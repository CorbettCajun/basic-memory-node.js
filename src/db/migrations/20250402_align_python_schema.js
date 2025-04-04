/**
 * Migration Script: Align Node.js Schema with Python Implementation
 * 
 * Purpose: Ensure 100% database schema compatibility between 
 * Node.js and Python implementations of Basic Memory
 * 
 * Generated: 2025-04-02
 */

import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';

export async function migrate(sequelize) {
  const transaction = await sequelize.transaction();

  try {
    // 1. Update Entity Table
    await sequelize.queryInterface.addColumn('entities', 'entity_metadata', {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Metadata for the entity, matching Python implementation'
    }, { transaction });

    await sequelize.queryInterface.addColumn('entities', 'content_type', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'note',
      comment: 'Content type of the entity'
    }, { transaction });

    await sequelize.queryInterface.addColumn('entities', 'checksum', {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Checksum for content verification'
    }, { transaction });

    // 2. Create Observation Table (if not exists)
    await sequelize.queryInterface.createTable('observations', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      entity_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'entities',
          key: 'id'
        },
        allowNull: false
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Note'
      },
      context: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, { transaction });

    // 3. Create Search Index Tables
    const searchIndexTables = [
      'search_index', 
      'search_index_data', 
      'search_index_idx', 
      'search_index_content', 
      'search_index_docsize', 
      'search_index_config'
    ];

    for (const tableName of searchIndexTables) {
      await sequelize.queryInterface.createTable(tableName, {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        // Generic columns - adjust based on exact Python schema
        name: {
          type: DataTypes.STRING,
          allowNull: true
        },
        data: {
          type: DataTypes.JSONB,
          allowNull: true
        }
      }, { transaction });
    }

    // 4. Add Indexes for Performance
    await sequelize.queryInterface.addIndex('entities', ['permalink'], {
      unique: true,
      name: 'idx_entities_permalink',
      transaction
    });

    await sequelize.queryInterface.addIndex('observations', ['entity_id'], {
      name: 'idx_observations_entity_id',
      transaction
    });

    // Commit transaction
    await transaction.commit();

    console.log('✅ Schema migration completed successfully');
  } catch (error) {
    // Rollback transaction if any step fails
    await transaction.rollback();
    console.error('❌ Schema migration failed:', error);
    throw error;
  }
}

// Optional: Add a rollback method for this migration
export async function rollback(sequelize) {
  const transaction = await sequelize.transaction();

  try {
    // Remove added columns
    await sequelize.queryInterface.removeColumn('entities', 'entity_metadata', { transaction });
    await sequelize.queryInterface.removeColumn('entities', 'content_type', { transaction });
    await sequelize.queryInterface.removeColumn('entities', 'checksum', { transaction });

    // Drop created tables
    const tablesToDrop = [
      'observations', 
      'search_index', 
      'search_index_data', 
      'search_index_idx', 
      'search_index_content', 
      'search_index_docsize', 
      'search_index_config'
    ];

    for (const tableName of tablesToDrop) {
      await sequelize.queryInterface.dropTable(tableName, { transaction });
    }

    await transaction.commit();
    console.log('✅ Migration rollback completed successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

// Automatically run migration if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.resolve(__dirname, '../../../basic-memory.db')
  });

  migrate(sequelize)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
