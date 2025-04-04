/**
 * Initial database schema migration for Basic Memory Node.js
 * 
 * Creates all the tables required for the Basic Memory system:
 * - entities
 * - relations
 * - observations
 * - tags
 * - search_index
 * 
 * Matches the schema used in the Python implementation
 */

export const up = async (queryInterface) => {
  const { Sequelize } = queryInterface.sequelize;
  const DataTypes = Sequelize.DataTypes;

  // Create Entity table
  await queryInterface.createTable('entities', {
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
      allowNull: true,
      unique: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    content_hash: {
      type: DataTypes.STRING,
      allowNull: true
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: true
    },
    metadata: {
      type: DataTypes.TEXT, // JSON stored as text
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  });

  // Create index on title for faster lookups
  await queryInterface.addIndex('entities', ['title']);

  // Create Relations table
  await queryInterface.createTable('relations', {
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
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  });

  // Create unique index on source, target, and type to prevent duplicates
  await queryInterface.addIndex('relations', ['source_id', 'target_id', 'relation_type'], {
    unique: true,
    name: 'relations_source_target_type_unique'
  });

  // Create Observations table (for potential future use)
  await queryInterface.createTable('observations', {
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
    observation_type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    data: {
      type: DataTypes.TEXT, // JSON stored as text
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  });

  // Create Tags table
  await queryInterface.createTable('tags', {
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
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  });

  // Create unique index on entity_id and name to prevent duplicate tags
  await queryInterface.addIndex('tags', ['entity_id', 'name'], {
    unique: true,
    name: 'tags_entity_id_name_unique'
  });

  // Create index on name for faster lookups
  await queryInterface.addIndex('tags', ['name']);

  // Create Search Index table
  await queryInterface.createTable('search_indices', {
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
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  });

  // Create index on term for faster searches
  await queryInterface.addIndex('search_indices', ['term']);

  // Create index on entity_id for faster lookups
  await queryInterface.addIndex('search_indices', ['entity_id']);

  console.log('Initial schema migration complete');
};

export const down = async (queryInterface) => {
  // Drop tables in reverse order to respect foreign key constraints
  await queryInterface.dropTable('search_indices');
  await queryInterface.dropTable('tags');
  await queryInterface.dropTable('observations');
  await queryInterface.dropTable('relations');
  await queryInterface.dropTable('entities');
  
  console.log('Rolled back initial schema migration');
};
