import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection configuration
export const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../data/basic-memory.sqlite'),
    logging: false
});

// Migration configuration
export const umzug = new Umzug({
    migrations: {
        glob: ['migrations/*.js', { cwd: __dirname }],
        resolve: ({ name, path, context }) => {
            const migration = import(path);
            return {
                name,
                up: async () => (await migration).up(context),
                down: async () => (await migration).down(context)
            };
        }
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({
        sequelize,
        modelName: 'migrations_meta'
    }),
    logger: console
});

// Utility functions for migration management
export async function runMigrations() {
    try {
        await sequelize.authenticate();
        const pendingMigrations = await umzug.pending();
        console.log(`Pending migrations: ${pendingMigrations.length}`);
        
        if (pendingMigrations.length > 0) {
            await umzug.up();
            console.log('Migrations completed successfully');
        }
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

export async function undoLastMigration() {
    try {
        await umzug.down();
        console.log('Last migration undone successfully');
    } catch (error) {
        console.error('Migration undo failed:', error);
        throw error;
    }
}

export async function getMigrationStatus() {
    const executed = await umzug.executed();
    const pending = await umzug.pending();

    console.log('Executed Migrations:');
    executed.forEach(migration => console.log(`- ${migration.name}`));

    console.log('\nPending Migrations:');
    pending.forEach(migration => console.log(`- ${migration.name}`));

    return { executed, pending };
}

// Create migrations directory if it doesn't exist
const migrationsDir = path.join(__dirname, 'migrations');
await fs.mkdir(migrationsDir, { recursive: true });

export default umzug;
