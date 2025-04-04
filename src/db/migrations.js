/**
 * Database Migration Management for Basic Memory
 * 
 * Provides functionality for managing database schema migrations
 * Equivalent to the Python Alembic-based migration system
 */

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pino from 'pino';
import { getHomeDir } from './index.js';
import { Database } from 'sqlite3';

// Configure logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { 
      colorize: true,
      maxListeners: 1 
    }
  },
  base: null,
  timestamp: false
});

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the migrations directory path
 * @returns {string} Path to migrations directory
 */
function getMigrationsPath() {
  return path.join(__dirname, 'migrations');
}

/**
 * Get a sorted list of migration files
 * @returns {Promise<string[]>} Sorted list of migration files
 */
async function getMigrationFiles() {
  const migrationsPath = getMigrationsPath();
  
  try {
    const files = await fs.readdir(migrationsPath);
    
    // Filter and sort migration files
    return files
      .filter(file => file.endsWith('.sql') && file.startsWith('migration_'))
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    logger.error(`Error reading migrations: ${error.message}`);
    throw error;
  }
}

/**
 * Get database connection
 * @returns {Promise<Database>} SQLite database connection
 */
function getDbConnection() {
  const homeDir = getHomeDir();
  const dbPath = path.join(homeDir, 'basic-memory.db');
  
  return new Promise((resolve, reject) => {
    const db = new Database(dbPath, (err) => {
      if (err) {
        logger.error(`Database connection error: ${err.message}`);
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

/**
 * Run a single migration
 * @param {Database} db - Database connection
 * @param {string} migrationFile - Migration file to run
 * @returns {Promise<void>}
 */
async function runMigration(db, migrationFile) {
  const migrationsPath = getMigrationsPath();
  const filePath = path.join(migrationsPath, migrationFile);
  
  try {
    const migrationSql = await fs.readFile(filePath, 'utf8');
    
    return new Promise((resolve, reject) => {
      db.exec(migrationSql, (err) => {
        if (err) {
          logger.error(`Migration error in ${migrationFile}: ${err.message}`);
          reject(err);
        } else {
          logger.info(`Successfully applied migration: ${migrationFile}`);
          resolve();
        }
      });
    });
  } catch (error) {
    logger.error(`Error reading migration file ${migrationFile}: ${error.message}`);
    throw error;
  }
}

/**
 * Check if migrations table exists
 * @param {Database} db - Database connection
 * @returns {Promise<boolean>} Whether migrations table exists
 */
function checkMigrationsTableExists(db) {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='migrations'
    `, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(!!row);
      }
    });
  });
}

/**
 * Create migrations tracking table
 * @param {Database} db - Database connection
 * @returns {Promise<void>}
 */
function createMigrationsTable(db) {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get applied migrations
 * @param {Database} db - Database connection
 * @returns {Promise<string[]>} List of applied migration filenames
 */
function getAppliedMigrations(db) {
  return new Promise((resolve, reject) => {
    db.all('SELECT filename FROM migrations', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows.map(row => row.filename));
      }
    });
  });
}

/**
 * Mark migration as applied
 * @param {Database} db - Database connection
 * @param {string} migrationFile - Migration filename
 * @returns {Promise<void>}
 */
function markMigrationApplied(db, migrationFile) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO migrations (filename) VALUES (?)', 
      [migrationFile], 
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

/**
 * Upgrade database to the latest migration
 * @returns {Promise<void>}
 */
export async function upgradeDatabase() {
  logger.info('Starting database upgrade...');
  
  const db = await getDbConnection();
  
  try {
    // Ensure migrations table exists
    const migrationTableExists = await checkMigrationsTableExists(db);
    if (!migrationTableExists) {
      await createMigrationsTable(db);
    }
    
    // Get migration files and applied migrations
    const migrationFiles = await getMigrationFiles();
    const appliedMigrations = await getAppliedMigrations(db);
    
    // Find and apply pending migrations
    const pendingMigrations = migrationFiles.filter(
      file => !appliedMigrations.includes(file)
    );
    
    if (pendingMigrations.length === 0) {
      logger.info('Database is up to date');
      return;
    }
    
    // Run migrations in sequence
    for (const migrationFile of pendingMigrations) {
      await runMigration(db, migrationFile);
      await markMigrationApplied(db, migrationFile);
    }
    
    logger.info(`Successfully applied ${pendingMigrations.length} migrations`);
  } catch (error) {
    logger.error(`Database upgrade failed: ${error.message}`);
    throw error;
  } finally {
    db.close();
  }
}

/**
 * Reset database to base state
 * @returns {Promise<void>}
 */
export async function resetDatabase() {
  logger.info('Resetting database...');
  
  const db = await getDbConnection();
  
  try {
    // Drop all tables
    const tables = await new Promise((resolve, reject) => {
      db.all(
        "SELECT name FROM sqlite_master WHERE type='table'", 
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(row => row.name));
        }
      );
    });
    
    // Drop each table
    for (const table of tables) {
      await new Promise((resolve, reject) => {
        db.run(`DROP TABLE IF EXISTS ${table}`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    // Recreate migrations table
    await createMigrationsTable(db);
    
    // Run all migrations
    await upgradeDatabase();
    
    logger.info('Database reset complete');
  } catch (error) {
    logger.error(`Database reset failed: ${error.message}`);
    throw error;
  } finally {
    db.close();
  }
}

// Export as default for easier importing
export default { 
  upgradeDatabase, 
  resetDatabase 
};
