import { getMigrationManager } from '../src/db/migrations/migration-manager.js';
import { sequelize } from '../src/db/sequelize.js';
import { migrationLogger as logger } from '../src/utils/logger.js';

async function debugMigrations() {
    try {
        logger.info('Starting detailed migration debug');

        // Check database connection
        try {
            await sequelize.authenticate();
            logger.info('Database connection established successfully');
        } catch (connectionError) {
            logger.error('Failed to connect to database:', connectionError);
            return;
        }

        // Get migration manager
        const migrationManager = getMigrationManager(sequelize);

        // Check pending migrations
        const pendingMigrations = await migrationManager.pending();
        logger.info(`Number of pending migrations: ${pendingMigrations.length}`);
        
        if (pendingMigrations.length > 0) {
            logger.info('Pending Migration Details:');
            pendingMigrations.forEach(migration => {
                logger.info(`- ${migration.name}`);
            });
        }

        // Check completed migrations
        const completedMigrations = await migrationManager.executed();
        logger.info(`Number of completed migrations: ${completedMigrations.length}`);
        
        if (completedMigrations.length > 0) {
            logger.info('Completed Migration Details:');
            completedMigrations.forEach(migration => {
                logger.info(`- ${migration.name}`);
            });
        }

        // Attempt to run migrations
        try {
            await migrationManager.up();
            logger.info('All migrations ran successfully');
        } catch (migrationError) {
            logger.error('Migration process encountered an error:', migrationError);
        }
    } catch (error) {
        logger.error('Unexpected error during migration debug:', error);
    } finally {
        await sequelize.close();
    }
}

debugMigrations();
