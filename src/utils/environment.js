/**
 * Environment Utilities
 * 
 * Standardized access to environment variables with appropriate defaults
 * and utility functions for environment-dependent behavior.
 */

import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { logger } from './logger.js';

/**
 * Get the base home directory for Basic Memory
 * @returns {string} The home directory path
 */
export function getHomeDir() {
  const home = process.env.BASIC_MEMORY_HOME || join(homedir(), 'basic-memory');
  
  // Create directory if it doesn't exist
  if (!existsSync(home)) {
    logger.info(`Creating Basic Memory home directory: ${home}`);
    mkdirSync(home, { recursive: true });
  }
  
  return home;
}

/**
 * Get the database path for the current project
 * @param {string} [projectName] - Optional project name, defaults to environment variable or 'main'
 * @returns {string} The database file path
 */
export function getDbPath(projectName) {
  const project = projectName || process.env.BASIC_MEMORY_PROJECT || 'main';
  
  // If explicit DB path is provided, use it
  if (process.env.BASIC_MEMORY_DB_PATH) {
    return process.env.BASIC_MEMORY_DB_PATH;
  }
  
  // Otherwise create a project-specific database in the .basic-memory directory
  const dbDir = join(getHomeDir(), '.basic-memory');
  
  // Ensure directory exists
  if (!existsSync(dbDir)) {
    logger.info(`Creating database directory: ${dbDir}`);
    mkdirSync(dbDir, { recursive: true });
  }
  
  return join(dbDir, `${project}.db`);
}

/**
 * Get the current project name
 * @returns {string} Project name
 */
export function getProjectName() {
  return process.env.BASIC_MEMORY_PROJECT || 'main';
}

/**
 * Get MCP server configuration
 * @returns {Object} Server configuration object
 */
export function getMcpConfig() {
  return {
    host: process.env.BASIC_MEMORY_HOST || 'localhost',
    port: parseInt(process.env.BASIC_MEMORY_PORT || '8766', 10)
  };
}

/**
 * Check if file synchronization is enabled
 * Default is true in line with the Python implementation
 * @returns {boolean} Whether sync is enabled
 */
export function isSyncEnabled() {
  const syncEnv = process.env.SYNC_TO_FILES;
  return syncEnv !== 'false'; // Only disable sync if explicitly set to 'false'
}

/**
 * Get application config as an object
 * @returns {Object} Configuration object
 */
export function getConfig() {
  return {
    home: getHomeDir(),
    dbPath: getDbPath(),
    project: getProjectName(),
    mcp: getMcpConfig(),
    syncEnabled: isSyncEnabled(),
    logLevel: process.env.BASIC_MEMORY_LOG_LEVEL || 'info'
  };
}

export default {
  getHomeDir,
  getDbPath,
  getProjectName,
  getMcpConfig,
  isSyncEnabled,
  getConfig
};
