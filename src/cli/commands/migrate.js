/**
 * Database Migration Commands
 * 
 * Provides CLI commands for database schema migrations:
 * - migrate:status - Show migration status
 * - migrate:up - Run pending migrations
 * - migrate:down - Roll back migrations
 * - migrate:create - Create new migration file
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { sequelize } from '../../db/index.js';
import { 
  getMigrationStatus, 
  runMigrations, 
  rollbackMigrations,
  resetMigrations, 
  createMigration 
} from '../../db/migrations/migration-manager.js';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const migrationsDir = join(__dirname, '../../db/migrations/versions');

/**
 * Migration command module
 */
export default {
  /**
   * Set up the migration command and its subcommands
   * @returns {import('commander').Command} The configured command
   */
  setup() {
    // Create the migration command
    const migrateCommand = new Command('migrate')
      .description('Database migration commands')
      .action(() => {
        console.log(chalk.yellow('Please specify a migration subcommand:'));
        console.log('  status   - Show migration status');
        console.log('  up       - Run pending migrations');
        console.log('  down     - Roll back migrations');
        console.log('  create   - Create new migration file');
        console.log('  reset    - Reset all migrations (warning: destructive)');
        console.log('\nExample: basic-memory migrate status');
      });

    // Status command
    migrateCommand
      .command('status')
      .description('Show migration status')
      .action(async () => {
        try {
          const status = await getMigrationStatus(sequelize);
          
          if (status.pending.length === 0 && status.executed.length === 0) {
            console.log(chalk.yellow('No migrations found.'));
            return;
          }
          
          if (status.executed.length > 0) {
            console.log(chalk.green(`\nExecuted migrations (${status.executed.length}):`));
            status.executed.forEach(migration => {
              console.log(`  ✓ ${chalk.cyan(migration)}`);
            });
          }
          
          if (status.pending.length > 0) {
            console.log(chalk.yellow(`\nPending migrations (${status.pending.length}):`));
            status.pending.forEach(migration => {
              console.log(`  - ${chalk.gray(migration)}`);
            });
          } else {
            console.log(chalk.green('\nDatabase schema is up to date.'));
          }
        } catch (error) {
          console.error(chalk.red(`Error checking migration status: ${error.message}`));
          process.exit(1);
        }
      });

    // Up command
    migrateCommand
      .command('up')
      .description('Run pending migrations')
      .option('-t, --to <migration>', 'Migrate up to a specific migration')
      .action(async (options) => {
        try {
          console.log(chalk.cyan('Running migrations...'));
          
          const result = await runMigrations(sequelize, options.to);
          
          if (result.migrations.length === 0) {
            console.log(chalk.green('No migrations to run. Database schema is up to date.'));
            return;
          }
          
          console.log(chalk.green(`\nSuccessfully ran ${result.migrations.length} migrations:`));
          result.migrations.forEach(migration => {
            console.log(`  ✓ ${chalk.cyan(migration)}`);
          });
        } catch (error) {
          console.error(chalk.red(`Error running migrations: ${error.message}`));
          process.exit(1);
        }
      });

    // Down command
    migrateCommand
      .command('down')
      .description('Roll back migrations')
      .option('-t, --to <migration>', 'Migrate down to a specific migration')
      .option('-a, --all', 'Roll back all migrations')
      .action(async (options) => {
        if (!options.to && !options.all) {
          console.log(chalk.yellow('Please specify a target migration with --to or use --all to roll back all migrations.'));
          return;
        }
        
        try {
          console.log(chalk.cyan('Rolling back migrations...'));
          
          const result = await rollbackMigrations(sequelize, options.to, options.all);
          
          if (result.migrations.length === 0) {
            console.log(chalk.yellow('No migrations to roll back.'));
            return;
          }
          
          console.log(chalk.green(`\nSuccessfully rolled back ${result.migrations.length} migrations:`));
          result.migrations.forEach(migration => {
            console.log(`  ✓ ${chalk.cyan(migration)}`);
          });
        } catch (error) {
          console.error(chalk.red(`Error rolling back migrations: ${error.message}`));
          process.exit(1);
        }
      });

    // Create command
    migrateCommand
      .command('create')
      .description('Create a new migration file')
      .argument('<name>', 'Name for the migration (will be prefixed with timestamp)')
      .action(async (name) => {
        try {
          const migrationPath = await createMigration(name);
          console.log(chalk.green(`\nCreated new migration: ${chalk.cyan(migrationPath)}`));
        } catch (error) {
          console.error(chalk.red(`Error creating migration: ${error.message}`));
          process.exit(1);
        }
      });

    // Reset command
    migrateCommand
      .command('reset')
      .description('Reset all migrations (warning: destructive)')
      .option('-f, --force', 'Force reset without confirmation')
      .action(async (options) => {
        if (!options.force) {
          console.log(chalk.red('WARNING: This will drop all tables and reapply migrations.'));
          console.log(chalk.red('This operation is destructive and cannot be undone.'));
          console.log(chalk.yellow('To proceed, run the command again with the --force option.'));
          return;
        }
        
        try {
          console.log(chalk.cyan('Resetting migrations...'));
          
          const result = await resetMigrations(sequelize);
          
          console.log(chalk.green('\nSuccessfully reset and reapplied migrations:'));
          result.migrations.forEach(migration => {
            console.log(`  ✓ ${chalk.cyan(migration)}`);
          });
        } catch (error) {
          console.error(chalk.red(`Error resetting migrations: ${error.message}`));
          process.exit(1);
        }
      });

    return migrateCommand;
  }
};
