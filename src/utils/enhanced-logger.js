const pino = require('pino');
const { EventEmitter } = require('events');

// Unique log tracking to prevent duplicates
const logCache = new Set();

/**
 * Enhanced logging utility with deduplication and advanced tracking
 */
class EnhancedLogger {
  constructor(options = {}) {
    // Increase event listener limit
    EventEmitter.defaultMaxListeners = 100;

    // Default configuration
    const defaultConfig = {
      level: process.env.BASIC_MEMORY_LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      },
      base: undefined,
      timestamp: false
    };

    // Merge default and provided options
    this.logger = pino({
      ...defaultConfig,
      ...options
    });
  }

  /**
   * Generate a unique hash for a log message to detect duplicates
   * @param {string} level - Log level
   * @param {Array} args - Log arguments
   * @returns {string} Unique log hash
   */
  _generateLogHash(level, ...args) {
    const stringifiedArgs = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join('|');
    return `${level}:${stringifiedArgs}`;
  }

  /**
   * Log a message with deduplication
   * @param {string} level - Log level (info, warn, error, etc.)
   * @param  {...any} args - Arguments to log
   */
  _log(level, ...args) {
    const logHash = this._generateLogHash(level, ...args);

    // Prevent duplicate logs within a short time frame
    if (!logCache.has(logHash)) {
      logCache.add(logHash);
      
      // Remove from cache after a short delay to allow similar but not identical logs
      setTimeout(() => {
        logCache.delete(logHash);
      }, 1000);

      // Call the appropriate Pino logging method
      this.logger[level](...args);
    }
  }

  /**
   * Info level logging
   * @param  {...any} args - Arguments to log
   */
  info(...args) {
    this._log('info', ...args);
  }

  /**
   * Warning level logging
   * @param  {...any} args - Arguments to log
   */
  warn(...args) {
    this._log('warn', ...args);
  }

  /**
   * Error level logging
   * @param  {...any} args - Arguments to log
   */
  error(...args) {
    this._log('error', ...args);
  }

  /**
   * Debug level logging
   * @param  {...any} args - Arguments to log
   */
  debug(...args) {
    this._log('debug', ...args);
  }

  /**
   * Create a child logger with additional context
   * @param {Object} bindings - Context bindings for the child logger
   * @returns {EnhancedLogger} Child logger instance
   */
  child(bindings) {
    return new EnhancedLogger({
      ...this.logger.options,
      base: { ...this.logger.options.base, ...bindings }
    });
  }
}

// Create singleton instances for different modules
const logger = new EnhancedLogger();
const dbLogger = logger.child({ module: 'database' });
const syncLogger = logger.child({ module: 'sync' });
const mcpLogger = logger.child({ module: 'mcp' });
const migrationLogger = logger.child({ module: 'migration' });

module.exports = {
  logger,
  dbLogger,
  syncLogger,
  mcpLogger,
  migrationLogger,
  default: logger
};
