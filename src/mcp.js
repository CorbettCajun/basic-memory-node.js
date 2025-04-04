/**
 * Main MCP Server implementation for Basic Memory
 * 
 * Creates and configures the MCP instance and handles server startup
 */

import fastify from 'fastify';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { mkdirSync, existsSync } from 'fs';
import pino from 'pino';
import process from 'process';
import { EventEmitter } from 'events';

// Increase the max listeners limit to avoid warnings
process.setMaxListeners(50);

// Increase max listeners for all EventEmitters
EventEmitter.defaultMaxListeners = 50;

// Import tool handlers
import { registerTools } from './tools/index.js';
import { getHomeDir } from './db/index.js';

// Current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MCP Server Prefix Mapping (March 2025 standard)
const mcpPrefixMapping = {
  fetch: "mcp3_",
  archon: "mcp0_",
  "sequential-thinking": "mcp8_",
  "memory-mcp": "mcp6_",
  "brave-search": "mcp1_",
  search1api: "mcp7_",
  "codex-keeper": "mcp2_",
  firecrawl: "mcp5_",
  filesystem: "mcp4_",
  // Basic-memory uses no prefix as it's a primary service
  "basic-memory": ""
};

// Configuration
const config = {
  home: getHomeDir(),
  port: parseInt(process.env.BASIC_MEMORY_PORT || '8766', 10),
  host: process.env.BASIC_MEMORY_HOST || 'localhost',
  logLevel: process.env.BASIC_MEMORY_LOG_LEVEL || 'info',
  serverPrefix: mcpPrefixMapping["basic-memory"]
};

// Ensure the home directory exists
if (!existsSync(config.home)) {
  mkdirSync(config.home, { recursive: true });
}

// Setup logger
const logger = pino({
  level: config.logLevel,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

// Enhanced connection and error handling
const connectionLogger = {
  logConnectionAttempt(client) {
    logger.info('MCP Client Connection Attempt', {
      timestamp: new Date().toISOString(),
      clientInfo: {
        address: client.remoteAddress,
        port: client.remotePort
      }
    });
  },

  logConnectionError(error) {
    logger.error('MCP Connection Error', {
      timestamp: new Date().toISOString(),
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack
    });
  },

  logConnectionClose(hadError) {
    logger.warn('MCP Connection Closed', {
      timestamp: new Date().toISOString(),
      hadError: hadError
    });
  }
};

// Create MCP server with robust connection handling
const server = fastify({
  logger,
  // Add increased timeout to prevent connection closures
  connectionTimeout: 60000,
  keepAliveTimeout: 65000,
  // Enable reuse address for rapid restarts
  rewriteUrl: true,
  trustProxy: true,
  // Increase limits for larger payloads
  bodyLimit: 10485760, // 10MB
  // Improved error serialization
  serializerOpts: {
    serialize: true
  }
});

// Robust connection handling
server.addHook('onRequest', (request, reply, done) => {
  const connection = request.socket;
  connectionLogger.logConnectionAttempt(connection);

  connection.on('error', (error) => {
    connectionLogger.logConnectionError(error);
  });

  connection.on('close', (hadError) => {
    connectionLogger.logConnectionClose(hadError);
  });

  done();
});

// Standard MCP Error Codes
const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR_START: -32099,
  SERVER_ERROR_END: -32000,
  AUTHORIZATION_ERROR: -32000,
  RATE_LIMIT_EXCEEDED: -32001,
  SERVICE_UNAVAILABLE: -32002
};

// Comprehensive error handling for server startup
server.setErrorHandler((error, request, reply) => {
  logger.error('Unhandled Server Error', {
    timestamp: new Date().toISOString(),
    errorName: error.name,
    errorMessage: error.message,
    requestMethod: request.method,
    requestUrl: request.url,
    errorStack: error.stack
  });

  reply.status(500).send({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

// Add global error handler that conforms to MCP spec
server.setErrorHandler((error, request, reply) => {
  logger.error(`Error in request ${request.method} ${request.url}: ${error.message}`);
  
  // Determine appropriate error code
  let code = MCP_ERROR_CODES.INTERNAL_ERROR;
  if (error.validation) {
    code = MCP_ERROR_CODES.INVALID_PARAMS;
  } else if (error.statusCode === 404) {
    code = MCP_ERROR_CODES.METHOD_NOT_FOUND;
  } else if (error.statusCode === 401 || error.statusCode === 403) {
    code = MCP_ERROR_CODES.AUTHORIZATION_ERROR;
  } else if (error.statusCode === 429) {
    code = MCP_ERROR_CODES.RATE_LIMIT_EXCEEDED;
  } else if (error.statusCode === 503) {
    code = MCP_ERROR_CODES.SERVICE_UNAVAILABLE;
  }
  
  // Format error response according to MCP spec
  reply.status(error.statusCode || 500).send({ 
    error: error.message || 'An error occurred processing your request',
    code: code,
    data: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

// Add keepalive handling
server.addHook('onRequest', (request, reply, done) => {
  if (request.headers['connection'] === 'keep-alive') {
    reply.header('Connection', 'keep-alive');
    reply.header('Keep-Alive', 'timeout=65');
  }
  done();
});

// Add CORS support for Model Context Protocol clients
await server.register(import('@fastify/cors'), {
  origin: (origin, cb) => {
    // Whitelist of known MCP client protocols and local development environments
    const allowedOrigins = [
      // Local development and testing
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      
      // Specific MCP client protocols
      /^vscode-webview:\/\//,
      /^windsurf:\/\//,
      /^roo:\/\//,
      
      // Potential future MCP client protocols
      /^mcp:\/\//,
      /^modelcontextprotocol:\/\//,
      
      // File and extension protocols
      /^file:\/\//,
      /^extension:\/\//
    ];

    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(pattern => pattern.test(origin));
    
    // Allow requests with no origin (like server-to-server) or matching origins
    cb(null, isAllowed || !origin);
  },
  methods: [
    'GET',    // Read operations
    'POST',   // Create and RPC operations
    'PUT',    // Update operations
    'DELETE', // Delete operations
    'OPTIONS' // Preflight CORS requests
  ],
  allowedHeaders: [
    'Content-Type',     // Payload type
    'Authorization',    // Authentication
    'X-MCP-Version',    // Protocol version
    'X-MCP-Client',     // Client identifier
    'X-Requested-With', // Ajax requests
    'Accept',           // Response type
    'Origin'            // CORS origin
  ],
  exposedHeaders: [
    'X-MCP-Server-Version', // Server version
    'X-MCP-Request-ID',     // Unique request tracking
    'X-MCP-Error-Code'      // Standardized error codes
  ],
  credentials: true,    // Allow credentials for authenticated requests
  maxAge: 86400,        // Cache preflight for 24 hours
  preflightContinue: false, // Stop processing after preflight
  optionsSuccessStatus: 204 // No content response for OPTIONS
});

// Add hook for all POST requests to validate content type
server.addHook('preHandler', (request, reply, done) => {
  if (request.method === 'POST') {
    const contentType = request.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
      return reply.code(415).send({
        error: 'Unsupported Media Type',
        code: MCP_ERROR_CODES.INVALID_REQUEST,
        message: 'Content-Type must be application/json'
      });
    }
  }
  done();
});

// Register health check endpoints
server.get('/health', async (request, reply) => {
  return { status: 'healthy', uptime: process.uptime() };
});

// Register MCP routes
server.get('/', async (request, reply) => {
  return { 
    status: 'ok', 
    name: 'Basic Memory MCP Server',
    prefix: config.serverPrefix,
    version: '0.10.0',
    protocol_version: '2025-03-26',
    description: 'A local-first knowledge management system with MCP integration'
  };
});

// Register service discovery endpoint for MCP
server.get('/mcp', async (request, reply) => {
  // Handle protocol negotiation via Accept header
  const acceptHeader = request.headers.accept || '';
  const requestedVersion = acceptHeader.includes('version=') 
    ? acceptHeader.split('version=')[1].split(';')[0].trim()
    : '2025-03-26'; // Default to latest if not specified
    
  // Check if we support the requested version
  const supportedVersions = ['2025-03-26', '2024-11-05'];
  const protocolVersion = supportedVersions.includes(requestedVersion) ? requestedVersion : '2025-03-26';
  
  // Set proper content type with protocol version
  reply.header('Content-Type', `application/json; charset=utf-8; version=${protocolVersion}`);
  
  return {
    name: 'Basic Memory',
    version: '0.10.0',
    protocol_version: protocolVersion,
    prefix: config.serverPrefix,
    tools: [
      'read_note', 
      'write_note', 
      'delete_note',
      'search',
      'recent_activity',
      'canvas',
      'build_context',
      'project_info',
      'read_content'
    ],
    auth_requirement: 'none',
    description: 'Local-first knowledge management system that combines Zettelkasten principles with knowledge graphs',
    documentation_url: 'https://github.com/basicmachines-co/basic-memory',
    contact: {
      name: 'Basic Memory Team',
      url: 'https://github.com/basicmachines-co/basic-memory/issues'
    }
  };
});

// Register tool endpoints
// registerTools(server);

// Graceful shutdown and event listener management
const cleanupHandlers = [];

function registerCleanup(handler) {
  cleanupHandlers.push(handler);
}

async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Run all registered cleanup handlers
    for (const handler of cleanupHandlers) {
      await handler();
    }

    // Close the server
    if (server) {
      await server.close();
      logger.info('Server closed');
    }

    // Exit process
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Remove existing signal handlers to prevent duplicates
process.removeAllListeners('SIGINT');
process.removeAllListeners('SIGTERM');

// Register new signal handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Clean up resources when server is closed
registerCleanup(async () => {
  // Close database connections
  // if (sequelize) {
  //   await sequelize.close();
  //   logger.info('Database connection closed');
  // }
});

// Handle graceful shutdown
async function start() {
  try {
    // Register all tools before starting the server
    await registerTools(server);
    logger.info('All MCP tools registered successfully');

    // Configure Fastify plugin timeout
    server.pluginTimeout = 30000; // Increase plugin timeout to 30 seconds

    // Start Fastify server
    await server.listen({ 
      port: config.port, 
      host: config.host 
    });

    logger.info(`Server is listening on http://${config.host}:${config.port}`);
    return true;
  } catch (error) {
    logger.error('Server failed to start:', error);
    throw error;
  }
}

// Add warning and error event listeners to prevent unhandled issues
process.on('warning', (warning) => {
  if (warning.name === 'MaxListenersExceededWarning') {
    logger.warn('Max listeners warning:', {
      message: warning.message,
      count: warning.count,
      type: warning.type
    });
    
    // Attempt to increase listeners dynamically if needed
    const emitter = warning.emitter;
    if (emitter && typeof emitter.setMaxListeners === 'function') {
      const currentMax = emitter.getMaxListeners();
      emitter.setMaxListeners(currentMax * 2);
      logger.info(`Increased max listeners to ${currentMax * 2}`);
    }
  } else {
    // Log other warnings
    logger.warn('Node.js warning:', {
      name: warning.name,
      message: warning.message
    });
  }
});

// Global unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise: promise,
    reason: reason
  });
  
  // Optional: You might want to exit the process for critical unhandled rejections
  // process.exit(1);
});

// Export server instance for testing
export { server, config, start };
