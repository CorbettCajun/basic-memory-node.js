/**
 * Database configuration for Basic Memory
 * 
 * Sets up Sequelize ORM and initializes database models
 */

import { Sequelize } from 'sequelize';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync } from 'fs';
import pino from 'pino';
import { initModels, validateModelCompatibility } from './models.js';

// Configure logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Get home directory from environment or fallback to default
export const getHomeDir = () => {
  const home = process.env.BASIC_MEMORY_HOME || join(homedir(), 'basic-memory');
  logger.debug(`Using home directory: ${home}`);
  
  if (!existsSync(home)) {
    logger.info(`Creating home directory: ${home}`);
    mkdirSync(home, { recursive: true });
  }
  
  return home;
};

// Set up database path - can be directly specified or derived from home directory
const getDbPath = () => {
  // Check if a specific database path was provided
  if (process.env.BASIC_MEMORY_DB_PATH) {
    const dbPath = process.env.BASIC_MEMORY_DB_PATH;
    logger.info(`Using specified database path: ${dbPath}`);
    
    // Ensure the directory for the database exists
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
      logger.info(`Creating directory for database: ${dbDir}`);
      mkdirSync(dbDir, { recursive: true });
    }
    
    return dbPath;
  }
  
  // Default to the home directory
  const defaultPath = join(getHomeDir(), 'basic-memory.db');
  logger.debug(`Using default database path: ${defaultPath}`);
  return defaultPath;
};

const dbPath = getDbPath();

// Create Sequelize instance
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.SQL_LOGGING ? msg => logger.debug(msg) : false,
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
    // Sync models with database schema
    logger.info('Initializing database...');
    await sequelize.sync();
    
    // Validate compatibility with Python implementation
    logger.info('Validating model compatibility...');
    const validation = await validateModelCompatibility(models, sequelize);
    
    if (!validation.isCompatible) {
      logger.warn('Schema compatibility issues detected:');
      validation.issues.forEach(issue => logger.warn(`- ${issue}`));
    } else {
      logger.info('Model validation successful - compatible with Python implementation');
    }
    
    logger.info('Database initialization complete');
    return true;
  } catch (error) {
    logger.error('Database initialization failed:', error);
    return false;
  }
};

// Attempt to initialize the database
initializeDatabase();

// Export models and Sequelize instance
export { sequelize, Entity, Observation, Relation, SearchIndex };
