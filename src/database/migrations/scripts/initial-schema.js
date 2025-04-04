const chalk = require('chalk');

module.exports = {
  /**
   * Upgrade database schema
   * @param {Object} context - Migration context
   */
  async up(context) {
    const { database } = context;

    try {
      // Create entities table
      await database.schema.createTable('entities', (table) => {
        table.uuid('id').primary();
        table.string('name').notNullable();
        table.text('description');
        table.string('type').notNullable();
        table.jsonb('metadata').defaultTo('{}');
        table.timestamp('created_at').defaultTo(database.fn.now());
        table.timestamp('updated_at').defaultTo(database.fn.now());
      });

      // Create relationships table
      await database.schema.createTable('relationships', (table) => {
        table.uuid('id').primary();
        table.uuid('source_entity_id').references('entities.id');
        table.uuid('target_entity_id').references('entities.id');
        table.string('type').notNullable();
        table.jsonb('metadata').defaultTo('{}');
        table.timestamp('created_at').defaultTo(database.fn.now());
      });

      console.log(chalk.green('Initial database schema created successfully'));
    } catch (error) {
      console.error(chalk.red('Failed to create initial schema:'), error);
      throw error;
    }
  },

  /**
   * Downgrade database schema
   * @param {Object} context - Migration context
   */
  async down(context) {
    const { database } = context;

    try {
      // Drop tables in reverse order of creation
      await database.schema.dropTableIfExists('relationships');
      await database.schema.dropTableIfExists('entities');

      console.log(chalk.green('Initial database schema dropped successfully'));
    } catch (error) {
      console.error(chalk.red('Failed to drop initial schema:'), error);
      throw error;
    }
  }
};
