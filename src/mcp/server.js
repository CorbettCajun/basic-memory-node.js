import { EventEmitter } from 'events';
import net from 'net';
import { logger } from '../app.js';
import { commandRegistry, registerCommands } from '../cli/commands/index.js';
import { Command } from 'commander';
import BasicMemoryError from '../errors/base-error.js';

/**
 * MCP Server implementation following Model Context Protocol specifications
 */
class MCPServer extends EventEmitter {
  /**
   * Create a new MCP Server instance
   * @param {Object} [config={}] - Server configuration
   */
  constructor(config = {}) {
    super();
    
    // MCP Protocol version
    this.protocolVersion = '2025-03-26';

    // Default configuration
    this.config = {
      port: config.port || 0,  // 0 means find an available port
      host: config.host || 'localhost',
      debug: config.debug || false,
      maxConnections: config.maxConnections || 100,
      connectionTimeout: config.connectionTimeout || 10000, // 10 seconds
      reconnectAttempts: config.reconnectAttempts || 3,
      reconnectDelay: config.reconnectDelay || 1000, // 1 second
      ...config
    };

    // Server state tracking
    this.state = {
      isInitialized: false,
      isRunning: false,
      startTime: null,
      loadedCommands: [],
      errors: [],
      actualPort: null,
      clientCapabilities: null,
      connectionAttempts: 0
    };

    // Network server instance
    this.server = null;
    this.connections = new Set();
  }

  /**
   * Initialize the MCP server
   * @param {Object} clientCapabilities - Capabilities provided by the client
   * @returns {Promise<Object>} Server initialization result
   */
  async initialize(clientCapabilities = {}) {
    try {
      // Validate protocol version
      this._validateProtocolVersion(clientCapabilities.protocolVersion);

      // Store client capabilities
      this.state.clientCapabilities = clientCapabilities;

      // Register commands
      await registerCommands();
      this.state.loadedCommands = Array.from(commandRegistry.keys());

      // Find available port
      this.state.actualPort = await this._findAvailablePort();

      // Create TCP server
      this.server = net.createServer(this._handleConnection.bind(this));

      // Set server-wide connection limits
      this.server.maxConnections = this.config.maxConnections;

      // Error handling for server
      this.server.on('error', this._handleServerError.bind(this));

      // Start listening
      await new Promise((resolve, reject) => {
        this.server.listen(
          { 
            port: this.state.actualPort, 
            host: this.config.host 
          }, 
          () => {
            this.state.isInitialized = true;
            this.state.isRunning = true;
            this.state.startTime = new Date();
            logger.info(`MCP Server listening on ${this.config.host}:${this.state.actualPort}`);
            resolve();
          }
        );

        // Set connection timeout
        this.server.setTimeout(this.config.connectionTimeout);
      });

      // Mark as initialized
      this.state.isInitialized = true;

      // Return server capabilities
      return {
        _meta: {
          protocolVersion: this.protocolVersion
        },
        serverCapabilities: {
          commands: this.state.loadedCommands,
          supportedProtocolVersions: [this.protocolVersion],
          maxConnections: this.config.maxConnections,
          port: this.state.actualPort
        }
      };
    } catch (error) {
      // Detailed error logging
      logger.error('Server initialization failed', { 
        error: error.message, 
        stack: error.stack,
        clientCapabilities 
      });

      // Wrap and rethrow with MCP error format
      throw new BasicMemoryError('Server initialization failed', {
        code: BasicMemoryError.ErrorCodes.INTERNAL_ERROR,
        metadata: { 
          originalError: error.message,
          clientCapabilities 
        }
      });
    }
  }

  /**
   * Handle individual client connections
   * @param {net.Socket} socket - Incoming client socket
   * @private
   */
  _handleConnection(socket) {
    // Validate authorization before handling connection
    const authToken = socket.headers?.authorization?.replace('Bearer ', '');
    try {
      const payload = await this._validateAuthToken(authToken);
      if (!payload.scopes.includes('mcp:basic')) {
        throw new BasicMemoryError('Missing required scope', {
          code: 'EAUTHSCOPE',
          status: 403
        });
      }
    } catch (error) {
      socket.write(this._formatSpecError(error));
      socket.destroy();
      return;
    }

    // Increment connection count
    this.connections.add(socket);
    logger.info(`New authenticated connection from ${socket.remoteAddress}`, {
      clientVersion: socket.headers?.['x-mcp-version']
    });

    // Connection timeout handling
    socket.setTimeout(this.config.connectionTimeout);

    // Error and close event handlers
    socket.on('error', (err) => {
      logger.warn(`Socket error from ${socket.remoteAddress}`, { error: err });
      this.connections.delete(socket);
      socket.destroy();
    });

    socket.on('close', () => {
      logger.info(`Client disconnected from ${socket.remoteAddress}`);
      this.connections.delete(socket);
    });

    // Optional: Add connection data processing logic here
  }

  /**
   * Handle server-wide errors
   * @param {Error} error - Server error
   * @private
   */
  _handleServerError(error) {
    logger.error('MCP Server error', { 
      error: error.message, 
      code: error.code 
    });

    // Attempt reconnection for certain errors
    if (this.state.connectionAttempts < this.config.reconnectAttempts) {
      this.state.connectionAttempts++;
      setTimeout(() => {
        try {
          this.server.close();
          this.initialize(this.state.clientCapabilities);
        } catch (reinitError) {
          logger.error('Reinitialization failed', { error: reinitError });
        }
      }, this.config.reconnectDelay);
    } else {
      this.state.isRunning = false;
      this.emit('serverError', error);
    }
  }

  /**
   * Find an available port
   * @returns {Promise<number>} Available port number
   * @private
   */
  async _findAvailablePort() {
    return new Promise((resolve, reject) => {
      const testServer = net.createServer();
      testServer.listen(0, this.config.host, () => {
        const port = testServer.address().port;
        testServer.close(() => {
          resolve(port);
        });
      });
      testServer.on('error', reject);
    });
  }

  /**
   * Validate client's protocol version
   * @param {string} clientVersion - Version provided by client
   * @private
   */
  _validateProtocolVersion(clientVersion) {
    const supportedVersions = ['2025-03-26', '2024-11-05'];
    this.activeProtocolVersion = supportedVersions.includes(clientVersion)
      ? clientVersion
      : supportedVersions[0];
    
    if (!clientVersion) {
      logger.warn('Client provided no protocol version, using latest');
    } else if (!supportedVersions.includes(clientVersion)) {
      logger.warn(`Client version ${clientVersion} not supported`);
    }
  }

  /**
   * Gracefully close the server
   * @returns {Promise<void>}
   */
  async close() {
    return new Promise((resolve, reject) => {
      // Close all active connections
      this.connections.forEach(socket => socket.destroy());

      if (this.server) {
        this.server.close((err) => {
          if (err) {
            logger.error('Error closing server', { error: err });
            reject(err);
          } else {
            logger.info('MCP Server closed');
            this.state.isRunning = false;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get current server status
   * @returns {Object} Server status details
   */
  getStatus() {
    return {
      isRunning: this.state.isRunning,
      startTime: this.state.startTime,
      port: this.state.actualPort,
      activeConnections: this.connections.size,
      loadedCommands: this.state.loadedCommands
    };
  }
}

export default MCPServer;
