# Changelog

All notable changes to the Basic Memory Node.js implementation will be documented in this file.

## [0.10.0] - 2025-04-01

### Added

- Initial Node.js implementation of Basic Memory
- MCP server implementation with 2025 MCP standards
- Command-line interface for initialization, MCP server, and sync operations
- Database models for entities and links
- File synchronization system with watch mode
- Tool implementations:
  - `read_note`: Retrieve notes by title or permalink
  - `write_note`: Create or update notes
  - `delete_note`: Delete notes
  - `search`: Search for notes matching a query
  - `recent_activity`: Get recent notes
  - `canvas`: Generate graph visualization
  - `build_context`: Build context for AI assistants
  - `project_info`: Get project information
  - `read_content`: Read file content
- Markdown file parsing with front matter support
- Wiki-style link extraction and relationship creation
- ES Module syntax for better compatibility with modern JavaScript
- Robust error handling and logging
- Health monitoring endpoints

### Changed

- Port configuration changed from 3000 to 8765 to avoid conflicts with Docker and WSL services

### Known Issues

- MaxListenersExceededWarning may occur when running in watch mode with many files (workaround: increased listener limit to 25)
- Some larger Markdown files may have slower processing times

## Future Plans

### [0.11.0] - Planned

- Add REST API for web client integration
- Implement full-text search with better ranking
- Add authentication for multi-user environments
- Improve performance for large knowledge bases

### [0.12.0] - Planned

- Web UI for browsing and editing notes
- Visualization improvements
- Tag management system
- AI-assisted note organization
