import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { logger } from './enhanced-logger.js';

class EnvironmentConfigManager {
  constructor() {
    this._envCache = new Map();
    this._loadEnvironmentFiles();
  }

  /**
   * Load environment files with intelligent priority
   * @private
   */
  _loadEnvironmentFiles() {
    const envFiles = [
      '.env',
      `.env.${process.env.NODE_ENV || 'development'}`,
      '.env.local'
    ];

    envFiles.forEach(file => {
      const envPath = path.resolve(process.cwd(), file);
      if (fs.existsSync(envPath)) {
        try {
          const result = dotenv.config({ path: envPath });
          if (result.error) {
            logger.warn(`Error loading ${file}:`, result.error);
          } else {
            logger.info(`Loaded environment file: ${file}`);
            this._cacheEnvironmentVariables(result.parsed);
          }
        } catch (error) {
          logger.error(`Failed to parse ${file}:`, error);
        }
      }
    });
  }

  /**
   * Cache environment variables for quick access
   * @param {Object} parsedEnv - Parsed environment variables
   * @private
   */
  _cacheEnvironmentVariables(parsedEnv) {
    Object.entries(parsedEnv || {}).forEach(([key, value]) => {
      this._envCache.set(key, value);
    });
  }

  /**
   * Get an environment variable with optional default
   * @param {string} key - Environment variable key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Environment variable value
   */
  get(key, defaultValue = undefined) {
    return process.env[key] || this._envCache.get(key) || defaultValue;
  }

  /**
   * Check if an environment variable exists
   * @param {string} key - Environment variable key
   * @returns {boolean} Whether the variable exists
   */
  has(key) {
    return process.env[key] !== undefined || this._envCache.has(key);
  }

  /**
   * Get all environment variables
   * @returns {Object} All environment variables
   */
  getAll() {
    return {
      ...Object.fromEntries(this._envCache),
      ...process.env
    };
  }

  /**
   * Validate required environment variables
   * @param {string[]} requiredVars - List of required variables
   * @throws {Error} If any required variable is missing
   */
  validate(requiredVars = []) {
    const missingVars = requiredVars.filter(key => !this.has(key));
    
    if (missingVars.length > 0) {
      const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  }
}

export const envConfig = new EnvironmentConfigManager();
export default envConfig;
