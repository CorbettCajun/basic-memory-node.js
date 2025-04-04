import { Command } from 'commander';
import { initDatabase } from '../../db/index.js';
import { logger } from '../../utils/logger.js';

const initCommand = new Command('init')
  .description('Initialize the Basic Memory database')
  .action(async () => {
    try {
      logger.info('Starting database initialization...');
      await initDatabase();
      logger.info('Database initialized successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      
      // Log additional error details
      if (error.name) {
        logger.error(`Error Name: ${error.name}`);
      }
      if (error.message) {
        logger.error(`Error Message: ${error.message}`);
      }
      if (error.stack) {
        logger.error('Error Stack Trace:', error.stack);
      }
      
      process.exit(1);
    }
  });

export default initCommand;