/**
 * Observation Operations Benchmark Suite
 * 
 * This suite tests the performance of observation-related operations in Basic Memory.
 * It measures create, read, update, delete, and filtering operations to establish
 * a baseline for comparison with the Python implementation.
 */

import { entity, observation } from '../../src/api/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = path.join(dirname(dirname(__filename)), 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Generate a unique ID for testing
const generateId = () => `test-obs-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

// Generate test data
const generateTestEntity = async () => {
  const id = `test-entity-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const testEntity = {
    id,
    title: `Test Entity ${id}`,
    type: 'benchmark-test-entity',
    content: `This is a test entity for observation benchmarks.`,
    metadata: {
      created: new Date().toISOString(),
      tags: ['benchmark', 'test'],
      testValue: Math.random()
    }
  };
  
  return await entity.createOrUpdate(testEntity);
};

const generateTestObservation = async (entityId) => {
  return {
    id: generateId(),
    entity_id: entityId,
    category: 'benchmark-test',
    content: `This is a test observation for benchmarking. It contains some sample text to make it more realistic.\n\nThe observation is attached to entity ${entityId} and includes various test data to simulate real-world usage patterns.`,
    metadata: {
      created: new Date().toISOString(),
      tags: ['benchmark', 'test', 'observation'],
      priority: Math.floor(Math.random() * 5) + 1,
      confidence: Math.random(),
      testValue: Math.random()
    }
  };
};

// Test suite definition
export const suite = {
  name: 'Observation Operations',
  description: 'Benchmarks for observation CRUD operations',
  benchmarks: [
    // Create observation benchmark
    {
      name: 'Create Observation',
      iterations: 50,
      setup: async () => {
        // Create an entity to attach observations to
        return await generateTestEntity();
      },
      fn: async (testEntity) => {
        const testObservation = await generateTestObservation(testEntity.id);
        return await observation.create(testObservation);
      }
    },
    
    // Get observation benchmark
    {
      name: 'Get Observation by ID',
      iterations: 100,
      setup: async () => {
        // Create an entity and observation to retrieve
        const testEntity = await generateTestEntity();
        const testObservation = await generateTestObservation(testEntity.id);
        const createdObservation = await observation.create(testObservation);
        return createdObservation.id;
      },
      fn: async (observationId) => {
        return await observation.getById(observationId);
      }
    },
    
    // Get observations for entity benchmark
    {
      name: 'Get Observations for Entity',
      iterations: 20,
      setup: async () => {
        // Create an entity with multiple observations
        const testEntity = await generateTestEntity();
        const batchSize = 20;
        
        for (let i = 0; i < batchSize; i++) {
          const testObservation = await generateTestObservation(testEntity.id);
          await observation.create(testObservation);
        }
        
        return testEntity.id;
      },
      fn: async (entityId) => {
        return await observation.get({ entity_id: entityId });
      }
    },
    
    // Update observation benchmark
    {
      name: 'Update Observation',
      iterations: 50,
      setup: async () => {
        // Create an entity and observation to update
        const testEntity = await generateTestEntity();
        const testObservation = await generateTestObservation(testEntity.id);
        const createdObservation = await observation.create(testObservation);
        return createdObservation.id;
      },
      fn: async (observationId) => {
        const existingObservation = await observation.getById(observationId);
        existingObservation.content = `Updated: ${existingObservation.content}`;
        existingObservation.metadata.updated = new Date().toISOString();
        existingObservation.metadata.testValue = Math.random();
        return await observation.update(observationId, existingObservation);
      }
    },
    
    // Delete observation benchmark
    {
      name: 'Delete Observation',
      iterations: 50,
      setup: async () => {
        // Create an entity and observation to delete
        const testEntity = await generateTestEntity();
        const testObservation = await generateTestObservation(testEntity.id);
        const createdObservation = await observation.create(testObservation);
        return createdObservation.id;
      },
      fn: async (observationId) => {
        return await observation.delete(observationId);
      }
    },
    
    // Get observation categories benchmark
    {
      name: 'Get Observation Categories',
      iterations: 20,
      setup: async () => {
        // Create observations with different categories
        const testEntity = await generateTestEntity();
        const categories = ['category1', 'category2', 'category3', 'category4', 'category5'];
        
        for (const category of categories) {
          for (let i = 0; i < 5; i++) {
            const testObservation = await generateTestObservation(testEntity.id);
            testObservation.category = category;
            await observation.create(testObservation);
          }
        }
      },
      fn: async () => {
        return await observation.getCategories();
      }
    },
    
    // Batch operation (create multiple observations)
    {
      name: 'Batch Create Observations (20)',
      iterations: 5,
      setup: async () => {
        // Create an entity for batch observations
        return await generateTestEntity();
      },
      fn: async (testEntity) => {
        const batchSize = 20;
        const observations = [];
        
        for (let i = 0; i < batchSize; i++) {
          const testObservation = await generateTestObservation(testEntity.id);
          const result = await observation.create(testObservation);
          observations.push(result);
        }
        
        return observations;
      }
    },
    
    // Filter observations by category
    {
      name: 'Filter Observations by Category',
      iterations: 20,
      setup: async () => {
        // Create observations with specific categories
        const testEntity = await generateTestEntity();
        const categories = ['filterTest1', 'filterTest2', 'filterTest3'];
        
        for (const category of categories) {
          for (let i = 0; i < 10; i++) {
            const testObservation = await generateTestObservation(testEntity.id);
            testObservation.category = category;
            await observation.create(testObservation);
          }
        }
        
        return 'filterTest2';
      },
      fn: async (category) => {
        return await observation.get({ category });
      }
    }
  ]
};

// Helper to properly run setup and cleanup
export async function runObservationBenchmarks() {
  const results = [];
  
  for (const benchmark of suite.benchmarks) {
    console.log(`Running benchmark: ${benchmark.name}`);
    
    // Run setup if defined
    let setupResult;
    if (benchmark.setup) {
      setupResult = await benchmark.setup();
    }
    
    // Run the benchmark
    const startTime = process.hrtime.bigint();
    for (let i = 0; i < benchmark.iterations; i++) {
      await benchmark.fn(setupResult);
    }
    const endTime = process.hrtime.bigint();
    
    // Run cleanup if defined
    if (benchmark.cleanup) {
      await benchmark.cleanup(setupResult);
    }
    
    // Calculate and record results
    const durationNs = Number(endTime - startTime);
    const durationMs = durationNs / 1_000_000;
    const averageMs = durationMs / benchmark.iterations;
    
    results.push({
      name: benchmark.name,
      iterations: benchmark.iterations,
      totalMs: durationMs,
      averageMs: averageMs
    });
    
    console.log(`  ${benchmark.iterations} iterations in ${durationMs.toFixed(2)}ms (avg: ${averageMs.toFixed(2)}ms)`);
  }
  
  return results;
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runObservationBenchmarks()
    .then(results => {
      console.log('Benchmark results:', JSON.stringify(results, null, 2));
    })
    .catch(error => {
      console.error('Error running benchmarks:', error);
    });
}
