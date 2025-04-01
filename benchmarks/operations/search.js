/**
 * Search Operations Benchmark Suite
 * 
 * This suite tests the performance of search-related operations in Basic Memory.
 * It measures entity search, observation search, and index operations to establish
 * a baseline for comparison with the Python implementation.
 */

import { entity, observation, search } from '../../src/api/index.js';
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
const generateId = () => `test-search-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

// Generate test data with searchable content
const generateTestEntity = async (keywords = []) => {
  const id = `test-entity-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  
  // Include keywords in the content to make it searchable
  const keywordText = keywords.length > 0 
    ? `This entity contains the following keywords: ${keywords.join(', ')}.` 
    : '';
    
  const testEntity = {
    id,
    title: `Test Entity ${id} ${keywords.length > 0 ? keywords[0] : ''}`,
    type: 'benchmark-test-search',
    content: `This is a test entity for search benchmarks. ${keywordText}\n\nThe entity contains various paragraphs and sentences to make search more realistic. Search algorithms need to process text efficiently to provide relevant results quickly. Performance is critical for search operations, especially as the knowledge base grows.`,
    metadata: {
      created: new Date().toISOString(),
      tags: ['benchmark', 'test', 'search', ...keywords],
      testValue: Math.random()
    }
  };
  
  return await entity.createOrUpdate(testEntity);
};

const generateTestObservation = async (entityId, keywords = []) => {
  // Include keywords in the content to make it searchable
  const keywordText = keywords.length > 0 
    ? `This observation contains the following keywords: ${keywords.join(', ')}.` 
    : '';
  
  const testObservation = {
    id: generateId(),
    entity_id: entityId,
    category: 'benchmark-test-search',
    content: `This is a test observation for search benchmarking. ${keywordText}\n\nThe observation includes various paragraphs to simulate real-world content that would be searched. The text needs to be substantial enough to properly test search performance across different content sizes and types.`,
    metadata: {
      created: new Date().toISOString(),
      tags: ['benchmark', 'test', 'search', ...keywords],
      priority: Math.floor(Math.random() * 5) + 1,
      testValue: Math.random()
    }
  };
  
  return await observation.create(testObservation);
};

// Generate dataset with various search terms
async function generateSearchDataset() {
  console.log('Generating search benchmark dataset...');
  
  // Set of keywords that will be used in searches
  const keywords = [
    'unique', 'specific', 'important', 'critical', 'essential',
    'performance', 'optimization', 'algorithm', 'methodology', 'approach',
    'technical', 'scientific', 'analytical', 'theoretical', 'practical',
    'implementation', 'development', 'framework', 'architecture', 'structure'
  ];
  
  // Create entities with different keyword distributions
  for (let i = 0; i < 20; i++) {
    // Select 2-4 random keywords for this entity
    const numKeywords = Math.floor(Math.random() * 3) + 2;
    const entityKeywords = [];
    
    for (let j = 0; j < numKeywords; j++) {
      const keyword = keywords[Math.floor(Math.random() * keywords.length)];
      if (!entityKeywords.includes(keyword)) {
        entityKeywords.push(keyword);
      }
    }
    
    // Create the entity
    const testEntity = await generateTestEntity(entityKeywords);
    
    // Create 2-5 observations for each entity
    const numObservations = Math.floor(Math.random() * 4) + 2;
    for (let j = 0; j < numObservations; j++) {
      // Select 1-3 random keywords for this observation
      const numObsKeywords = Math.floor(Math.random() * 3) + 1;
      const obsKeywords = [];
      
      for (let k = 0; k < numObsKeywords; k++) {
        const keyword = keywords[Math.floor(Math.random() * keywords.length)];
        if (!obsKeywords.includes(keyword)) {
          obsKeywords.push(keyword);
        }
      }
      
      await generateTestObservation(testEntity.id, obsKeywords);
    }
  }
  
  // Ensure search indices are updated
  await search.rebuildIndices();
  
  console.log('Search benchmark dataset generation complete.');
  
  // Return the keywords used for tests
  return keywords;
}

// Test suite definition
export const suite = {
  name: 'Search Operations',
  description: 'Benchmarks for search operations and index management',
  benchmarks: [
    // Search entities benchmark
    {
      name: 'Search Entities - Simple Query',
      iterations: 20,
      setup: async () => {
        // The dataset should already be generated
        // Return a simple search query
        return 'performance';
      },
      fn: async (query) => {
        return await search.entities(query);
      }
    },
    
    // Search entities with filtering
    {
      name: 'Search Entities with Type Filter',
      iterations: 20,
      setup: async () => {
        return {
          query: 'important',
          filters: {
            type: 'benchmark-test-search'
          }
        };
      },
      fn: async (params) => {
        return await search.entities(params.query, params.filters);
      }
    },
    
    // Complex entity search
    {
      name: 'Search Entities - Complex Query',
      iterations: 20,
      setup: async () => {
        return 'performance optimization algorithm';
      },
      fn: async (query) => {
        return await search.entities(query);
      }
    },
    
    // Search observations
    {
      name: 'Search Observations - Simple Query',
      iterations: 20,
      setup: async () => {
        return 'critical';
      },
      fn: async (query) => {
        return await search.observations(query);
      }
    },
    
    // Search observations with filtering
    {
      name: 'Search Observations with Category Filter',
      iterations: 20,
      setup: async () => {
        return {
          query: 'methodology',
          filters: {
            category: 'benchmark-test-search'
          }
        };
      },
      fn: async (params) => {
        return await search.observations(params.query, params.filters);
      }
    },
    
    // Complex observation search
    {
      name: 'Search Observations - Complex Query',
      iterations: 20,
      setup: async () => {
        return 'theoretical practical implementation';
      },
      fn: async (query) => {
        return await search.observations(query);
      }
    },
    
    // Update search index
    {
      name: 'Update Search Index',
      iterations: 5,
      setup: async () => {
        // Create a new entity that needs indexing
        const testEntity = await generateTestEntity(['indextest', 'updateindex']);
        
        // Create some observations for the entity
        for (let i = 0; i < 3; i++) {
          await generateTestObservation(testEntity.id, ['indextest', 'updateindex']);
        }
        
        return testEntity.id;
      },
      fn: async (entityId) => {
        return await search.updateIndex(entityId);
      }
    },
    
    // Rebuild search indices
    {
      name: 'Rebuild All Search Indices',
      iterations: 3,
      fn: async () => {
        return await search.rebuildIndices();
      }
    }
  ]
};

// Helper to properly run setup and cleanup
export async function runSearchBenchmarks() {
  const results = [];
  
  // First, generate the dataset if needed
  console.log('Checking for existing search dataset...');
  const entities = await entity.list({ type: 'benchmark-test-search' });
  
  if (entities.length < 20) {
    console.log('Insufficient benchmark data. Generating new dataset...');
    await generateSearchDataset();
  } else {
    console.log(`Found ${entities.length} existing benchmark entities. Proceeding with benchmarks...`);
  }
  
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
  runSearchBenchmarks()
    .then(results => {
      console.log('Benchmark results:', JSON.stringify(results, null, 2));
    })
    .catch(error => {
      console.error('Error running benchmarks:', error);
    });
}
