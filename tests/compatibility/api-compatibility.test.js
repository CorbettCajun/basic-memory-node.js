/**
 * API Compatibility Tests
 * 
 * These tests verify that the Node.js implementation of Basic Memory
 * has full API compatibility with the Python implementation.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { entity, relation, observation, search, content } = require('../../src/api');

// Configuration
const PYTHON_PATH = process.env.PYTHON_PATH || 'python';
const PYTHON_BASIC_MEMORY_PATH = path.resolve(__dirname, '../../../basic-memory');
const TEST_DATA_DIR = path.resolve(__dirname, '../test-data');
const TEMP_DIR = path.resolve(__dirname, '../temp');

// Ensure directories exist
if (!fs.existsSync(TEST_DATA_DIR)) {
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Helper function to run a Python command and get the result
 * @param {string} script - Python script to run
 * @returns {Promise<object>} - Parsed JSON result
 */
async function runPythonTest(script) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(PYTHON_PATH, ['-c', script]);
    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${error}`));
      } else {
        try {
          const parsedResult = JSON.parse(result);
          resolve(parsedResult);
        } catch (e) {
          reject(new Error(`Failed to parse Python result: ${result}`));
        }
      }
    });
  });
}

/**
 * Test entity API compatibility
 */
async function testEntityAPICompatibility() {
  console.log('Testing Entity API compatibility...');

  // Test entity creation
  const testEntity = {
    title: 'Test Entity',
    content: 'This is a test entity for API compatibility checking',
    type: 'note',
    metadata: {
      tags: ['test', 'compatibility', 'api'],
      created: new Date().toISOString()
    }
  };

  // Create entity in Node.js
  const nodeEntity = await entity.createOrUpdate(testEntity);
  
  // Create equivalent entity in Python
  const pythonScript = `
import sys
import json
from basic_memory.api import entity

result = entity.create_or_update({
    "title": "${testEntity.title}",
    "content": "${testEntity.content}",
    "type": "${testEntity.type}",
    "metadata": ${JSON.stringify(testEntity.metadata)}
})

# Convert to format compatible with Node.js API
result_dict = {
    "id": result.id,
    "title": result.title,
    "content": result.content,
    "type": result.type,
    "metadata": result.metadata
}

print(json.dumps(result_dict))
  `;

  const pythonEntity = await runPythonTest(pythonScript);

  // Compare entity properties
  assert.strictEqual(nodeEntity.title, pythonEntity.title, 'Entity title should match');
  assert.strictEqual(nodeEntity.content, pythonEntity.content, 'Entity content should match');
  assert.strictEqual(nodeEntity.type, pythonEntity.type, 'Entity type should match');
  
  // Compare metadata (only common fields)
  for (const key of Object.keys(testEntity.metadata)) {
    assert.deepStrictEqual(
      nodeEntity.metadata[key], 
      pythonEntity.metadata[key], 
      `Entity metadata.${key} should match`
    );
  }

  console.log('✓ Entity creation API is compatible');

  // Test entity retrieval
  const nodeRetrievedEntity = await entity.getByTitle(testEntity.title);
  
  // Get equivalent entity in Python
  const pythonRetrievalScript = `
import sys
import json
from basic_memory.api import entity

result = entity.get_by_title("${testEntity.title}")

# Convert to format compatible with Node.js API
result_dict = {
    "id": result.id,
    "title": result.title,
    "content": result.content,
    "type": result.type,
    "metadata": result.metadata
}

print(json.dumps(result_dict))
  `;

  const pythonRetrievedEntity = await runPythonTest(pythonRetrievalScript);

  // Compare retrieved entity properties
  assert.strictEqual(nodeRetrievedEntity.title, pythonRetrievedEntity.title, 'Retrieved entity title should match');
  assert.strictEqual(nodeRetrievedEntity.content, pythonRetrievedEntity.content, 'Retrieved entity content should match');
  assert.strictEqual(nodeRetrievedEntity.type, pythonRetrievedEntity.type, 'Retrieved entity type should match');

  console.log('✓ Entity retrieval API is compatible');

  // Clean up - delete the test entity from both implementations
  await entity.delete(nodeRetrievedEntity.id);
  
  const pythonDeleteScript = `
import sys
import json
from basic_memory.api import entity

result = entity.delete("${pythonRetrievedEntity.id}")
print(json.dumps({"success": result}))
  `;
  
  await runPythonTest(pythonDeleteScript);
  
  console.log('Entity API compatibility tests completed successfully');
}

/**
 * Test relation API compatibility
 */
async function testRelationAPICompatibility() {
  console.log('Testing Relation API compatibility...');

  // Create test entities
  const entityA = await entity.createOrUpdate({
    title: 'Entity A',
    content: 'This is test entity A',
    type: 'note'
  });
  
  const entityB = await entity.createOrUpdate({
    title: 'Entity B',
    content: 'This is test entity B',
    type: 'note'
  });

  // Create Python equivalent entities
  const pythonEntityScript = `
import sys
import json
from basic_memory.api import entity

entity_a = entity.create_or_update({
    "title": "Entity A",
    "content": "This is test entity A",
    "type": "note"
})

entity_b = entity.create_or_update({
    "title": "Entity B",
    "content": "This is test entity B",
    "type": "note"
})

print(json.dumps({
    "entity_a_id": entity_a.id,
    "entity_b_id": entity_b.id
}))
  `;

  const pythonEntities = await runPythonTest(pythonEntityScript);

  // Test relation creation
  const nodeRelation = await relation.create({
    sourceId: entityA.id,
    targetId: entityB.id,
    type: 'references',
    metadata: {
      strength: 'high',
      context: 'test'
    }
  });

  // Create equivalent relation in Python
  const pythonRelationScript = `
import sys
import json
from basic_memory.api import relation

result = relation.create({
    "source_id": "${pythonEntities.entity_a_id}",
    "target_id": "${pythonEntities.entity_b_id}",
    "type": "references",
    "metadata": {
        "strength": "high",
        "context": "test"
    }
})

# Convert to format compatible with Node.js API
result_dict = {
    "id": result.id,
    "sourceId": result.source_id,
    "targetId": result.target_id,
    "type": result.type,
    "metadata": result.metadata
}

print(json.dumps(result_dict))
  `;

  const pythonRelation = await runPythonTest(pythonRelationScript);

  // Compare relation properties
  assert.strictEqual(nodeRelation.type, pythonRelation.type, 'Relation type should match');
  assert.deepStrictEqual(nodeRelation.metadata.strength, pythonRelation.metadata.strength, 'Relation metadata.strength should match');
  assert.deepStrictEqual(nodeRelation.metadata.context, pythonRelation.metadata.context, 'Relation metadata.context should match');

  console.log('✓ Relation creation API is compatible');

  // Test get relations for entity
  const nodeRelations = await relation.getForEntity(entityA.id, { direction: 'outgoing' });
  
  // Get equivalent relations in Python
  const pythonGetRelationsScript = `
import sys
import json
from basic_memory.api import relation

result = relation.get_for_entity("${pythonEntities.entity_a_id}", direction="outgoing")

# Convert to format compatible with Node.js API
result_list = []
for rel in result:
    result_list.append({
        "id": rel.id,
        "sourceId": rel.source_id,
        "targetId": rel.target_id,
        "type": rel.type,
        "metadata": rel.metadata
    })

print(json.dumps(result_list))
  `;

  const pythonRelations = await runPythonTest(pythonGetRelationsScript);

  // Compare relation lists
  assert.strictEqual(nodeRelations.length, pythonRelations.length, 'Number of relations should match');
  if (nodeRelations.length > 0 && pythonRelations.length > 0) {
    assert.strictEqual(nodeRelations[0].type, pythonRelations[0].type, 'First relation type should match');
  }

  console.log('✓ Relation retrieval API is compatible');

  // Clean up - delete the test entities from both implementations
  await entity.delete(entityA.id);
  await entity.delete(entityB.id);
  
  const pythonCleanupScript = `
import sys
import json
from basic_memory.api import entity

result1 = entity.delete("${pythonEntities.entity_a_id}")
result2 = entity.delete("${pythonEntities.entity_b_id}")

print(json.dumps({"success": result1 and result2}))
  `;
  
  await runPythonTest(pythonCleanupScript);
  
  console.log('Relation API compatibility tests completed successfully');
}

/**
 * Test observation API compatibility
 */
async function testObservationAPICompatibility() {
  console.log('Testing Observation API compatibility...');

  // Create test entity
  const testEntity = await entity.createOrUpdate({
    title: 'Observation Test Entity',
    content: 'This is an entity for testing observations',
    type: 'note'
  });

  // Create Python equivalent entity
  const pythonEntityScript = `
import sys
import json
from basic_memory.api import entity

result = entity.create_or_update({
    "title": "Observation Test Entity",
    "content": "This is an entity for testing observations",
    "type": "note"
})

print(json.dumps({
    "id": result.id,
    "title": result.title
}))
  `;

  const pythonEntity = await runPythonTest(pythonEntityScript);

  // Test observation creation
  const nodeObservation = await observation.create({
    entityId: testEntity.id,
    content: 'This is a test observation',
    type: 'note',
    metadata: {
      importance: 'high',
      source: 'test'
    }
  });

  // Create equivalent observation in Python
  const pythonObservationScript = `
import sys
import json
from basic_memory.api import observation

result = observation.create({
    "entity_id": "${pythonEntity.id}",
    "content": "This is a test observation",
    "type": "note",
    "metadata": {
        "importance": "high",
        "source": "test"
    }
})

# Convert to format compatible with Node.js API
result_dict = {
    "id": result.id,
    "entityId": result.entity_id,
    "content": result.content,
    "type": result.type,
    "metadata": result.metadata
}

print(json.dumps(result_dict))
  `;

  const pythonObservation = await runPythonTest(pythonObservationScript);

  // Compare observation properties
  assert.strictEqual(nodeObservation.content, pythonObservation.content, 'Observation content should match');
  assert.strictEqual(nodeObservation.type, pythonObservation.type, 'Observation type should match');
  assert.deepStrictEqual(nodeObservation.metadata.importance, pythonObservation.metadata.importance, 'Observation metadata.importance should match');

  console.log('✓ Observation creation API is compatible');

  // Test get observations for entity
  const nodeObservations = await observation.getForEntity(testEntity.id);
  
  // Get equivalent observations in Python
  const pythonGetObservationsScript = `
import sys
import json
from basic_memory.api import observation

result = observation.get_for_entity("${pythonEntity.id}")

# Convert to format compatible with Node.js API
result_list = []
for obs in result:
    result_list.append({
        "id": obs.id,
        "entityId": obs.entity_id,
        "content": obs.content,
        "type": obs.type,
        "metadata": obs.metadata
    })

print(json.dumps(result_list))
  `;

  const pythonObservations = await runPythonTest(pythonGetObservationsScript);

  // Compare observation lists
  assert.strictEqual(nodeObservations.length, pythonObservations.length, 'Number of observations should match');
  if (nodeObservations.length > 0 && pythonObservations.length > 0) {
    assert.strictEqual(nodeObservations[0].content, pythonObservations[0].content, 'First observation content should match');
  }

  console.log('✓ Observation retrieval API is compatible');

  // Clean up - delete the test entity from both implementations
  await entity.delete(testEntity.id);
  
  const pythonCleanupScript = `
import sys
import json
from basic_memory.api import entity

result = entity.delete("${pythonEntity.id}")
print(json.dumps({"success": result}))
  `;
  
  await runPythonTest(pythonCleanupScript);
  
  console.log('Observation API compatibility tests completed successfully');
}

/**
 * Test search API compatibility
 */
async function testSearchAPICompatibility() {
  console.log('Testing Search API compatibility...');

  // Create test entities
  const entityA = await entity.createOrUpdate({
    title: 'Search Test Entity Alpha',
    content: 'This entity contains unique search terms like xylophone and zebra',
    type: 'note',
    metadata: {
      tags: ['search', 'test', 'unique']
    }
  });
  
  const entityB = await entity.createOrUpdate({
    title: 'Search Test Entity Beta',
    content: 'This entity contains different terms like umbrella and yacht',
    type: 'note',
    metadata: {
      tags: ['search', 'test', 'different']
    }
  });

  // Create Python equivalent entities
  const pythonEntityScript = `
import sys
import json
from basic_memory.api import entity

entity_a = entity.create_or_update({
    "title": "Search Test Entity Alpha",
    "content": "This entity contains unique search terms like xylophone and zebra",
    "type": "note",
    "metadata": {
        "tags": ["search", "test", "unique"]
    }
})

entity_b = entity.create_or_update({
    "title": "Search Test Entity Beta",
    "content": "This entity contains different terms like umbrella and yacht",
    "type": "note",
    "metadata": {
        "tags": ["search", "test", "different"]
    }
})

# Ensure search index is updated
from basic_memory.api import search
search.build_index()

print(json.dumps({
    "entity_a_id": entity_a.id,
    "entity_b_id": entity_b.id
}))
  `;

  const pythonEntities = await runPythonTest(pythonEntityScript);

  // Rebuild search index in Node.js
  await search.buildIndex();

  // Test search by specific term
  const nodeSearchResults = await search.entities('xylophone', { limit: 10 });
  
  // Search for the same term in Python
  const pythonSearchScript = `
import sys
import json
from basic_memory.api import search

results = search.entities("xylophone", limit=10)

# Convert to format compatible with Node.js API
result_list = []
for res in results:
    result_list.append({
        "id": res.id,
        "title": res.title,
        "content": res.content,
        "type": res.type,
        "score": res.score if hasattr(res, 'score') else None
    })

print(json.dumps(result_list))
  `;

  const pythonSearchResults = await runPythonTest(pythonSearchScript);

  // Compare search results
  assert.strictEqual(
    nodeSearchResults.some(r => r.title === 'Search Test Entity Alpha'),
    pythonSearchResults.some(r => r.title === 'Search Test Entity Alpha'),
    'Search should find Entity Alpha in both implementations'
  );
  
  assert.strictEqual(
    nodeSearchResults.every(r => r.title !== 'Search Test Entity Beta'),
    pythonSearchResults.every(r => r.title !== 'Search Test Entity Beta'),
    'Search should not find Entity Beta in both implementations'
  );

  console.log('✓ Entity search API is compatible');

  // Test search by tag
  const nodeTagResults = await search.byTag('unique', { limit: 10 });
  
  // Search by the same tag in Python
  const pythonTagSearchScript = `
import sys
import json
from basic_memory.api import search

results = search.by_tag("unique", limit=10)

# Convert to format compatible with Node.js API
result_list = []
for res in results:
    result_list.append({
        "id": res.id,
        "title": res.title,
        "type": res.type
    })

print(json.dumps(result_list))
  `;

  const pythonTagResults = await runPythonTest(pythonTagSearchScript);

  // Compare tag search results
  assert.strictEqual(
    nodeTagResults.some(r => r.title === 'Search Test Entity Alpha'),
    pythonTagResults.some(r => r.title === 'Search Test Entity Alpha'),
    'Tag search should find Entity Alpha in both implementations'
  );
  
  assert.strictEqual(
    nodeTagResults.every(r => r.title !== 'Search Test Entity Beta'),
    pythonTagResults.every(r => r.title !== 'Search Test Entity Beta'),
    'Tag search should not find Entity Beta in both implementations'
  );

  console.log('✓ Tag search API is compatible');

  // Clean up - delete the test entities from both implementations
  await entity.delete(entityA.id);
  await entity.delete(entityB.id);
  
  const pythonCleanupScript = `
import sys
import json
from basic_memory.api import entity

result1 = entity.delete("${pythonEntities.entity_a_id}")
result2 = entity.delete("${pythonEntities.entity_b_id}")

print(json.dumps({"success": result1 and result2}))
  `;
  
  await runPythonTest(pythonCleanupScript);
  
  console.log('Search API compatibility tests completed successfully');
}

/**
 * Test content extraction API compatibility
 */
async function testContentAPICompatibility() {
  console.log('Testing Content API compatibility...');

  // Test markdown content to use
  const testMarkdown = `---
title: Test Content
tags: [api, compatibility, test]
---
# Test Content

This is a test paragraph with a [link](https://example.com) and a [[wiki link]].

## Section 1

This section has **bold** and *italic* text.

## Section 2

This section mentions #hashtags and #important things.
`;

  // Test front matter extraction
  const nodeFrontMatter = content.extractFrontMatter(testMarkdown);
  
  // Extract front matter in Python
  const pythonFrontMatterScript = `
import sys
import json
from basic_memory.api import content

result = content.extract_front_matter("""${testMarkdown}""")

# Convert to format compatible with Node.js API
result_dict = {
    "frontMatter": result[0],
    "content": result[1]
}

print(json.dumps(result_dict))
  `;

  const pythonFrontMatter = await runPythonTest(pythonFrontMatterScript);

  // Compare front matter results
  assert.deepStrictEqual(
    nodeFrontMatter.frontMatter.title, 
    pythonFrontMatter.frontMatter.title, 
    'Front matter title should match'
  );
  
  assert.deepStrictEqual(
    nodeFrontMatter.frontMatter.tags, 
    pythonFrontMatter.frontMatter.tags, 
    'Front matter tags should match'
  );

  console.log('✓ Front matter extraction API is compatible');

  // Test link extraction
  const nodeLinks = content.extractLinks(testMarkdown);
  
  // Extract links in Python
  const pythonLinksScript = `
import sys
import json
from basic_memory.api import content

result = content.extract_links("""${testMarkdown}""")

# Convert to format compatible with Node.js API
result_list = []
for link in result:
    result_list.append({
        "text": link.text,
        "url": link.url,
        "type": link.type
    })

print(json.dumps(result_list))
  `;

  const pythonLinks = await runPythonTest(pythonLinksScript);

  // Compare link extraction results
  assert.strictEqual(nodeLinks.length, pythonLinks.length, 'Number of extracted links should match');
  
  // Compare standard link
  const nodeStandardLink = nodeLinks.find(l => l.type === 'markdown');
  const pythonStandardLink = pythonLinks.find(l => l.type === 'markdown');
  
  if (nodeStandardLink && pythonStandardLink) {
    assert.strictEqual(nodeStandardLink.text, pythonStandardLink.text, 'Standard link text should match');
    assert.strictEqual(nodeStandardLink.url, pythonStandardLink.url, 'Standard link URL should match');
  }
  
  // Compare wiki link
  const nodeWikiLink = nodeLinks.find(l => l.type === 'wiki');
  const pythonWikiLink = pythonLinks.find(l => l.type === 'wiki');
  
  if (nodeWikiLink && pythonWikiLink) {
    assert.strictEqual(nodeWikiLink.text, pythonWikiLink.text, 'Wiki link text should match');
  }

  console.log('✓ Link extraction API is compatible');

  // Test heading extraction
  const nodeHeadings = content.extractHeadings(testMarkdown);
  
  // Extract headings in Python
  const pythonHeadingsScript = `
import sys
import json
from basic_memory.api import content

result = content.extract_headings("""${testMarkdown}""")

# Convert to format compatible with Node.js API
result_list = []
for heading in result:
    result_list.append({
        "text": heading.text,
        "level": heading.level
    })

print(json.dumps(result_list))
  `;

  const pythonHeadings = await runPythonTest(pythonHeadingsScript);

  // Compare heading extraction results
  assert.strictEqual(nodeHeadings.length, pythonHeadings.length, 'Number of extracted headings should match');
  
  for (let i = 0; i < Math.min(nodeHeadings.length, pythonHeadings.length); i++) {
    assert.strictEqual(nodeHeadings[i].text, pythonHeadings[i].text, `Heading ${i} text should match`);
    assert.strictEqual(nodeHeadings[i].level, pythonHeadings[i].level, `Heading ${i} level should match`);
  }

  console.log('✓ Heading extraction API is compatible');

  // Test tag extraction
  const nodeTags = content.extractTags(testMarkdown);
  
  // Extract tags in Python
  const pythonTagsScript = `
import sys
import json
from basic_memory.api import content

result = content.extract_tags("""${testMarkdown}""")

print(json.dumps(result))
  `;

  const pythonTags = await runPythonTest(pythonTagsScript);

  // Compare tag extraction results
  // Sort both arrays to ensure consistent order for comparison
  const sortedNodeTags = [...nodeTags].sort();
  const sortedPythonTags = [...pythonTags].sort();
  
  assert.deepStrictEqual(
    sortedNodeTags.includes('api'), 
    sortedPythonTags.includes('api'), 
    'Tag "api" should be extracted in both implementations'
  );
  
  assert.deepStrictEqual(
    sortedNodeTags.includes('hashtags'), 
    sortedPythonTags.includes('hashtags'), 
    'Tag "hashtags" should be extracted in both implementations'
  );

  console.log('✓ Tag extraction API is compatible');
  
  console.log('Content API compatibility tests completed successfully');
}

/**
 * Run all compatibility tests
 */
async function runCompatibilityTests() {
  console.log('Starting API compatibility tests...');
  
  try {
    await testEntityAPICompatibility();
    await testRelationAPICompatibility();
    await testObservationAPICompatibility();
    await testSearchAPICompatibility();
    await testContentAPICompatibility();
    
    console.log('\n✓✓✓ All API compatibility tests passed successfully ✓✓✓');
  } catch (error) {
    console.error('\n❌ API compatibility test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runCompatibilityTests();
}

module.exports = {
  runCompatibilityTests,
  testEntityAPICompatibility,
  testRelationAPICompatibility,
  testObservationAPICompatibility,
  testSearchAPICompatibility,
  testContentAPICompatibility
};
