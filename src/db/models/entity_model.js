/**
 * Entity Database Model
 * 
 * Defines the database model for entities, which represent notes and documents in the system
 */

import { Model, DataTypes } from 'sequelize';

/**
 * EntityModel class
 * 
 * Represents an entity in the database with associated metadata
 */
export class EntityModel extends Model {
  /**
   * Initialize the Entity model with Sequelize
   * 
   * @param {Object} sequelize - Sequelize instance
   * @returns {Model} Initialized Entity model
   */
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
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
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'note'
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {}
      },
      file_path: {
        type: DataTypes.STRING,
        allowNull: true
      },
      hash: {
        type: DataTypes.STRING,
        allowNull: true
      }
    }, {
      sequelize,
      modelName: 'entity',
      tableName: 'entities',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: 'idx_entities_permalink',
          unique: true,
          fields: ['permalink']
        },
        {
          name: 'idx_entities_title',
          fields: ['title']
        },
        {
          name: 'idx_entities_type',
          fields: ['type']
        }
      ]
    });
  }

  /**
   * Define model associations
   * 
   * @param {Object} models - Models object containing all models
   */
  static associate(models) {
    this.hasMany(models.Tag, {
      foreignKey: 'entity_id',
      as: 'tags'
    });

    this.hasMany(models.SearchIndex, {
      foreignKey: 'entity_id',
      as: 'searchIndices'
    });

    this.hasMany(models.Relation, {
      foreignKey: 'source_id',
      as: 'outgoingRelations'
    });

    this.hasMany(models.Relation, {
      foreignKey: 'target_id',
      as: 'incomingRelations'
    });
  }
}

export default EntityModel;
