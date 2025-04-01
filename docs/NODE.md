# Basic Memory - Node.js Implementation Details

This document provides detailed information about the Node.js implementation of Basic Memory, including architecture, configuration, development guidelines, and API references.

## Table of Contents

- [Architecture](#architecture)
- [Configuration Options](#configuration-options)
- [Database](#database)
- [MCP Server](#mcp-server)
- [Tools](#tools)
- [File Synchronization](#file-synchronization)
- [Development Guidelines](#development-guidelines)
- [API Reference](#api-reference)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)

## Architecture

The Node.js implementation of Basic Memory is built using modern JavaScript with ES Modules and follows a modular architecture:

```
basic-memory-node.js/
├── bin/              # Executable scripts
│   └── basic-memory.js  # Main CLI entry point
├── src/              # Source code
│   ├── db/           # Database models and configuration
│   ├── tools/        # MCP tool implementations
│   ├── mcp.js        # MCP server
│   └── sync.js       # File synchronization
├── scripts/          # Utility scripts
└── docs/             # Documentation
```

The application leverages several key technologies:

- **Fastify**: High-performance web framework for the MCP server implementation
- **Sequelize**: ORM for database interactions with SQLite
- **Commander.js**: Command-line interface processing
- **Chokidar**: File system watcher for synchronization
- **Marked**: Markdown processing library
- **Gray-matter**: Front matter parsing for Markdown files
- **Pino**: Fast, structured logging

## Configuration Options

The application can be configured using environment variables:

| Environment Variable | Description | Default Value |
|---------------------|-------------|---------------|
| BASIC_MEMORY_HOME | Directory for storing Markdown files | ~/basic-memory |
| BASIC_MEMORY_DB_PATH | Full path to the SQLite database file | ~/basic-memory/basic-memory.db |
| BASIC_MEMORY_PORT | Port for the MCP server | 8765 |
| BASIC_MEMORY_HOST | Host for the MCP server | localhost |
| BASIC_MEMORY_LOG_LEVEL | Level of logging (trace, debug, info, warn, error, fatal) | info |
| SQL_LOGGING | Enable SQL query logging (set to any value to enable) | disabled |
| SYNC_TO_FILES | Flag to enable syncing entities to files | true |

You can set these environment variables in your shell, in a `.env` file, or pass them when running commands:

```bash
# Example: Running with custom configuration
BASIC_MEMORY_PORT=9000 BASIC_MEMORY_LOG_LEVEL=debug npm run mcp
```

## Database

The application uses SQLite through Sequelize ORM for data storage. The database contains these primary models:

### Entity Model

Represents a note or other content item with the following fields:

- **id**: Primary key (auto-incrementing integer)
- **title**: Title of the entity (string, required)
- **content**: Markdown content (text)
- **permalink**: URL-friendly identifier (string, unique)
- **metadata**: Additional attributes (JSON object)
- **file_path**: Path to the corresponding file on disk (string)
- **createdAt**: Creation timestamp (date)
- **updatedAt**: Last update timestamp (date)

### Link Model

Represents connections between entities:

- **id**: Primary key (auto-incrementing integer)
- **sourceId**: Foreign key to the source Entity (integer)
- **targetId**: Foreign key to the target Entity (integer)
- **type**: Type of relationship (string)
- **metadata**: Additional attributes (JSON object)
- **createdAt**: Creation timestamp (date)
- **updatedAt**: Last update timestamp (date)

### Database Location

By default, the database is stored at `~/basic-memory/basic-memory.db`. You can change this location by:

1. Setting the `BASIC_MEMORY_DB_PATH` environment variable to specify the exact database file path:
   ```bash
   BASIC_MEMORY_DB_PATH=/path/to/custom/database.db npm run mcp
   ```

2. Setting the `BASIC_MEMORY_HOME` environment variable to change the parent directory:
   ```bash
   BASIC_MEMORY_HOME=/path/to/custom/directory npm run mcp
   ```

## MCP Server

The Model Context Protocol (MCP) server allows AI assistants to interact with your knowledge base. It follows the 2025 MCP standards and is implemented using Fastify.

### Server Configuration

The server can be configured with these environment variables:

- `BASIC_MEMORY_PORT`: Port number (default: 8765)
- `BASIC_MEMORY_HOST`: Host address (default: localhost)
- `BASIC_MEMORY_LOG_LEVEL`: Logging level (default: info)

### Starting the Server

```bash
npm run mcp
```

### Connection Handling

The MCP server is designed to handle persistent connections and includes timeouts to prevent resource leaks:

- Connection timeout: 60 seconds
- Keep-alive timeout: 65 seconds
- Max listeners: 25 (to avoid Node.js MaxListenersExceededWarning)

### Error Handling

The server implements comprehensive error handling:

- Global error handlers for uncaught exceptions
- Graceful shutdown on SIGINT and SIGTERM signals
- Structured error logging
- Client-friendly error responses

## Tools

The MCP server implements these tools to interact with your knowledge base:

### read_note

Retrieves a note by title or permalink.

```js
// Parameters
{
  "title": "Optional title of the note",
  "permalink": "Optional permalink of the note"
}

// Returns a note object or error message
```

### write_note

Creates or updates a note.

```js
// Parameters
{
  "title": "Title of the note",
  "content": "Markdown content of the note",
  "metadata": { /* Optional metadata */ }
}

// Returns the created/updated note
```

### delete_note

Deletes a note by title or permalink.

```js
// Parameters
{
  "title": "Optional title of the note to delete",
  "permalink": "Optional permalink of the note to delete"
}

// Returns success confirmation or error
```

### search

Searches for notes based on query.

```js
// Parameters
{
  "query": "Search query string",
  "limit": 10 // Optional limit for results
}

// Returns array of matching notes
```

### recent_activity

Retrieves recently modified notes.

```js
// Parameters
{
  "limit": 10 // Optional limit for results
}

// Returns array of recently modified notes
```

### canvas

Generates a graph structure for visualizing note connections.

```js
// Parameters
{
  "query": "Optional filter query",
  "depth": 2 // Optional depth for graph traversal
}

// Returns nodes and edges for graph visualization
```

### build_context

Creates contextual information for AI assistants.

```js
// Parameters
{
  "query": "Optional focus query",
  "max_items": 10 // Optional max items to include
}

// Returns formatted context
```

### project_info

Gets information about projects.

```js
// Parameters
{
  "name": "Optional project name"
}

// Returns project information
```

### read_content

Reads content from a specified file path.

```js
// Parameters
{
  "path": "Path to the file"
}

// Returns file content as markdown
```

## File Synchronization

Basic Memory synchronizes Markdown files with the database in both directions.

### One-time Sync

```bash
npm run sync
```

### Watch Mode (Continuous Sync)

```bash
npm run sync -- -w
```

### Sync Configuration

The synchronization behavior can be configured using these environment variables:

- `SYNC_TO_FILES`: Enable/disable syncing changes to files (default: true)
- `BASIC_MEMORY_HOME`: Directory to sync files from/to (default: ~/basic-memory)

### Markdown Processing

The file synchronization process:
1. Parses Markdown files with front matter
2. Extracts metadata, title, and content
3. Creates or updates database entities
4. Detects and processes wiki-style links (`[[link]]`)
5. Maintains bidirectional relationships between entities

## Development Guidelines

### Prerequisites

- Node.js 18.x or higher
- npm 8.x or higher

### Installation for Development

```bash
# Clone the repository
git clone https://github.com/your-org/basic-memory.git

# Navigate to Node.js implementation
cd basic-memory/basic-memory-node.js

# Install dependencies
npm install

# Run tests
npm test
```

### Code Structure

- **Module Organization**: Use ES Modules (`import`/`export`)
- **Asynchronous Code**: Use async/await pattern
- **Error Handling**: Use try/catch blocks and provide informative error messages
- **Logging**: Use the pino logger with appropriate levels

### Testing

The codebase uses Jest for testing:

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/sync.test.js

# Run with coverage report
npm test -- --coverage
```

## API Reference

### Database API

```js
import { sequelize, Entity, Link } from './src/db/index.js';

// Create an entity
const entity = await Entity.create({
  title: 'Example Note',
  content: 'This is an example note',
  permalink: 'example-note'
});

// Find an entity
const found = await Entity.findOne({ where: { permalink: 'example-note' } });
```

### MCP Server API

```js
import { server, config, start } from './src/mcp.js';

// Configure custom routes
server.get('/custom-route', async (request, reply) => {
  return { hello: 'world' };
});

// Start the server
await start();
```

### Sync API

```js
import { synchronize, startWatcher } from './src/sync.js';

// One-time sync
await synchronize({ directory: '/path/to/directory' });

// Watch mode
const watcher = await startWatcher({ directory: '/path/to/directory' });
```

## Advanced Usage

### Custom Tool Implementation

You can add your own MCP tools by creating a new file in the `src/tools` directory:

```js
// src/tools/my_custom_tool.js
export async function myCustomTool(params) {
  // Implement your tool logic
  return { result: 'Custom tool response' };
}

// Register in src/tools/index.js
import { myCustomTool } from './my_custom_tool.js';

// Add to schema and handlers
```

### Database Migrations

The Node.js implementation uses Sequelize's built-in migration support:

```js
// Create a migration
npx sequelize-cli migration:generate --name add-new-field

// Run migrations
npx sequelize-cli db:migrate
```

## Troubleshooting

### Common Issues

#### MaxListenersExceededWarning

If you see this warning, you may need to increase the maximum listeners:

```js
// In your code
process.setMaxListeners(50);
```

#### Database Lock Errors

SQLite can only handle one write operation at a time. If you encounter lock errors:

1. Use transactions properly
2. Ensure write operations don't overlap
3. Consider using a connection pool with proper configuration

#### File Synchronization Issues

If syncing isn't working as expected:

1. Check file permissions
2. Verify the BASIC_MEMORY_HOME path
3. Look for detailed errors in the logs with increased log level:
   ```bash
   BASIC_MEMORY_LOG_LEVEL=debug npm run sync
   ```

### Debugging

To enable verbose debugging:

```bash
# Enable SQL query logging
SQL_LOGGING=true BASIC_MEMORY_LOG_LEVEL=debug npm run mcp

# Use Node.js inspector
node --inspect bin/basic-memory.js mcp
```

---

## Contributing

For information on contributing to the project, please see the main README and the CONTRIBUTING file.
