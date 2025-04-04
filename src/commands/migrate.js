import { Command } from 'commander';
import chalk from 'chalk';
import { getConfig } from '../config/config.js';
import { 
  generateMigration, 
  runMigrations, 
  listMigrations 
} from '../database/migrations/index.js';

/**
 * Register migration-related CLI commands
 * @param {Command} program - Commander program instance
 */
export function registerMigrateCommands(program) {
  const migrateCommand = program
    .command('migrate')
    .description('Database migration management');

  migrateCommand
    .command('generate <name>')
    .description('Generate a new migration script')
    .action(async (name) => {
      try {
        const config = await getConfig();
        await generateMigration(name, config.projectPath);
      } catch (error) {
        console.error(chalk.red('Migration generation failed:'), error);
        process.exit(1);
      }
    });

  migrateCommand
    .command('up')
    .description('Run pending database migrations')
    .action(async () => {
      try {
        const config = await getConfig();
        await runMigrations(config, 'up');
      } catch (error) {
        console.error(chalk.red('Migration up failed:'), error);
        process.exit(1);
      }
    });

  migrateCommand
    .command('down')
    .description('Rollback the last database migration')
    .action(async () => {
      try {
        const config = await getConfig();
        await runMigrations(config, 'down');
      } catch (error) {
        console.error(chalk.red('Migration down failed:'), error);
        process.exit(1);
      }
    });

  migrateCommand
    .command('status')
    .description('Show migration status')
    .action(async () => {
      try {
        const config = await getConfig();
        await listMigrations(config);
      } catch (error) {
        console.error(chalk.red('Failed to retrieve migration status:'), error);
        process.exit(1);
      }
    });
}

export default {
  registerMigrateCommands
};
