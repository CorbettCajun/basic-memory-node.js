/**
 * Direct Database Schema Analyzer
 * 
 * This tool directly analyzes SQLite database schemas without requiring Python module imports.
 * It works with both Python and Node.js Basic Memory implementations.
 */

import { Sequelize, DataTypes, QueryTypes } from 'sequelize';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import pino from 'pino';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

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

// Path to output directory for reports
const REPORTS_DIR = join(__dirname, '..', 'reports');
if (!existsSync(REPORTS_DIR)) {
  mkdirSync(REPORTS_DIR, { recursive: true });
}

// Default paths to database files
const NODEJS_DB_PATH = process.env.BASIC_MEMORY_DB_PATH || 
  join(__dirname, '..', 'basic-memory.db');

const PYTHON_DB_PATH = join(
  __dirname, '..', '..', 'basic-memory', 
  'data', 'projects', 'default', 'basic_memory.db'
);

/**
 * Main function to analyze database schemas
 */
async function analyzeDatabaseSchemas(options = {}) {
  const nodejsDbPath = options.nodejsDbPath || NODEJS_DB_PATH;
  const pythonDbPath = options.pythonDbPath || PYTHON_DB_PATH;

  logger.info(`Starting direct schema analysis...`);
  logger.info(`Node.js DB path: ${nodejsDbPath}`);
  logger.info(`Python DB path: ${pythonDbPath}`);

  // Verify database files exist
  if (!existsSync(nodejsDbPath)) {
    logger.error(`Node.js database not found at: ${nodejsDbPath}`);
    logger.info(`Please run the Node.js app first to create the database`);
    process.exit(1);
  }

  if (!existsSync(pythonDbPath)) {
    logger.error(`Python database not found at: ${pythonDbPath}`);
    logger.info(`Please specify the correct path with --python-db=PATH`);
    process.exit(1);
  }

  try {
    // Analyze Node.js schema
    logger.info(`Analyzing Node.js schema...`);
    const nodejsSchema = await analyzeSchema(nodejsDbPath, 'Node.js');

    // Analyze Python schema
    logger.info(`Analyzing Python schema...`);
    const pythonSchema = await analyzeSchema(pythonDbPath, 'Python');

    // Compare schemas
    logger.info(`Comparing schemas...`);
    const report = compareSchemas(pythonSchema, nodejsSchema);

    // Save reports
    await saveReports(pythonSchema, nodejsSchema, report);

    return report;
  } catch (error) {
    logger.error(`Schema analysis failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

/**
 * Analyze a SQLite database schema
 */
async function analyzeSchema(dbPath, implementationName) {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Get all tables
  const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  
  const schema = {
    implementation: implementationName,
    tables: {}
  };

  // For each table, get its columns and indexes
  for (const table of tables) {
    const tableName = table.name;
    
    // Get columns
    const columns = await db.all(`PRAGMA table_info(${tableName})`);
    
    // Get indexes
    const indexes = await db.all(`PRAGMA index_list(${tableName})`);
    
    // Get foreign keys
    const foreignKeys = await db.all(`PRAGMA foreign_key_list(${tableName})`);

    // Process column information
    const processedColumns = columns.map(col => ({
      name: col.name,
      type: col.type,
      notNull: col.notnull === 1,
      defaultValue: col.dflt_value,
      primaryKey: col.pk === 1
    }));

    // Process index information
    const processedIndexes = [];
    for (const idx of indexes) {
      const indexColumns = await db.all(`PRAGMA index_info(${idx.name})`);
      processedIndexes.push({
        name: idx.name,
        unique: idx.unique === 1,
        columns: indexColumns.map(col => ({
          name: columns[col.cid]?.name || `Unknown(${col.cid})`,
          position: col.seqno
        }))
      });
    }

    // Store table schema
    schema.tables[tableName] = {
      name: tableName,
      columns: processedColumns,
      indexes: processedIndexes,
      foreignKeys: foreignKeys.map(fk => ({
        id: fk.id,
        seq: fk.seq,
        table: fk.table,
        from: fk.from,
        to: fk.to,
        onUpdate: fk.on_update,
        onDelete: fk.on_delete
      }))
    };
  }
  
  await db.close();
  return schema;
}

/**
 * Compare schemas between Python and Node.js implementations
 */
function compareSchemas(pythonSchema, nodejsSchema) {
  const report = {
    timestamp: new Date().toISOString(),
    compatible: true,
    tableComparisons: {},
    missingTables: {
      python: [],
      nodejs: []
    },
    recommendations: []
  };

  // Check for missing tables
  const pythonTables = Object.keys(pythonSchema.tables);
  const nodejsTables = Object.keys(nodejsSchema.tables);

  // Find Python tables missing in Node.js
  for (const tableName of pythonTables) {
    // Special case: check for table name mapping between implementations
    const mappedTableName = mapTableName(tableName, 'python-to-nodejs');
    
    if (!nodejsTables.includes(mappedTableName)) {
      report.missingTables.nodejs.push({
        table: tableName,
        pythonName: tableName,
        mappedNodejsName: mappedTableName,
        recommendation: `Table '${tableName}' exists in Python but not in Node.js (mapped name would be '${mappedTableName}')`
      });
      report.compatible = false;
    }
  }

  // Find Node.js tables missing in Python
  for (const tableName of nodejsTables) {
    // Special case: check for table name mapping between implementations
    const mappedTableName = mapTableName(tableName, 'nodejs-to-python');
    
    if (!pythonTables.includes(mappedTableName)) {
      report.missingTables.python.push({
        table: tableName,
        nodejsName: tableName,
        mappedPythonName: mappedTableName,
        recommendation: `Table '${tableName}' exists in Node.js but not in Python (mapped name would be '${mappedTableName}')`
      });
      report.compatible = false;
    }
  }

  // Compare tables that exist in both implementations
  for (const pythonTableName of pythonTables) {
    const nodejsTableName = mapTableName(pythonTableName, 'python-to-nodejs');
    
    if (nodejsTables.includes(nodejsTableName)) {
      const tableReport = compareTableSchema(
        pythonSchema.tables[pythonTableName],
        nodejsSchema.tables[nodejsTableName]
      );
      
      report.tableComparisons[pythonTableName] = tableReport;
      
      if (!tableReport.compatible) {
        report.compatible = false;
      }
    }
  }

  // Add recommendations for observations table if missing
  if (report.missingTables.nodejs.some(t => t.table === 'observation')) {
    report.recommendations.push(
      'Add Observation model to Node.js implementation to store granular entity observations'
    );
  }

  return report;
}

/**
 * Compare table schemas between implementations
 */
function compareTableSchema(pythonTable, nodejsTable) {
  const report = {
    compatible: true,
    pythonName: pythonTable.name,
    nodejsName: nodejsTable.name,
    missingColumns: {
      python: [],
      nodejs: []
    },
    typeDiscrepancies: [],
    nullabilityIssues: [],
    recommendations: []
  };

  // Get column names
  const pythonColumns = pythonTable.columns.map(c => c.name);
  const nodejsColumns = nodejsTable.columns.map(c => c.name);

  // Find Python columns missing in Node.js
  for (const colName of pythonColumns) {
    const mappedColName = mapColumnName(colName, 'python-to-nodejs');
    
    if (!nodejsColumns.includes(mappedColName)) {
      report.missingColumns.nodejs.push({
        column: colName,
        pythonName: colName,
        mappedNodejsName: mappedColName,
        recommendation: `Column '${colName}' exists in Python table but not in Node.js (mapped name would be '${mappedColName}')`
      });
      report.compatible = false;
    }
  }

  // Find Node.js columns missing in Python
  for (const colName of nodejsColumns) {
    const mappedColName = mapColumnName(colName, 'nodejs-to-python');
    
    if (!pythonColumns.includes(mappedColName)) {
      report.missingColumns.python.push({
        column: colName,
        nodejsName: colName,
        mappedPythonName: mappedColName,
        recommendation: `Column '${colName}' exists in Node.js table but not in Python (mapped name would be '${mappedColName}')`
      });
      report.compatible = false;
    }
  }

  // Compare columns that exist in both implementations
  for (const pythonColName of pythonColumns) {
    const nodejsColName = mapColumnName(pythonColName, 'python-to-nodejs');
    
    if (nodejsColumns.includes(nodejsColName)) {
      const pythonCol = pythonTable.columns.find(c => c.name === pythonColName);
      const nodejsCol = nodejsTable.columns.find(c => c.name === nodejsColName);
      
      // Check type compatibility
      if (!areTypesCompatible(pythonCol.type, nodejsCol.type)) {
        report.typeDiscrepancies.push({
          pythonColumn: pythonColName,
          nodejsColumn: nodejsColName,
          pythonType: pythonCol.type,
          nodejsType: nodejsCol.type,
          recommendation: `Column types are incompatible: Python '${pythonColName}' (${pythonCol.type}) vs Node.js '${nodejsColName}' (${nodejsCol.type})`
        });
        report.compatible = false;
      }
      
      // Check nullability
      if (pythonCol.notNull && !nodejsCol.notNull) {
        report.nullabilityIssues.push({
          pythonColumn: pythonColName,
          nodejsColumn: nodejsColName,
          pythonNotNull: pythonCol.notNull,
          nodejsNotNull: nodejsCol.notNull,
          recommendation: `Column '${pythonColName}' is required in Python but nullable in Node.js`
        });
        report.compatible = false;
      }
    }
  }

  return report;
}

/**
 * Map table names between implementations
 */
function mapTableName(tableName, direction) {
  const mappings = {
    'python-to-nodejs': {
      'entity': 'entities',
      'relation': 'links',
      'observation': 'observations',
      'search_index': 'search_index'
    },
    'nodejs-to-python': {
      'entities': 'entity',
      'links': 'relation',
      'observations': 'observation',
      'search_index': 'search_index'
    }
  };
  
  return mappings[direction][tableName] || tableName;
}

/**
 * Map column names between implementations
 */
function mapColumnName(columnName, direction) {
  const mappings = {
    'python-to-nodejs': {
      // Entity table
      'id': 'id',
      'title': 'title',
      'entity_type': 'type',
      'permalink': 'permalink',
      'file_path': 'file_path',
      'created_at': 'createdAt',
      'updated_at': 'updatedAt',
      
      // Relation/Link table
      'from_id': 'source_id',
      'to_id': 'target_id',
      'relation_type': 'type',
      'to_name': 'target_name'
    },
    'nodejs-to-python': {
      // Entity table
      'id': 'id',
      'title': 'title',
      'type': 'entity_type',
      'permalink': 'permalink',
      'file_path': 'file_path',
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      
      // Link/Relation table
      'source_id': 'from_id',
      'target_id': 'to_id',
      'type': 'relation_type',
      'target_name': 'to_name'
    }
  };
  
  return mappings[direction][columnName] || columnName;
}

/**
 * Check if two database types are compatible
 */
function areTypesCompatible(pythonType, nodejsType) {
  // Normalize types for comparison
  pythonType = pythonType.toLowerCase();
  nodejsType = nodejsType.toLowerCase();
  
  // SQLite type compatibility is quite flexible
  // These are general mappings between common types
  const pythonToNodejsCompatibility = {
    'integer': ['integer', 'int'],
    'varchar': ['varchar', 'text', 'string'],
    'text': ['text', 'varchar', 'string'],
    'json': ['json', 'text'],
    'datetime': ['datetime', 'timestamp', 'date'],
    'boolean': ['boolean', 'tinyint', 'integer']
  };
  
  // Check if the Node.js type is compatible with the Python type
  for (const [pyType, compatibleTypes] of Object.entries(pythonToNodejsCompatibility)) {
    if (pythonType.includes(pyType)) {
      return compatibleTypes.some(t => nodejsType.includes(t));
    }
  }
  
  // Default to false for unrecognized types
  logger.warn(`Unrecognized type comparison: Python (${pythonType}) vs Node.js (${nodejsType})`);
  return false;
}

/**
 * Save reports to files
 */
async function saveReports(pythonSchema, nodejsSchema, report) {
  // Save raw schema dumps for reference
  writeFileSync(
    join(REPORTS_DIR, 'python_schema.json'),
    JSON.stringify(pythonSchema, null, 2)
  );
  
  writeFileSync(
    join(REPORTS_DIR, 'nodejs_schema.json'),
    JSON.stringify(nodejsSchema, null, 2)
  );
  
  // Save compatibility report
  const reportPath = join(REPORTS_DIR, 'compatibility_report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Generate and save markdown report
  const markdownReport = generateMarkdownReport(report, pythonSchema, nodejsSchema);
  const markdownPath = join(REPORTS_DIR, 'compatibility_report.md');
  writeFileSync(markdownPath, markdownReport);
  
  logger.info(`Schema compatibility report generated at ${reportPath}`);
  logger.info(`Markdown report generated at ${markdownPath}`);
}

/**
 * Generate a human-readable Markdown report
 */
function generateMarkdownReport(report, pythonSchema, nodejsSchema) {
  const { timestamp, compatible, tableComparisons, missingTables, recommendations } = report;
  
  let markdown = `# Basic Memory Schema Compatibility Report\n\n`;
  markdown += `Generated: ${new Date(timestamp).toLocaleString()}\n\n`;
  markdown += `**Overall Compatibility:** ${compatible ? '✅ Compatible' : '❌ Incompatible'}\n\n`;
  
  if (recommendations.length > 0) {
    markdown += `## General Recommendations\n\n`;
    recommendations.forEach(rec => {
      markdown += `- ${rec}\n`;
    });
    markdown += '\n';
  }
  
  // Missing Tables Section
  if (missingTables.nodejs.length > 0 || missingTables.python.length > 0) {
    markdown += `## Missing Tables\n\n`;
    
    if (missingTables.nodejs.length > 0) {
      markdown += `### Tables in Python missing from Node.js\n\n`;
      markdown += `| Python Table | Mapped Node.js Name | Recommendation |\n`;
      markdown += `|--------------|---------------------|----------------|\n`;
      missingTables.nodejs.forEach(item => {
        markdown += `| ${item.pythonName} | ${item.mappedNodejsName} | ${item.recommendation} |\n`;
      });
      markdown += '\n';
    }
    
    if (missingTables.python.length > 0) {
      markdown += `### Tables in Node.js missing from Python\n\n`;
      markdown += `| Node.js Table | Mapped Python Name | Recommendation |\n`;
      markdown += `|---------------|-------------------|----------------|\n`;
      missingTables.python.forEach(item => {
        markdown += `| ${item.nodejsName} | ${item.mappedPythonName} | ${item.recommendation} |\n`;
      });
      markdown += '\n';
    }
  }
  
  // Table Comparisons Section
  markdown += `## Table Compatibility\n\n`;
  
  for (const [tableName, tableReport] of Object.entries(tableComparisons)) {
    markdown += `### ${tableName} (Python) ↔ ${tableReport.nodejsName} (Node.js)\n\n`;
    markdown += `**Compatible:** ${tableReport.compatible ? '✅ Yes' : '❌ No'}\n\n`;
    
    // Missing Columns
    if (tableReport.missingColumns.nodejs.length > 0) {
      markdown += `#### Columns in Python missing from Node.js\n\n`;
      markdown += `| Python Column | Mapped Node.js Name | Recommendation |\n`;
      markdown += `|---------------|---------------------|----------------|\n`;
      tableReport.missingColumns.nodejs.forEach(col => {
        markdown += `| ${col.pythonName} | ${col.mappedNodejsName} | ${col.recommendation} |\n`;
      });
      markdown += '\n';
    }
    
    if (tableReport.missingColumns.python.length > 0) {
      markdown += `#### Columns in Node.js missing from Python\n\n`;
      markdown += `| Node.js Column | Mapped Python Name | Recommendation |\n`;
      markdown += `|----------------|-------------------|----------------|\n`;
      tableReport.missingColumns.python.forEach(col => {
        markdown += `| ${col.nodejsName} | ${col.mappedPythonName} | ${col.recommendation} |\n`;
      });
      markdown += '\n';
    }
    
    // Type Discrepancies
    if (tableReport.typeDiscrepancies.length > 0) {
      markdown += `#### Type Discrepancies\n\n`;
      markdown += `| Python Column | Node.js Column | Python Type | Node.js Type | Recommendation |\n`;
      markdown += `|---------------|----------------|-------------|-------------|----------------|\n`;
      tableReport.typeDiscrepancies.forEach(disc => {
        markdown += `| ${disc.pythonColumn} | ${disc.nodejsColumn} | ${disc.pythonType} | ${disc.nodejsType} | ${disc.recommendation} |\n`;
      });
      markdown += '\n';
    }
    
    // Nullability Issues
    if (tableReport.nullabilityIssues.length > 0) {
      markdown += `#### Nullability Issues\n\n`;
      markdown += `| Python Column | Node.js Column | Python NOT NULL | Node.js NOT NULL | Recommendation |\n`;
      markdown += `|---------------|----------------|-----------------|------------------|----------------|\n`;
      tableReport.nullabilityIssues.forEach(issue => {
        markdown += `| ${issue.pythonColumn} | ${issue.nodejsColumn} | ${issue.pythonNotNull} | ${issue.nodejsNotNull} | ${issue.recommendation} |\n`;
      });
      markdown += '\n';
    }
  }
  
  // Table Structure Section
  markdown += `## Detailed Table Structure\n\n`;
  
  // Python Tables
  markdown += `### Python Implementation Tables\n\n`;
  for (const [tableName, table] of Object.entries(pythonSchema.tables)) {
    markdown += `#### ${tableName}\n\n`;
    markdown += `| Column | Type | NOT NULL | Primary Key |\n`;
    markdown += `|--------|------|----------|-------------|\n`;
    
    table.columns.forEach(col => {
      markdown += `| ${col.name} | ${col.type} | ${col.notNull} | ${col.primaryKey} |\n`;
    });
    markdown += '\n';
    
    if (table.indexes.length > 0) {
      markdown += `**Indexes:**\n\n`;
      table.indexes.forEach(idx => {
        const columnList = idx.columns.map(c => c.name).join(', ');
        markdown += `- ${idx.name}: ${idx.unique ? 'UNIQUE ' : ''}(${columnList})\n`;
      });
      markdown += '\n';
    }
    
    if (table.foreignKeys.length > 0) {
      markdown += `**Foreign Keys:**\n\n`;
      table.foreignKeys.forEach(fk => {
        markdown += `- ${fk.from} → ${fk.table}(${fk.to}) [ON DELETE: ${fk.onDelete}]\n`;
      });
      markdown += '\n';
    }
  }
  
  // Node.js Tables
  markdown += `### Node.js Implementation Tables\n\n`;
  for (const [tableName, table] of Object.entries(nodejsSchema.tables)) {
    markdown += `#### ${tableName}\n\n`;
    markdown += `| Column | Type | NOT NULL | Primary Key |\n`;
    markdown += `|--------|------|----------|-------------|\n`;
    
    table.columns.forEach(col => {
      markdown += `| ${col.name} | ${col.type} | ${col.notNull} | ${col.primaryKey} |\n`;
    });
    markdown += '\n';
    
    if (table.indexes.length > 0) {
      markdown += `**Indexes:**\n\n`;
      table.indexes.forEach(idx => {
        const columnList = idx.columns.map(c => c.name).join(', ');
        markdown += `- ${idx.name}: ${idx.unique ? 'UNIQUE ' : ''}(${columnList})\n`;
      });
      markdown += '\n';
    }
    
    if (table.foreignKeys.length > 0) {
      markdown += `**Foreign Keys:**\n\n`;
      table.foreignKeys.forEach(fk => {
        markdown += `- ${fk.from} → ${fk.table}(${fk.to}) [ON DELETE: ${fk.onDelete}]\n`;
      });
      markdown += '\n';
    }
  }
  
  return markdown;
}

/**
 * Parse command line arguments
 */
function parseCommandLineArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (const arg of args) {
    if (arg.startsWith('--nodejs-db=')) {
      options.nodejsDbPath = arg.replace('--nodejs-db=', '');
    } else if (arg.startsWith('--python-db=')) {
      options.pythonDbPath = arg.replace('--python-db=', '');
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node direct-schema-analyzer.js [options]

Options:
  --nodejs-db=PATH    Path to Node.js SQLite database file
  --python-db=PATH    Path to Python SQLite database file
  --help, -h          Show this help message
`);
      process.exit(0);
    }
  }
  
  return options;
}

/**
 * Main function
 */
async function main() {
  try {
    const options = parseCommandLineArgs();
    await analyzeDatabaseSchemas(options);
  } catch (error) {
    logger.error(`Schema analysis failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Execute the script
main();
