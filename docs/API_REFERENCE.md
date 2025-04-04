# Basic Memory API Reference

This document provides comprehensive documentation for the Basic Memory Node.js API.

## Table of Contents

- [Overview](#overview)
- [Entity API](#entity-api)
- [Relation API](#relation-api)
- [Observation API](#observation-api)
- [Search API](#search-api)
- [Content API](#content-api)
- [Sync API](#sync-api)
- [MCP API](#mcp-api)

## Overview

The Basic Memory API is organized into several modules, each handling a specific aspect of the knowledge management system:

- **Entity API**: Manage entities (notes, documents, etc.)
- **Relation API**: Create and manage relationships between entities
- **Observation API**: Record observations about entities
- **Search API**: Find entities, relations, and observations
- **Content API**: Extract and process information from content
- **Sync API**: Synchronize files with the database
- **MCP API**: Integrate with Claude Desktop and other AI assistants

All modules are accessible through the main entry point:

```javascript
import { entity, relation, observation, search, content, sync, mcp } from 'basic-memory';
```

## Entity API

The Entity API provides functions for managing entities in the knowledge base.

### entity.create(data)

Creates a new entity.

**Parameters:**

- `data`: Object with the following properties:
  - `title`: String, the entity title
  - `content`: String, the entity content (optional)
  - `type`: String, the entity type (default: 'note')
  - `metadata`: Object, additional metadata (optional)

**Returns:** Promise resolving to the created entity object.

**Example:**

```javascript
const newEntity = await entity.create({
  title: 'My First Note',
  content: 'This is the content of my first note.',
  type: 'note',
  metadata: {
    tags: ['example', 'getting-started'],
    priority: 'high'
  }
});
```

### entity.get(id)

Retrieves an entity by its ID.

**Parameters:**

- `id`: String, the entity ID

**Returns:** Promise resolving to the entity object or null if not found.

**Example:**

```javascript
const myEntity = await entity.get('entity-123');
```

### entity.getByTitle(title)

Retrieves an entity by its title.

**Parameters:**

- `title`: String, the entity title

**Returns:** Promise resolving to the entity object or null if not found.

**Example:**

```javascript
const myEntity = await entity.getByTitle('My First Note');
```

### entity.update(id, data)

Updates an existing entity.

**Parameters:**

- `id`: String, the entity ID
- `data`: Object with the properties to update:
  - `title`: String, the entity title (optional)
  - `content`: String, the entity content (optional)
  - `type`: String, the entity type (optional)
  - `metadata`: Object, additional metadata (optional)

**Returns:** Promise resolving to the updated entity object.

**Example:**

```javascript
const updatedEntity = await entity.update('entity-123', {
  content: 'Updated content for my note.',
  metadata: {
    tags: ['example', 'updated']
  }
});
```

### entity.delete(id)

Deletes an entity.

**Parameters:**

- `id`: String, the entity ID

**Returns:** Promise resolving to a boolean indicating success.

**Example:**

```javascript
const success = await entity.delete('entity-123');
```

### entity.list(options)

Lists entities with optional filtering.

**Parameters:**

- `options`: Object with the following properties:
  - `type`: String, filter by entity type (optional)
  - `limit`: Number, maximum number of results (default: 100)
  - `offset`: Number, pagination offset (default: 0)
  - `sort`: String, sort field (default: 'updatedAt')
  - `order`: String, sort order, 'asc' or 'desc' (default: 'desc')

**Returns:** Promise resolving to an array of entity objects.

**Example:**

```javascript
const notes = await entity.list({
  type: 'note',
  limit: 10,
  sort: 'createdAt',
  order: 'asc'
});
```

### entity.count(options)

Counts entities with optional filtering.

**Parameters:**

- `options`: Object with the following properties:
  - `type`: String, filter by entity type (optional)

**Returns:** Promise resolving to the count.

**Example:**

```javascript
const noteCount = await entity.count({ type: 'note' });
```

### entity.getMetadata(id, key)

Gets a specific metadata field for an entity.

**Parameters:**

- `id`: String, the entity ID
- `key`: String, the metadata key

**Returns:** Promise resolving to the metadata value or null if not found.

**Example:**

```javascript
const tags = await entity.getMetadata('entity-123', 'tags');
```

### entity.setMetadata(id, key, value)

Sets a specific metadata field for an entity.

**Parameters:**

- `id`: String, the entity ID
- `key`: String, the metadata key
- `value`: Any, the metadata value

**Returns:** Promise resolving to the updated entity object.

**Example:**

```javascript
const updatedEntity = await entity.setMetadata('entity-123', 'priority', 'high');
```

### entity.createOrUpdate(data)

Creates a new entity or updates an existing one if the title matches.

**Parameters:**

- `data`: Object with the following properties:
  - `title`: String, the entity title
  - `content`: String, the entity content (optional)
  - `type`: String, the entity type (default: 'note')
  - `metadata`: Object, additional metadata (optional)

**Returns:** Promise resolving to the created or updated entity object.

**Example:**

```javascript
const entity = await entity.createOrUpdate({
  title: 'My Note',
  content: 'This will create a new note or update an existing one with the same title.'
});
```

## Relation API

The Relation API provides functions for managing relationships between entities.

### relation.create(data)

Creates a new relation between entities.

**Parameters:**

- `data`: Object with the following properties:
  - `sourceId`: String, the source entity ID
  - `targetId`: String, the target entity ID
  - `type`: String, the relation type (default: 'link')
  - `metadata`: Object, additional metadata (optional)

**Returns:** Promise resolving to the created relation object.

**Example:**

```javascript
const newRelation = await relation.create({
  sourceId: 'entity-123',
  targetId: 'entity-456',
  type: 'references',
  metadata: {
    strength: 'strong',
    context: 'Chapter 3'
  }
});
```

### relation.get(id)

Retrieves a relation by its ID.

**Parameters:**

- `id`: String, the relation ID

**Returns:** Promise resolving to the relation object or null if not found.

**Example:**

```javascript
const myRelation = await relation.get('relation-123');
```

### relation.update(id, data)

Updates an existing relation.

**Parameters:**

- `id`: String, the relation ID
- `data`: Object with the properties to update:
  - `type`: String, the relation type (optional)
  - `metadata`: Object, additional metadata (optional)

**Returns:** Promise resolving to the updated relation object.

**Example:**

```javascript
const updatedRelation = await relation.update('relation-123', {
  type: 'cites',
  metadata: {
    strength: 'weak'
  }
});
```

### relation.delete(id)

Deletes a relation.

**Parameters:**

- `id`: String, the relation ID

**Returns:** Promise resolving to a boolean indicating success.

**Example:**

```javascript
const success = await relation.delete('relation-123');
```

### relation.getByEntities(sourceId, targetId, type)

Retrieves relations between two entities with optional type filtering.

**Parameters:**

- `sourceId`: String, the source entity ID
- `targetId`: String, the target entity ID
- `type`: String, the relation type (optional)

**Returns:** Promise resolving to an array of relation objects.

**Example:**

```javascript
const relations = await relation.getByEntities('entity-123', 'entity-456', 'references');
```

### relation.getForEntity(entityId, options)

Retrieves relations for a specific entity.

**Parameters:**

- `entityId`: String, the entity ID
- `options`: Object with the following properties:
  - `direction`: String, 'outgoing', 'incoming', or 'both' (default: 'both')
  - `type`: String, filter by relation type (optional)
  - `limit`: Number, maximum number of results (default: 100)
  - `offset`: Number, pagination offset (default: 0)

**Returns:** Promise resolving to an array of relation objects.

**Example:**

```javascript
const relations = await relation.getForEntity('entity-123', {
  direction: 'outgoing',
  type: 'references'
});
```

### relation.count(options)

Counts relations with optional filtering.

**Parameters:**

- `options`: Object with the following properties:
  - `sourceId`: String, filter by source entity ID (optional)
  - `targetId`: String, filter by target entity ID (optional)
  - `type`: String, filter by relation type (optional)

**Returns:** Promise resolving to the count.

**Example:**

```javascript
const referenceCount = await relation.count({
  sourceId: 'entity-123',
  type: 'references'
});
```

### relation.createBidirectional(data)

Creates a bidirectional relation between entities (two relations, one in each direction).

**Parameters:**

- `data`: Object with the following properties:
  - `entityId1`: String, the first entity ID
  - `entityId2`: String, the second entity ID
  - `type`: String, the relation type (default: 'link')
  - `metadata`: Object, additional metadata (optional)

**Returns:** Promise resolving to an array with both created relation objects.

**Example:**

```javascript
const relations = await relation.createBidirectional({
  entityId1: 'entity-123',
  entityId2: 'entity-456',
  type: 'connected-to',
  metadata: {
    strength: 'strong'
  }
});
```

## Observation API

The Observation API provides functions for managing observations about entities.

### observation.create(data)

Creates a new observation for an entity.

**Parameters:**

- `data`: Object with the following properties:
  - `entityId`: String, the entity ID
  - `content`: String, the observation content
  - `type`: String, the observation type (default: 'note')
  - `metadata`: Object, additional metadata (optional)

**Returns:** Promise resolving to the created observation object.

**Example:**

```javascript
const newObservation = await observation.create({
  entityId: 'entity-123',
  content: 'This entity contains important information about quantum physics.',
  type: 'insight',
  metadata: {
    tags: ['important', 'review'],
    source: 'user-analysis'
  }
});
```

### observation.get(id)

Retrieves an observation by its ID.

**Parameters:**

- `id`: String, the observation ID

**Returns:** Promise resolving to the observation object or null if not found.

**Example:**

```javascript
const myObservation = await observation.get('observation-123');
```

### observation.update(id, data)

Updates an existing observation.

**Parameters:**

- `id`: String, the observation ID
- `data`: Object with the properties to update:
  - `content`: String, the observation content (optional)
  - `type`: String, the observation type (optional)
  - `metadata`: Object, additional metadata (optional)

**Returns:** Promise resolving to the updated observation object.

**Example:**

```javascript
const updatedObservation = await observation.update('observation-123', {
  content: 'Updated observation about this entity.',
  metadata: {
    importance: 'high'
  }
});
```

### observation.delete(id)

Deletes an observation.

**Parameters:**

- `id`: String, the observation ID

**Returns:** Promise resolving to a boolean indicating success.

**Example:**

```javascript
const success = await observation.delete('observation-123');
```

### observation.getForEntity(entityId, options)

Retrieves observations for a specific entity.

**Parameters:**

- `entityId`: String, the entity ID
- `options`: Object with the following properties:
  - `type`: String, filter by observation type (optional)
  - `limit`: Number, maximum number of results (default: 100)
  - `offset`: Number, pagination offset (default: 0)
  - `sort`: String, sort field (default: 'createdAt')
  - `order`: String, sort order, 'asc' or 'desc' (default: 'desc')

**Returns:** Promise resolving to an array of observation objects.

**Example:**

```javascript
const observations = await observation.getForEntity('entity-123', {
  type: 'insight',
  limit: 5,
  sort: 'createdAt',
  order: 'desc'
});
```

### observation.count(options)

Counts observations with optional filtering.

**Parameters:**

- `options`: Object with the following properties:
  - `entityId`: String, filter by entity ID (optional)
  - `type`: String, filter by observation type (optional)

**Returns:** Promise resolving to the count.

**Example:**

```javascript
const insightCount = await observation.count({
  entityId: 'entity-123',
  type: 'insight'
});
```

## Search API

The Search API provides functions for searching across entities, relations, and observations.

### search.entities(query, options)

Searches for entities based on a text query.

**Parameters:**

- `query`: String, the search query
- `options`: Object with the following properties:
  - `type`: String, filter by entity type (optional)
  - `fields`: Array of strings, fields to search within (default: ['title', 'content'])
  - `limit`: Number, maximum number of results (default: 10)
  - `offset`: Number, pagination offset (default: 0)

**Returns:** Promise resolving to an array of entity objects with match information.

**Example:**

```javascript
const results = await search.entities('quantum physics', {
  type: 'note',
  fields: ['title', 'content', 'metadata.tags'],
  limit: 5
});
```

### search.relations(options)

Searches for relations based on various criteria.

**Parameters:**

- `options`: Object with the following properties:
  - `sourceId`: String, filter by source entity ID (optional)
  - `targetId`: String, filter by target entity ID (optional)
  - `type`: String, filter by relation type (optional)
  - `limit`: Number, maximum number of results (default: 10)
  - `offset`: Number, pagination offset (default: 0)

**Returns:** Promise resolving to an array of relation objects.

**Example:**

```javascript
const results = await search.relations({
  sourceId: 'entity-123',
  type: 'references',
  limit: 5
});
```

### search.observations(query, options)

Searches for observations based on a text query.

**Parameters:**

- `query`: String, the search query
- `options`: Object with the following properties:
  - `entityId`: String, filter by entity ID (optional)
  - `type`: String, filter by observation type (optional)
  - `fields`: Array of strings, fields to search within (default: ['content'])
  - `limit`: Number, maximum number of results (default: 10)
  - `offset`: Number, pagination offset (default: 0)

**Returns:** Promise resolving to an array of observation objects with match information.

**Example:**

```javascript
const results = await search.observations('important concept', {
  entityId: 'entity-123',
  type: 'insight',
  limit: 5
});
```

### search.all(query, options)

Searches across entities, relations, and observations based on a text query.

**Parameters:**

- `query`: String, the search query
- `options`: Object with the following properties:
  - `types`: Array of strings, types of objects to search (default: ['entity', 'observation'])
  - `limit`: Number, maximum number of results per type (default: 5)
  - `offset`: Number, pagination offset (default: 0)

**Returns:** Promise resolving to an object with results grouped by type.

**Example:**

```javascript
const results = await search.all('quantum', {
  types: ['entity', 'observation'],
  limit: 3
});
```

### search.byTag(tag, options)

Searches for entities with a specific tag.

**Parameters:**

- `tag`: String, the tag to search for
- `options`: Object with the following properties:
  - `type`: String, filter by entity type (optional)
  - `limit`: Number, maximum number of results (default: 10)
  - `offset`: Number, pagination offset (default: 0)

**Returns:** Promise resolving to an array of entity objects.

**Example:**

```javascript
const results = await search.byTag('physics', {
  type: 'note',
  limit: 5
});
```

### search.buildIndex()

Rebuilds the search index for all entities and observations.

**Returns:** Promise resolving when the index has been built.

**Example:**

```javascript
await search.buildIndex();
```

## Content API

The Content API provides utilities for extracting structured information from content, particularly Markdown files.

### Content Extraction Overview

The content extraction module provides tools for:

- Extracting YAML front matter from Markdown
- Finding and processing wiki-style and standard Markdown links
- Analyzing document structure through headings
- Extracting tags, code blocks, and other elements
- Converting Markdown to HTML or plain text
- Splitting content into logical sections
- Processing embedded data formats

All content extraction functions are available through the `content` API module:

```javascript
import { content } from 'basic-memory';

// Now you can use content.extractFrontMatter, content.extractLinks, etc.
```

#### Common Usage Patterns

Here are some common usage patterns for the content extraction utilities:

1. **Extracting document metadata**:

```javascript
function extractDocumentMetadata(filePath) {
  const markdownContent = fs.readFileSync(filePath, 'utf-8');
  
  // Extract front matter (title, tags, etc.)
  const { frontMatter, content: contentWithoutFrontMatter } = content.extractFrontMatter(markdownContent);
  
  // Extract headings to understand document structure
  const headings = content.extractHeadings(contentWithoutFrontMatter);
  
  // Extract links to find connections
  const links = content.extractLinks(contentWithoutFrontMatter);
  
  return {
    metadata: frontMatter,
    structure: headings,
    connections: links
  };
}
```

1. **Generating a table of contents**:

```javascript
function generateTableOfContents(markdownContent) {
  const headings = content.extractHeadings(markdownContent);
  
  let toc = '## Table of Contents\n\n';
  
  headings.forEach(heading => {
    // Create indentation based on heading level
    const indent = '  '.repeat(heading.level - 1);
    
    // Create a link-friendly ID from the heading text
    const id = heading.text.toLowerCase().replace(/\s+/g, '-');
    
    toc += `${indent}- [${heading.text}](#${id})\n`;
  });
  
  return toc;
}
```

1. **Processing sections individually**:

```javascript
function processSections(markdownContent) {
  const sections = content.splitSections(markdownContent);
  
  return sections.map(section => {
    // Process each section individually
    return {
      title: section.title,
      level: section.level,
      summary: content.markdownToPlainText(section.content).substring(0, 150) + '...',
      wordCount: section.content.split(/\s+/).length
    };
  });
}
```

### content.extractFrontMatter(markdownContent)

Extracts YAML front matter from Markdown content.

**Parameters:**

- `markdownContent`: String, the Markdown content with front matter

**Returns:** Object with the following properties:

- `frontMatter`: Object containing the parsed front matter
- `content`: String, the content without front matter

**Example:**

```javascript
const { frontMatter, content } = content.extractFrontMatter(`---
title: My Note
tags: [example, documentation]
---
# My Note
This is my note content.`);
```

### content.extractLinks(markdownContent)

Extracts links from Markdown content.

**Parameters:**

- `markdownContent`: String, the Markdown content

**Returns:** Array of link objects with the following properties:

- `text`: String, the link text
- `url`: String, the link URL
- `type`: String, 'wiki' for wiki-style links ([[link]]) or 'markdown' for standard Markdown links
- `position`: Object with start and end positions

**Example:**

```javascript
const links = content.extractLinks(`# My Note
This is a [standard link](https://example.com) and a [[wiki link]].`);
```

### content.extractTags(markdownContent, options)

Extracts tags from front matter and content.

**Parameters:**

- `markdownContent`: String, the Markdown content
- `options`: Object (optional) with properties:
  - `includeFrontMatter`: Boolean, whether to include tags from front matter (default: true)
  - `includeHashtags`: Boolean, whether to include #hashtags from content (default: true)

**Returns:** Array of unique tag strings.

**Example:**

```javascript
const tags = content.extractTags(`---
title: My Note
tags: [example, documentation]
---
# My Note
This is tagged with #important and #todo.`);
```

### content.extractHeadings(markdownContent)

Extracts headings from Markdown content.

**Parameters:**

- `markdownContent`: String, the Markdown content

**Returns:** Array of heading objects with the following properties:

- `text`: String, the heading text
- `level`: Number, the heading level (1-6)
- `position`: Object with start and end positions

**Example:**

```javascript
const headings = content.extractHeadings(`# Main Heading
Content
## Sub Heading
More content`);
```

### content.markdownToHtml(markdownContent)

Converts Markdown content to HTML.

**Parameters:**

- `markdownContent`: String, the Markdown content

**Returns:** String containing the HTML content.

**Example:**

```javascript
const html = content.markdownToHtml('# Heading\nThis is **bold** text.');
```

### content.markdownToPlainText(markdownContent)

Converts Markdown content to plain text.

**Parameters:**

- `markdownContent`: String, the Markdown content

**Returns:** String containing the plain text content.

**Example:**

```javascript
const plainText = content.markdownToPlainText('# Heading\nThis is **bold** text.');
```

### content.splitSections(markdownContent)

Splits Markdown content into sections based on headings.

**Parameters:**

- `markdownContent`: String, the Markdown content

**Returns:** Array of section objects with the following properties:

- `title`: String, the section heading
- `level`: Number, the heading level (1-6)
- `content`: String, the section content

**Example:**

```javascript
const sections = content.splitSections(`# Main Heading
Intro text
## First Section
Section content
## Second Section
More content`);
```

## Sync API

The Sync API provides functions for synchronizing files with the database.

### sync.run(options)

Synchronizes Markdown files with the database.

**Parameters:**

- `options`: Object with the following properties:
  - `directory`: String, the directory to sync (default: '~/basic-memory')
  - `watch`: Boolean, whether to watch for file changes (default: false)
  - `verbose`: Boolean, whether to output verbose logs (default: false)

**Returns:** Promise resolving when sync is complete or when watch mode is started.

**Example:**

```javascript
// One-time sync
await sync.run({ directory: '/path/to/notes' });

// Watch mode
const stopWatching = await sync.run({
  directory: '/path/to/notes',
  watch: true,
  verbose: true
});

// Later, to stop watching
stopWatching();
```

### sync.syncFile(filePath)

Synchronizes a single Markdown file with the database.

**Parameters:**

- `filePath`: String, path to the Markdown file

**Returns:** Promise resolving to the created or updated entity.

**Example:**

```javascript
const entity = await sync.syncFile('/path/to/notes/my-note.md');
```

### sync.deleteFile(filePath)

Removes an entity from the database when a file is deleted.

**Parameters:**

- `filePath`: String, path to the deleted Markdown file

**Returns:** Promise resolving to a boolean indicating success.

**Example:**

```javascript
const success = await sync.deleteFile('/path/to/notes/deleted-note.md');
```

## MCP API

The MCP API provides functions for integrating with AI assistants through the Model Context Protocol.

### MCP Integration Overview

Model Context Protocol (MCP) is a standardized interface for AI models to interact with external tools and services. Basic Memory implements an MCP server that allows AI assistants like Claude Desktop to access and manipulate your knowledge base.

#### What is MCP?

MCP enables AI assistants to:

- Read and write notes in your knowledge base
- Search for relevant information
- Build context based on queries
- Manage links between notes
- Access file content

#### Connecting to Claude Desktop

To connect Basic Memory to Claude Desktop:

1. Start the Basic Memory MCP server:

   ```bash
   basic-memory mcp
   ```

2. In Claude Desktop:
   - Click on the settings gear icon
   - Select "Model Context Protocol"
   - Click "Add MCP Server"
   - Enter the URL (default: `http://localhost:8765`)
   - Click "Test Connection" and then "Save"

3. When chatting with Claude, you can now ask it to:
   - Create or read notes in your knowledge base
   - Search for information
   - Help organize your thoughts

#### Example Interactions

Here are some examples of how to interact with Claude once connected to Basic Memory:

```text
USER: Create a note about the benefits of regular exercise.

CLAUDE: I'll create a note about exercise benefits for you. Let me do that…

[Claude uses the write_note MCP tool to create the note]

I've created a note titled "Benefits of Regular Exercise" in your knowledge base. It includes sections on cardiovascular health, muscle strength, stress reduction, sleep improvement, weight management, and cognitive benefits. I've also tagged it with "health", "fitness", and "wellness" for easy retrieval.
```

#### Security Considerations

When using the MCP integration:

1. **Local server only**: By default, the MCP server only accepts connections from localhost for security.

2. **No authentication**: The current MCP implementation doesn't include authentication. Don't expose the server to untrusted networks.

3. **Data sensitivity**: Be mindful of the sensitive information in your knowledge base when connecting AI assistants.

### mcp.start(options)

Starts the MCP server.

**Parameters:**

- `options`: Object with the following properties:
  - `port`: Number, the port to listen on (default: 8765)
  - `host`: String, the host to bind to (default: 'localhost')
  - `knowledgeBase`: String, path to the knowledge base directory (default: '~/basic-memory')

**Returns:** Promise resolving to the server instance.

**Example:**

```javascript
const server = await mcp.start({
  port: 9000,
  knowledgeBase: '/path/to/notes'
});

// Later, to stop the server
await server.close();
```

### mcp.buildContext(query, options)

Builds context for AI assistants based on a query.

**Parameters:**

- `query`: String, the query to build context for
- `options`: Object with the following properties:
  - `maxEntities`: Number, maximum number of entities to include (default: 5)
  - `maxTokens`: Number, maximum context size in tokens (default: 2000)
  - `includeMetadata`: Boolean, whether to include entity metadata (default: true)

**Returns:** Promise resolving to a string containing the context.

**Example:**

```javascript
const context = await mcp.buildContext('quantum physics', {
  maxEntities: 3,
  maxTokens: 1500
});
```

### mcp.registerTools(server, options)

Registers MCP tools with a server instance.

**Parameters:**

- `server`: Object, the server instance
- `options`: Object with tool configuration options

**Returns:** The server instance with tools registered.

**Example:**

```javascript
const server = await mcp.start();
mcp.registerTools(server, {
  allowReadOnly: true,
  customTools: myCustomTools
});

```
