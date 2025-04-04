/**
 * CLI Application for Basic Memory
 * 
 * This file sets up the command-line interface using Commander
 * and provides the main application structure
 */

import { Command } from 'commander';
import { join } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { initializeDatabase } from '../db/index.js';
import pino from 'pino';
import initCommand from './commands/init.js';

// Set up paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { 
      colorize: true,
      maxListeners: 1 // Minimal listeners
    }
  },
  base: null, // Remove pid, hostname etc.
  timestamp: false // Disable timestamp
});

// Get package info
const packagePath = join(__dirname, '..', '..', 'package.json');
const packageInfo = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Create CLI program
const program = new Command();
program
  .name('basic-memory')
  .description('Local-first knowledge management combining Zettelkasten with knowledge graphs')
  .version(packageInfo.version)
  .option('-p, --project <name>', 'Specify which project to use', 'main')
  .addCommand(initCommand)
  .hook('preAction', async (thisCommand, actionCommand) => {
    // Initialize database before each command
    if (actionCommand.name() !== 'version') {
      const projectName = actionCommand.opts().project || program.opts().project || 'main';
      process.env.BASIC_MEMORY_PROJECT = projectName;
      
      // Only initialize DB if needed - some commands might not need it
      if (actionCommand.opts().skipDbInit !== true) {
        try {
          await initializeDatabase();
        } catch (error) {
          logger.error(`Database initialization failed: ${error.message}`);
          logger.debug(error.stack);
        }
      }
    }
  });

// Handle unhandled promises and exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise);
  logger.error('Reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  logger.error(error.stack);
  process.exit(1);
});

export { program, logger };
