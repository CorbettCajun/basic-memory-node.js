/**
 * Initialize test databases for compatibility testing
 * 
 * This script creates minimal databases for both Python and Node.js implementations
 * that can be used to test our schema compatibility verification tools.
 */

import { Sequelize, DataTypes } from 'sequelize';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import pino from 'pino';
import { execSync } from 'child_process';

// Create a logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to test directory for databases
const TEST_DIR = join(__dirname, '..', 'test-compatibility');
if (!existsSync(TEST_DIR)) {
  mkdirSync(TEST_DIR, { recursive: true });
}

// Database paths
const NODEJS_DB_PATH = join(TEST_DIR, 'nodejs-test.db');
const PYTHON_SCRIPT_PATH = join(TEST_DIR, 'create_python_test_db.py');
const PYTHON_DB_PATH = join(TEST_DIR, 'python-test.db');

/**
 * Initialize Node.js test database
 */
async function initNodeJsDatabase() {
  logger.info(`Creating Node.js test database at: ${NODEJS_DB_PATH}`);
  
  // Create Sequelize instance
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: NODEJS_DB_PATH,
    logging: false
  });
  
  // Define Entity model (based on the Node.js implementation)
  const Entity = sequelize.define('Entity', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    permalink: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    raw_content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'note'
    },
    attributes: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('attributes');
        return value ? JSON.parse(value) : {};
      },
      set(value) {
        this.setDataValue('attributes', JSON.stringify(value || {}));
      }
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: true
    },
    last_modified: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'entities',
    indexes: [
      { unique: true, fields: ['permalink'] },
      { fields: ['type'] },
      { fields: ['title'] }
    ]
  });
  
  // Define Link model (equivalent to Relation in Python)
  const Link = sequelize.define('Link', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    source_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'entities',
        key: 'id'
      }
    },
    target_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'entities',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'reference'
    },
    attributes: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('attributes');
        return value ? JSON.parse(value) : {};
      },
      set(value) {
        this.setDataValue('attributes', JSON.stringify(value || {}));
      }
    }
  }, {
    tableName: 'links',
    indexes: [
      { fields: ['source_id'] },
      { fields: ['target_id'] },
      { fields: ['type'] }
    ]
  });
  
  // Sync models with database
  await sequelize.sync({ force: true });
  
  // Add a test entity
  await Entity.create({
    title: 'Test Entity',
    permalink: 'test-entity',
    content: 'This is a test entity',
    raw_content: 'This is a test entity',
    type: 'note',
    attributes: { tag: 'test' },
    file_path: '/test/test-entity.md',
    last_modified: new Date()
  });
  
  logger.info('Node.js test database initialized successfully');
  await sequelize.close();
}

/**
 * Create Python script to initialize test database
 */
async function createPythonDbScript() {
  logger.info(`Creating Python database creation script at: ${PYTHON_SCRIPT_PATH}`);
  
  const scriptContent = `
import sqlite3
import os
import json
from datetime import datetime

# Database path
db_path = "${PYTHON_DB_PATH.replace(/\\/g, '/')}"

# Create database directory if it doesn't exist
os.makedirs(os.path.dirname(db_path), exist_ok=True)

# Connect to database and create tables
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Create entity table
cursor.execute('''
CREATE TABLE entity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_metadata TEXT,
    content_type TEXT NOT NULL,
    permalink TEXT,
    file_path TEXT UNIQUE,
    checksum TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
)
''')

# Create indexes
cursor.execute('CREATE INDEX ix_entity_type ON entity(entity_type)')
cursor.execute('CREATE INDEX ix_entity_title ON entity(title)')
cursor.execute('CREATE INDEX ix_entity_created_at ON entity(created_at)')
cursor.execute('CREATE INDEX ix_entity_updated_at ON entity(updated_at)')
cursor.execute('CREATE INDEX ix_entity_permalink ON entity(permalink)')
cursor.execute('CREATE INDEX ix_entity_file_path ON entity(file_path)')

# Create observation table
cursor.execute('''
CREATE TABLE observation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    context TEXT,
    tags TEXT,
    FOREIGN KEY (entity_id) REFERENCES entity(id) ON DELETE CASCADE
)
''')

# Create indexes
cursor.execute('CREATE INDEX ix_observation_entity_id ON observation(entity_id)')
cursor.execute('CREATE INDEX ix_observation_category ON observation(category)')

# Create relation table
cursor.execute('''
CREATE TABLE relation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_id INTEGER NOT NULL,
    to_id INTEGER,
    to_name TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    context TEXT,
    FOREIGN KEY (from_id) REFERENCES entity(id) ON DELETE CASCADE,
    FOREIGN KEY (to_id) REFERENCES entity(id) ON DELETE CASCADE
)
''')

# Create indexes
cursor.execute('CREATE INDEX ix_relation_type ON relation(relation_type)')
cursor.execute('CREATE INDEX ix_relation_from_id ON relation(from_id)')
cursor.execute('CREATE INDEX ix_relation_to_id ON relation(to_id)')
cursor.execute('CREATE UNIQUE INDEX uix_relation_from_id_to_id ON relation(from_id, to_id, relation_type)')
cursor.execute('CREATE UNIQUE INDEX uix_relation_from_id_to_name ON relation(from_id, to_name, relation_type)')

# Create FTS5 virtual table for search
cursor.execute('''
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
    id UNINDEXED,
    title,
    content_stems,
    content_snippet,
    permalink,
    file_path UNINDEXED,
    type UNINDEXED,
    from_id UNINDEXED,
    to_id UNINDEXED,
    relation_type UNINDEXED,
    entity_id UNINDEXED,
    category UNINDEXED,
    metadata UNINDEXED,
    created_at UNINDEXED,
    updated_at UNINDEXED,
    tokenize='unicode61 tokenchars 0x2F',
    prefix='1,2,3,4'
)
''')

# Insert test data
now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
metadata = json.dumps({"tag": "test"})

# Insert test entity
cursor.execute('''
INSERT INTO entity (
    title, entity_type, entity_metadata, content_type, 
    permalink, file_path, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
''', (
    'Test Entity', 'note', metadata, 'text/markdown',
    'test-entity', '/test/test-entity.md', now, now
))

entity_id = cursor.lastrowid

# Insert test observation
cursor.execute('''
INSERT INTO observation (
    entity_id, content, category, tags
) VALUES (?, ?, ?, ?)
''', (
    entity_id, 'This is a test observation', 'note', json.dumps(['test'])
))

# Insert test relation
cursor.execute('''
INSERT INTO entity (
    title, entity_type, entity_metadata, content_type, 
    permalink, file_path, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
''', (
    'Related Entity', 'note', metadata, 'text/markdown',
    'related-entity', '/test/related-entity.md', now, now
))

related_id = cursor.lastrowid

cursor.execute('''
INSERT INTO relation (
    from_id, to_id, to_name, relation_type
) VALUES (?, ?, ?, ?)
''', (
    entity_id, related_id, 'Related Entity', 'references'
))

# Commit changes and close
conn.commit()
conn.close()

print("Python test database initialized successfully")
  `;
  
  // Write script content to file
  const fs = await import('fs/promises');
  await fs.writeFile(PYTHON_SCRIPT_PATH, scriptContent);
}

/**
 * Run Python script to create test database
 */
function runPythonScript() {
  logger.info(`Running Python script to create test database at: ${PYTHON_DB_PATH}`);
  try {
    execSync(`python "${PYTHON_SCRIPT_PATH}"`, { stdio: 'inherit' });
    logger.info('Python test database created successfully');
    return true;
  } catch (error) {
    logger.error(`Failed to create Python test database: ${error.message}`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Initialize Node.js test database
    await initNodeJsDatabase();
    
    // Create and run Python script to initialize test database
    await createPythonDbScript();
    const pythonSuccess = runPythonScript();
    
    if (pythonSuccess) {
      logger.info('Test databases initialized successfully');
      logger.info(`Node.js database: ${NODEJS_DB_PATH}`);
      logger.info(`Python database: ${PYTHON_DB_PATH}`);
      logger.info('Run compatibility test with:');
      logger.info(`  npm run check-compatibility -- --nodejs-db="${NODEJS_DB_PATH}" --python-db="${PYTHON_DB_PATH}"`);
    }
  } catch (error) {
    logger.error(`Failed to initialize test databases: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
