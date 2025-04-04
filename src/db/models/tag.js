/**
 * Tag Model
 * 
 * Defines the database model for entity tags
 */

import { Model, DataTypes } from 'sequelize';

/**
 * Tag model class
 * 
 * Represents a tag associated with an entity in the database
 */
export class TagModel extends Model {
  /**
   * Initialize the Tag model with Sequelize
   * 
   * @param {Object} sequelize - Sequelize instance
   * @returns {Model} Initialized Tag model
   */
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      entity_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'entities',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      }
    }, {
      sequelize,
      modelName: 'tag',
      tableName: 'tags',
      timestamps: true,
      underscored: true
    });
  }

  /**
   * Define model associations
   * 
   * @param {Object} models - Models object containing all models
   */
  static associate(models) {
    this.belongsTo(models.Entity, {
      foreignKey: 'entity_id',
      as: 'entity'
    });
  }
}

export default TagModel;
