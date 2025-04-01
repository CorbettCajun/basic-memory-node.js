/**
 * Database command for Basic Memory
 * 
 * Provides functionality to manage the Basic Memory database
 */

import { program, logger } from '../app.js';
import { initializeDatabase } from '../../db/index.js';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, copyFileSync, unlinkSync, mkdirSync } from 'fs';
import chalk from 'chalk';

// Define the db command group
const dbCommand = program
  .command('db')
  .description('Manage the Basic Memory database');

// Define the backup subcommand
dbCommand
  .command('backup')
  .description('Create a backup of the database')
  .option('-d, --destination <path>', 'Destination directory for backup', 
          join(homedir(), 'basic-memory-backups'))
  .option('-p, --project <name>', 'Project to backup (default: current project)')
  .action(async (options) => {
    try {
      // Get project name from options or environment
      const projectName = options.project || process.env.BASIC_MEMORY_PROJECT || 'main';
      
      // Set up paths
      const homeDir = process.env.BASIC_MEMORY_HOME || join(homedir(), 'basic-memory');
      const dbPath = process.env.BASIC_MEMORY_DB_PATH || join(homeDir, '.basic-memory', `${projectName}.db`);
      
      // Create backup directory if it doesn't exist
      if (!existsSync(options.destination)) {
        mkdirSync(options.destination, { recursive: true });
        logger.info(chalk.blue(`Created backup directory: ${options.destination}`));
      }
      
      // Generate backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
      const backupFilename = `${projectName}-${timestamp}.db`;
      const backupPath = join(options.destination, backupFilename);
      
      // Check if source database exists
      if (!existsSync(dbPath)) {
        logger.error(chalk.red(`Database not found: ${dbPath}`));
        process.exit(1);
      }
      
      // Create backup
      copyFileSync(dbPath, backupPath);
      logger.info(chalk.green(`Backup created: ${backupPath}`));
    } catch (error) {
      logger.error(chalk.red(`Backup failed: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the restore subcommand
dbCommand
  .command('restore')
  .description('Restore a database backup')
  .requiredOption('-f, --file <path>', 'Backup file to restore')
  .option('-p, --project <name>', 'Project to restore to (default: current project)')
  .option('--force', 'Overwrite existing database without confirmation', false)
  .action(async (options) => {
    try {
      // Get project name from options or environment
      const projectName = options.project || process.env.BASIC_MEMORY_PROJECT || 'main';
      
      // Set up paths
      const homeDir = process.env.BASIC_MEMORY_HOME || join(homedir(), 'basic-memory');
      const dbDir = join(homeDir, '.basic-memory');
      const dbPath = process.env.BASIC_MEMORY_DB_PATH || join(dbDir, `${projectName}.db`);
      
      // Check if backup file exists
      if (!existsSync(options.file)) {
        logger.error(chalk.red(`Backup file not found: ${options.file}`));
        process.exit(1);
      }
      
      // Check if destination database exists
      const dbExists = existsSync(dbPath);
      
      if (dbExists && !options.force) {
        logger.error(chalk.red(`Database already exists: ${dbPath}`));
        logger.error(chalk.red(`Use --force to overwrite the existing database`));
        process.exit(1);
      }
      
      // Create database directory if it doesn't exist
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
      }
      
      // Backup existing database if it exists
      if (dbExists) {
        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
        const autoBackupPath = join(dbDir, `${projectName}-pre-restore-${timestamp}.db`);
        copyFileSync(dbPath, autoBackupPath);
        logger.info(chalk.blue(`Created automatic backup: ${autoBackupPath}`));
      }
      
      // Restore backup
      copyFileSync(options.file, dbPath);
      logger.info(chalk.green(`Database restored to ${dbPath}`));
      
      // Re-initialize database
      await initializeDatabase();
      logger.info(chalk.green(`Database re-initialized`));
    } catch (error) {
      logger.error(chalk.red(`Restore failed: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the reset subcommand
dbCommand
  .command('reset')
  .description('Reset the database (WARNING: this will delete all data)')
  .option('-p, --project <name>', 'Project to reset (default: current project)')
  .option('--force', 'Reset without confirmation', false)
  .action(async (options) => {
    try {
      // Get project name from options or environment
      const projectName = options.project || process.env.BASIC_MEMORY_PROJECT || 'main';
      
      // Set up paths
      const homeDir = process.env.BASIC_MEMORY_HOME || join(homedir(), 'basic-memory');
      const dbDir = join(homeDir, '.basic-memory');
      const dbPath = process.env.BASIC_MEMORY_DB_PATH || join(dbDir, `${projectName}.db`);
      
      // Check if database exists
      if (!existsSync(dbPath)) {
        logger.error(chalk.red(`Database not found: ${dbPath}`));
        process.exit(1);
      }
      
      if (!options.force) {
        logger.error(chalk.red(`This will permanently delete all data in the ${projectName} project!`));
        logger.error(chalk.red(`Use --force to confirm`));
        process.exit(1);
      }
      
      // Backup existing database
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
      const autoBackupPath = join(dbDir, `${projectName}-pre-reset-${timestamp}.db`);
      copyFileSync(dbPath, autoBackupPath);
      logger.info(chalk.blue(`Created automatic backup: ${autoBackupPath}`));
      
      // Delete database
      unlinkSync(dbPath);
      logger.info(chalk.green(`Database reset: ${dbPath}`));
      
      // Re-initialize database
      await initializeDatabase();
      logger.info(chalk.green(`Database re-initialized`));
    } catch (error) {
      logger.error(chalk.red(`Reset failed: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the migrate subcommand
dbCommand
  .command('migrate')
  .description('Run database migrations')
  .option('--force', 'Force running migrations even if already up to date', false)
  .action(async (options) => {
    try {
      logger.info(chalk.blue('Running database migrations...'));
      
      // Force re-initialization which will run migrations
      await initializeDatabase({ forceMigrations: options.force });
      
      logger.info(chalk.green('Migrations completed successfully'));
    } catch (error) {
      logger.error(chalk.red(`Migration failed: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

export default dbCommand;
