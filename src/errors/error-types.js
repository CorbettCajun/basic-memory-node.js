import BasicMemoryError from './base-error.js';

/**
 * Database-related errors
 */
export class DatabaseError extends BasicMemoryError {
    constructor(message, options = {}) {
        super(message, {
            ...options,
            code: options.code || 'DATABASE_ERROR'
        });
    }
}

/**
 * File system-related errors
 */
export class FileSystemError extends BasicMemoryError {
    constructor(message, options = {}) {
        super(message, {
            ...options,
            code: options.code || 'FILESYSTEM_ERROR'
        });
    }
}

/**
 * Import/Export related errors
 */
export class ImportExportError extends BasicMemoryError {
    constructor(message, options = {}) {
        super(message, {
            ...options,
            code: options.code || 'IMPORT_EXPORT_ERROR'
        });
    }
}

/**
 * Validation errors for input data
 */
export class ValidationError extends BasicMemoryError {
    constructor(message, options = {}) {
        super(message, {
            ...options,
            code: options.code || 'VALIDATION_ERROR'
        });
    }
}

/**
 * Authentication and Authorization errors
 */
export class AuthenticationError extends BasicMemoryError {
    constructor(message, options = {}) {
        super(message, {
            ...options,
            code: options.code || 'AUTHENTICATION_ERROR'
        });
    }
}

/**
 * Configuration-related errors
 */
export class ConfigurationError extends BasicMemoryError {
    constructor(message, options = {}) {
        super(message, {
            ...options,
            code: options.code || 'CONFIGURATION_ERROR'
        });
    }
}

/**
 * Tool and Plugin related errors
 */
export class ToolError extends BasicMemoryError {
    constructor(message, options = {}) {
        super(message, {
            ...options,
            code: options.code || 'TOOL_ERROR'
        });
    }
}

// Export all error types for easy importing
export default {
    BasicMemoryError,
    DatabaseError,
    FileSystemError,
    ImportExportError,
    ValidationError,
    AuthenticationError,
    ConfigurationError,
    ToolError
};
