/**
 * Entity Operations Benchmark Suite
 * 
 * This suite tests the performance of entity-related operations in Basic Memory.
 * It measures create, read, update, delete, and list operations to establish
 * a baseline for comparison with the Python implementation.
 */

import { entity } from '../../src/api/index.js';
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
const generateId = () => `test-entity-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

// Generate test data
const generateTestEntity = (id = generateId()) => ({
  id,
  title: `Test Entity ${id}`,
  type: 'benchmark-test',
  content: `This is a test entity created for benchmarking purposes. It contains some lorem ipsum text to make it more realistic.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`,
  metadata: {
    created: new Date().toISOString(),
    tags: ['benchmark', 'test', 'entity'],
    priority: Math.floor(Math.random() * 5) + 1,
    testValue: Math.random()
  }
});

// Test suite definition
export const suite = {
  name: 'Entity Operations',
  description: 'Benchmarks for entity CRUD operations',
  benchmarks: [
    // Create entity benchmark
    {
      name: 'Create Entity',
      iterations: 50,
      fn: async () => {
        const testEntity = generateTestEntity();
        return await entity.createOrUpdate(testEntity);
      }
    },
    
    // Get entity benchmark
    {
      name: 'Get Entity by ID',
      iterations: 100,
      setup: async () => {
        // Create an entity to retrieve
        const testEntity = generateTestEntity();
        const createdEntity = await entity.createOrUpdate(testEntity);
        return createdEntity.id;
      },
      fn: async (entityId) => {
        return await entity.get(entityId);
      }
    },
    
    // Update entity benchmark
    {
      name: 'Update Entity',
      iterations: 50,
      setup: async () => {
        // Create an entity to update
        const testEntity = generateTestEntity();
        const createdEntity = await entity.createOrUpdate(testEntity);
        return createdEntity.id;
      },
      fn: async (entityId) => {
        const existingEntity = await entity.get(entityId);
        existingEntity.title = `Updated: ${existingEntity.title}`;
        existingEntity.metadata.updated = new Date().toISOString();
        existingEntity.metadata.testValue = Math.random();
        return await entity.createOrUpdate(existingEntity);
      }
    },
    
    // List entities benchmark
    {
      name: 'List Entities',
      iterations: 20,
      setup: async () => {
        // Create a batch of entities
        const batchSize = 50;
        const prefix = `batch-${Date.now()}`;
        
        for (let i = 0; i < batchSize; i++) {
          const testEntity = generateTestEntity(`${prefix}-${i}`);
          testEntity.type = 'benchmark-batch';
          await entity.createOrUpdate(testEntity);
        }
        
        return { type: 'benchmark-batch' };
      },
      fn: async (filter) => {
        return await entity.list(filter);
      },
      cleanup: async (filter) => {
        // Clean up batch entities
        const entities = await entity.list(filter);
        for (const entity of entities) {
          await entity.delete(entity.id);
        }
      }
    },
    
    // Delete entity benchmark
    {
      name: 'Delete Entity',
      iterations: 50,
      setup: async () => {
        // Create an entity to delete
        const testEntity = generateTestEntity();
        const createdEntity = await entity.createOrUpdate(testEntity);
        return createdEntity.id;
      },
      fn: async (entityId) => {
        return await entity.delete(entityId);
      }
    },
    
    // Entity type listing benchmark
    {
      name: 'Get Entity Types',
      iterations: 20,
      setup: async () => {
        // Create entities with different types
        const types = ['type1', 'type2', 'type3', 'type4', 'type5'];
        
        for (const type of types) {
          for (let i = 0; i < 10; i++) {
            const testEntity = generateTestEntity();
            testEntity.type = type;
            await entity.createOrUpdate(testEntity);
          }
        }
      },
      fn: async () => {
        return await entity.getTypes();
      }
    },
    
    // Batch operation (create multiple entities)
    {
      name: 'Batch Create Entities (50)',
      iterations: 5,
      fn: async () => {
        const batchSize = 50;
        const entities = [];
        
        for (let i = 0; i < batchSize; i++) {
          const testEntity = generateTestEntity();
          const result = await entity.createOrUpdate(testEntity);
          entities.push(result);
        }
        
        return entities;
      }
    },
    
    // Update metadata benchmark
    {
      name: 'Update Entity Metadata',
      iterations: 50,
      setup: async () => {
        // Create an entity to update metadata
        const testEntity = generateTestEntity();
        const createdEntity = await entity.createOrUpdate(testEntity);
        return createdEntity.id;
      },
      fn: async (entityId) => {
        const metadata = {
          updated: new Date().toISOString(),
          testValue: Math.random(),
          tags: ['updated', 'benchmark', 'metadata']
        };
        
        return await entity.updateMetadata(entityId, metadata);
      }
    }
  ]
};

// Helper to properly run setup and cleanup
export async function runEntityBenchmarks() {
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
  runEntityBenchmarks()
    .then(results => {
      console.log('Benchmark results:', JSON.stringify(results, null, 2));
    })
    .catch(error => {
      console.error('Error running benchmarks:', error);
    });
}
