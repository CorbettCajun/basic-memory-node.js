/**
 * Relation Operations Benchmark Suite
 * 
 * This suite tests the performance of relation-related operations in Basic Memory.
 * It measures create, read, delete, and list operations to establish
 * a baseline for comparison with the Python implementation.
 */

import { entity, relation } from '../../src/api/index.js';
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

// Generate test entities for relation testing
const generateTestEntities = async () => {
  const sourceId = generateId();
  const targetId = generateId();
  
  const sourceEntity = await entity.create({
    id: sourceId,
    title: `Source Entity ${sourceId}`,
    content: `Test content for source entity ${sourceId}`,
    entity_type: 'note',
    permalink: `test-source-${sourceId}`
  });
  
  const targetEntity = await entity.create({
    id: targetId,
    title: `Target Entity ${targetId}`,
    content: `Test content for target entity ${targetId}`,
    entity_type: 'note',
    permalink: `test-target-${targetId}`
  });
  
  return { sourceEntity, targetEntity };
};

// Test suite definition
export const suite = {
  name: 'Relation Operations',
  description: 'Benchmarks for relation CRUD operations',
  benchmarks: [
    // Create relation benchmark
    {
      name: 'Create Relation',
      async setup() {
        const { sourceEntity, targetEntity } = await generateTestEntities();
        return { sourceId: sourceEntity.id, targetId: targetEntity.id };
      },
      async fn({ sourceId, targetId }) {
        return await relation.create({
          source_id: sourceId,
          target_id: targetId,
          relation_type: 'link'
        });
      },
      async cleanup({ sourceId, targetId }) {
        await entity.delete(sourceId);
        await entity.delete(targetId);
      }
    },
    
    // Get relations for entity benchmark
    {
      name: 'Get Relations for Entity',
      async setup() {
        const { sourceEntity, targetEntity } = await generateTestEntities();
        const newRelation = await relation.create({
          source_id: sourceEntity.id,
          target_id: targetEntity.id,
          relation_type: 'link'
        });
        return { 
          sourceId: sourceEntity.id, 
          targetId: targetEntity.id,
          relationId: newRelation.id 
        };
      },
      async fn({ sourceId }) {
        return await relation.getRelationsForEntity(sourceId);
      },
      async cleanup({ sourceId, targetId }) {
        await entity.delete(sourceId);
        await entity.delete(targetId);
      }
    },
    
    // Get outgoing relations benchmark
    {
      name: 'Get Outgoing Relations',
      async setup() {
        const { sourceEntity, targetEntity } = await generateTestEntities();
        const newRelation = await relation.create({
          source_id: sourceEntity.id,
          target_id: targetEntity.id,
          relation_type: 'link'
        });
        return { 
          sourceId: sourceEntity.id, 
          targetId: targetEntity.id,
          relationId: newRelation.id 
        };
      },
      async fn({ sourceId }) {
        return await relation.getOutgoingRelations(sourceId);
      },
      async cleanup({ sourceId, targetId }) {
        await entity.delete(sourceId);
        await entity.delete(targetId);
      }
    },
    
    // Get incoming relations benchmark
    {
      name: 'Get Incoming Relations',
      async setup() {
        const { sourceEntity, targetEntity } = await generateTestEntities();
        const newRelation = await relation.create({
          source_id: sourceEntity.id,
          target_id: targetEntity.id,
          relation_type: 'link'
        });
        return { 
          sourceId: sourceEntity.id, 
          targetId: targetEntity.id,
          relationId: newRelation.id 
        };
      },
      async fn({ targetId }) {
        return await relation.getIncomingRelations(targetId);
      },
      async cleanup({ sourceId, targetId }) {
        await entity.delete(sourceId);
        await entity.delete(targetId);
      }
    },
    
    // Delete relation benchmark
    {
      name: 'Delete Relation',
      async setup() {
        const { sourceEntity, targetEntity } = await generateTestEntities();
        const newRelation = await relation.create({
          source_id: sourceEntity.id,
          target_id: targetEntity.id,
          relation_type: 'link'
        });
        return { 
          sourceId: sourceEntity.id, 
          targetId: targetEntity.id,
          relationId: newRelation.id 
        };
      },
      async fn({ relationId }) {
        return await relation.delete(relationId);
      },
      async cleanup({ sourceId, targetId }) {
        await entity.delete(sourceId);
        await entity.delete(targetId);
      }
    },
    
    // Batch relation creation benchmark
    {
      name: 'Batch Create Relations (20)',
      async setup() {
        const entities = [];
        for (let i = 0; i < 20; i++) {
          const id = generateId();
          const testEntity = await entity.create({
            id,
            title: `Test Entity ${id}`,
            content: `Test content for entity ${id}`,
            entity_type: 'note',
            permalink: `test-${id}`
          });
          entities.push(testEntity);
        }
        return { entities };
      },
      async fn({ entities }) {
        const results = [];
        const centerEntity = entities[0];
        
        // Create relations from center entity to all others
        for (let i = 1; i < entities.length; i++) {
          results.push(await relation.create({
            source_id: centerEntity.id,
            target_id: entities[i].id,
            relation_type: 'link'
          }));
        }
        
        return results;
      },
      async cleanup({ entities }) {
        for (const entity of entities) {
          await entity.delete(entity.id);
        }
      }
    },
    
    // Get relation types benchmark
    {
      name: 'Get Relation Types',
      async setup() {
        const types = ['link', 'reference', 'dependency', 'citation', 'parent-child'];
        const entities = [];
        const relations = [];
        
        // Create two entities for each relation type
        for (let i = 0; i < types.length; i++) {
          const sourceId = generateId();
          const targetId = generateId();
          
          const sourceEntity = await entity.create({
            id: sourceId,
            title: `Source Entity ${sourceId}`,
            content: `Test content for source entity ${sourceId}`,
            entity_type: 'note',
            permalink: `test-source-${sourceId}`
          });
          
          const targetEntity = await entity.create({
            id: targetId,
            title: `Target Entity ${targetId}`,
            content: `Test content for target entity ${targetId}`,
            entity_type: 'note',
            permalink: `test-target-${targetId}`
          });
          
          entities.push(sourceEntity, targetEntity);
          
          // Create relation with the current type
          const newRelation = await relation.create({
            source_id: sourceEntity.id,
            target_id: targetEntity.id,
            relation_type: types[i]
          });
          
          relations.push(newRelation);
        }
        
        return { entities, relations };
      },
      async fn() {
        return await relation.getRelationTypes();
      },
      async cleanup({ entities }) {
        for (const e of entities) {
          await entity.delete(e.id);
        }
      }
    }
  ]
};

// Helper to properly run setup and cleanup
export async function runRelationBenchmarks() {
  const results = {
    name: suite.name,
    description: suite.description,
    timestamp: new Date().toISOString(),
    benchmarks: []
  };

  for (const benchmark of suite.benchmarks) {
    console.log(`Running ${benchmark.name}...`);
    
    try {
      // Setup
      let setupData = {};
      if (benchmark.setup) {
        setupData = await benchmark.setup();
      }
      
      // Measure performance
      const start = performance.now();
      const result = await benchmark.fn(setupData);
      const end = performance.now();
      
      // Cleanup
      if (benchmark.cleanup) {
        await benchmark.cleanup(setupData);
      }
      
      results.benchmarks.push({
        name: benchmark.name,
        duration: end - start,
        success: true
      });
      
      console.log(`✓ ${benchmark.name}: ${(end - start).toFixed(2)}ms`);
    } catch (error) {
      results.benchmarks.push({
        name: benchmark.name,
        duration: 0,
        success: false,
        error: error.message
      });
      
      console.log(`✗ ${benchmark.name}: Failed - ${error.message}`);
    }
  }
  
  return results;
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runRelationBenchmarks()
    .then(results => {
      console.log(JSON.stringify(results, null, 2));
    })
    .catch(error => {
      console.error('Error running benchmarks:', error);
      process.exit(1);
    });
}
