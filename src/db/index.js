/**
 * Database configuration and models for Basic Memory
 * 
 * Sets up Sequelize ORM and defines database models
 */

import { Sequelize, DataTypes, Model } from 'sequelize';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync } from 'fs';
import pino from 'pino';

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
    timestamps: true
  }
});

// Define Entity model
class Entity extends Model {}
Entity.init({
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
    allowNull: true,
    get() {
      const value = this.getDataValue('entity_metadata');
      return value ? JSON.parse(value) : null;
    },
    set(value) {
      this.setDataValue('entity_metadata', value ? JSON.stringify(value) : null);
    }
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
    allowNull: true,
    get() {
      const value = this.getDataValue('attributes');
      return value ? JSON.parse(value) : {};
    },
    set(value) {
      this.setDataValue('attributes', JSON.stringify(value || {}));
    }
  },
  file_path: {
    type: DataTypes.STRING,
    allowNull: true
  },
  last_modified: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Entity',
  tableName: 'entities',
  indexes: [
    { unique: true, fields: ['permalink'] },
    { fields: ['type'] },
    { fields: ['title'] },
    { fields: ['entity_type'] },
    { fields: ['content_type'] },
    { fields: ['file_path'] },
    { fields: ['checksum'] }
  ]
});

// Define Observation model
class Observation extends Model {}
Observation.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  entity_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Entity,
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
    defaultValue: '[]',
    get() {
      const value = this.getDataValue('tags');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('tags', JSON.stringify(value || []));
    }
  }
}, {
  sequelize,
  modelName: 'Observation',
  tableName: 'observations',
  timestamps: false,
  indexes: [
    { fields: ['entity_id'] },
    { fields: ['category'] }
  ]
});

// Define Link model
class Link extends Model {}
Link.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  source_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Entity,
      key: 'id'
    }
  },
  target_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Entity,
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
    allowNull: true,
    get() {
      const value = this.getDataValue('attributes');
      return value ? JSON.parse(value) : {};
    },
    set(value) {
      this.setDataValue('attributes', JSON.stringify(value || {}));
    }
  }
}, {
  sequelize,
  modelName: 'Link',
  tableName: 'links',
  indexes: [
    { fields: ['source_id'] },
    { fields: ['target_id'] },
    { fields: ['type'] },
    { fields: ['to_name'] },
    { unique: true, fields: ['source_id', 'target_id', 'type'], name: 'uix_link_source_target_type' },
    { unique: true, fields: ['source_id', 'to_name', 'type'], name: 'uix_link_source_name_type' }
  ]
});

// Define relationships
Entity.hasMany(Link, { foreignKey: 'source_id', as: 'outgoing_links' });
Entity.hasMany(Link, { foreignKey: 'target_id', as: 'incoming_links' });
Link.belongsTo(Entity, { foreignKey: 'source_id', as: 'source' });
Link.belongsTo(Entity, { foreignKey: 'target_id', as: 'target' });

// Add Observation relationship
Entity.hasMany(Observation, { foreignKey: 'entity_id', as: 'observations' });
Observation.belongsTo(Entity, { foreignKey: 'entity_id', as: 'entity' });

// Initialize database
export const initializeDatabase = async () => {
  try {
    logger.info('Initializing database...');
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    
    // Sync models with database
    await sequelize.sync();
    logger.info('Database models synchronized');
    
    return { sequelize, Entity, Link, Observation };
  } catch (error) {
    logger.error(`Database initialization failed: ${error.message}`);
    throw error;
  }
};

// Export models and Sequelize instance
export { sequelize, Entity, Link, Observation };
