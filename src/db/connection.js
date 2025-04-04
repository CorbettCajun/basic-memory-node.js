import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { EventEmitter } from 'events';
import { logger } from '../utils/enhanced-logger.js';

class DatabaseConnectionManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this._engine = null;
    this._sessionMaker = null;
    this._options = {
      path: options.path || ':memory:',
      mode: options.mode || sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
      verbose: options.verbose || false
    };
  }

  /**
   * Create or retrieve database connection
   * @returns {Promise<Object>} Database connection
   */
  async getConnection() {
    if (!this._engine) {
      try {
        this._engine = await open({
          filename: this._options.path,
          driver: sqlite3.Database,
          mode: this._options.mode
        });

        // Enable foreign key support
        await this._engine.run('PRAGMA foreign_keys = ON');

        // Set up connection pooling and safety mechanisms
        this._setupConnectionPool();

        this.emit('connection_created', this._engine);
        logger.info(`Database connection established: ${this._options.path}`);
      } catch (error) {
        logger.error('Database connection failed', { 
          path: this._options.path, 
          error: error.message 
        });
        throw error;
      }
    }
    return this._engine;
  }

  /**
   * Create a transaction with robust error handling
   * @param {Function} transactionFn - Transaction function
   * @returns {Promise<any>} Transaction result
   */
  async transaction(transactionFn) {
    const db = await this.getConnection();
    
    try {
      await db.run('BEGIN TRANSACTION');
      const result = await transactionFn(db);
      await db.run('COMMIT');
      return result;
    } catch (error) {
      await db.run('ROLLBACK');
      logger.error('Transaction failed', { 
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Set up connection pooling and safety mechanisms
   * @private
   */
  _setupConnectionPool() {
    // Implement connection pooling and safety mechanisms
    this._engine.on('error', (error) => {
      logger.error('Database connection error', { error: error.message });
      this.emit('connection_error', error);
    });

    // Implement connection timeout and retry
    this._engine.configure({
      busyTimeout: 5000,  // 5 seconds
      trace: this._options.verbose ? 
        (sql) => logger.debug(`SQL Trace: ${sql}`) : 
        undefined
    });
  }

  /**
   * Close database connection
   */
  async close() {
    if (this._engine) {
      await this._engine.close();
      this._engine = null;
      logger.info('Database connection closed');
    }
  }
}

export const createDatabaseConnection = (options) => 
  new DatabaseConnectionManager(options);

export default createDatabaseConnection;
