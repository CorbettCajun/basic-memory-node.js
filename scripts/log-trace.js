import { EventEmitter } from 'events';
import { logger, migrationLogger, dbLogger, mcpLogger } from '../src/utils/logger.js';

// Increase max listeners to prevent warnings
EventEmitter.defaultMaxListeners = 100;

// Monkey patch loggers to add tracing
function traceLogger(loggerInstance, name) {
    const originalInfo = loggerInstance.info;
    const originalWarn = loggerInstance.warn;
    const originalError = loggerInstance.error;

    loggerInstance.info = function(...args) {
        console.trace(`[TRACE] ${name} INFO:`, ...args);
        return originalInfo.apply(this, args);
    };

    loggerInstance.warn = function(...args) {
        console.trace(`[TRACE] ${name} WARN:`, ...args);
        return originalWarn.apply(this, args);
    };

    loggerInstance.error = function(...args) {
        console.trace(`[TRACE] ${name} ERROR:`, ...args);
        return originalError.apply(this, args);
    };
}

// Apply tracing to different loggers
traceLogger(logger, 'MAIN');
traceLogger(migrationLogger, 'MIGRATION');
traceLogger(dbLogger, 'DATABASE');
traceLogger(mcpLogger, 'MCP');

console.log('Logging tracing enabled. Run your application to see detailed traces.');
