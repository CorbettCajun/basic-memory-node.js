/**
 * Database configuration for Basic Memory
 * 
 * Sets up Sequelize ORM and initializes database models through migrations
 */

import { Sequelize } from 'sequelize';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync } from 'fs';
import pino from 'pino';
import { initModels, validateModelCompatibility } from './models.js';
import { runMigrations, getMigrationStatus } from './migrations/migration-manager.js';
import { getMigrationManager } from './migrations/migration-manager.js';
import { dbLogger as logger } from '../utils/logger.js';

export const initDatabase = async () => {
  let sequelize;
  try {
    // Create Sequelize instance
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: process.env.DB_PATH || './basic-memory.sqlite',
      logging: process.env.NODE_ENV === 'development' 
        ? (msg) => logger.debug(msg) 
        : false
    });

    // Validate database connection
    logger.info('Validating database connection...');
    await sequelize.authenticate();
    logger.info('Database connection validated successfully');
    
    // Run all pending migrations
    const migrationManager = getMigrationManager(sequelize);
    const pendingMigrations = await migrationManager.pending();
    
    if (pendingMigrations.length > 0) {
      logger.info(`Applying ${pendingMigrations.length} pending migrations`);
      try {
        await migrationManager.up();
        logger.info('Database migrations applied successfully');
      } catch (migrationError) {
        logger.error('Migration failed:', migrationError);
        // Attempt to rollback any partial migrations
        try {
          await migrationManager.down();
        } catch (rollbackError) {
          logger.error('Rollback failed:', rollbackError);
        }
        throw migrationError;
      }
    } else {
      logger.info('No pending migrations to apply');
    }

    // Perform any additional initialization steps
    logger.info('Database initialization complete');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  } finally {
    // Always close the connection to prevent resource leaks
    if (sequelize) {
      try {
        await sequelize.close();
        logger.info('Database connection closed');
      } catch (closeError) {
        logger.error('Failed to close database connection:', closeError);
      }
    }
  }
};

// Configure logger
const appLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Get home directory from environment or fallback to default
export const getHomeDir = () => {
  const home = process.env.BASIC_MEMORY_HOME || join(homedir(), 'basic-memory');
  appLogger.debug(`Using home directory: ${home}`);
  
  if (!existsSync(home)) {
    appLogger.info(`Creating home directory: ${home}`);
    mkdirSync(home, { recursive: true });
  }
  
  return home;
};

// Set up database path - can be directly specified or derived from home directory
const getDbPath = () => {
  // Check if a specific database path was provided
  if (process.env.BASIC_MEMORY_DB_PATH) {
    const dbPath = process.env.BASIC_MEMORY_DB_PATH;
    appLogger.info(`Using specified database path: ${dbPath}`);
    
    // Ensure the directory for the database exists
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
      appLogger.info(`Creating directory for database: ${dbDir}`);
      mkdirSync(dbDir, { recursive: true });
    }
    
    return dbPath;
  }
  
  // Default to the home directory
  const defaultPath = join(getHomeDir(), 'basic-memory.db');
  appLogger.debug(`Using default database path: ${defaultPath}`);
  return defaultPath;
};

const dbPath = getDbPath();

// Create Sequelize instance
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.SQL_LOGGING ? msg => appLogger.debug(msg) : false,
  define: {
    timestamps: true,
    underscored: true // Use snake_case for automatically created fields
  }
});

// Initialize models
const models = initModels(sequelize);
const { Entity, Observation, Relation, SearchIndex } = models;

// Initialize database
const initializeDatabase = async () => {
  try {
    appLogger.info('Initializing database...');
    
    // Run migrations instead of using sync
    await runMigrations(sequelize);
    
    // Get migration status
    const migrationStatus = await getMigrationStatus(sequelize);
    if (migrationStatus.isUpToDate) {
      appLogger.info(`Database schema is up to date with ${migrationStatus.executed.length} migrations applied`);
      
      if (migrationStatus.lastExecuted) {
        appLogger.info(`Last applied migration: ${migrationStatus.lastExecuted}`);
      }
    } else {
      appLogger.warn(`Database has ${migrationStatus.pending.length} pending migrations`);
      
      // Log details of pending migrations
      migrationStatus.pending.forEach(pendingMigration => {
        appLogger.warn(`Pending migration details:`, {
          name: pendingMigration.name,
          path: pendingMigration.path
        });
      });
      
      // Attempt to run migrations
      const migrationResult = await runMigrations(sequelize);
      
      if (migrationResult.success) {
        appLogger.info('Migrations applied successfully');
      } else {
        appLogger.warn('Failed to apply migrations:', migrationResult.error);
      }
      
      // Recheck migration status after applying
      const updatedMigrationStatus = await getMigrationStatus(sequelize);
      if (updatedMigrationStatus.isUpToDate) {
        appLogger.info('All pending migrations successfully applied');
      } else {
        // If migrations are still pending, log details but continue
        appLogger.warn(`Still has ${updatedMigrationStatus.pending.length} pending migrations`);
        
        // Log details of remaining pending migrations
        updatedMigrationStatus.pending.forEach(pendingMigration => {
          appLogger.warn(`Remaining pending migration details:`, {
            name: pendingMigration.name,
            path: pendingMigration.path
          });
        });
      }
    }
    
    // Validate compatibility with Python implementation
    appLogger.info('Validating model compatibility...');
    const validation = await validateModelCompatibility(models, sequelize);
    
    if (!validation.isCompatible) {
      appLogger.warn('Schema compatibility issues detected:');
      validation.issues.forEach(issue => appLogger.warn(`- ${issue}`));
    } else {
      appLogger.info('Model validation successful - compatible with Python implementation');
    }
    
    appLogger.info('Database initialization complete');
    return true;
  } catch (error) {
    appLogger.error('Database initialization failed:', error);
    return false;
  }
};

// Attempt to initialize the database
(async () => {
  try {
    const result = await initializeDatabase();
    if (!result) {
      console.error('Database initialization failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('Unhandled database initialization error:', error);
    process.exit(1);
  }
})();

// Export models and Sequelize instance
export { 
  sequelize, 
  Entity, 
  Observation, 
  Relation, 
  SearchIndex, 
  initializeDatabase, 
  runMigrations, 
  getMigrationStatus 
};
