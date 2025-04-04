import logger from './enhanced-logger.js';

class EventManager {
  constructor() {
    // Global event emitter with infinite max listeners
    this.globalEmitter = new EventEmitter();
    this.globalEmitter.setMaxListeners(Infinity);

    // Centralize process event handling
    this.setupProcessEvents();
  }

  setupProcessEvents() {
    const safeExit = (code = 0) => {
      try {
        logger.info(`Exiting process with code ${code}`);
        
        // Emit a global exit event for any cleanup
        this.globalEmitter.emit('safe-exit', code);

        // Remove all listeners to prevent memory leaks
        process.removeAllListeners();
        
        process.exit(code);
      } catch (error) {
        logger.error('Error during safe exit:', error);
        process.exit(1);
      }
    };

    // Attach centralized exit handlers
    process.setMaxListeners(Infinity);
    
    process.on('exit', () => safeExit());
    process.on('SIGINT', () => safeExit(0));
    process.on('SIGTERM', () => safeExit(0));
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      safeExit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection:', reason);
      safeExit(1);
    });
  }

  /**
   * Register a global event listener
   * @param {string} eventName - Name of the event
   * @param {Function} listener - Event listener function
   */
  on(eventName, listener) {
    this.globalEmitter.on(eventName, listener);
  }

  /**
   * Emit a global event
   * @param {string} eventName - Name of the event
   * @param  {...any} args - Event arguments
   */
  emit(eventName, ...args) {
    this.globalEmitter.emit(eventName, ...args);
  }

  /**
   * Remove all listeners for a specific event
   * @param {string} eventName - Name of the event
   */
  removeAllListeners(eventName) {
    this.globalEmitter.removeAllListeners(eventName);
  }
}

// Singleton instance
export default new EventManager();
