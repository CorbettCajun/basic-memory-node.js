/**
 * Enhanced Migration Manager for Basic Memory Node.js
 * Provides robust, safe migration mechanisms
 */
import { Umzug, SequelizeStorage } from 'umzug';
import { Sequelize } from 'sequelize';
import { pathToFileURL, fileURLToPath } from 'url';
import { join, basename, dirname } from 'path';
import { existsSync, readdirSync } from 'fs';
import { logger } from '../../../utils/enhanced-logger.js';

const MIGRATION_LOCK_TIMEOUT = 30000; // 30 seconds

export class MigrationManager {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.migrationLock = false;
  }

  /**
   * Acquire migration lock
   * @returns {Promise<boolean>}
   */
  async acquireMigrationLock() {
    const startTime = Date.now();
    while (this.migrationLock) {
      if (Date.now() - startTime > MIGRATION_LOCK_TIMEOUT) {
        throw new Error('Migration lock timeout');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.migrationLock = true;
    return true;
  }

  /**
   * Release migration lock
   */
  releaseMigrationLock() {
    this.migrationLock = false;
  }

  /**
   * Run migrations with enhanced safety
   * @param {Object} options - Migration options
   */
  async runMigrations(options = {}) {
    await this.acquireMigrationLock();
    
    try {
      const umzug = new Umzug({
        migrations: this._findMigrationFiles(),
        context: this.sequelize.getQueryInterface(),
        storage: new SequelizeStorage({ sequelize: this.sequelize }),
        logger: {
          info: msg => logger.info(msg),
          warn: msg => logger.warn(msg),
          error: msg => logger.error(msg)
        }
      });

      const pendingMigrations = await umzug.pending();
      logger.info(`Pending migrations: ${pendingMigrations.length}`);

      if (options.force || pendingMigrations.length > 0) {
        await umzug.up();
        logger.info('Migrations completed successfully');
      }
    } catch (error) {
      logger.error('Migration failed', { error: error.message });
      throw error;
    } finally {
      this.releaseMigrationLock();
    }
  }

  /**
   * Find and prepare migration files
   * @returns {Array} Migration file configurations
   * @private
   */
  _findMigrationFiles() {
    const migrationsPath = join(dirname(fileURLToPath(import.meta.url)), 'versions');
    
    if (!existsSync(migrationsPath)) {
      logger.warn(`Migration path does not exist: ${migrationsPath}`);
      return [];
    }

    return readdirSync(migrationsPath)
      .filter(file => file.endsWith('.js'))
      .map(file => ({
        name: basename(file, '.js'),
        path: join(migrationsPath, file)
      }));
  }
}

export const createMigrationManager = (sequelize) => 
  new MigrationManager(sequelize);

export default createMigrationManager;
