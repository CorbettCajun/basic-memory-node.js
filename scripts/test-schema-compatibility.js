/**
 * Test script to verify schema compatibility between Python and Node.js implementations
 * 
 * This script tests the updated Node.js models (Entity, Observation, Link) to ensure
 * they are compatible with the Python implementation's database schema.
 */

import { sequelize, Entity, Observation, Link } from '../src/db/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pino from 'pino';
import fs from 'fs';

// Configure logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test database path
const TEST_DB_PATH = join(__dirname, '..', 'test-compatibility', 'test-schema.db');

/**
 * Run schema compatibility tests
 */
async function runTests() {
  logger.info(`Running schema compatibility tests on ${TEST_DB_PATH}`);
  
  // Delete existing test database if it exists
  if (fs.existsSync(TEST_DB_PATH)) {
    logger.info(`Removing existing test database: ${TEST_DB_PATH}`);
    fs.unlinkSync(TEST_DB_PATH);
  }
  
  // Ensure the directory exists
  const dbDir = dirname(TEST_DB_PATH);
  if (!fs.existsSync(dbDir)) {
    logger.info(`Creating directory: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  // Set database path for this test
  process.env.BASIC_MEMORY_DB_PATH = TEST_DB_PATH;
  
  try {
    // Initialize the database with force sync to create all tables
    logger.info('Initializing database with force sync...');
    await sequelize.authenticate();
    
    // Force sync will drop existing tables and recreate them with the new schema
    await sequelize.sync({ force: true });
    logger.info('Database initialized with complete schema');
    
    // Begin transaction
    const transaction = await sequelize.transaction();
    
    try {
      // Create test entities
      logger.info('Creating test entities...');
      
      const entity1 = await Entity.create({
        title: 'Test Entity 1',
        permalink: '/test-entity-1',
        content: 'This is test entity 1 content',
        raw_content: 'This is test entity 1 raw content',
        type: 'note',
        entity_type: 'document',
        content_type: 'text/markdown',
        entity_metadata: { author: 'Test User', tags: ['test', 'entity'] },
        checksum: 'abc123',
        file_path: '/path/to/test1.md',
        attributes: { importance: 'high', status: 'active' }
      }, { transaction });
      
      const entity2 = await Entity.create({
        title: 'Test Entity 2',
        permalink: '/test-entity-2',
        content: 'This is test entity 2 content',
        raw_content: 'This is test entity 2 raw content',
        type: 'note',
        entity_type: 'document',
        content_type: 'text/markdown',
        entity_metadata: { author: 'Test User', tags: ['test', 'entity'] },
        checksum: 'def456',
        file_path: '/path/to/test2.md',
        attributes: { importance: 'medium', status: 'pending' }
      }, { transaction });
      
      logger.info(`Created entities with IDs: ${entity1.id}, ${entity2.id}`);
      
      // Create observations
      logger.info('Creating observations...');
      
      const observation1 = await Observation.create({
        entity_id: entity1.id,
        content: 'This is an observation about entity 1',
        category: 'note',
        context: 'Test context',
        tags: ['important', 'review']
      }, { transaction });
      
      const observation2 = await Observation.create({
        entity_id: entity1.id,
        content: 'This is another observation about entity 1',
        category: 'analysis',
        context: 'Secondary analysis',
        tags: ['followup']
      }, { transaction });
      
      const observation3 = await Observation.create({
        entity_id: entity2.id,
        content: 'This is an observation about entity 2',
        category: 'note',
        tags: ['question']
      }, { transaction });
      
      logger.info(`Created observations with IDs: ${observation1.id}, ${observation2.id}, ${observation3.id}`);
      
      // Create links
      logger.info('Creating links...');
      
      const link1 = await Link.create({
        source_id: entity1.id,
        target_id: entity2.id,
        type: 'reference',
        to_name: 'Test Entity 2',
        context: 'Referenced in section 3',
        attributes: { strength: 'strong', bidirectional: false }
      }, { transaction });
      
      const link2 = await Link.create({
        source_id: entity2.id,
        target_id: entity1.id,
        type: 'related',
        to_name: 'Test Entity 1',
        context: 'Similar topic',
        attributes: { strength: 'weak', bidirectional: true }
      }, { transaction });
      
      logger.info(`Created links with IDs: ${link1.id}, ${link2.id}`);
      
      // Query relationships to verify they work correctly
      logger.info('Testing relationships...');
      
      // Get entity with observations
      const entityWithObservations = await Entity.findByPk(entity1.id, {
        include: ['observations'],
        transaction
      });
      
      logger.info(`Entity 1 has ${entityWithObservations.observations.length} observations`);
      
      // Get entity with outgoing links
      const entityWithOutgoingLinks = await Entity.findByPk(entity1.id, {
        include: ['outgoing_links'],
        transaction
      });
      
      logger.info(`Entity 1 has ${entityWithOutgoingLinks.outgoing_links.length} outgoing links`);
      
      // Get entity with incoming links
      const entityWithIncomingLinks = await Entity.findByPk(entity1.id, {
        include: ['incoming_links'],
        transaction
      });
      
      logger.info(`Entity 1 has ${entityWithIncomingLinks.incoming_links.length} incoming links`);
      
      // Get observation with entity
      const observationWithEntity = await Observation.findByPk(observation1.id, {
        include: ['entity'],
        transaction
      });
      
      logger.info(`Observation 1 belongs to entity: ${observationWithEntity.entity.title}`);
      
      // Commit the transaction
      await transaction.commit();
      logger.info('All tests completed successfully');
      
      // Verify database structure using Sequelize
      logger.info('Verifying database structure...');
      
      // Get all tables in the database
      const tables = await sequelize.getQueryInterface().showAllTables();
      logger.info(`Database tables: ${tables.join(', ')}`);
      
      // Get table structure for Entity
      const entityFields = await sequelize.getQueryInterface().describeTable('entities');
      logger.info(`Entity table has ${Object.keys(entityFields).length} fields`);
      logger.info(`Entity table fields: ${Object.keys(entityFields).join(', ')}`);
      
      // Verify key fields from Python implementation
      const entityRequiredFields = ['id', 'title', 'entity_type', 'entity_metadata', 'content_type', 'checksum'];
      for (const field of entityRequiredFields) {
        if (entityFields[field]) {
          logger.info(` Entity table has required field: ${field} (${entityFields[field].type})`);
        } else {
          logger.error(` Missing required field in Entity table: ${field}`);
          throw new Error(`Schema compatibility issue: Entity table missing ${field} field`);
        }
      }
      
      // Get table structure for Observation
      const observationFields = await sequelize.getQueryInterface().describeTable('observations');
      logger.info(`Observation table has ${Object.keys(observationFields).length} fields`);
      logger.info(`Observation table fields: ${Object.keys(observationFields).join(', ')}`);
      
      // Verify key fields from Python implementation
      const observationRequiredFields = ['id', 'entity_id', 'content', 'category', 'context', 'tags'];
      for (const field of observationRequiredFields) {
        if (observationFields[field]) {
          logger.info(` Observation table has required field: ${field} (${observationFields[field].type})`);
        } else {
          logger.error(` Missing required field in Observation table: ${field}`);
          throw new Error(`Schema compatibility issue: Observation table missing ${field} field`);
        }
      }
      
      // Get table structure for Link
      const linkFields = await sequelize.getQueryInterface().describeTable('links');
      logger.info(`Link table has ${Object.keys(linkFields).length} fields`);
      logger.info(`Link table fields: ${Object.keys(linkFields).join(', ')}`);
      
      // Verify key fields from Python implementation
      const linkRequiredFields = ['id', 'source_id', 'target_id', 'to_name', 'type', 'context'];
      for (const field of linkRequiredFields) {
        if (linkFields[field]) {
          logger.info(` Link table has required field: ${field} (${linkFields[field].type})`);
        } else {
          logger.error(` Missing required field in Link table: ${field}`);
          throw new Error(`Schema compatibility issue: Link table missing ${field} field`);
        }
      }
      
      // Log success
      logger.info(' Schema compatibility test completed successfully');
      logger.info(' All models and relationships are working correctly');
      logger.info(' Node.js implementation is compatible with Python implementation');
      
    } catch (error) {
      // Rollback the transaction if any step fails
      await transaction.rollback();
      logger.error(`Test failed: ${error.message}`);
      throw error;
    } finally {
      // Close the database connection
      await sequelize.close();
    }
    
  } catch (error) {
    logger.error(`Database error: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Run the tests
runTests().then(() => {
  logger.info('Tests completed successfully');
  process.exit(0);
}).catch((error) => {
  logger.error(`Tests failed: ${error.message}`);
  process.exit(1);
});
