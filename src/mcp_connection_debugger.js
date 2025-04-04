import fs from 'fs';
import path from 'path';
import net from 'net';
import { EventEmitter } from 'events';

class MCPConnectionDebugger extends EventEmitter {
  constructor(options = {}) {
    super();
    this.config = {
      logDirectory: options.logDirectory || path.join(process.cwd(), 'mcp-logs'),
      maxLogFiles: options.maxLogFiles || 10,
      connectionTimeout: options.connectionTimeout || 10000,
      reconnectAttempts: options.reconnectAttempts || 3,
      reconnectDelay: options.reconnectDelay || 2000,
      ...options
    };

    this.connectionAttempts = 0;
    this.isConnected = false;
    this.socket = null;

    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.config.logDirectory)) {
      fs.mkdirSync(this.config.logDirectory, { recursive: true });
    }
  }

  logEvent(eventType, message, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      message,
      details,
      connectionAttempts: this.connectionAttempts
    };

    const logFilename = `mcp_connection_${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`;
    const logPath = path.join(this.config.logDirectory, logFilename);

    try {
      fs.writeFileSync(logPath, JSON.stringify(logEntry, null, 2));
      this.rotateLogFiles();
    } catch (error) {
      console.error('Failed to write MCP connection log:', error);
    }

    this.emit('log', logEntry);
    console.log(`[MCP Debugger] ${eventType}: ${message}`, details);
  }

  rotateLogFiles() {
    const logFiles = fs.readdirSync(this.config.logDirectory)
      .filter(file => file.startsWith('mcp_connection_'))
      .sort((a, b) => b.localeCompare(a));

    while (logFiles.length > this.config.maxLogFiles) {
      const oldestLogFile = logFiles.pop();
      fs.unlinkSync(path.join(this.config.logDirectory, oldestLogFile));
    }
  }

  async diagnoseConnectionError(error) {
    this.logEvent('CONNECTION_ERROR', 'Detailed connection error analysis', {
      errorCode: error.code,
      errorMessage: error.message,
      socketState: this.getSocketState()
    });

    const diagnosticResults = {
      networkInterfaces: this.getNetworkInterfaces(),
      systemEnvironment: this.getSystemEnvironment(),
      connectionHistory: this.getConnectionHistory()
    };

    this.logEvent('DIAGNOSTIC_RESULTS', 'Comprehensive connection diagnostic', diagnosticResults);

    return {
      error,
      diagnostics: diagnosticResults,
      recommendations: this.generateRecommendations(error)
    };
  }

  getSocketState() {
    if (!this.socket) return 'No socket created';

    return {
      connecting: this.socket.connecting,
      destroyed: this.socket.destroyed,
      readable: this.socket.readable,
      writable: this.socket.writable
    };
  }

  getNetworkInterfaces() {
    try {
      const os = require('os');
      return os.networkInterfaces();
    } catch (error) {
      return { error: error.message };
    }
  }

  getSystemEnvironment() {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      env: Object.keys(process.env)
    };
  }

  getConnectionHistory() {
    // This would typically be populated with actual connection attempts
    return {
      totalAttempts: this.connectionAttempts,
      lastConnectionTimestamp: this.lastConnectionTimestamp
    };
  }

  generateRecommendations(error) {
    const recommendations = [];

    switch (error.code) {
      case 'ECONNREFUSED':
        recommendations.push('Verify server is running and listening on the correct port');
        recommendations.push('Check firewall settings');
        break;
      case 'ETIMEDOUT':
        recommendations.push('Check network connectivity');
        recommendations.push('Verify server responsiveness');
        recommendations.push('Increase connection timeout');
        break;
      default:
        recommendations.push('Perform a comprehensive network diagnostic');
    }

    return recommendations;
  }

  async connectWithRetry(host, port, options = {}) {
    const mergedOptions = { ...this.config, ...options };

    return new Promise((resolve, reject) => {
      const attemptConnection = () => {
        this.connectionAttempts++;
        this.logEvent('CONNECTION_ATTEMPT', `Attempting to connect to ${host}:${port}`, {
          attempt: this.connectionAttempts
        });

        const socket = new net.Socket();
        socket.setTimeout(mergedOptions.connectionTimeout);

        socket.connect(port, host, () => {
          this.isConnected = true;
          this.socket = socket;
          this.lastConnectionTimestamp = new Date().toISOString();
          this.logEvent('CONNECTION_SUCCESS', `Connected to ${host}:${port}`);
          resolve(socket);
        });

        socket.on('timeout', () => {
          socket.destroy();
          this.logEvent('CONNECTION_TIMEOUT', `Connection to ${host}:${port} timed out`);
          
          if (this.connectionAttempts < mergedOptions.reconnectAttempts) {
            setTimeout(attemptConnection, mergedOptions.reconnectDelay);
          } else {
            reject(new Error('Max connection attempts reached'));
          }
        });

        socket.on('error', (err) => {
          socket.destroy();
          this.logEvent('CONNECTION_ERROR', `Connection error to ${host}:${port}`, {
            errorCode: err.code,
            errorMessage: err.message
          });

          if (this.connectionAttempts < mergedOptions.reconnectAttempts) {
            setTimeout(attemptConnection, mergedOptions.reconnectDelay);
          } else {
            reject(err);
          }
        });
      };

      attemptConnection();
    });
  }

  async testMCPConnection(host, port) {
    try {
      const socket = await this.connectWithRetry(host, port);
      
      // Simulate MCP handshake (you'd replace this with actual MCP protocol)
      const handshakeMessage = JSON.stringify({
        jsonrpc: '2.0',
        method: 'mcp.handshake',
        params: [],
        id: 1
      });

      return new Promise((resolve, reject) => {
        socket.write(handshakeMessage, (err) => {
          if (err) {
            this.logEvent('HANDSHAKE_ERROR', 'Failed to send MCP handshake', { error: err });
            reject(err);
          } else {
            this.logEvent('HANDSHAKE_SENT', 'MCP handshake message sent successfully');
            resolve(socket);
          }
        });

        socket.on('data', (data) => {
          this.logEvent('HANDSHAKE_RESPONSE', 'Received response from MCP server', {
            responseData: data.toString()
          });
        });
      });
    } catch (error) {
      await this.diagnoseConnectionError(error);
      throw error;
    }
  }
}

export default new MCPConnectionDebugger();
