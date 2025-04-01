/**
 * Migration: Update Schema for Python Compatibility
 * 
 * This migration updates the database schema to ensure 100% compatibility
 * with the Python implementation. It performs the following changes:
 * 
 * 1. Renames tables to match Python naming conventions (singular form)
 * 2. Adds missing columns required for Python compatibility
 * 3. Converts timestamps to be compatible with the Python implementation
 * 4. Renames the "links" table to "relation" to match Python
 */

import { Sequelize, DataTypes } from 'sequelize';
import pino from 'pino';
import path from 'path';
import fs from 'fs';

// Configure logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

/**
 * Run the migration on the specified database
 * @param {string} dbPath - Path to the SQLite database file
 * @returns {Promise<boolean>} - Whether the migration succeeded
 */
export const migrate = async (dbPath) => {
  // Validate the database path
  if (!dbPath || !fs.existsSync(dbPath)) {
    logger.error(`Database file not found at path: ${dbPath}`);
    return false;
  }

  logger.info(`Running Python compatibility migration on database: ${dbPath}`);
  
  // Create backup of the database before migration
  const backupPath = `${dbPath}.backup-${Date.now()}`;
  try {
    fs.copyFileSync(dbPath, backupPath);
    logger.info(`Created database backup at: ${backupPath}`);
  } catch (error) {
    logger.error(`Failed to create database backup: ${error.message}`);
    return false;
  }
  
  // Create Sequelize instance
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: msg => logger.debug(msg),
  });

  try {
    // Verify database connection
    await sequelize.authenticate();
    logger.info('Database connection established');
    
    // Get query interface for raw SQL operations
    const queryInterface = sequelize.getQueryInterface();
    
    // Get existing tables
    const tables = await queryInterface.showAllTables();
    logger.info(`Found existing tables: ${tables.join(', ')}`);
    
    // 1. Update Entity table
    if (tables.includes('entities')) {
      logger.info('Migrating Entity table...');
      
      // Check if the entity table already exists (to prevent duplicate tables)
      if (!tables.includes('entity')) {
        // Create new entity table with correct schema
        await queryInterface.createTable('entity', {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          title: {
            type: DataTypes.STRING,
            allowNull: false
          },
          permalink: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
          },
          content: {
            type: DataTypes.TEXT,
            allowNull: false
          },
          raw_content: {
            type: DataTypes.TEXT,
            allowNull: false
          },
          type: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'note'
          },
          entity_type: {
            type: DataTypes.STRING,
            allowNull: true
          },
          entity_metadata: {
            type: DataTypes.TEXT,
            allowNull: true
          },
          content_type: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: 'text/markdown'
          },
          checksum: {
            type: DataTypes.STRING,
            allowNull: true
          },
          attributes: {
            type: DataTypes.TEXT,
            allowNull: true
          },
          file_path: {
            type: DataTypes.STRING,
            allowNull: true
          },
          last_modified: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
          },
          created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
          }
        });
        
        // Copy data from old table to new table
        await sequelize.query(`
          INSERT INTO entity (
            id, title, permalink, content, raw_content, type, entity_type, 
            entity_metadata, content_type, checksum, attributes, file_path, 
            last_modified, created_at, updated_at
          )
          SELECT 
            id, title, permalink, content, raw_content, type, entity_type,
            entity_metadata, content_type, checksum, attributes, file_path,
            last_modified, createdAt, updatedAt
          FROM entities
        `);
        
        // Create indexes
        await queryInterface.addIndex('entity', ['permalink'], { unique: true });
        await queryInterface.addIndex('entity', ['type']);
        await queryInterface.addIndex('entity', ['title']);
        await queryInterface.addIndex('entity', ['entity_type']);
        await queryInterface.addIndex('entity', ['content_type']);
        await queryInterface.addIndex('entity', ['file_path']);
        await queryInterface.addIndex('entity', ['checksum']);
        
        // Drop old table (only if copy was successful)
        const entityCount = await sequelize.query('SELECT COUNT(*) as count FROM entity', 
          { type: sequelize.QueryTypes.SELECT });
        const entitiesCount = await sequelize.query('SELECT COUNT(*) as count FROM entities', 
          { type: sequelize.QueryTypes.SELECT });
        
        if (entityCount[0].count === entitiesCount[0].count) {
          await queryInterface.dropTable('entities');
          logger.info('Successfully migrated entities -> entity table');
        } else {
          logger.warn('Data count mismatch, keeping old entities table as backup');
        }
      } else {
        logger.info('Entity table already exists, skipping table creation');
        
        // Just update the schema if needed
        try {
          await queryInterface.describeTable('entity').then(tableDefinition => {
            const missingColumns = [];
            
            if (!tableDefinition.entity_metadata) missingColumns.push('entity_metadata');
            if (!tableDefinition.content_type) missingColumns.push('content_type');
            if (!tableDefinition.checksum) missingColumns.push('checksum');
            
            if (missingColumns.length > 0) {
              logger.info(`Adding missing columns to entity table: ${missingColumns.join(', ')}`);
              
              if (missingColumns.includes('entity_metadata')) {
                queryInterface.addColumn('entity', 'entity_metadata', {
                  type: DataTypes.TEXT,
                  allowNull: true
                });
              }
              
              if (missingColumns.includes('content_type')) {
                queryInterface.addColumn('entity', 'content_type', {
                  type: DataTypes.STRING,
                  allowNull: true,
                  defaultValue: 'text/markdown'
                });
              }
              
              if (missingColumns.includes('checksum')) {
                queryInterface.addColumn('entity', 'checksum', {
                  type: DataTypes.STRING,
                  allowNull: true
                });
              }
            }
          });
        } catch (error) {
          logger.error(`Error updating entity table: ${error.message}`);
        }
      }
    }
    
    // 2. Update Observation table
    if (tables.includes('observations')) {
      logger.info('Migrating Observation table...');
      
      if (!tables.includes('observation')) {
        // Create new observation table with correct schema
        await queryInterface.createTable('observation', {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          entity_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: 'entity',
              key: 'id'
            },
            onDelete: 'CASCADE'
          },
          content: {
            type: DataTypes.TEXT,
            allowNull: false
          },
          category: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'note'
          },
          context: {
            type: DataTypes.TEXT,
            allowNull: true
          },
          tags: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: '[]'
          },
          created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
          }
        });
        
        // Copy data from old table to new table
        await sequelize.query(`
          INSERT INTO observation (
            id, entity_id, content, category, context, tags, created_at
          )
          SELECT 
            id, entity_id, content, category, context, tags, 
            COALESCE(createdAt, CURRENT_TIMESTAMP) as created_at
          FROM observations
        `);
        
        // Create indexes
        await queryInterface.addIndex('observation', ['entity_id']);
        await queryInterface.addIndex('observation', ['category']);
        
        // Drop old table (only if copy was successful)
        const observationCount = await sequelize.query('SELECT COUNT(*) as count FROM observation', 
          { type: sequelize.QueryTypes.SELECT });
        const observationsCount = await sequelize.query('SELECT COUNT(*) as count FROM observations', 
          { type: sequelize.QueryTypes.SELECT });
        
        if (observationCount[0].count === observationsCount[0].count) {
          await queryInterface.dropTable('observations');
          logger.info('Successfully migrated observations -> observation table');
        } else {
          logger.warn('Data count mismatch, keeping old observations table as backup');
        }
      } else {
        logger.info('Observation table already exists, skipping table creation');
      }
    }
    
    // 3. Update Link/Relation table
    if (tables.includes('links')) {
      logger.info('Migrating Link/Relation table...');
      
      if (!tables.includes('relation')) {
        // Create new relation table with correct schema
        await queryInterface.createTable('relation', {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          source_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: 'entity',
              key: 'id'
            }
          },
          target_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: 'entity',
              key: 'id'
            }
          },
          to_name: {
            type: DataTypes.STRING,
            allowNull: true
          },
          type: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'reference'
          },
          context: {
            type: DataTypes.TEXT,
            allowNull: true
          },
          attributes: {
            type: DataTypes.TEXT,
            allowNull: true
          },
          created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
          }
        });
        
        // Copy data from old table to new table
        await sequelize.query(`
          INSERT INTO relation (
            id, source_id, target_id, to_name, type, context, attributes,
            created_at, updated_at
          )
          SELECT 
            id, source_id, target_id, to_name, type, context, attributes,
            COALESCE(createdAt, CURRENT_TIMESTAMP) as created_at,
            COALESCE(updatedAt, CURRENT_TIMESTAMP) as updated_at
          FROM links
        `);
        
        // Create indexes
        await queryInterface.addIndex('relation', ['source_id']);
        await queryInterface.addIndex('relation', ['target_id']);
        await queryInterface.addIndex('relation', ['type']);
        await queryInterface.addIndex('relation', ['to_name']);
        
        // Drop old table (only if copy was successful)
        const relationCount = await sequelize.query('SELECT COUNT(*) as count FROM relation', 
          { type: sequelize.QueryTypes.SELECT });
        const linksCount = await sequelize.query('SELECT COUNT(*) as count FROM links', 
          { type: sequelize.QueryTypes.SELECT });
        
        if (relationCount[0].count === linksCount[0].count) {
          await queryInterface.dropTable('links');
          logger.info('Successfully migrated links -> relation table');
        } else {
          logger.warn('Data count mismatch, keeping old links table as backup');
        }
      } else {
        logger.info('Relation table already exists, skipping table creation');
      }
    }
    
    // 4. Create SearchIndex table if it doesn't exist
    if (!tables.includes('search_index')) {
      logger.info('Creating SearchIndex table...');
      
      await queryInterface.createTable('search_index', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        entity_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'entity',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false
        },
        content_type: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'text'
        },
        indexed_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        }
      });
      
      // Create indexes
      await queryInterface.addIndex('search_index', ['entity_id']);
      await queryInterface.addIndex('search_index', ['content_type']);
      
      logger.info('Successfully created search_index table');
    }
    
    // Close the connection
    await sequelize.close();
    
    logger.info('Migration completed successfully');
    return true;
  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    logger.error(error.stack);
    
    try {
      await sequelize.close();
    } catch (closeError) {
      logger.error(`Error closing connection: ${closeError.message}`);
    }
    
    return false;
  }
};

/**
 * Command line interface for running the migration directly
 */
if (require.main === module) {
  // Get database path from command line arguments or environment
  const dbPath = process.argv[2] || process.env.BASIC_MEMORY_DB_PATH;
  
  if (!dbPath) {
    logger.error('No database path provided. Usage: node update-schema-for-python-compatibility.js <db_path>');
    process.exit(1);
  }
  
  migrate(dbPath)
    .then(success => {
      if (success) {
        logger.info('Migration completed successfully');
        process.exit(0);
      } else {
        logger.error('Migration failed');
        process.exit(1);
      }
    })
    .catch(error => {
      logger.error(`Unhandled error: ${error.message}`);
      process.exit(1);
    });
}
