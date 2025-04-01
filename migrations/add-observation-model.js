/**
 * Migration script to add the Observation model and update Entity and Link models
 * for compatibility with the Python implementation
 * 
 * IMPORTANT: This migration adapts the Node.js implementation to match the Python implementation exactly.
 * The Python implementation is considered the reference implementation and remains unchanged.
 */

import { Sequelize, DataTypes } from 'sequelize';
import pino from 'pino';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Configure logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const runMigration = async (dbPath) => {
  logger.info(`Running migration on database: ${dbPath}`);
  logger.info('This migration adapts the Node.js implementation to match the Python schema exactly');
  
  try {
    // Connect to the database
    const sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: dbPath,
      logging: process.env.SQL_LOGGING ? msg => logger.debug(msg) : false
    });
    
    await sequelize.authenticate();
    logger.info('Database connection established');
    
    // Start a transaction
    const transaction = await sequelize.transaction();
    
    try {
      // 1. Add new columns to Entity table to match Python's entity table
      logger.info('Adding new columns to Entity table to match Python implementation...');
      await sequelize.query(`
        ALTER TABLE entities ADD COLUMN entity_type TEXT;
        ALTER TABLE entities ADD COLUMN entity_metadata TEXT;
        ALTER TABLE entities ADD COLUMN content_type TEXT DEFAULT 'text/markdown';
        ALTER TABLE entities ADD COLUMN checksum TEXT;
      `, { transaction });
      
      // 2. Add new columns to Link table to match Python's relation table
      logger.info('Adding new columns to Link table to match Python implementation...');
      await sequelize.query(`
        ALTER TABLE links ADD COLUMN to_name TEXT;
        ALTER TABLE links ADD COLUMN context TEXT;
      `, { transaction });
      
      // 3. Create Observation table to match Python implementation
      logger.info('Creating Observation table to match Python implementation...');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS observations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entity_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'note',
          context TEXT,
          tags TEXT DEFAULT '[]',
          FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS ix_observation_entity_id ON observations(entity_id);
        CREATE INDEX IF NOT EXISTS ix_observation_category ON observations(category);
      `, { transaction });
      
      // 4. Create new indexes to match Python implementation
      logger.info('Creating new indexes to match Python implementation...');
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS ix_entity_entity_type ON entities(entity_type);
        CREATE INDEX IF NOT EXISTS ix_entity_content_type ON entities(content_type);
        CREATE INDEX IF NOT EXISTS ix_entity_checksum ON entities(checksum);
        
        CREATE INDEX IF NOT EXISTS ix_link_to_name ON links(to_name);
        CREATE UNIQUE INDEX IF NOT EXISTS uix_link_source_target_type ON links(source_id, target_id, type);
        CREATE UNIQUE INDEX IF NOT EXISTS uix_link_source_name_type ON links(source_id, to_name, type);
      `, { transaction });
      
      // Commit the transaction if everything succeeds
      await transaction.commit();
      logger.info('Migration completed successfully');
      logger.info('Node.js database schema now compatible with Python implementation');
      
    } catch (error) {
      // Rollback the transaction if any step fails
      await transaction.rollback();
      logger.error(`Migration failed: ${error.message}`);
      throw error;
    } finally {
      // Close the connection
      await sequelize.close();
    }
    
  } catch (error) {
    logger.error(`Database error: ${error.message}`);
    throw error;
  }
};

// Main function to run the migration
const main = async () => {
  try {
    const dbPath = process.argv[2];
    
    if (!dbPath) {
      logger.error('No database path provided');
      logger.info('Usage: node migrations/add-observation-model.js <path-to-db>');
      process.exit(1);
    }
    
    await runMigration(dbPath);
    logger.info('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    process.exit(1);
  }
};

// Run the migration
main();
