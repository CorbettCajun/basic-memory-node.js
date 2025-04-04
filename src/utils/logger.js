/**
 * Logger Utility
 * 
 * Provides a standardized logging interface for the application.
 * Uses pino for structured logging with pretty printing for development.
 */

import pino from 'pino';
import { EventEmitter } from 'events';

// Get log level from environment or default to info
const LOG_LEVEL = process.env.BASIC_MEMORY_LOG_LEVEL || 'info';

// Increase event listeners for logging
EventEmitter.defaultMaxListeners = 50;

// Configure the logger with increased event listeners
export const logger = pino({
  level: LOG_LEVEL,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      maxListeners: 50
    }
  },
  base: undefined, // Remove pid and hostname from logs
  timestamp: false // Disable timestamp to reduce event overhead
});

// Additional log methods with specific prefixes
export const dbLogger = logger.child({ module: 'database' });
export const syncLogger = logger.child({ module: 'sync' });
export const mcpLogger = logger.child({ module: 'mcp' });
export const migrationLogger = logger.child({ module: 'migration' });

export default logger;
