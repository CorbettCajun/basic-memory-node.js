import { createDatabaseConnection } from './connection.js';
import { logger } from '../utils/enhanced-logger.js';

class DatabaseManager {
  constructor(options = {}) {
    this._connectionManager = createDatabaseConnection(options);
    this._locks = new Map();
  }

  /**
   * Acquire a lock for a specific resource
   * @param {string} resourceId - Unique identifier for the resource
   * @returns {Promise<function>} Release function
   */
  async acquireLock(resourceId) {
    while (this._locks.has(resourceId)) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    const release = () => {
      this._locks.delete(resourceId);
      logger.debug(`Lock released for resource: ${resourceId}`);
    };

    this._locks.set(resourceId, true);
    logger.debug(`Lock acquired for resource: ${resourceId}`);
    
    return release;
  }

  /**
   * Perform a thread-safe database operation
   * @param {string} resourceId - Resource to lock
   * @param {function} operation - Database operation to perform
   * @returns {Promise<any>} Operation result
   */
  async safeTransaction(resourceId, operation) {
    const release = await this.acquireLock(resourceId);
    
    try {
      return await this._connectionManager.transaction(async (db) => {
        return await operation(db);
      });
    } catch (error) {
      logger.error('Safe transaction failed', { 
        resourceId, 
        error: error.message 
      });
      throw error;
    } finally {
      release();
    }
  }

  /**
   * Get direct database connection
   * @returns {Promise<Object>} Database connection
   */
  async getConnection() {
    return this._connectionManager.getConnection();
  }

  /**
   * Close database connection
   */
  async close() {
    await this._connectionManager.close();
  }
}

export const createDatabaseManager = (options) => 
  new DatabaseManager(options);

export default createDatabaseManager;
