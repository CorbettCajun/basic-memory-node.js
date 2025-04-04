/**
 * Base error class for Basic Memory application
 * Provides a standardized error structure with additional metadata
 */
class BasicMemoryError extends Error {
    /**
     * Create a new BasicMemoryError
     * @param {string} message - Error message
     * @param {Object} [options={}] - Additional error options
     * @param {number} [options.code=-32603] - JSON-RPC error code (defaults to INTERNAL_ERROR)
     * @param {Object} [options.metadata={}] - Additional error metadata
     * @param {Error} [options.cause] - Original error that caused this error
     */
    constructor(message, options = {}) {
        super(message);
        
        // Ensure the name of this error is the same as the class
        this.name = this.constructor.name;

        // Set error code (default to INTERNAL_ERROR)
        this.code = options.code || -32603;

        // Store additional metadata
        this.metadata = options.metadata || {};

        // Store the original cause of the error
        this.cause = options.cause;

        // Capture stack trace, excluding constructor call from stack trace
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Convert error to JSON-RPC error format
     * @returns {Object} JSON-RPC error object
     */
    toJSONRPCError() {
        return {
            code: this.code,
            message: this.message,
            data: {
                name: this.name,
                metadata: this.metadata,
                stack: this.stack
            }
        };
    }

    /**
     * Create a new error with additional context
     * @param {Object} additionalMetadata - Extra metadata to attach
     * @returns {BasicMemoryError} New error instance
     */
    withContext(additionalMetadata) {
        return new BasicMemoryError(this.message, {
            code: this.code,
            metadata: { ...this.metadata, ...additionalMetadata },
            cause: this
        });
    }

    /**
     * Standard JSON-RPC error codes
     * @returns {Object} Mapping of standard error codes
     */
    static get ErrorCodes() {
        return {
            PARSE_ERROR: -32700,
            INVALID_REQUEST: -32600,
            METHOD_NOT_FOUND: -32601,
            INVALID_PARAMS: -32602,
            INTERNAL_ERROR: -32603,
            
            // Custom application-specific error ranges
            DATABASE_ERROR: -32000,
            FILESYSTEM_ERROR: -32001,
            AUTHENTICATION_ERROR: -32002,
            VALIDATION_ERROR: -32003
        };
    }
}

export default BasicMemoryError;
