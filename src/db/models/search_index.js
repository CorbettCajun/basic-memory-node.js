/**
 * Search Index Model
 * 
 * Defines the database model for search indexing
 */

import { Model, DataTypes } from 'sequelize';

/**
 * SearchIndex model class
 * 
 * Represents search index entries for efficient content searching
 */
export class SearchIndexModel extends Model {
  /**
   * Initialize the SearchIndex model with Sequelize
   * 
   * @param {Object} sequelize - Sequelize instance
   * @returns {Model} Initialized SearchIndex model
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
      term: {
        type: DataTypes.STRING,
        allowNull: false
      },
      position: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      field: {
        type: DataTypes.STRING,
        allowNull: false
      }
    }, {
      sequelize,
      modelName: 'search_index',
      tableName: 'search_indices',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: 'idx_search_indices_term',
          fields: ['term']
        },
        {
          name: 'idx_search_indices_entity_id',
          fields: ['entity_id']
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
      foreignKey: 'entity_id',
      as: 'entity'
    });
  }
}

export default SearchIndexModel;
