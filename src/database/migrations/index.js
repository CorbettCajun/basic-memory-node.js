import { Umzug, JSONStorage } from 'umzug';
import path from 'path';
import fs from 'fs/promises';
import chalk from 'chalk';

/**
 * Create a migration manager for the database
 * @param {Object} config - Database configuration
 * @returns {Umzug} Configured migration manager
 */
export function createMigrationManager(config) {
  const migrationPath = path.join(__dirname, 'scripts');

  return new Umzug({
    migrations: {
      glob: ['scripts/*.js', { cwd: __dirname }],
      resolve: ({ name, path, context }) => {
        const migration = require(path);
        return {
          name,
          up: async () => migration.up(context),
          down: async () => migration.down(context)
        };
      }
    },
    context: config,
    storage: new JSONStorage({
      path: path.join(config.projectPath, '.migrations.json')
    }),
    logger: console
  });
}

/**
 * Generate a new migration script
 * @param {string} name - Name of the migration
 * @param {string} projectPath - Project root path
 */
export async function generateMigration(name, projectPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const migrationName = `${timestamp}-${name.toLowerCase().replace(/\s+/g, '-')}`;
  const migrationPath = path.join(projectPath, 'src', 'database', 'migrations', 'scripts', `${migrationName}.js`);

  const migrationTemplate = `
// Migration: ${name}
// Generated at: ${new Date().toISOString()}

module.exports = {
  async up(context) {
    // Implement database upgrade logic here
    console.log('Upgrading database...');
  },

  async down(context) {
    // Implement database downgrade logic here
    console.log('Downgrading database...');
  }
};
`;

  try {
    await fs.writeFile(migrationPath, migrationTemplate);
    console.log(chalk.green(`Migration created: ${migrationName}`));
  } catch (error) {
    console.error(chalk.red(`Failed to create migration: ${error.message}`));
  }
}

/**
 * Run database migrations
 * @param {Object} config - Database configuration
 * @param {string} direction - Migration direction ('up' or 'down')
 */
export async function runMigrations(config, direction = 'up') {
  const migrationManager = createMigrationManager(config);

  try {
    const migrations = direction === 'up' 
      ? await migrationManager.up() 
      : await migrationManager.down();

    console.log(chalk.green(`Successfully ran ${direction} migrations:`));
    migrations.forEach(migration => {
      console.log(chalk.white(`- ${migration.name}`));
    });
  } catch (error) {
    console.error(chalk.red('Migration failed:'), error);
    throw error;
  }
}

/**
 * List available migrations
 * @param {Object} config - Database configuration
 */
export async function listMigrations(config) {
  const migrationManager = createMigrationManager(config);

  try {
    const pendingMigrations = await migrationManager.pending();
    const executedMigrations = await migrationManager.executed();

    console.log(chalk.blue('=== Migration Status ==='));
    
    console.log(chalk.green('\nExecuted Migrations:'));
    executedMigrations.forEach(migration => {
      console.log(chalk.white(`- ${migration.name}`));
    });

    console.log(chalk.yellow('\nPending Migrations:'));
    pendingMigrations.forEach(migration => {
      console.log(chalk.white(`- ${migration.name}`));
    });
  } catch (error) {
    console.error(chalk.red('Failed to list migrations:'), error);
  }
}

export default {
  createMigrationManager,
  generateMigration,
  runMigrations,
  listMigrations
};
