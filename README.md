# Basic Memory - Node.js Implementation

A local-first knowledge management system that combines the principles of Zettelkasten with knowledge graphs, implemented in Node.js.

## Overview

Basic Memory is a personal knowledge management system that allows you to:
- Store and organize notes as Markdown files
- Create bi-directional links between notes
- Search across your knowledge base
- Visualize connections between ideas
- Integrate with AI assistants through the Model Context Protocol (MCP)

This Node.js implementation provides a fast, efficient, and modern codebase with full feature parity with the Python version.

## Features

- **Local-first**: Your data stays on your machine, stored as Markdown files and in a local SQLite database
- **Markdown support**: Write notes in Markdown with front matter for metadata
- **Wiki-style links**: Connect notes using `[[link]]` syntax
- **File synchronization**: Automatically sync between files and database
- **Search**: Find notes by title, content, or tags
- **MCP integration**: Connect with Claude Desktop and other AI assistants
- **Graph visualization**: Explore connections between your notes

## Credits

### Original Python Implementation

Basic Memory was originally created and developed by Paul Hernandez of Basic Machines ([https://github.com/basicmachines-co/basic-memory](https://github.com/basicmachines-co/basic-memory)) as a Python application. We extend our sincere gratitude to Paul for establishing the core architecture and functionality that serves as the foundation for this project.

### Node.js Implementation

This Node.js version was converted and enhanced by:
- **CorbettCajun**
- **Super Smart Innovations**

The Node.js implementation maintains feature parity with the original Python version while leveraging the performance benefits and ecosystem of Node.js.

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/basic-memory.git
# Navigate to Node.js implementation
cd basic-memory/basic-memory-node.js
# Install dependencies
npm install
```

### Initialize a Repository

```bash
npm run init
```
This creates a new Basic Memory repository in `~/basic-memory` with the initial directory structure.

### Start the MCP Server

```bash
npm run mcp
```
This starts the MCP server on port 8765, allowing AI assistants to interact with your knowledge base.

### Add Notes

Create Markdown files in your repository directory (default: `~/basic-memory`). Use front matter for metadata and wiki-style links to connect notes:

```markdown
---
title: My First Note
tags: [example, getting-started]
---
# My First Note
This is an example note that links to [[Another Note]].
```

### Sync Notes

```bash
# One-time sync
npm run sync
# Continuous sync (watch mode)
npm run sync -- -w
```
This synchronizes your Markdown files with the database.

## Architecture

The Node.js implementation uses:
- **Fastify**: Fast HTTP server for the MCP implementation
- **Sequelize**: ORM for database interactions
- **SQLite**: Local database for storing entities and relationships
- **Commander**: Command-line interface
- **Chokidar**: File system watcher for synchronization

## Documentation

For more detailed documentation:
- [Node.js Implementation Details](NODE.md): Specific details about the Node.js implementation
- [Changelog](CHANGELOG.md): Version history and changes

## MCP Integration

The Basic Memory MCP server implements the 2025 MCP standards and provides the following tools:
- `read_note`: Retrieve a note by title or permalink
- `write_note`: Create or update a note
- `delete_note`: Delete a note
- `search`: Search for notes
- `recent_activity`: Get recently modified notes
- `canvas`: Generate graph visualization data
- `build_context`: Create context for AI assistants
- `project_info`: Get information about a project
- `read_content`: Read file content

To connect Claude Desktop:
1. Start the MCP server: `npm run mcp`
2. In Claude Desktop, add a new MCP server with URL `http://localhost:8765`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
