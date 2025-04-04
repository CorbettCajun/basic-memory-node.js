import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { Sequelize } from 'sequelize';

const program = new Command();

// Initialize migrations
program
  .command('init')
  .description('Initialize migrations system')
  .action(() => {
    // Create migrations folder
    const migrationsDir = path.join(process.cwd(), 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir);
      console.log('Created migrations directory');
    }

    // Create migration table if not exists
    const sequelize = new Sequelize(/* your database config */);
    sequelize.query("CREATE TABLE IF NOT EXISTS SequelizeMeta (\n" +
      "  name VARCHAR(255) NOT NULL,\n" +
      "  PRIMARY KEY (name)\n" +
      ");");
  });

// Create new migration
program
  .command('create <n>')
  .description('Create a new migration file')
  .action((name) => {
    const timestamp = new Date().getTime();
    const migrationName = `${timestamp}-${name}.js`;
    const migrationPath = path.join(process.cwd(), 'migrations', migrationName);

    const template = `export default {
  up: async (queryInterface, Sequelize) => {
    // Write migration code here
  },
  down: async (queryInterface, Sequelize) => {
    // Write rollback code here
  }
};
`;

    fs.writeFileSync(migrationPath, template);
    console.log(`Created migration: ${migrationName}`);
  });

// Run migrations
program
  .command('up')
  .description('Run all pending migrations')
  .action(async () => {
    const sequelize = new Sequelize(/* your database config */);
    await sequelize.migrateUp();
  });

// Rollback last migration
program
  .command('down')
  .description('Rollback the last migration')
  .action(async () => {
    const sequelize = new Sequelize(/* your database config */);
    await sequelize.migrateDown();
  });

// Show migration status
program
  .command('status')
  .description('Show current migration status')
  .action(async () => {
    const sequelize = new Sequelize(/* your database config */);
    const [results] = await sequelize.query("SELECT * FROM SequelizeMeta");
    console.log('Applied migrations:', results.map(r => r.name));
  });

export default program;
