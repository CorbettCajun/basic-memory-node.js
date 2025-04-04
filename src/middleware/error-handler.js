import winston from 'winston';
import BasicMemoryError from '../errors/base-error.js';
import errorTypes from '../errors/error-types.js';

/**
 * Global error handling middleware
 * Handles different types of errors and provides consistent error responses
 */
export function errorHandler(err, req, res, next) {
    // Create a logger instance specifically for error tracking
    const errorLogger = winston.createLogger({
        level: 'error',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
        transports: [
            new winston.transports.File({ 
                filename: 'logs/error.log',
                maxsize: 5242880, // 5MB
                maxFiles: 5
            }),
            new winston.transports.Console({
                format: winston.format.simple()
            })
        ]
    });

    // Determine the appropriate error response
    let statusCode = 500;
    let errorResponse = {
        success: false,
        error: {
            message: 'An unexpected error occurred',
            code: 'INTERNAL_SERVER_ERROR'
        }
    };

    // Handle BasicMemoryError instances
    if (err instanceof BasicMemoryError) {
        statusCode = getStatusCodeForErrorType(err);
        errorResponse.error = {
            message: err.message,
            code: err.code,
            metadata: err.metadata
        };
    } 
    // Handle standard Error instances
    else if (err instanceof Error) {
        errorResponse.error.message = err.message;
    }

    // Log the full error details
    errorLogger.error('Unhandled Error', {
        error: err,
        requestInfo: {
            method: req.method,
            path: req.path,
            body: req.body
        }
    });

    // Send error response
    res.status(statusCode).json(errorResponse);
}

/**
 * Determine HTTP status code based on error type
 * @param {BasicMemoryError} err - Error instance
 * @returns {number} Appropriate HTTP status code
 */
function getStatusCodeForErrorType(err) {
    const errorTypeMap = {
        'VALIDATION_ERROR': 400,
        'AUTHENTICATION_ERROR': 401,
        'AUTHORIZATION_ERROR': 403,
        'NOT_FOUND_ERROR': 404,
        'DATABASE_ERROR': 500,
        'FILESYSTEM_ERROR': 500,
        'IMPORT_EXPORT_ERROR': 422,
        'CONFIGURATION_ERROR': 500,
        'TOOL_ERROR': 500
    };

    return errorTypeMap[err.code] || 500;
}

/**
 * Async error wrapper to handle promise rejections
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped route handler
 */
export function asyncErrorHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

export default {
    errorHandler,
    asyncErrorHandler
};
