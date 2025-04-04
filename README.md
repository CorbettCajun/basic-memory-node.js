# Basic Memory MCP Server (Node.js Implementation)

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![MCP Protocol](https://img.shields.io/badge/MCP%20Protocol-2024--11--05-blue)](https://github.com/basicmachines-co/basic-memory)

## Overview

Basic Memory is a Model Context Protocol (MCP) server that provides advanced memory management, search, and context-building capabilities.

## Features

- Real-time memory synchronization
- Comprehensive search functionality
- Context-aware memory retrieval
- Robust error handling
- Extensible command system

## Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher

## Installation

```bash
git clone https://github.com/your-org/basic-memory-node.git
cd basic-memory-node
npm install
```

## Configuration

### Configuration Files

Basic Memory supports multiple configuration methods:

1. **MCP Settings (`mcp_settings.json`)**

   Located at: `~/.config/basic-memory/mcp_settings.json`

   ```json
   {
     "basic-memory": {
       "database": {
         "type": "sqlite",
         "path": "~/basic-memory/database.sqlite"
       },
       "logging": {
         "level": "info",
         "path": "~/basic-memory/logs"
       }
     }
   }
   ```

2. **Environment Variables**

   - `MCP_DATABASE_TYPE`: Database type (default: sqlite)
   - `MCP_DATABASE_PATH`: Path to database file
   - `MCP_LOG_LEVEL`: Logging verbosity level

   Example usage:
   ```bash
   export MCP_DATABASE_TYPE=postgres
   export MCP_LOG_LEVEL=debug
   ```

## Running the Server

### Development Mode

```bash
# Start server with file watching
npm run watch

# Start server normally
npm start
```

### Watch Service

The included watch service (`mcp-watch-service.js`) provides:

- Automatic server restart on file changes
- Logging of server events
- Graceful shutdown

### Realtime Synchronization

To ensure realtime database updates:

- Keep the MCP server running
- Use the watch service for persistent operation
- Configure your client to maintain an active connection

## CLI Commands

### Basic Operations

```bash
# Write a note
basic-memory tool write-note -t "Meeting Notes" -f "work" -c "Discussed project timeline"

# Read a note
basic-memory tool read-note <identifier>

# Search memories
basic-memory tool search "project management"
```

## Debugging

### Logging

Logs are stored in `~/basic-memory/logs/` by default.
Adjust log levels in configuration or via environment variables.

### Common Issues

- **Connection Closed**:
  - Verify protocol version
  - Check network configuration
  - Ensure no port conflicts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License

## Support

For issues, please file a GitHub issue with:

- Detailed description
- Error logs
- Environment details

## Roadmap

- [ ] Enhanced search capabilities
- [ ] More robust error handling
- [ ] Additional import/export formats

## Acknowledgements

- [Anthropic Claude](https://www.anthropic.com/)
- [Model Context Protocol](https://github.com/basicmachines-co/basic-memory)
