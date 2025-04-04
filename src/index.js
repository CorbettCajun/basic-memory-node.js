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

// Export optimizations
export * from './optimizations/index.js';

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
 * @param {boolean} [options.optimize] - Whether to apply performance optimizations
 * @returns {Promise<Object>} - Initialization result
 */
export async function initialize(options = {}) {
  // Import needed functions
  const { initializeDatabase } = await import('./db/index.js');
  const { synchronize, watchDirectory } = await import('./sync.js');
  const { applyAllOptimizations } = await import('./optimizations/index.js');
  
  // Process options
  const home = options.home || process.env.BASIC_MEMORY_HOME;
  const shouldSync = options.sync ?? true;
  const shouldWatch = options.watch ?? false;
  const shouldOptimize = options.optimize ?? true;
  
  // Set environment variable for database path
  if (home) {
    process.env.BASIC_MEMORY_HOME = home;
  }
  
  // Initialize database
  const dbResult = await initializeDatabase();
  
  // Apply performance optimizations if requested
  let optimizationResult = null;
  if (shouldOptimize) {
    console.log('Applying performance optimizations...');
    optimizationResult = await applyAllOptimizations();
  }
  
  // Perform initial file synchronization if requested
  let syncResult = null;
  if (shouldSync) {
    syncResult = await synchronize();
  }
  
  // Setup file watching if requested
  let watchResult = null;
  if (shouldWatch) {
    watchResult = watchDirectory();
  }
  
  return {
    success: true,
    database: dbResult,
    sync: syncResult,
    watch: watchResult,
    optimizations: optimizationResult,
    home
  };
}

// Export default object for CommonJS compatibility
export default {
  initialize,
  version,
  api
};
