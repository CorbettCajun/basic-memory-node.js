# Basic Memory Node.js API Reference

This document provides detailed documentation for the Basic Memory Node.js API, matching the functionality and interface of the Python implementation.

## Core API Modules

Basic Memory's API is organized into the following modules:

- **entity**: Functions for creating, retrieving, updating, and deleting entities
- **relation**: Functions for managing relationships between entities
- **observation**: Functions for creating and managing observations about entities
- **search**: Functions for searching entities and observations
- **content**: Utilities for extracting structured information from content

## Entity API

The Entity API provides functions for managing entities in the knowledge base.

### entity.createOrUpdate(entityData)

Creates a new entity or updates an existing one.

**Parameters:**
- `entityData` (Object): Entity data with the following properties:
  - `id` (String): Unique identifier for the entity
  - `title` (String): Title of the entity
  - `type` (String): Type of the entity
  - `content` (String): Content of the entity
  - `metadata` (Object, optional): Additional metadata for the entity
  - `permalink` (String, optional): Permanent link to the entity

**Returns:**
- Promise<Object>: The created or updated entity object

**Example:**
```javascript
import { entity } from 'basic-memory';

const newEntity = {
  id: 'unique-id-123',
  title: 'Example Entity',
  type: 'note',
  content: 'This is an example entity.',
  metadata: {
    tags: ['example', 'documentation'],
    created: new Date().toISOString()
  }
};

const result = await entity.createOrUpdate(newEntity);
console.log(`Created entity: ${result.id}`);
```

### entity.get(entityId)

Retrieves an entity by its ID.

**Parameters:**
- `entityId` (String): ID of the entity to retrieve

**Returns:**
- Promise<Object>: The entity object if found, or null if not found

**Example:**
```javascript
import { entity } from 'basic-memory';

const entityId = 'unique-id-123';
const result = await entity.get(entityId);

if (result) {
  console.log(`Found entity: ${result.title}`);
} else {
  console.log('Entity not found');
}
```

### entity.delete(entityId)

Deletes an entity by its ID.

**Parameters:**
- `entityId` (String): ID of the entity to delete

**Returns:**
- Promise<Boolean>: True if the entity was deleted, false if not found

**Example:**
```javascript
import { entity } from 'basic-memory';

const entityId = 'unique-id-123';
const result = await entity.delete(entityId);

if (result) {
  console.log('Entity deleted successfully');
} else {
  console.log('Entity not found or could not be deleted');
}
```

### entity.list(filter)

Lists entities matching the specified filter.

**Parameters:**
- `filter` (Object, optional): Filter criteria
  - `type` (String, optional): Filter by entity type
  - `permalink` (String, optional): Filter by permalink
  - `limit` (Number, optional): Maximum number of entities to return
  - `offset` (Number, optional): Offset for pagination

**Returns:**
- Promise<Array<Object>>: Array of entity objects matching the filter

**Example:**
```javascript
import { entity } from 'basic-memory';

// List all entities of type 'note'
const filter = { type: 'note' };
const results = await entity.list(filter);

console.log(`Found ${results.length} notes`);
```

### entity.getTypes()

Gets a list of all entity types in the knowledge base.

**Returns:**
- Promise<Array<String>>: Array of entity type strings

**Example:**
```javascript
import { entity } from 'basic-memory';

const types = await entity.getTypes();
console.log('Entity types in the knowledge base:', types);
```

### entity.updateMetadata(entityId, metadata)

Updates the metadata for an entity.

**Parameters:**
- `entityId` (String): ID of the entity to update
- `metadata` (Object): New metadata to merge with existing metadata

**Returns:**
- Promise<Object>: The updated entity object

**Example:**
```javascript
import { entity } from 'basic-memory';

const entityId = 'unique-id-123';
const metadata = {
  tags: ['updated', 'documentation'],
  modified: new Date().toISOString()
};

const result = await entity.updateMetadata(entityId, metadata);
console.log(`Updated metadata for entity: ${result.title}`);
```

## Relation API

The Relation API provides functions for managing relationships between entities.

### relation.create(relationData)

Creates a relationship between two entities.

**Parameters:**
- `relationData` (Object): Relation data with the following properties:
  - `source_id` (String): ID of the source entity
  - `target_id` (String): ID of the target entity
  - `type` (String): Type of relationship
  - `metadata` (Object, optional): Additional metadata for the relationship

**Returns:**
- Promise<Object>: The created relation object

**Example:**
```javascript
import { relation } from 'basic-memory';

const newRelation = {
  source_id: 'entity-1',
  target_id: 'entity-2',
  type: 'references',
  metadata: {
    strength: 0.8,
    created: new Date().toISOString()
  }
};

const result = await relation.create(newRelation);
console.log(`Created relation: ${result.id}`);
```

### relation.get(filter)

Gets relations matching the specified filter.

**Parameters:**
- `filter` (Object): Filter criteria
  - `source_id` (String, optional): Filter by source entity ID
  - `target_id` (String, optional): Filter by target entity ID
  - `type` (String, optional): Filter by relation type
  - `bidirectional` (Boolean, optional): If true, search in both directions

**Returns:**
- Promise<Array<Object>>: Array of relation objects matching the filter

**Example:**
```javascript
import { relation } from 'basic-memory';

// Get all relations where entity-1 is the source
const filter = { source_id: 'entity-1' };
const results = await relation.get(filter);

console.log(`Found ${results.length} relations`);
```

### relation.delete(relationId)

Deletes a relation by its ID.

**Parameters:**
- `relationId` (String): ID of the relation to delete

**Returns:**
- Promise<Boolean>: True if the relation was deleted, false if not found

**Example:**
```javascript
import { relation } from 'basic-memory';

const relationId = 'relation-123';
const result = await relation.delete(relationId);

if (result) {
  console.log('Relation deleted successfully');
} else {
  console.log('Relation not found or could not be deleted');
}
```

### relation.getTypes()

Gets a list of all relation types in the knowledge base.

**Returns:**
- Promise<Array<String>>: Array of relation type strings

**Example:**
```javascript
import { relation } from 'basic-memory';

const types = await relation.getTypes();
console.log('Relation types in the knowledge base:', types);
```

### relation.findRelated(entityId, options)

Finds entities related to the specified entity.

**Parameters:**
- `entityId` (String): ID of the entity to find relations for
- `options` (Object, optional): Options for the query
  - `types` (Array<String>, optional): Only include relations of these types
  - `direction` (String, optional): 'incoming', 'outgoing', or 'both' (default)
  - `includeEntities` (Boolean, optional): If true, include the related entities in the result

**Returns:**
- Promise<Array<Object>>: Array of relation objects, optionally with related entities

**Example:**
```javascript
import { relation } from 'basic-memory';

const entityId = 'entity-1';
const options = {
  direction: 'outgoing',
  includeEntities: true
};

const results = await relation.findRelated(entityId, options);
console.log(`Found ${results.length} related entities`);
```

## Observation API

The Observation API provides functions for managing observations about entities.

### observation.create(observationData)

Creates a new observation for an entity.

**Parameters:**
- `observationData` (Object): Observation data with the following properties:
  - `id` (String, optional): Unique identifier for the observation
  - `entity_id` (String): ID of the entity this observation is about
  - `category` (String): Category of the observation
  - `content` (String): Content of the observation
  - `metadata` (Object, optional): Additional metadata for the observation

**Returns:**
- Promise<Object>: The created observation object

**Example:**
```javascript
import { observation } from 'basic-memory';

const newObservation = {
  entity_id: 'entity-123',
  category: 'note',
  content: 'This is an important observation about the entity.',
  metadata: {
    tags: ['important', 'follow-up'],
    created: new Date().toISOString()
  }
};

const result = await observation.create(newObservation);
console.log(`Created observation: ${result.id}`);
```

### observation.get(filter)

Gets observations matching the specified filter.

**Parameters:**
- `filter` (Object): Filter criteria
  - `entity_id` (String, optional): Filter by entity ID
  - `category` (String, optional): Filter by category
  - `limit` (Number, optional): Maximum number of observations to return
  - `offset` (Number, optional): Offset for pagination

**Returns:**
- Promise<Array<Object>>: Array of observation objects matching the filter

**Example:**
```javascript
import { observation } from 'basic-memory';

// Get all observations for entity-123
const filter = { entity_id: 'entity-123' };
const results = await observation.get(filter);

console.log(`Found ${results.length} observations`);
```

### observation.getById(observationId)

Gets an observation by its ID.

**Parameters:**
- `observationId` (String): ID of the observation to retrieve

**Returns:**
- Promise<Object>: The observation object if found, or null if not found

**Example:**
```javascript
import { observation } from 'basic-memory';

const observationId = 'observation-123';
const result = await observation.getById(observationId);

if (result) {
  console.log(`Found observation: ${result.category}`);
} else {
  console.log('Observation not found');
}
```

### observation.update(observationId, observationData)

Updates an existing observation.

**Parameters:**
- `observationId` (String): ID of the observation to update
- `observationData` (Object): New observation data

**Returns:**
- Promise<Object>: The updated observation object

**Example:**
```javascript
import { observation } from 'basic-memory';

const observationId = 'observation-123';
const updatedData = {
  content: 'Updated observation content',
  metadata: {
    tags: ['updated', 'important'],
    modified: new Date().toISOString()
  }
};

const result = await observation.update(observationId, updatedData);
console.log(`Updated observation: ${result.id}`);
```

### observation.delete(observationId)

Deletes an observation by its ID.

**Parameters:**
- `observationId` (String): ID of the observation to delete

**Returns:**
- Promise<Boolean>: True if the observation was deleted, false if not found

**Example:**
```javascript
import { observation } from 'basic-memory';

const observationId = 'observation-123';
const result = await observation.delete(observationId);

if (result) {
  console.log('Observation deleted successfully');
} else {
  console.log('Observation not found or could not be deleted');
}
```

### observation.getCategories()

Gets a list of all observation categories in the knowledge base.

**Returns:**
- Promise<Array<String>>: Array of observation category strings

**Example:**
```javascript
import { observation } from 'basic-memory';

const categories = await observation.getCategories();
console.log('Observation categories in the knowledge base:', categories);
```

## Search API

The Search API provides functions for searching entities and observations in the knowledge base.

### search.entities(query, filters)

Searches for entities matching the query text.

**Parameters:**
- `query` (String): Search query text
- `filters` (Object, optional): Filters to apply to the search
  - `type` (String, optional): Filter by entity type
  - `limit` (Number, optional): Maximum number of results to return
  - `offset` (Number, optional): Offset for pagination

**Returns:**
- Promise<Array<Object>>: Array of matching entity objects

**Example:**
```javascript
import { search } from 'basic-memory';

const query = 'important concept';
const filters = { type: 'note', limit: 10 };

const results = await search.entities(query, filters);
console.log(`Found ${results.length} matching entities`);
```

### search.observations(query, filters)

Searches for observations matching the query text.

**Parameters:**
- `query` (String): Search query text
- `filters` (Object, optional): Filters to apply to the search
  - `entity_id` (String, optional): Filter by entity ID
  - `category` (String, optional): Filter by category
  - `limit` (Number, optional): Maximum number of results to return
  - `offset` (Number, optional): Offset for pagination

**Returns:**
- Promise<Array<Object>>: Array of matching observation objects

**Example:**
```javascript
import { search } from 'basic-memory';

const query = 'important finding';
const filters = { category: 'note', limit: 10 };

const results = await search.observations(query, filters);
console.log(`Found ${results.length} matching observations`);
```

### search.updateIndex(entityId)

Updates the search index for a specific entity.

**Parameters:**
- `entityId` (String): ID of the entity to update in the search index

**Returns:**
- Promise<Boolean>: True if the index was updated successfully

**Example:**
```javascript
import { search } from 'basic-memory';

const entityId = 'entity-123';
const result = await search.updateIndex(entityId);

if (result) {
  console.log('Search index updated successfully');
} else {
  console.log('Failed to update search index');
}
```

### search.rebuildIndices()

Rebuilds all search indices for the knowledge base.

**Returns:**
- Promise<Boolean>: True if indices were rebuilt successfully

**Example:**
```javascript
import { search } from 'basic-memory';

const result = await search.rebuildIndices();

if (result) {
  console.log('Search indices rebuilt successfully');
} else {
  console.log('Failed to rebuild search indices');
}
```

## Content API

The Content API provides utilities for extracting structured information from various types of content.

### content.extractFrontMatter(markdownContent)

Extracts YAML front matter from Markdown content.

**Parameters:**
- `markdownContent` (String): Markdown content with front matter

**Returns:**
- Object: Object containing parsed front matter and content without front matter
  - `frontMatter` (Object): Parsed front matter data
  - `content` (String): Markdown content with front matter removed

**Example:**
```javascript
import { content } from 'basic-memory';

const markdown = `---
title: Example Note
tags: [example, documentation]
---
# Example Note
This is an example note with front matter.`;

const result = content.extractFrontMatter(markdown);
console.log('Front matter:', result.frontMatter);
console.log('Content:', result.content);
```

### content.extractLinks(markdownContent)

Extracts links from Markdown content.

**Parameters:**
- `markdownContent` (String): Markdown content

**Returns:**
- Array<Object>: Array of extracted link objects
  - `text` (String): Link text
  - `url` (String): Link URL
  - `type` (String): 'wiki' for wiki-style links, 'markdown' for standard Markdown links
  - `position` (Object): Position in the original text

**Example:**
```javascript
import { content } from 'basic-memory';

const markdown = `# Example Note
This is an example with a [standard link](https://example.com) and a [[wiki link]].`;

const links = content.extractLinks(markdown);
console.log(`Found ${links.length} links:`, links);
```

### content.extractHeadings(markdownContent)

Extracts headings from Markdown content with their hierarchy.

**Parameters:**
- `markdownContent` (String): Markdown content

**Returns:**
- Array<Object>: Array of extracted heading objects
  - `text` (String): Heading text
  - `level` (Number): Heading level (1-6)
  - `position` (Object): Position in the original text

**Example:**
```javascript
import { content } from 'basic-memory';

const markdown = `# Main Heading
Some content
## Sub Heading
More content
### Sub-sub Heading
Even more content`;

const headings = content.extractHeadings(markdown);
console.log('Headings:', headings);
```

### content.extractTags(markdownContent, options)

Extracts tags from Markdown content.

**Parameters:**
- `markdownContent` (String): Markdown content
- `options` (Object, optional): Extraction options
  - `includeFrontMatter` (Boolean, optional): Whether to include tags from front matter (default: true)
  - `includeHashtags` (Boolean, optional): Whether to include hashtags from content (default: true)

**Returns:**
- Array<String>: Array of extracted tag strings

**Example:**
```javascript
import { content } from 'basic-memory';

const markdown = `---
title: Example Note
tags: [documentation, example]
---
# Example Note
This is an example note with #hashtags in the content.`;

const tags = content.extractTags(markdown);
console.log('Tags:', tags); // ['documentation', 'example', 'hashtags']
```

### content.extractCodeBlocks(markdownContent)

Extracts code blocks from Markdown content.

**Parameters:**
- `markdownContent` (String): Markdown content

**Returns:**
- Array<Object>: Array of extracted code block objects
  - `language` (String): Programming language of the code block
  - `code` (String): Code content
  - `position` (Object): Position in the original text

**Example:**
```javascript
import { content } from 'basic-memory';

const markdown = `# Example Code
Here is some JavaScript code:

\`\`\`javascript
function hello() {
  console.log('Hello, world!');
}
\`\`\`

And some Python:

\`\`\`python
def hello():
    print('Hello, world!')
\`\`\``;

const codeBlocks = content.extractCodeBlocks(markdown);
console.log(`Found ${codeBlocks.length} code blocks:`, codeBlocks);
```

### content.markdownToHtml(markdownContent)

Converts Markdown content to HTML.

**Parameters:**
- `markdownContent` (String): Markdown content

**Returns:**
- String: HTML content

**Example:**
```javascript
import { content } from 'basic-memory';

const markdown = `# Example Heading
This is **bold** and *italic* text.`;

const html = content.markdownToHtml(markdown);
console.log('HTML:', html);
```

### content.markdownToPlainText(markdownContent)

Converts Markdown content to plain text.

**Parameters:**
- `markdownContent` (String): Markdown content

**Returns:**
- String: Plain text content

**Example:**
```javascript
import { content } from 'basic-memory';

const markdown = `# Example Heading
This is **bold** and *italic* text.`;

const plainText = content.markdownToPlainText(markdown);
console.log('Plain text:', plainText);
```

### content.splitSections(markdownContent)

Splits Markdown content into sections based on headings.

**Parameters:**
- `markdownContent` (String): Markdown content

**Returns:**
- Array<Object>: Array of section objects
  - `title` (String): Section title (heading text)
  - `level` (Number): Heading level (1-6)
  - `content` (String): Section content

**Example:**
```javascript
import { content } from 'basic-memory';

const markdown = `# Main Heading
Introduction text.
## First Section
Section content.
## Second Section
More section content.`;

const sections = content.splitSections(markdown);
console.log(`Found ${sections.length} sections:`, sections);
```
