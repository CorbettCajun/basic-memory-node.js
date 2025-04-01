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

// Increase the max listeners limit to avoid warnings
process.setMaxListeners(25);

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
  port: process.env.BASIC_MEMORY_PORT || 8765,
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

// Add global error handling
server.setErrorHandler((error, request, reply) => {
  logger.error(`Error in request ${request.method} ${request.url}: ${error.message}`);
  reply.status(500).send({ 
    error: 'An error occurred processing your request',
    code: -32000,
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

// Add CORS support for browser clients
server.register(import('@fastify/cors'), {
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
    version: '0.10.0'
  };
});

// Register service discovery endpoint for MCP
server.get('/mcp', async (request, reply) => {
  return {
    name: 'Basic Memory',
    version: '0.10.0',
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
    ]
  };
});

// Register tool endpoints
registerTools(server);

// Handle graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  try {
    await server.close();
    logger.info('Server closed successfully');
    process.exit(0);
  } catch (err) {
    logger.error(`Error during shutdown: ${err.message}`);
    process.exit(1);
  }
};

// Listen for termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start server
const start = async () => {
  try {
    logger.info(`Starting Basic Memory MCP server`);
    logger.info(`Home directory: ${config.home}`);
    logger.info(`Using server prefix: '${config.serverPrefix}'`);
    
    await server.listen({ 
      port: config.port, 
      host: config.host 
    });
    
    // Log all registered routes for debugging
    const routes = server.printRoutes();
    logger.debug(`Registered routes:\n${routes}`);
    
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

// Export server instance for testing
export { server, config, start };
