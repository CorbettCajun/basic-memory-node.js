#!/usr/bin/env node

/**
 * Large Dataset Generator for Performance Testing
 * 
 * This tool generates large test datasets for performance and scalability testing.
 * It creates entities, observations, and relations in various sizes to test
 * database performance at scale.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { program } from 'commander';
import { faker } from '@faker-js/faker';
import ProgressBar from 'progress';
import { performance } from 'perf_hooks';

// Path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = path.join(dirname(dirname(__filename)), 'data', 'large-datasets');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Configure CLI
program
  .name('generate-test-dataset')
  .description('Generate large test datasets for performance testing')
  .version('1.0.0')
  .option('-s, --size <size>', 'Dataset size: small, medium, large, or xlarge', 'medium')
  .option('-t, --type <type>', 'Dataset type: entities, observations, relations, or all', 'all')
  .option('-o, --output <directory>', 'Output directory', DATA_DIR)
  .option('--seed <seed>', 'Random seed for reproducible datasets', '42')
  .parse(process.argv);

const options = program.opts();

// Dataset size configurations
const DATASET_SIZES = {
  small: {
    entities: 1000,
    observationsPerEntity: 5,
    relationsPerEntity: 3,
    contentLength: 2000
  },
  medium: {
    entities: 10000,
    observationsPerEntity: 10,
    relationsPerEntity: 5,
    contentLength: 5000
  },
  large: {
    entities: 50000,
    observationsPerEntity: 20,
    relationsPerEntity: 10,
    contentLength: 10000
  },
  xlarge: {
    entities: 100000,
    observationsPerEntity: 30,
    relationsPerEntity: 15,
    contentLength: 20000
  }
};

// Entity types for variety
const ENTITY_TYPES = ['note', 'document', 'image', 'code', 'reference', 'quote', 'task', 'project'];

// Observation types
const OBSERVATION_TYPES = ['tag', 'category', 'priority', 'status', 'author', 'source', 'reference', 'keyword'];

// Relation types
const RELATION_TYPES = ['link', 'reference', 'dependency', 'parent-child', 'mention', 'citation', 'related-to', 'inspired-by'];

/**
 * Generate a large set of test entities
 * 
 * @param {Object} config - Dataset configuration
 * @returns {Array<Object>} Generated entities
 */
function generateEntities(config) {
  console.log(`Generating ${config.entities} entities...`);
  const entities = [];
  const bar = new ProgressBar('[:bar] :current/:total entities (:percent) - :etas remaining', {
    complete: '=',
    incomplete: ' ',
    width: 30,
    total: config.entities
  });
  
  const startTime = performance.now();
  
  for (let i = 0; i < config.entities; i++) {
    const id = `test-entity-${i}`;
    const entity = {
      id,
      title: faker.lorem.sentence(5),
      content: faker.lorem.paragraphs(Math.ceil(config.contentLength / 500), '\n\n'),
      entity_type: ENTITY_TYPES[Math.floor(Math.random() * ENTITY_TYPES.length)],
      permalink: `test-${i}`,
      metadata: JSON.stringify({
        created_date: faker.date.past().toISOString(),
        author: faker.person.fullName(),
        source: faker.internet.url(),
        word_count: Math.floor(Math.random() * 1000) + 100,
        read_time: Math.floor(Math.random() * 20) + 1,
        keywords: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, () => faker.lorem.word())
      }),
      checksum: faker.string.alphanumeric(32)
    };
    
    entities.push(entity);
    bar.tick();
  }
  
  const endTime = performance.now();
  console.log(`Generated ${entities.length} entities in ${((endTime - startTime) / 1000).toFixed(2)}s`);
  
  return entities;
}

/**
 * Generate observations for entities
 * 
 * @param {Array<Object>} entities - Source entities
 * @param {Object} config - Dataset configuration
 * @returns {Array<Object>} Generated observations
 */
function generateObservations(entities, config) {
  const observations = [];
  const totalObservations = entities.length * config.observationsPerEntity;
  
  console.log(`Generating ${totalObservations} observations...`);
  const bar = new ProgressBar('[:bar] :current/:total observations (:percent) - :etas remaining', {
    complete: '=',
    incomplete: ' ',
    width: 30,
    total: totalObservations
  });
  
  const startTime = performance.now();
  let observationId = 1;
  
  for (const entity of entities) {
    const observationCount = config.observationsPerEntity;
    
    // Generate a random number of observations for this entity
    for (let i = 0; i < observationCount; i++) {
      const observationType = OBSERVATION_TYPES[Math.floor(Math.random() * OBSERVATION_TYPES.length)];
      
      // Generate appropriate value based on observation type
      let value;
      switch (observationType) {
        case 'tag':
          value = faker.lorem.word();
          break;
        case 'category':
          value = faker.commerce.department();
          break;
        case 'priority':
          value = ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)];
          break;
        case 'status':
          value = ['draft', 'in-progress', 'review', 'completed'][Math.floor(Math.random() * 4)];
          break;
        case 'author':
          value = faker.person.fullName();
          break;
        case 'source':
          value = faker.internet.url();
          break;
        case 'reference':
          value = faker.lorem.sentence(3);
          break;
        case 'keyword':
          value = faker.lorem.word();
          break;
        default:
          value = faker.lorem.word();
      }
      
      const observation = {
        id: observationId++,
        entity_id: entity.id,
        entity_permalink: entity.permalink, // Add permalink for API compatibility
        observer_id: 'test-system',
        observation_type: observationType,
        value,
        context: JSON.stringify({
          timestamp: faker.date.recent().toISOString(),
          confidence: Math.random().toFixed(2),
          source: 'benchmark-generator'
        })
      };
      
      observations.push(observation);
      bar.tick();
    }
  }
  
  const endTime = performance.now();
  console.log(`Generated ${observations.length} observations in ${((endTime - startTime) / 1000).toFixed(2)}s`);
  
  return observations;
}

/**
 * Generate relations between entities
 * 
 * @param {Array<Object>} entities - Source entities
 * @param {Object} config - Dataset configuration
 * @returns {Array<Object>} Generated relations
 */
function generateRelations(entities, config) {
  const relations = [];
  const totalRelations = entities.length * config.relationsPerEntity;
  
  console.log(`Generating ${totalRelations} relations...`);
  const bar = new ProgressBar('[:bar] :current/:total relations (:percent) - :etas remaining', {
    complete: '=',
    incomplete: ' ',
    width: 30,
    total: totalRelations
  });
  
  const startTime = performance.now();
  let relationId = 1;
  
  for (const entity of entities) {
    const relationCount = config.relationsPerEntity;
    
    // Create relations to random entities
    for (let i = 0; i < relationCount; i++) {
      // Select a random target entity (different from source)
      let targetIndex;
      do {
        targetIndex = Math.floor(Math.random() * entities.length);
      } while (entities[targetIndex].id === entity.id);
      
      const targetEntity = entities[targetIndex];
      const relationType = RELATION_TYPES[Math.floor(Math.random() * RELATION_TYPES.length)];
      
      const relation = {
        id: relationId++,
        source_id: entity.id,
        target_id: targetEntity.id,
        relation_type: relationType,
        to_name: targetEntity.title,
        context: JSON.stringify({
          timestamp: faker.date.recent().toISOString(),
          source: 'benchmark-generator',
          weight: (Math.random() * 0.9 + 0.1).toFixed(2),
          bidirectional: Math.random() > 0.7
        })
      };
      
      relations.push(relation);
      bar.tick();
    }
  }
  
  const endTime = performance.now();
  console.log(`Generated ${relations.length} relations in ${((endTime - startTime) / 1000).toFixed(2)}s`);
  
  return relations;
}

/**
 * Save dataset to files
 * 
 * @param {Object} dataset - Generated dataset
 * @param {string} outputDir - Output directory
 * @param {string} size - Dataset size name
 */
function saveDataset(dataset, outputDir, size) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log(`Saving dataset to ${outputDir}...`);
  
  // Save entities
  if (dataset.entities && dataset.entities.length) {
    const entitiesFile = path.join(outputDir, `entities-${size}.json`);
    fs.writeFileSync(entitiesFile, JSON.stringify(dataset.entities, null, 2));
    console.log(`- Saved ${dataset.entities.length} entities to ${entitiesFile}`);
  }
  
  // Save observations
  if (dataset.observations && dataset.observations.length) {
    const observationsFile = path.join(outputDir, `observations-${size}.json`);
    fs.writeFileSync(observationsFile, JSON.stringify(dataset.observations, null, 2));
    console.log(`- Saved ${dataset.observations.length} observations to ${observationsFile}`);
  }
  
  // Save relations
  if (dataset.relations && dataset.relations.length) {
    const relationsFile = path.join(outputDir, `relations-${size}.json`);
    fs.writeFileSync(relationsFile, JSON.stringify(dataset.relations, null, 2));
    console.log(`- Saved ${dataset.relations.length} relations to ${relationsFile}`);
  }
  
  // Save dataset info
  const infoFile = path.join(outputDir, `dataset-${size}-info.json`);
  fs.writeFileSync(infoFile, JSON.stringify({
    size,
    timestamp: new Date().toISOString(),
    counts: {
      entities: dataset.entities ? dataset.entities.length : 0,
      observations: dataset.observations ? dataset.observations.length : 0,
      relations: dataset.relations ? dataset.relations.length : 0
    },
    configuration: DATASET_SIZES[size]
  }, null, 2));
  
  console.log(`- Saved dataset info to ${infoFile}`);
}

/**
 * Main function
 */
async function main() {
  // Set random seed for reproducibility
  faker.seed(parseInt(options.seed, 10) || 42);
  
  const sizeConfig = DATASET_SIZES[options.size] || DATASET_SIZES.medium;
  
  console.log(`Generating ${options.size} dataset with configuration:`, sizeConfig);
  
  const dataset = {};
  const startTime = performance.now();
  
  // Generate requested dataset types
  if (options.type === 'all' || options.type === 'entities') {
    dataset.entities = generateEntities(sizeConfig);
  }
  
  if (options.type === 'all' || options.type === 'observations') {
    if (!dataset.entities) {
      dataset.entities = generateEntities(sizeConfig);
    }
    dataset.observations = generateObservations(dataset.entities, sizeConfig);
  }
  
  if (options.type === 'all' || options.type === 'relations') {
    if (!dataset.entities) {
      dataset.entities = generateEntities(sizeConfig);
    }
    dataset.relations = generateRelations(dataset.entities, sizeConfig);
  }
  
  const endTime = performance.now();
  console.log(`Dataset generation completed in ${((endTime - startTime) / 1000).toFixed(2)}s`);
  
  // Save dataset
  saveDataset(dataset, options.output, options.size);
}

// Run main function
main().catch(error => {
  console.error('Error generating dataset:', error);
  process.exit(1);
});
