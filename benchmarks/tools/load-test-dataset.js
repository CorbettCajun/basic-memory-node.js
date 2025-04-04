#!/usr/bin/env node

/**
 * Large Dataset Test Loader
 * 
 * This tool loads large datasets into the database and performs
 * performance testing to evaluate scalability.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { program } from 'commander';
import ProgressBar from 'progress';
import { performance } from 'perf_hooks';
import { entity, observation, relation, search } from '../../src/api/index.js';
import { sequelize } from '../../src/db/index.js';

// Path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = path.join(dirname(dirname(__filename)), 'data', 'large-datasets');

// Configure CLI
program
  .name('load-test-dataset')
  .description('Load and test large datasets for scalability testing')
  .version('1.0.0')
  .option('-s, --size <size>', 'Dataset size: small, medium, large, or xlarge', 'medium')
  .option('-d, --data-dir <directory>', 'Dataset directory', DATA_DIR)
  .option('-c, --clean', 'Clean database before loading', false)
  .option('-t, --tests <tests>', 'Comma-separated test names to run (all, entity, observation, relation, search)', 'all')
  .option('-n, --iterations <number>', 'Number of iterations per test', '10')
  .option('-r, --report <file>', 'Save report to file', 'scalability-report.json')
  .parse(process.argv);

const options = program.opts();

// Test configurations
const TEST_CONFIGS = {
  entity: [
    { name: 'entity-create', func: testEntityCreate },
    { name: 'entity-get', func: testEntityGet },
    { name: 'entity-list', func: testEntityList },
    { name: 'entity-update', func: testEntityUpdate },
    { name: 'entity-delete', func: testEntityDelete },
    { name: 'entity-batch-get', func: testEntityBatchGet }
  ],
  observation: [
    { name: 'observation-create', func: testObservationCreate },
    { name: 'observation-get', func: testObservationGet },
    { name: 'observation-list', func: testObservationList },
    { name: 'observation-list-for-entity', func: testObservationListForEntity }
  ],
  relation: [
    { name: 'relation-create', func: testRelationCreate },
    { name: 'relation-get', func: testRelationGet },
    { name: 'relation-list', func: testRelationList },
    { name: 'relation-get-outgoing', func: testRelationGetOutgoing },
    { name: 'relation-get-incoming', func: testRelationGetIncoming }
  ],
  search: [
    { name: 'search-text-small', func: testSearchTextSmall },
    { name: 'search-text-medium', func: testSearchTextMedium },
    { name: 'search-text-large', func: testSearchTextLarge },
    { name: 'search-with-filter', func: testSearchWithFilter },
    { name: 'search-observations', func: testSearchObservations }
  ]
};

// Helper to load JSON file
function loadJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading file ${filePath}:`, error);
    return null;
  }
}

/**
 * Clean database tables
 */
async function cleanDatabase() {
  console.log('Cleaning database...');
  try {
    await sequelize.query('DELETE FROM entity_fts');
    await sequelize.query('DELETE FROM relation');
    await sequelize.query('DELETE FROM observation');
    await sequelize.query('DELETE FROM entity');
    await sequelize.query('DELETE FROM search_index');
    console.log('Database cleaned successfully');
    return true;
  } catch (error) {
    console.error('Error cleaning database:', error);
    return false;
  }
}

/**
 * Load entities into database
 * 
 * @param {string} filePath - Path to entities JSON file
 * @returns {Promise<Array>} Loaded entity IDs
 */
async function loadEntities(filePath) {
  console.log(`Loading entities from ${filePath}...`);
  const entities = loadJsonFile(filePath);
  if (!entities || !entities.length) {
    console.error('No entities found in file');
    return [];
  }
  
  console.log(`Found ${entities.length} entities to load`);
  const bar = new ProgressBar('[:bar] :current/:total entities (:percent) - :etas remaining', {
    complete: '=',
    incomplete: ' ',
    width: 30,
    total: entities.length
  });
  
  const startTime = performance.now();
  const entityIds = [];
  
  // Load entities in batches for better performance
  const BATCH_SIZE = 100;
  for (let i = 0; i < entities.length; i += BATCH_SIZE) {
    const batch = entities.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (entityData) => {
      try {
        const result = await entity.createOrUpdate(entityData);
        entityIds.push(result.id);
        return true;
      } catch (error) {
        console.error(`Error creating entity ${entityData.title}:`, error);
        return false;
      }
    });
    
    await Promise.all(promises);
    bar.tick(batch.length);
  }
  
  const endTime = performance.now();
  console.log(`Loaded ${entityIds.length} entities in ${((endTime - startTime) / 1000).toFixed(2)}s`);
  
  return entityIds;
}

/**
 * Load observations into database
 * 
 * @param {string} filePath - Path to observations JSON file
 * @returns {Promise<Array>} Loaded observation IDs
 */
async function loadObservations(filePath) {
  console.log(`Loading observations from ${filePath}...`);
  const observations = loadJsonFile(filePath);
  if (!observations || !observations.length) {
    console.error('No observations found in file');
    return [];
  }
  
  console.log(`Found ${observations.length} observations to load`);
  const bar = new ProgressBar('[:bar] :current/:total observations (:percent) - :etas remaining', {
    complete: '=',
    incomplete: ' ',
    width: 30,
    total: observations.length
  });
  
  const startTime = performance.now();
  const observationIds = [];
  
  // Load observations in batches for better performance
  const BATCH_SIZE = 500;
  for (let i = 0; i < observations.length; i += BATCH_SIZE) {
    const batch = observations.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (obsData) => {
      try {
        const result = await observation.create(obsData);
        observationIds.push(result.id);
        return true;
      } catch (error) {
        console.error(`Error creating observation:`, error);
        return false;
      }
    });
    
    await Promise.all(promises);
    bar.tick(batch.length);
  }
  
  const endTime = performance.now();
  console.log(`Loaded ${observationIds.length} observations in ${((endTime - startTime) / 1000).toFixed(2)}s`);
  
  return observationIds;
}

/**
 * Load relations into database
 * 
 * @param {string} filePath - Path to relations JSON file
 * @returns {Promise<Array>} Loaded relation IDs
 */
async function loadRelations(filePath) {
  console.log(`Loading relations from ${filePath}...`);
  const relations = loadJsonFile(filePath);
  if (!relations || !relations.length) {
    console.error('No relations found in file');
    return [];
  }
  
  console.log(`Found ${relations.length} relations to load`);
  const bar = new ProgressBar('[:bar] :current/:total relations (:percent) - :etas remaining', {
    complete: '=',
    incomplete: ' ',
    width: 30,
    total: relations.length
  });
  
  const startTime = performance.now();
  const relationIds = [];
  
  // Load relations in batches for better performance
  const BATCH_SIZE = 200;
  for (let i = 0; i < relations.length; i += BATCH_SIZE) {
    const batch = relations.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (relData) => {
      try {
        const result = await relation.create(relData);
        relationIds.push(result.id);
        return true;
      } catch (error) {
        console.error(`Error creating relation:`, error);
        return false;
      }
    });
    
    await Promise.all(promises);
    bar.tick(batch.length);
  }
  
  const endTime = performance.now();
  console.log(`Loaded ${relationIds.length} relations in ${((endTime - startTime) / 1000).toFixed(2)}s`);
  
  return relationIds;
}

/**
 * Run a performance test
 * 
 * @param {Function} testFunction - Test function to run
 * @param {Object} testData - Test data
 * @param {number} iterations - Number of iterations
 * @returns {Object} Test results
 */
async function runTest(testFunction, testData, iterations) {
  const results = {
    iterations: [],
    average: 0,
    min: Number.MAX_SAFE_INTEGER,
    max: 0
  };
  
  let totalTime = 0;
  
  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    await testFunction(testData);
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    results.iterations.push(duration);
    totalTime += duration;
    
    results.min = Math.min(results.min, duration);
    results.max = Math.max(results.max, duration);
  }
  
  results.average = totalTime / iterations;
  return results;
}

// Test functions

async function testEntityCreate(data) {
  const newEntity = {
    id: `test-entity-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: `Test Entity ${Date.now()}`,
    content: `Test content for performance testing`,
    entity_type: 'test',
    permalink: `test-${Date.now()}`
  };
  
  return await entity.createOrUpdate(newEntity);
}

async function testEntityGet(data) {
  const randomIndex = Math.floor(Math.random() * data.entityIds.length);
  const entityId = data.entityIds[randomIndex];
  return await entity.get(entityId);
}

async function testEntityList(data) {
  return await entity.list({ limit: 100, offset: 0 });
}

async function testEntityUpdate(data) {
  const randomIndex = Math.floor(Math.random() * data.entityIds.length);
  const entityId = data.entityIds[randomIndex];
  return await entity.update(entityId, {
    title: `Updated Title ${Date.now()}`
  });
}

async function testEntityDelete(data) {
  // Create a temporary entity to delete
  const tempEntity = await testEntityCreate(data);
  return await entity.delete(tempEntity.id);
}

async function testEntityBatchGet(data) {
  const randomIndices = Array.from({ length: 20 }, () => 
    Math.floor(Math.random() * data.entityIds.length)
  );
  const entityIds = randomIndices.map(index => data.entityIds[index]);
  
  const results = [];
  for (const id of entityIds) {
    results.push(await entity.get(id));
  }
  return results;
}

async function testObservationCreate(data) {
  const randomIndex = Math.floor(Math.random() * data.entityIds.length);
  const entityId = data.entityIds[randomIndex];
  
  const newObservation = {
    entity_id: entityId,
    observer_id: 'test-system',
    observation_type: 'tag',
    value: `test-tag-${Date.now()}`
  };
  
  return await observation.create(newObservation);
}

async function testObservationGet(data) {
  const randomIndex = Math.floor(Math.random() * data.observationIds.length);
  const observationId = data.observationIds[randomIndex];
  return await observation.get(observationId);
}

async function testObservationList(data) {
  return await observation.list({ limit: 100, offset: 0 });
}

async function testObservationListForEntity(data) {
  const randomIndex = Math.floor(Math.random() * data.entityIds.length);
  const entityId = data.entityIds[randomIndex];
  return await observation.getForEntity(entityId);
}

async function testRelationCreate(data) {
  // Get two random entities
  const sourceIndex = Math.floor(Math.random() * data.entityIds.length);
  let targetIndex;
  do {
    targetIndex = Math.floor(Math.random() * data.entityIds.length);
  } while (targetIndex === sourceIndex);
  
  const sourceId = data.entityIds[sourceIndex];
  const targetId = data.entityIds[targetIndex];
  
  const newRelation = {
    source_id: sourceId,
    target_id: targetId,
    relation_type: 'test-relation'
  };
  
  return await relation.create(newRelation);
}

async function testRelationGet(data) {
  const randomIndex = Math.floor(Math.random() * data.relationIds.length);
  const relationId = data.relationIds[randomIndex];
  return await relation.get(relationId);
}

async function testRelationList(data) {
  return await relation.list({ limit: 100, offset: 0 });
}

async function testRelationGetOutgoing(data) {
  const randomIndex = Math.floor(Math.random() * data.entityIds.length);
  const entityId = data.entityIds[randomIndex];
  return await relation.getOutgoingRelations(entityId);
}

async function testRelationGetIncoming(data) {
  const randomIndex = Math.floor(Math.random() * data.entityIds.length);
  const entityId = data.entityIds[randomIndex];
  return await relation.getIncomingRelations(entityId);
}

async function testSearchTextSmall(data) {
  // Search for a common word that should appear in many entities
  return await search.searchEntities({
    query: 'test',
    limit: 20
  });
}

async function testSearchTextMedium(data) {
  // Search for a phrase
  return await search.searchEntities({
    query: 'content for',
    limit: 20,
    include_content: true
  });
}

async function testSearchTextLarge(data) {
  // Search with multiple terms
  return await search.searchEntities({
    query: 'test content performance',
    limit: 50,
    include_content: true
  });
}

async function testSearchWithFilter(data) {
  // Get a random entity type
  const types = ['note', 'document', 'image', 'code', 'reference', 'quote', 'task', 'project'];
  const randomType = types[Math.floor(Math.random() * types.length)];
  
  return await search.searchEntities({
    query: 'test',
    entity_type: randomType,
    limit: 20
  });
}

async function testSearchObservations(data) {
  // Search for observations
  return await search.searchObservations({
    query: 'test',
    limit: 20
  });
}

/**
 * Run all tests and generate report
 * 
 * @param {Object} testData - Test data
 * @param {Array<string>} testCategories - Test categories to run
 * @param {number} iterations - Number of iterations
 * @returns {Object} Test report
 */
async function runAllTests(testData, testCategories, iterations) {
  const report = {
    timestamp: new Date().toISOString(),
    dataset: {
      size: options.size,
      entities: testData.entityIds.length,
      observations: testData.observationIds.length,
      relations: testData.relationIds.length
    },
    tests: {},
    summary: {}
  };
  
  // Determine which tests to run
  let testsToRun = [];
  if (testCategories.includes('all')) {
    Object.values(TEST_CONFIGS).forEach(tests => {
      testsToRun = testsToRun.concat(tests);
    });
  } else {
    testCategories.forEach(category => {
      if (TEST_CONFIGS[category]) {
        testsToRun = testsToRun.concat(TEST_CONFIGS[category]);
      }
    });
  }
  
  console.log(`Running ${testsToRun.length} tests with ${iterations} iterations each...`);
  
  // Run each test
  for (const test of testsToRun) {
    console.log(`Running test: ${test.name}`);
    const results = await runTest(test.func, testData, iterations);
    report.tests[test.name] = {
      average_ms: results.average.toFixed(2),
      min_ms: results.min.toFixed(2),
      max_ms: results.max.toFixed(2),
      iterations: results.iterations.map(d => d.toFixed(2))
    };
    console.log(`  Average: ${results.average.toFixed(2)}ms, Min: ${results.min.toFixed(2)}ms, Max: ${results.max.toFixed(2)}ms`);
  }
  
  // Generate summary statistics
  const categories = Object.keys(TEST_CONFIGS);
  categories.forEach(category => {
    const categoryTests = TEST_CONFIGS[category];
    const testNames = categoryTests.map(test => test.name);
    
    const categoryResults = testNames
      .filter(name => report.tests[name])
      .map(name => parseFloat(report.tests[name].average_ms));
    
    if (categoryResults.length > 0) {
      const total = categoryResults.reduce((sum, val) => sum + val, 0);
      const average = total / categoryResults.length;
      report.summary[category] = {
        average_ms: average.toFixed(2),
        test_count: categoryResults.length
      };
    }
  });
  
  // Calculate overall average
  const allResults = Object.values(report.tests).map(test => parseFloat(test.average_ms));
  if (allResults.length > 0) {
    const total = allResults.reduce((sum, val) => sum + val, 0);
    const average = total / allResults.length;
    report.summary.overall = {
      average_ms: average.toFixed(2),
      test_count: allResults.length
    };
  }
  
  return report;
}

/**
 * Save report to file
 * 
 * @param {Object} report - Test report
 * @param {string} filePath - Output file path
 */
function saveReport(report, filePath) {
  try {
    const dirName = path.dirname(filePath);
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    console.log(`Report saved to ${filePath}`);
  } catch (error) {
    console.error(`Error saving report to ${filePath}:`, error);
  }
}

/**
 * Main function
 */
async function main() {
  // Initialize database
  console.log('Initializing database connection...');
  
  // Clean database if requested
  if (options.clean) {
    await cleanDatabase();
  }
  
  // Determine dataset files
  const size = options.size;
  const entitiesFile = path.join(options.dataDir, `entities-${size}.json`);
  const observationsFile = path.join(options.dataDir, `observations-${size}.json`);
  const relationsFile = path.join(options.dataDir, `relations-${size}.json`);
  
  // Check if files exist
  if (!fs.existsSync(entitiesFile)) {
    console.error(`Entities file not found: ${entitiesFile}`);
    console.log('Please generate the dataset first using generate-test-dataset.js');
    process.exit(1);
  }
  
  // Load dataset
  const testData = {};
  const startTime = performance.now();
  
  // Load entities
  testData.entityIds = await loadEntities(entitiesFile);
  
  // Load observations if file exists
  if (fs.existsSync(observationsFile)) {
    testData.observationIds = await loadObservations(observationsFile);
  } else {
    console.log('Observations file not found, skipping observations load');
    testData.observationIds = [];
  }
  
  // Load relations if file exists
  if (fs.existsSync(relationsFile)) {
    testData.relationIds = await loadRelations(relationsFile);
  } else {
    console.log('Relations file not found, skipping relations load');
    testData.relationIds = [];
  }
  
  const endTime = performance.now();
  console.log(`Dataset loaded in ${((endTime - startTime) / 1000).toFixed(2)}s`);
  
  // Parse test categories
  const testCategories = options.tests.split(',').map(t => t.trim().toLowerCase());
  
  // Run tests
  const iterations = parseInt(options.iterations, 10) || 10;
  const report = await runAllTests(testData, testCategories, iterations);
  
  // Save report
  saveReport(report, options.report);
  
  console.log('Testing completed successfully!');
}

// Run main function
main().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});
