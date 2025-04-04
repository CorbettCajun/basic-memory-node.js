export const up = async (queryInterface) => {
    // Create entities table
    await queryInterface.createTable('entities', {
        id: {
            type: 'UUID',
            primaryKey: true,
            defaultValue: 'uuid_generate_v4()'
        },
        name: {
            type: 'VARCHAR(255)',
            allowNull: false
        },
        content: {
            type: 'TEXT',
            allowNull: true
        },
        metadata: {
            type: 'JSONB',
            allowNull: true
        },
        created_at: {
            type: 'TIMESTAMP',
            defaultValue: 'CURRENT_TIMESTAMP'
        },
        updated_at: {
            type: 'TIMESTAMP',
            defaultValue: 'CURRENT_TIMESTAMP'
        }
    });

    // Create relations table
    await queryInterface.createTable('relations', {
        id: {
            type: 'UUID',
            primaryKey: true,
            defaultValue: 'uuid_generate_v4()'
        },
        source_entity_id: {
            type: 'UUID',
            references: {
                model: 'entities',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        target_entity_id: {
            type: 'UUID',
            references: {
                model: 'entities',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        type: {
            type: 'VARCHAR(100)',
            allowNull: false
        },
        metadata: {
            type: 'JSONB',
            allowNull: true
        },
        created_at: {
            type: 'TIMESTAMP',
            defaultValue: 'CURRENT_TIMESTAMP'
        }
    });

    // Create indexes
    await queryInterface.addIndex('entities', ['name']);
    await queryInterface.addIndex('relations', ['source_entity_id', 'target_entity_id']);
};

export const down = async (queryInterface) => {
    await queryInterface.dropTable('relations');
    await queryInterface.dropTable('entities');
};
