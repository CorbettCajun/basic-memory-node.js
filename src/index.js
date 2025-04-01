/**
 * Basic Memory - Main Entry Point
 * 
 * Exports the core functionality of the Node.js implementation
 */

// Export database models and functions
export * from './db/index.js';

// Export MCP server
export * from './mcp.js';

// Export synchronization functions
export * from './sync.js';

// Export version information
export const version = '0.10.0';

// Export API information
export const api = {
  name: 'Basic Memory',
  version: '0.10.0',
  description: 'Local-first knowledge management combining Zettelkasten with knowledge graphs'
};

/**
 * Initialize the Basic Memory system
 * 
 * @param {Object} options - Initialization options
 * @param {string} [options.home] - Home directory path
 * @param {boolean} [options.sync] - Whether to sync files with database
 * @param {boolean} [options.watch] - Whether to watch files for changes
 * @returns {Promise<Object>} - Initialization result
 */
export async function initialize(options = {}) {
  // Import needed functions
  const { initializeDatabase } = await import('./db/index.js');
  const { synchronize, watchDirectory } = await import('./sync.js');
  
  // Process options
  const home = options.home || process.env.BASIC_MEMORY_HOME;
  const shouldSync = options.sync ?? true;
  const shouldWatch = options.watch ?? false;
  
  // Set environment variable for database path
  if (home) {
    process.env.BASIC_MEMORY_HOME = home;
  }
  
  // Initialize database
  const dbResult = await initializeDatabase();
  
  // Sync files if requested
  let syncResult = null;
  if (shouldSync) {
    syncResult = await synchronize({ directory: process.env.BASIC_MEMORY_HOME });
  }
  
  // Watch files if requested
  let watcher = null;
  if (shouldWatch) {
    watcher = watchDirectory(process.env.BASIC_MEMORY_HOME);
  }
  
  // Return initialization result
  return {
    database: dbResult,
    sync: syncResult,
    watcher,
    home: process.env.BASIC_MEMORY_HOME
  };
}

// Export default object for CommonJS compatibility
export default {
  initialize,
  version,
  api
};
