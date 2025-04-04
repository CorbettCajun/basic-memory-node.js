/**
 * Relation Model
 * 
 * Defines the database model for entity relationships
 */

import { Model, DataTypes } from 'sequelize';

/**
 * Relation model class
 * 
 * Represents a relationship between two entities in the database
 */
export class RelationModel extends Model {
  /**
   * Initialize the Relation model with Sequelize
   * 
   * @param {Object} sequelize - Sequelize instance
   * @returns {Model} Initialized Relation model
   */
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      source_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'entities',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      target_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'entities',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      relation_type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'link'
      }
    }, {
      sequelize,
      modelName: 'relation',
      tableName: 'relations',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: 'relations_source_target_type_unique',
          unique: true,
          fields: ['source_id', 'target_id', 'relation_type']
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
    this.belongsTo(models.Entity, {
      foreignKey: 'source_id',
      as: 'source'
    });
    
    this.belongsTo(models.Entity, {
      foreignKey: 'target_id',
      as: 'target'
    });
  }
}

export default RelationModel;
