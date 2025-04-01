/**
 * Schema Compatibility Verification Tool
 * 
 * This tool analyzes and compares the database schemas between the Python and Node.js
 * implementations of Basic Memory to ensure compatibility.
 * 
 * Usage:
 *   node scripts/schema-compatibility.js
 */

import { Sequelize, DataTypes } from 'sequelize';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import pino from 'pino';
import { exec } from 'child_process';
import { promisify } from 'util';

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

// Convert exec to Promise-based
const execAsync = promisify(exec);

/**
 * Field mappings between Python and Node.js implementations
 * Maps Python model field names to corresponding Node.js field names
 */
const FIELD_MAPPINGS = {
  entity: {
    // Python field => Node.js field
    'id': 'id',
    'title': 'title',
    'entity_type': 'type',
    'permalink': 'permalink',
    'file_path': 'file_path',
    'created_at': 'createdAt',
    'updated_at': 'updatedAt'
  },
  relation: {
    // Python Relation => Node.js Link
    'id': 'id',
    'from_id': 'source_id',
    'to_id': 'target_id',
    'relation_type': 'type',
    'created_at': 'createdAt',
    'updated_at': 'updatedAt'
  }
};

/**
 * Required fields in both implementations that must exist and be compatible
 */
const REQUIRED_FIELDS = {
  entity: [
    'id',
    'title',
    'permalink',
    'file_path'
  ],
  relation: [
    'id',
    'source_id', // from_id in Python
    'target_id', // to_id in Python
    'type'       // relation_type in Python
  ]
};

/**
 * Get the Node.js schema definition from Sequelize models
 * @returns {Object} The schema definition
 */
async function getNodeJsSchema() {
  // Import from our src/db directory
  const { sequelize } = await import('../src/db/index.js');
  
  // Return the schema for each model
  const schemaData = {};
  
  // Get model definitions from sequelize
  for (const modelName of Object.keys(sequelize.models)) {
    const model = sequelize.models[modelName];
    schemaData[modelName.toLowerCase()] = {
      name: modelName,
      tableName: model.tableName,
      fields: Object.keys(model.rawAttributes).map(field => ({
        name: field,
        type: model.rawAttributes[field].type.constructor.name,
        allowNull: model.rawAttributes[field].allowNull !== false,
        primaryKey: model.rawAttributes[field].primaryKey === true,
        unique: model.rawAttributes[field].unique === true,
        references: model.rawAttributes[field].references,
        defaultValue: model.rawAttributes[field].defaultValue
      }))
    };
  }
  
  return schemaData;
}

/**
 * Extract Python schema by running a helper script in the Python implementation
 * @returns {Promise<Object>} The schema definition
 */
async function getPythonSchema() {
  try {
    // Path to the Python implementation directory
    const pythonDir = join(__dirname, '..', '..', 'basic-memory');
    
    // Create a temporary Python script to dump the schema
    const tempScriptPath = join(REPORTS_DIR, 'temp_schema_dump.py');
    const pythonScript = `
import json
import sys
from pathlib import Path
from sqlalchemy import inspect

# Add the parent directory to the path so we can import basic_memory
sys.path.insert(0, '${pythonDir.replace(/\\/g, '/')}')

from basic_memory.models.knowledge import Entity, Observation, Relation
from basic_memory.models.search import CREATE_SEARCH_INDEX
from basic_memory.db import get_or_create_db, DatabaseType
from basic_memory.config import ProjectConfig, AppConfig

async def get_schema():
    # Create a temporary database to inspect
    app_config = AppConfig()
    project_config = ProjectConfig("default", app_config.storage_path)
    
    engine, session_maker = await get_or_create_db(
        project_config.database_path, 
        DatabaseType.MEMORY
    )
    
    schema = {}
    
    # Get schema for each model
    for cls in [Entity, Observation, Relation]:
        table_name = cls.__tablename__
        mapper = inspect(cls)
        
        schema[table_name] = {
            "name": cls.__name__,
            "tableName": table_name,
            "fields": []
        }
        
        for column in mapper.columns:
            field_info = {
                "name": column.name,
                "type": str(column.type),
                "allowNull": column.nullable,
                "primaryKey": column.primary_key,
                "unique": column.unique,
                "defaultValue": column.default.arg if column.default else None
            }
            
            if column.foreign_keys:
                field_info["references"] = [{
                    "model": fk.column.table.name,
                    "key": fk.column.name
                } for fk in column.foreign_keys]
            
            schema[table_name]["fields"].append(field_info)
    
    # Add virtual search table info
    schema["search_index"] = {
        "name": "SearchIndex",
        "tableName": "search_index",
        "fields": [],
        "definition": str(CREATE_SEARCH_INDEX)
    }
    
    print(json.dumps(schema, default=str, indent=2))

# Run the async function
import asyncio
asyncio.run(get_schema())
    `;
    
    // Write the temporary script
    const fs = await import('fs/promises');
    await fs.writeFile(tempScriptPath, pythonScript);
    
    // Execute the Python script
    const { stdout, stderr } = await execAsync(`cd "${pythonDir}" && python "${tempScriptPath}"`);
    
    if (stderr) {
      logger.warn(`Python schema extraction produced warnings: ${stderr}`);
    }
    
    // Parse the output
    const schemaData = JSON.parse(stdout);
    
    // Clean up temporary script
    await fs.unlink(tempScriptPath);
    
    return schemaData;
  } catch (error) {
    logger.error(`Failed to extract Python schema: ${error.message}`);
    throw error;
  }
}

/**
 * Compare schemas between Python and Node.js implementations
 * @param {Object} pythonSchema The Python schema
 * @param {Object} nodeSchema The Node.js schema
 * @returns {Object} Compatibility report
 */
function compareSchemas(pythonSchema, nodeSchema) {
  const report = {
    timestamp: new Date().toISOString(),
    compatible: true,
    tables: {},
    missingTables: [],
    recommendations: []
  };
  
  // Check Entity model compatibility
  report.tables.entity = compareEntityModels(
    pythonSchema.entity,
    nodeSchema.entity
  );
  
  // Check Relation/Link model compatibility
  report.tables.relation = compareRelationModels(
    pythonSchema.relation,
    nodeSchema.link
  );
  
  // Check for missing tables in Node.js implementation
  for (const tableName of Object.keys(pythonSchema)) {
    if (!nodeSchema[tableName.toLowerCase()] && 
        tableName !== 'entity' && 
        tableName !== 'relation' &&
        tableName !== 'search_index') {
      report.missingTables.push({
        pythonTable: tableName,
        recommendation: `Table '${tableName}' exists in Python implementation but is missing in Node.js`
      });
      
      // Add specific recommendations for known tables
      if (tableName === 'observation') {
        report.recommendations.push(
          'Add Observation model to Node.js implementation to store granular entity observations'
        );
      }
    }
  }
  
  // Set overall compatibility based on individual table reports
  report.compatible = Object.values(report.tables).every(table => table.compatible) && 
                     report.missingTables.length === 0;
  
  return report;
}

/**
 * Compare Entity models between implementations
 * @param {Object} pythonEntity Python Entity model
 * @param {Object} nodeEntity Node.js Entity model
 * @returns {Object} Compatibility report for Entity models
 */
function compareEntityModels(pythonEntity, nodeEntity) {
  const report = {
    compatible: true,
    missingFields: [],
    typeDiscrepancies: [],
    nullabilityIssues: []
  };
  
  // Check required fields
  for (const requiredField of REQUIRED_FIELDS.entity) {
    const pythonFieldName = Object.entries(FIELD_MAPPINGS.entity)
      .find(([_, nodeField]) => nodeField === requiredField)?.[0] || requiredField;
    
    const pythonField = pythonEntity.fields.find(f => f.name === pythonFieldName);
    const nodeField = nodeEntity.fields.find(f => f.name === requiredField);
    
    if (!pythonField) {
      report.missingFields.push({
        field: pythonFieldName,
        implementation: 'Python',
        recommendation: `Field '${pythonFieldName}' is required but missing in Python implementation`
      });
      report.compatible = false;
    }
    
    if (!nodeField) {
      report.missingFields.push({
        field: requiredField,
        implementation: 'Node.js',
        recommendation: `Field '${requiredField}' is required but missing in Node.js implementation`
      });
      report.compatible = false;
    }
    
    if (pythonField && nodeField) {
      // Check type compatibility
      if (!areTypesCompatible(pythonField.type, nodeField.type)) {
        report.typeDiscrepancies.push({
          field: requiredField,
          pythonType: pythonField.type,
          nodeType: nodeField.type,
          recommendation: `Field '${requiredField}' has incompatible types: Python (${pythonField.type}) vs Node.js (${nodeField.type})`
        });
        report.compatible = false;
      }
      
      // Check nullability compatibility
      if (pythonField.allowNull !== nodeField.allowNull) {
        report.nullabilityIssues.push({
          field: requiredField,
          pythonAllowNull: pythonField.allowNull,
          nodeAllowNull: nodeField.allowNull,
          recommendation: `Field '${requiredField}' has different nullability: Python (${pythonField.allowNull}) vs Node.js (${nodeField.allowNull})`
        });
        report.compatible = false;
      }
    }
  }
  
  return report;
}

/**
 * Compare Relation models between implementations (Python Relation vs Node.js Link)
 * @param {Object} pythonRelation Python Relation model
 * @param {Object} nodeLink Node.js Link model
 * @returns {Object} Compatibility report for Relation/Link models
 */
function compareRelationModels(pythonRelation, nodeLink) {
  const report = {
    compatible: true,
    missingFields: [],
    typeDiscrepancies: [],
    nullabilityIssues: []
  };
  
  // Check required fields
  for (const requiredField of REQUIRED_FIELDS.relation) {
    const pythonFieldName = Object.entries(FIELD_MAPPINGS.relation)
      .find(([_, nodeField]) => nodeField === requiredField)?.[0] || requiredField;
    
    const pythonField = pythonRelation.fields.find(f => f.name === pythonFieldName);
    const nodeField = nodeLink.fields.find(f => f.name === requiredField);
    
    if (!pythonField) {
      report.missingFields.push({
        field: pythonFieldName,
        implementation: 'Python',
        recommendation: `Field '${pythonFieldName}' is required but missing in Python implementation`
      });
      report.compatible = false;
    }
    
    if (!nodeField) {
      report.missingFields.push({
        field: requiredField,
        implementation: 'Node.js',
        recommendation: `Field '${requiredField}' is required but missing in Node.js implementation`
      });
      report.compatible = false;
    }
    
    if (pythonField && nodeField) {
      // Check type compatibility
      if (!areTypesCompatible(pythonField.type, nodeField.type)) {
        report.typeDiscrepancies.push({
          field: requiredField,
          pythonType: pythonField.type,
          nodeType: nodeField.type,
          recommendation: `Field '${requiredField}' has incompatible types: Python (${pythonField.type}) vs Node.js (${nodeField.type})`
        });
        report.compatible = false;
      }
      
      // Check nullability compatibility - for relation fields, Node.js implementation
      // should have the same or more restrictive nullability
      if (pythonField.allowNull === false && nodeField.allowNull === true) {
        report.nullabilityIssues.push({
          field: requiredField,
          pythonAllowNull: pythonField.allowNull,
          nodeAllowNull: nodeField.allowNull,
          recommendation: `Field '${requiredField}' is required in Python but nullable in Node.js`
        });
        report.compatible = false;
      }
    }
  }
  
  return report;
}

/**
 * Check if two database types are compatible
 * @param {string} pythonType Python type
 * @param {string} nodeType Node.js type
 * @returns {boolean} True if types are compatible
 */
function areTypesCompatible(pythonType, nodeType) {
  // Simple compatibility rules for common types
  // Adjust as needed based on specific requirements
  
  // Normalize types for comparison
  pythonType = pythonType.toLowerCase();
  nodeType = nodeType.toLowerCase();
  
  // Type compatibility mapping
  const typeMap = {
    // Python SQLAlchemy type => Node.js Sequelize types
    'integer': ['integer', 'int'],
    'varchar': ['string', 'varchar', 'char'],
    'text': ['string', 'text'],
    'datetime': ['date', 'datetime'],
    'boolean': ['boolean'],
    'json': ['json'],
    // Add more mappings as needed
  };
  
  // Handle special case for STRING vs VARCHAR/TEXT
  if (nodeType === 'string') {
    return ['varchar', 'text', 'string'].some(t => pythonType.includes(t));
  }
  
  // For each known Python type, check if Node.js type is in the list of compatible types
  for (const [pyType, nodeTypes] of Object.entries(typeMap)) {
    if (pythonType.includes(pyType)) {
      return nodeTypes.some(t => nodeType.includes(t));
    }
  }
  
  // Default to false for unrecognized types
  logger.warn(`Unrecognized type comparison: Python (${pythonType}) vs Node.js (${nodeType})`);
  return false;
}

/**
 * Generate schema compatibility report
 */
async function generateCompatibilityReport() {
  try {
    logger.info('Starting schema compatibility analysis...');
    
    // Extract schema from both implementations
    logger.info('Extracting Node.js schema...');
    const nodeSchema = await getNodeJsSchema();
    
    logger.info('Extracting Python schema...');
    const pythonSchema = await getPythonSchema();
    
    // Compare schemas
    logger.info('Comparing schemas...');
    const report = compareSchemas(pythonSchema, nodeSchema);
    
    // Generate detailed reports
    const fs = await import('fs/promises');
    
    // Save raw schema dumps for reference
    await fs.writeFile(
      join(REPORTS_DIR, 'python_schema.json'),
      JSON.stringify(pythonSchema, null, 2)
    );
    
    await fs.writeFile(
      join(REPORTS_DIR, 'nodejs_schema.json'),
      JSON.stringify(nodeSchema, null, 2)
    );
    
    // Save compatibility report
    const reportPath = join(REPORTS_DIR, 'compatibility_report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Generate a markdown summary for easy reading
    const markdownReport = generateMarkdownReport(report, pythonSchema, nodeSchema);
    const markdownPath = join(REPORTS_DIR, 'compatibility_report.md');
    await fs.writeFile(markdownPath, markdownReport);
    
    logger.info(`Schema compatibility report generated at ${reportPath}`);
    logger.info(`Markdown report generated at ${markdownPath}`);
    
    if (report.compatible) {
      logger.info('✅ Schemas are compatible!');
    } else {
      logger.warn('⚠️ Schemas have compatibility issues. See the reports for details.');
    }
    
    return report;
  } catch (error) {
    logger.error(`Failed to generate compatibility report: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
}

/**
 * Generate a human-readable Markdown report
 */
function generateMarkdownReport(report, pythonSchema, nodeSchema) {
  const { timestamp, compatible, tables, missingTables, recommendations } = report;
  
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
  
  markdown += `## Table Compatibility\n\n`;
  
  // Entity Model
  markdown += `### Entity Model\n\n`;
  markdown += `**Compatible:** ${tables.entity.compatible ? '✅ Yes' : '❌ No'}\n\n`;
  
  if (tables.entity.missingFields.length > 0) {
    markdown += `#### Missing Fields\n\n`;
    markdown += `| Field | Missing In | Recommendation |\n`;
    markdown += `|-------|-----------|----------------|\n`;
    tables.entity.missingFields.forEach(issue => {
      markdown += `| ${issue.field} | ${issue.implementation} | ${issue.recommendation} |\n`;
    });
    markdown += '\n';
  }
  
  if (tables.entity.typeDiscrepancies.length > 0) {
    markdown += `#### Type Discrepancies\n\n`;
    markdown += `| Field | Python Type | Node.js Type | Recommendation |\n`;
    markdown += `|-------|------------|-------------|----------------|\n`;
    tables.entity.typeDiscrepancies.forEach(issue => {
      markdown += `| ${issue.field} | ${issue.pythonType} | ${issue.nodeType} | ${issue.recommendation} |\n`;
    });
    markdown += '\n';
  }
  
  if (tables.entity.nullabilityIssues.length > 0) {
    markdown += `#### Nullability Issues\n\n`;
    markdown += `| Field | Python Allows Null | Node.js Allows Null | Recommendation |\n`;
    markdown += `|-------|-------------------|---------------------|----------------|\n`;
    tables.entity.nullabilityIssues.forEach(issue => {
      markdown += `| ${issue.field} | ${issue.pythonAllowNull} | ${issue.nodeAllowNull} | ${issue.recommendation} |\n`;
    });
    markdown += '\n';
  }
  
  // Relation Model
  markdown += `### Relation Model (Python) vs Link Model (Node.js)\n\n`;
  markdown += `**Compatible:** ${tables.relation.compatible ? '✅ Yes' : '❌ No'}\n\n`;
  
  if (tables.relation.missingFields.length > 0) {
    markdown += `#### Missing Fields\n\n`;
    markdown += `| Field | Missing In | Recommendation |\n`;
    markdown += `|-------|-----------|----------------|\n`;
    tables.relation.missingFields.forEach(issue => {
      markdown += `| ${issue.field} | ${issue.implementation} | ${issue.recommendation} |\n`;
    });
    markdown += '\n';
  }
  
  if (tables.relation.typeDiscrepancies.length > 0) {
    markdown += `#### Type Discrepancies\n\n`;
    markdown += `| Field | Python Type | Node.js Type | Recommendation |\n`;
    markdown += `|-------|------------|-------------|----------------|\n`;
    tables.relation.typeDiscrepancies.forEach(issue => {
      markdown += `| ${issue.field} | ${issue.pythonType} | ${issue.nodeType} | ${issue.recommendation} |\n`;
    });
    markdown += '\n';
  }
  
  if (tables.relation.nullabilityIssues.length > 0) {
    markdown += `#### Nullability Issues\n\n`;
    markdown += `| Field | Python Allows Null | Node.js Allows Null | Recommendation |\n`;
    markdown += `|-------|-------------------|---------------------|----------------|\n`;
    tables.relation.nullabilityIssues.forEach(issue => {
      markdown += `| ${issue.field} | ${issue.pythonAllowNull} | ${issue.nodeAllowNull} | ${issue.recommendation} |\n`;
    });
    markdown += '\n';
  }
  
  // Missing Tables
  if (missingTables.length > 0) {
    markdown += `## Missing Tables\n\n`;
    markdown += `| Python Table | Recommendation |\n`;
    markdown += `|-------------|----------------|\n`;
    missingTables.forEach(issue => {
      markdown += `| ${issue.pythonTable} | ${issue.recommendation} |\n`;
    });
    markdown += '\n';
  }
  
  // Table Structure Detail
  markdown += `## Detailed Table Structure\n\n`;
  
  // Python Tables
  markdown += `### Python Implementation Tables\n\n`;
  for (const [tableName, table] of Object.entries(pythonSchema)) {
    if (tableName === 'search_index') continue; // Skip virtual table
    
    markdown += `#### ${table.name} (${table.tableName})\n\n`;
    markdown += `| Field | Type | Allow Null | Primary Key | Unique |\n`;
    markdown += `|-------|------|------------|-------------|--------|\n`;
    
    table.fields.forEach(field => {
      markdown += `| ${field.name} | ${field.type} | ${field.allowNull} | ${field.primaryKey} | ${field.unique} |\n`;
    });
    markdown += '\n';
  }
  
  // Node.js Tables
  markdown += `### Node.js Implementation Tables\n\n`;
  for (const [tableName, table] of Object.entries(nodeSchema)) {
    markdown += `#### ${table.name} (${table.tableName})\n\n`;
    markdown += `| Field | Type | Allow Null | Primary Key | Unique |\n`;
    markdown += `|-------|------|------------|-------------|--------|\n`;
    
    table.fields.forEach(field => {
      markdown += `| ${field.name} | ${field.type} | ${field.allowNull} | ${field.primaryKey} | ${field.unique} |\n`;
    });
    markdown += '\n';
  }
  
  return markdown;
}

/**
 * Main function to run the compatibility verification
 */
async function main() {
  try {
    await generateCompatibilityReport();
  } catch (error) {
    logger.error(`Compatibility verification failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the verification
main();
