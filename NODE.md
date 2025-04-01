# Basic Memory: Node.js Implementation

This document provides specific details about the Node.js implementation of Basic Memory, including setup, configuration, and integration with Claude Desktop.

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/basic-memory.git

# Navigate to the Node.js implementation
cd basic-memory/basic-memory-node.js

# Install dependencies
npm install
```

## Configuration

The Node.js implementation uses the following environment variables:

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `BASIC_MEMORY_HOME` | Directory for storing Markdown files | `~/basic-memory` |
| `BASIC_MEMORY_PORT` | Port for the MCP server | `8765` |
| `BASIC_MEMORY_HOST` | Host for the MCP server | `localhost` |
| `BASIC_MEMORY_LOG_LEVEL` | Level of logging | `info` |
| `SYNC_TO_FILES` | Enable syncing entities to files | `true` |

You can set these variables in your shell, in a `.env` file, or when running commands:

```bash
BASIC_MEMORY_PORT=8765 npm run mcp
```

## Usage

### CLI Commands

The Node.js implementation includes a command-line interface with the following commands:

#### Initialize a Repository

```bash
npm run init -- -d /path/to/repository
```

This creates the directory structure and initial files for your knowledge base.

#### Start the MCP Server

```bash
npm run mcp -- -p 8765 -h localhost
```

This starts the MCP server that allows AI assistants to interact with your knowledge base.

#### Sync Markdown Files

```bash
# One-time sync
npm run sync -- -d /path/to/repository

# Continuous sync (watch mode)
npm run sync -- -d /path/to/repository -w
```

These commands synchronize Markdown files with the database.

### MCP Server

The MCP server implements the 2025 MCP standards and supports the following tools:

- `read_note`: Retrieves a note by title or permalink
- `write_note`: Creates or updates a note
- `delete_note`: Deletes a note
- `search`: Searches for notes matching a query
- `recent_activity`: Lists recent notes
- `canvas`: Generates a graph visualization
- `build_context`: Builds context for AI assistants
- `project_info`: Retrieves project information
- `read_content`: Reads file content

### Integrating with Claude Desktop

To connect Claude Desktop to your Basic Memory:

1. Start the MCP server:
   ```bash
   npm run mcp
   ```

2. Open Claude Desktop preferences
3. Navigate to the "Model Context Protocol" section
4. Add a new MCP Server with:
   - URL: `http://localhost:8765`
   - Name: "Basic Memory"
5. Save the settings

## File Synchronization

The Node.js implementation includes a robust file synchronization system that:

1. Imports Markdown files into the database
2. Exports database entities to files
3. Continuously watches for file changes (in watch mode)

To use the sync feature:

```bash
# Initialize database and perform one-time sync
npm run sync

# Start continuous sync
npm run sync -- -w
```

## Development

### Project Structure

```
basic-memory-node.js/
├── bin/              # Command-line executables
├── src/              # Source code
│   ├── db/           # Database models and setup
│   ├── tools/        # MCP tool implementations
│   ├── mcp.js        # MCP server implementation
│   └── sync.js       # File synchronization logic
├── scripts/          # Utility scripts
├── package.json      # Project metadata and dependencies
└── README.md         # Main documentation
```

### MCP Server Implementation

The MCP server is implemented using Fastify and follows the 2025 MCP standards:

- Uses the standard server prefix mapping system
- Implements proper connection handling and error recovery
- Includes health monitoring endpoints
- Supports CORS for browser clients
- Implements proper JSON-RPC error handling

### Advanced Features

#### Graph Visualization

The `canvas` tool generates graph structures for visualizing connections between notes, which can be rendered with visualization libraries like D3.js.

#### Context Building

The `build_context` tool creates context for AI assistants by retrieving relevant notes based on a query and formatting them for inclusion in prompts.

## Troubleshooting

### Connection Issues

If you encounter connection errors:

1. Ensure the port (default: 8765) is not in use by another service
2. Try a different port: `BASIC_MEMORY_PORT=8766 npm run mcp`
3. Check firewall settings if connecting from another machine

### Database Issues

If database synchronization fails:

1. Check permissions on the database file
2. Try removing the database file and restarting: `rm ~/basic-memory/basic-memory.db`
3. Review logs for specific errors: `BASIC_MEMORY_LOG_LEVEL=debug npm run mcp`

### MaxListenersExceededWarning

If you see this warning, it's because the file watcher creates multiple event listeners. The Node.js implementation already increases the limit to 25, but if you still see warnings, you can increase it further:

```javascript
// Add to your script
process.setMaxListeners(50);
```
