/**
 * Entity and Relationship Models for Basic Memory
 * 
 * These models are designed to be 100% compatible with the Python implementation.
 * Any changes to these models must be verified against the Python schema to ensure
 * perfect cross-implementation compatibility.
 */

import { Sequelize, DataTypes, Model } from 'sequelize';
import pino from 'pino';

// Configure logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

/**
 * Initialize all models and their relationships
 * @param {Sequelize} sequelize - Sequelize instance
 * @returns {Object} Object containing all initialized models
 */
export const initModels = (sequelize) => {
  // Define Entity model (matches Python 'entity' table)
  class Entity extends Model {
    /**
     * Helper method to define associations
     * This method is called automatically by Sequelize
     */
    static associate(models) {
      // Define relationships
      Entity.hasMany(models.Observation, { foreignKey: 'entity_id', as: 'observations' });
      Entity.hasMany(models.Relation, { foreignKey: 'source_id', as: 'outgoingRelations' });
      Entity.hasMany(models.Relation, { foreignKey: 'target_id', as: 'incomingRelations' });
    }

    /**
     * Convert Entity instance to JSON representation
     * Ensures compatibility with Python serialization format
     */
    toJSON() {
      const values = { ...this.get() };
      
      // Parse JSON fields if they're stored as strings
      if (typeof values.entity_metadata === 'string') {
        values.entity_metadata = JSON.parse(values.entity_metadata);
      }
      
      if (typeof values.attributes === 'string') {
        values.attributes = JSON.parse(values.attributes);
      }
      
      return values;
    }
  }

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
    },
    // Using TIMESTAMP types to match Python implementation exactly
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at' // Explicit field name to ensure snake_case in DB
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at' // Explicit field name to ensure snake_case in DB
    }
  }, {
    sequelize,
    modelName: 'Entity',
    tableName: 'entity', // Match Python table name exactly (singular)
    underscored: true, // Use snake_case for automatically created fields
    timestamps: true, // Enable timestamps
    createdAt: 'created_at', // Map createdAt to created_at
    updatedAt: 'updated_at', // Map updatedAt to updated_at
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

  // Define Observation model (matches Python 'observation' table)
  class Observation extends Model {
    static associate(models) {
      Observation.belongsTo(models.Entity, { foreignKey: 'entity_id' });
    }

    toJSON() {
      const values = { ...this.get() };
      
      // Parse JSON fields if they're stored as strings
      if (typeof values.tags === 'string') {
        values.tags = JSON.parse(values.tags);
      }
      
      return values;
    }
  }

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
        model: 'entity', // Reference the exact table name
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
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    sequelize,
    modelName: 'Observation',
    tableName: 'observation', // Match Python table name exactly (singular)
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // No updatedAt field in Python observation table
    indexes: [
      { fields: ['entity_id'] },
      { fields: ['category'] }
    ]
  });

  // Define Relation model (matches Python 'relation' table)
  class Relation extends Model {
    static associate(models) {
      Relation.belongsTo(models.Entity, { foreignKey: 'source_id', as: 'source' });
      Relation.belongsTo(models.Entity, { foreignKey: 'target_id', as: 'target' });
    }

    toJSON() {
      const values = { ...this.get() };
      
      // Parse JSON fields if they're stored as strings
      if (typeof values.attributes === 'string') {
        values.attributes = JSON.parse(values.attributes);
      }
      
      return values;
    }
  }

  Relation.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    source_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'entity', // Reference the exact table name
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
      allowNull: true,
      get() {
        const value = this.getDataValue('attributes');
        return value ? JSON.parse(value) : {};
      },
      set(value) {
        this.setDataValue('attributes', JSON.stringify(value || {}));
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  }, {
    sequelize,
    modelName: 'Relation',
    tableName: 'relation', // Match Python table name exactly (singular)
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['source_id'] },
      { fields: ['target_id'] },
      { fields: ['type'] },
      { fields: ['to_name'] }
    ]
  });

  // Search Index model (matches Python search index tables)
  class SearchIndex extends Model {}

  SearchIndex.init({
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
  }, {
    sequelize,
    modelName: 'SearchIndex',
    tableName: 'search_index',
    timestamps: false,
    indexes: [
      { fields: ['entity_id'] },
      { fields: ['content_type'] }
    ]
  });

  // Define associations
  const models = {
    Entity,
    Observation,
    Relation,
    SearchIndex
  };

  // Call associate method on each model if it exists
  Object.values(models)
    .filter(model => typeof model.associate === 'function')
    .forEach(model => model.associate(models));

  return models;
};

/**
 * Validate model compatibility against expected Python schema
 * @param {Object} models - Initialized models
 * @param {Boolean} throwOnError - Whether to throw an error on incompatibility
 * @returns {Object} Validation results
 */
export const validateModelCompatibility = async (models, sequelize, throwOnError = false) => {
  const validation = {
    isCompatible: true,
    issues: []
  };

  try {
    // Get all table definitions
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    
    // Verify required tables exist
    const requiredTables = ['entity', 'observation', 'relation', 'search_index'];
    for (const table of requiredTables) {
      if (!tables.includes(table)) {
        validation.isCompatible = false;
        validation.issues.push(`Missing required table: ${table}`);
      }
    }

    // Verify table structures
    for (const table of tables) {
      if (requiredTables.includes(table)) {
        const tableInfo = await queryInterface.describeTable(table);
        
        // Check for required columns
        switch (table) {
          case 'entity':
            if (!tableInfo.entity_metadata) {
              validation.isCompatible = false;
              validation.issues.push(`Missing required column 'entity_metadata' in 'entity' table`);
            }
            if (!tableInfo.content_type) {
              validation.isCompatible = false;
              validation.issues.push(`Missing required column 'content_type' in 'entity' table`);
            }
            if (!tableInfo.checksum) {
              validation.isCompatible = false;
              validation.issues.push(`Missing required column 'checksum' in 'entity' table`);
            }
            break;
            
          case 'relation':
            if (!tableInfo.to_name) {
              validation.isCompatible = false;
              validation.issues.push(`Missing required column 'to_name' in 'relation' table`);
            }
            if (!tableInfo.context) {
              validation.isCompatible = false;
              validation.issues.push(`Missing required column 'context' in 'relation' table`);
            }
            break;
        }
      }
    }
    
    if (!validation.isCompatible && throwOnError) {
      throw new Error(`Schema incompatibility detected: ${validation.issues.join(', ')}`);
    }
    
    return validation;
  } catch (error) {
    logger.error('Error validating model compatibility:', error);
    validation.isCompatible = false;
    validation.issues.push(error.message);
    
    if (throwOnError) {
      throw error;
    }
    
    return validation;
  }
};

export default { initModels, validateModelCompatibility };
