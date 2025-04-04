import { getMigrationManager } from '../src/db/migrations/migration-manager.js';
import { sequelize } from '../src/db/sequelize.js';

async function runMigrations() {
    try {
        console.log('Running database migrations...');
        const migrationManager = getMigrationManager(sequelize);
        
        await migrationManager.up();
        console.log('Migrations completed successfully.');
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

runMigrations();
