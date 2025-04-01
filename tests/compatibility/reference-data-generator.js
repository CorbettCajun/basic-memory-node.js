/**
 * Reference Data Generator for Cross-Implementation Testing
 * 
 * This module generates consistent test data sets for validating compatibility
 * between Python and Node.js implementations of Basic Memory.
 */

const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');

// Configuration
const REFERENCE_DATA_PATH = path.join(__dirname, '../../test_data/reference_data');

// Ensure reference data directory exists
if (!fs.existsSync(REFERENCE_DATA_PATH)) {
  fs.mkdirSync(REFERENCE_DATA_PATH, { recursive: true });
}

/**
 * Generate a deterministic dataset using a specified seed
 * This ensures both Python and Node.js implementations generate identical test data
 * @param {number} seed - Seed value for deterministic generation
 */
function setSeed(seed = 12345) {
  faker.seed(seed);
  console.log(`Set reference data generator seed to: ${seed}`);
}

/**
 * Create a reference entity with consistent properties
 * @param {number} index - Index to ensure uniqueness
 * @param {string} source - Source of the entity (e.g., 'python', 'node')
 * @returns {Object} Generated entity object
 */
function generateEntity(index, source = 'reference') {
  const entity = {
    id: `ent_${index.toString().padStart(5, '0')}`,
    name: `entity_${source}_${index}`,
    content: faker.lorem.paragraphs(2),
    content_type: 'text/markdown',
    entity_metadata: JSON.stringify({
      source: source,
      testCase: `reference_${index}`,
      tags: [faker.word.adjective(), faker.word.noun()],
      category: faker.helpers.arrayElement(['test', 'development', 'production']),
      priority: faker.helpers.arrayElement(['high', 'medium', 'low'])
    }),
    checksum: faker.git.commitSha(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString()
  };
  
  return entity;
}

/**
 * Create a reference observation for an entity
 * @param {string} entityName - Name of the entity being observed
 * @param {number} index - Index to ensure uniqueness
 * @returns {Object} Generated observation object
 */
function generateObservation(entityName, index) {
  const observationTypes = ['metadata', 'content', 'link', 'attribute', 'usage'];
  const type = faker.helpers.arrayElement(observationTypes);
  
  let content;
  switch (type) {
    case 'metadata':
      content = JSON.stringify({
        key: faker.word.noun(),
        value: faker.lorem.word(),
        numeric: faker.number.int(100)
      });
      break;
    case 'content':
      content = faker.lorem.paragraph();
      break;
    case 'link':
      content = JSON.stringify({
        target: `entity_reference_${faker.number.int({ min: 1, max: 10 })}`,
        context: faker.lorem.sentence()
      });
      break;
    case 'attribute':
      content = JSON.stringify({
        attribute: faker.word.adjective(),
        value: faker.helpers.arrayElement([true, false, faker.number.int(10), faker.lorem.word()])
      });
      break;
    case 'usage':
      content = JSON.stringify({
        action: faker.helpers.arrayElement(['view', 'edit', 'search', 'reference']),
        timestamp: faker.date.recent().toISOString(),
        user: faker.internet.userName()
      });
      break;
  }
  
  return {
    id: `obs_${index.toString().padStart(5, '0')}`,
    entity_name: entityName,
    observation_type: type,
    observation_content: content,
    created_at: faker.date.recent().toISOString()
  };
}

/**
 * Create a reference relation between two entities
 * @param {string} fromName - Source entity name
 * @param {string} toName - Target entity name
 * @param {number} index - Index to ensure uniqueness
 * @returns {Object} Generated relation object
 */
function generateRelation(fromName, toName, index) {
  const relationTypes = ['references', 'contains', 'extends', 'implements', 'uses', 'requires'];
  
  return {
    id: `rel_${index.toString().padStart(5, '0')}`,
    from_name: fromName,
    to_name: toName,
    relation_type: faker.helpers.arrayElement(relationTypes),
    context: faker.lorem.sentence(),
    created_at: faker.date.recent().toISOString()
  };
}

/**
 * Generate a complete reference dataset
 * @param {number} entityCount - Number of entities to generate
 * @param {number} observationsPerEntity - Number of observations per entity
 * @param {number} relationsCount - Number of relations to generate
 * @param {number} seed - Seed for deterministic generation
 * @returns {Object} Complete reference dataset
 */
function generateReferenceDataset(entityCount = 10, observationsPerEntity = 3, relationsCount = 15, seed = 12345) {
  // Set seed for deterministic generation
  setSeed(seed);
  
  console.log(`Generating reference dataset with ${entityCount} entities...`);
  
  const entities = [];
  const observations = [];
  const relations = [];
  
  // Generate entities
  for (let i = 1; i <= entityCount; i++) {
    const entity = generateEntity(i);
    entities.push(entity);
    
    // Generate observations for this entity
    for (let j = 1; j <= observationsPerEntity; j++) {
      const obsIndex = (i - 1) * observationsPerEntity + j;
      const observation = generateObservation(entity.name, obsIndex);
      observations.push(observation);
    }
  }
  
  // Generate relations (connections between entities)
  for (let i = 1; i <= relationsCount; i++) {
    const fromIndex = faker.number.int({ min: 0, max: entityCount - 1 });
    let toIndex;
    
    do {
      toIndex = faker.number.int({ min: 0, max: entityCount - 1 });
    } while (toIndex === fromIndex); // Ensure we don't relate an entity to itself
    
    const relation = generateRelation(
      entities[fromIndex].name,
      entities[toIndex].name,
      i
    );
    
    relations.push(relation);
  }
  
  return {
    entities,
    observations,
    relations,
    metadata: {
      generated: new Date().toISOString(),
      seed,
      counts: {
        entities: entities.length,
        observations: observations.length,
        relations: relations.length
      }
    }
  };
}

/**
 * Save generated dataset to disk as JSON files
 * @param {Object} dataset - The dataset to save
 * @param {string} outputDir - Directory to save files to
 * @returns {Object} Paths to saved files
 */
function saveReferenceDataset(dataset, outputDir = REFERENCE_DATA_PATH) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseFilename = `reference_data_${timestamp}`;
  
  // Save complete dataset
  const completeDataPath = path.join(outputDir, `${baseFilename}_complete.json`);
  fs.writeFileSync(completeDataPath, JSON.stringify(dataset, null, 2));
  
  // Save individual component files
  const entitiesPath = path.join(outputDir, `${baseFilename}_entities.json`);
  fs.writeFileSync(entitiesPath, JSON.stringify(dataset.entities, null, 2));
  
  const observationsPath = path.join(outputDir, `${baseFilename}_observations.json`);
  fs.writeFileSync(observationsPath, JSON.stringify(dataset.observations, null, 2));
  
  const relationsPath = path.join(outputDir, `${baseFilename}_relations.json`);
  fs.writeFileSync(relationsPath, JSON.stringify(dataset.relations, null, 2));
  
  console.log(`Reference dataset saved to ${outputDir}`);
  
  return {
    complete: completeDataPath,
    entities: entitiesPath,
    observations: observationsPath,
    relations: relationsPath,
    metadata: dataset.metadata
  };
}

/**
 * Main function to generate and save a reference dataset
 */
function generateAndSaveReferenceData(options = {}) {
  const {
    entityCount = 10,
    observationsPerEntity = 3,
    relationsCount = 15,
    seed = 12345,
    outputDir = REFERENCE_DATA_PATH
  } = options;
  
  const dataset = generateReferenceDataset(
    entityCount,
    observationsPerEntity,
    relationsCount,
    seed
  );
  
  return saveReferenceDataset(dataset, outputDir);
}

// Execute the generator if this module is run directly
if (require.main === module) {
  const result = generateAndSaveReferenceData();
  console.log('Reference data generation complete.');
  console.log('Saved files:', result);
}

// Export functions for use in other modules
module.exports = {
  setSeed,
  generateEntity,
  generateObservation,
  generateRelation,
  generateReferenceDataset,
  saveReferenceDataset,
  generateAndSaveReferenceData
};
