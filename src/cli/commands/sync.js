/**
 * Sync command for Basic Memory
 * 
 * Provides functionality to synchronize Markdown files with the Basic Memory database
 */

import { program, logger } from '../app.js';
import { homedir } from 'os';
import { join } from 'path';
import { synchronize, watchDirectory } from '../../sync.js';
import { initializeDatabase } from '../../db/index.js';
import chalk from 'chalk';

// Define the sync command
program
  .command('sync')
  .description('Synchronize Markdown files with the knowledge base')
  .option('-w, --watch', 'Watch for file changes and sync continuously', false)
  .option('-d, --directory <path>', 'Directory to sync (default: ~/basic-memory)', 
          join(homedir(), 'basic-memory'))
  .option('-v, --verbose', 'Show detailed sync information', false)
  .action(async (options) => {
    const { directory, watch, verbose } = options;
    process.env.BASIC_MEMORY_HOME = directory;
    
    try {
      // Initial sync
      logger.info(`Syncing directory: ${directory}`);
      const syncResults = await synchronize({ directory, verbose });
      
      // Display sync results
      displaySyncSummary(syncResults);
      
      if (verbose) {
        displayDetailedSyncResults(syncResults);
      }
      
      // Watch for changes if requested
      if (watch) {
        logger.info(`Watching for changes in ${directory}`);
        
        const watcher = watchDirectory(directory);
        
        // Keep process running
        logger.info('Press Ctrl+C to stop watching');
        await new Promise(() => {}); // Keep process running indefinitely
      }
    } catch (error) {
      logger.error(`Sync failed: ${error.message}`);
      logger.debug(error.stack);
      process.exit(1);
    }
  });

/**
 * Display a summary of sync results
 * 
 * @param {Object} results - The sync results
 */
function displaySyncSummary(results) {
  const totalChanges = 
    (results.created?.length || 0) + 
    (results.updated?.length || 0) + 
    (results.deleted?.length || 0);
  
  if (totalChanges === 0) {
    logger.info(chalk.green('Everything up to date'));
    return;
  }
  
  logger.info(`Sync completed with ${totalChanges} changes:`);
  if (results.created?.length > 0) {
    logger.info(chalk.green(`  Created: ${results.created.length} entities`));
  }
  
  if (results.updated?.length > 0) {
    logger.info(chalk.blue(`  Updated: ${results.updated.length} entities`));
  }
  
  if (results.deleted?.length > 0) {
    logger.info(chalk.yellow(`  Deleted: ${results.deleted.length} entities`));
  }
}

/**
 * Display detailed sync results
 * 
 * @param {Object} results - The sync results
 */
function displayDetailedSyncResults(results) {
  if (results.created?.length > 0) {
    logger.info(chalk.green('Created:'));
    results.created.forEach(entity => {
      logger.info(chalk.green(`  ${entity.title} (${entity.permalink})`));
    });
  }
  
  if (results.updated?.length > 0) {
    logger.info(chalk.blue('Updated:'));
    results.updated.forEach(entity => {
      logger.info(chalk.blue(`  ${entity.title} (${entity.permalink})`));
    });
  }
  
  if (results.deleted?.length > 0) {
    logger.info(chalk.yellow('Deleted:'));
    results.deleted.forEach(entity => {
      logger.info(chalk.yellow(`  ${entity.title} (${entity.permalink})`));
    });
  }
}

export default program.commands.find(cmd => cmd.name() === 'sync');
