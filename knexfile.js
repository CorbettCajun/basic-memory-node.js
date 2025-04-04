// Update with your config settings.

/**
 * @type { Object<string, import('knex').Knex.Config> }
 */
export default {
  development: {
    client: 'pg',
    connection: {
      host: process.env.BASIC_MEMORY_DB_HOST || 'localhost',
      port: process.env.BASIC_MEMORY_DB_PORT || 5432,
      user: process.env.BASIC_MEMORY_DB_USER || 'postgres',
      password: process.env.BASIC_MEMORY_DB_PASSWORD || 'postgres',
      database: process.env.BASIC_MEMORY_DB_NAME || 'basic_memory'
    },
    migrations: {
      directory: './src/migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: './src/seeds'
    }
  },

  test: {
    client: 'sqlite3',
    connection: {
      filename: ':memory:'
    },
    useNullAsDefault: true,
    migrations: {
      directory: './src/migrations'
    },
    seeds: {
      directory: './src/seeds'
    }
  },

  production: {
    client: 'pg',
    connection: {
      host: process.env.BASIC_MEMORY_DB_HOST,
      port: process.env.BASIC_MEMORY_DB_PORT,
      user: process.env.BASIC_MEMORY_DB_USER,
      password: process.env.BASIC_MEMORY_DB_PASSWORD,
      database: process.env.BASIC_MEMORY_DB_NAME
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './src/migrations'
    },
    seeds: {
      directory: './src/seeds'
    }
  }
};
