class BaseMemoryError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      stack: this.stack
    };
  }
}

class ConfigurationError extends BaseMemoryError {
  constructor(message, details = {}) {
    super(message, 'CONFIGURATION_ERROR', details);
  }
}

class DatabaseError extends BaseMemoryError {
  constructor(message, details = {}) {
    super(message, 'DATABASE_ERROR', details);
  }
}

class ImportError extends BaseMemoryError {
  constructor(message, details = {}) {
    super(message, 'IMPORT_ERROR', details);
  }
}

class ValidationError extends BaseMemoryError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

class ErrorHandler {
  /**
   * Handle and log errors with standardized formatting
   * @param {Error} error - The error to handle
   * @param {boolean} [fatal=false] - Whether the error is fatal
   */
  static handle(error, fatal = false) {
    const ConsoleFormatter = require('./console');

    if (error instanceof BaseMemoryError) {
      ConsoleFormatter.error(`[${error.code}] ${error.message}`);
      
      if (error.details && Object.keys(error.details).length) {
        ConsoleFormatter.warning('Error Details:');
        Object.entries(error.details).forEach(([key, value]) => {
          console.log(`  ${key}: ${JSON.stringify(value)}`);
        });
      }
    } else {
      ConsoleFormatter.error(`Unexpected Error: ${error.message}`);
    }

    if (fatal) {
      process.exit(1);
    }
  }

  /**
   * Create a new error instance
   * @param {string} type - Error type (Configuration, Database, Import, Validation)
   * @param {string} message - Error message
   * @param {Object} [details={}] - Additional error details
   * @returns {BaseMemoryError}
   */
  static create(type, message, details = {}) {
    const errorTypes = {
      Configuration: ConfigurationError,
      Database: DatabaseError,
      Import: ImportError,
      Validation: ValidationError
    };

    const ErrorClass = errorTypes[type] || BaseMemoryError;
    return new ErrorClass(message, details);
  }
}

module.exports = { 
  ErrorHandler, 
  BaseMemoryError, 
  ConfigurationError, 
  DatabaseError, 
  ImportError, 
  ValidationError 
};
