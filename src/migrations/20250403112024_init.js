const tableName = 'migrations';

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Create migrations table
  await knex.schema.createTable(tableName, (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.timestamp('applied_at').defaultTo(knex.fn.now());
  });

  // Create core tables
  await knex.schema.createTable('entities', (table) => {
    table.uuid('id').primary();
    table.string('type').notNullable();
    table.jsonb('data').notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('relationships', (table) => {
    table.uuid('id').primary();
    table.uuid('source_id').references('id').inTable('entities').onDelete('CASCADE');
    table.uuid('target_id').references('id').inTable('entities').onDelete('CASCADE');
    table.string('type').notNullable();
    table.jsonb('data').notNullable();
    table.timestamps(true, true);
  });
}

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('relationships');
  await knex.schema.dropTableIfExists('entities');
  await knex.schema.dropTableIfExists(tableName);
}
