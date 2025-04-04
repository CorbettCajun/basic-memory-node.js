# Basic Memory CLI Reference

Basic Memory provides a comprehensive command-line interface (CLI) for managing your knowledge base. This document provides detailed documentation for all available commands and options.

## Global Options

The following options are available for all commands:

- `--help, -h`: Display help information for a command
- `--version, -v`: Display the Basic Memory version

## Project Configuration

By default, Basic Memory uses the following environment variables for configuration:

- `BASIC_MEMORY_HOME`: Base directory for Basic Memory data (default: `~/basic-memory`)
- `BASIC_MEMORY_PROJECT`: Current project name (default: `default`)
- `BASIC_MEMORY_DB_PATH`: Path to the database file (default: `<BASIC_MEMORY_HOME>/<BASIC_MEMORY_PROJECT>/basic_memory.db`)

## Available Commands

### Status

Display the current status of Basic Memory.

```bash
basic-memory status
```

**Options:**

- `--json`: Output status information as JSON

**Example:**

```bash
basic-memory status
```

### Sync

Synchronize Markdown files with the knowledge base.

```bash
basic-memory sync [options]
```

**Options:**

- `--watch, -w`: Watch for file changes and sync continuously
- `--verbose, -v`: Show verbose output
- `--dir <directory>`: Specify a directory to sync (default: current project directory)

**Example:**

```bash
# One-time sync
basic-memory sync

# Continuous sync with file watching
basic-memory sync --watch

# Sync a specific directory
basic-memory sync --dir ~/notes
```

### MCP

Start the Model Context Protocol server for AI assistants to interact with Basic Memory.

```bash
basic-memory mcp [options]
```

**Options:**

- `--host <host>`: Host to bind the server to (default: localhost)
- `--port <port>`: Port to run the server on (default: 0, dynamically assigned)
- `--verbose, -v`: Show verbose output

**Dynamic Port Assignment**:

- When `--port` is set to `0` (default), the server automatically finds an available port
- The assigned port will be displayed in the console output
- This prevents port conflicts between multiple applications

**Example:**

```bash
# Start MCP server with dynamic port assignment
basic-memory mcp

# Start MCP server on a specific port
basic-memory mcp --port 9000
```

**Environment Variables:**

- `BASIC_MEMORY_PORT`: Set the port for the MCP server
  - `0`: Dynamically assign an available port (default)
  - Any other number: Use the specified port

### Entity Commands

Manage entities in the knowledge base.

#### Create Entity

Create a new entity.

```bash
basic-memory entity create [options]
```

**Options:**

- `--id <id>`: Specify entity ID
- `--title <title>`: Entity title
- `--type <type>`: Entity type
- `--content <content>`: Entity content
- `--file <file>`: Read entity content from file
- `--json <json>`: Provide entity as JSON

**Example:**

```bash
# Create an entity with inline parameters
basic-memory entity create --title "Example Entity" --type "note" --content "This is an example entity"

# Create an entity from a file
basic-memory entity create --file ~/notes/example.md
```

#### Get Entity

Get an entity by ID.

```bash
basic-memory entity get <id> [options]
```

**Options:**

- `--json`: Output entity as JSON

**Example:**

```bash
basic-memory entity get unique-id-123
```

#### Delete Entity

Delete an entity by ID.

```bash
basic-memory entity delete <id>
```

**Example:**

```bash
basic-memory entity delete unique-id-123
```

#### List Entities

List entities matching specified criteria.

```bash
basic-memory entity list [options]
```

**Options:**

- `--type <type>`: Filter by entity type
- `--limit <limit>`: Maximum number of entities to return
- `--offset <offset>`: Offset for pagination
- `--json`: Output as JSON

**Example:**

```bash
# List all entities
basic-memory entity list

# List entities of a specific type
basic-memory entity list --type note
```

### Relation Commands

Manage relationships between entities.

#### Create Relation

Create a relation between two entities.

```bash
basic-memory relation create [options]
```

**Options:**

- `--source <source_id>`: Source entity ID
- `--target <target_id>`: Target entity ID
- `--type <type>`: Relation type
- `--json <json>`: Provide relation as JSON

**Example:**

```bash
basic-memory relation create --source entity-1 --target entity-2 --type references
```

#### Get Relations

Get relations matching specified criteria.

```bash
basic-memory relation get [options]
```

**Options:**

- `--source <source_id>`: Filter by source entity ID
- `--target <target_id>`: Filter by target entity ID
- `--type <type>`: Filter by relation type
- `--bidirectional`: Search in both directions
- `--json`: Output as JSON

**Example:**

```bash
# Get all relations for a specific entity
basic-memory relation get --source entity-1
```

#### Delete Relation

Delete a relation by ID.

```bash
basic-memory relation delete <id>
```

**Example:**

```bash
basic-memory relation delete relation-123
```

#### Find Related

Find entities related to a specified entity.

```bash
basic-memory relation find-related <entity_id> [options]
```

**Options:**

- `--types <types>`: Comma-separated list of relation types to include
- `--direction <direction>`: Direction of relations ('incoming', 'outgoing', or 'both')
- `--include-entities`: Include the related entities in the result
- `--json`: Output as JSON

**Example:**

```bash
basic-memory relation find-related entity-1 --direction outgoing --include-entities
```

### Observation Commands

Manage observations about entities.

#### Create Observation

Create a new observation for an entity.

```bash
basic-memory observation create [options]
```

**Options:**

- `--entity <entity_id>`: Entity ID this observation is about
- `--category <category>`: Observation category
- `--content <content>`: Observation content
- `--file <file>`: Read observation content from file
- `--json <json>`: Provide observation as JSON

**Example:**

```bash
basic-memory observation create --entity entity-123 --category note --content "This is an important observation"
```

#### Get Observations

Get observations matching specified criteria.

```bash
basic-memory observation get [options]
```

**Options:**

- `--entity <entity_id>`: Filter by entity ID
- `--category <category>`: Filter by category
- `--limit <limit>`: Maximum number of observations to return
- `--offset <offset>`: Offset for pagination
- `--json`: Output as JSON

**Example:**

```bash
# Get all observations for a specific entity
basic-memory observation get --entity entity-123
```

#### Get Observation by ID

Get an observation by its ID.

```bash
basic-memory observation get-by-id <id> [options]
```

**Options:**

- `--json`: Output observation as JSON

**Example:**

```bash
basic-memory observation get-by-id observation-123
```

#### Update Observation

Update an existing observation.

```bash
basic-memory observation update <id> [options]
```

**Options:**

- `--category <category>`: New observation category
- `--content <content>`: New observation content
- `--file <file>`: Read new observation content from file
- `--json <json>`: Provide updated observation as JSON

**Example:**

```bash
basic-memory observation update observation-123 --content "Updated observation content"
```

#### Delete Observation

Delete an observation by its ID.

```bash
basic-memory observation delete <id>
```

**Example:**

```bash
basic-memory observation delete observation-123
```

### Search Commands

Search entities and observations in the knowledge base.

#### Search Entities

Search for entities matching query text.

```bash
basic-memory search entities <query> [options]
```

**Options:**

- `--type <type>`: Filter by entity type
- `--limit <limit>`: Maximum number of results to return
- `--offset <offset>`: Offset for pagination
- `--json`: Output as JSON

**Example:**

```bash
basic-memory search entities "important concept" --type note --limit 10
```

#### Search Observations

Search for observations matching query text.

```bash
basic-memory search observations <query> [options]
```

**Options:**

- `--entity <entity_id>`: Filter by entity ID
- `--category <category>`: Filter by category
- `--limit <limit>`: Maximum number of results to return
- `--offset <offset>`: Offset for pagination
- `--json`: Output as JSON

**Example:**

```bash
basic-memory search observations "important finding" --category note --limit 10
```

#### Update Index

Update the search index for a specific entity.

```bash
basic-memory search update-index <entity_id>
```

**Example:**

```bash
basic-memory search update-index entity-123
```

#### Rebuild Indices

Rebuild all search indices for the knowledge base.

```bash
basic-memory search rebuild-indices
```

**Example:**

```bash
basic-memory search rebuild-indices
```

### DB Commands

Manage the Basic Memory database.

#### Backup Database

Create a backup of the database.

```bash
basic-memory db backup [options]
```

**Options:**

- `--output <file>`: Output file path for the backup

**Example:**

```bash
basic-memory db backup --output ~/backups/basic-memory-$(date +%Y%m%d).db
```

#### Restore Database

Restore the database from a backup.

```bash
basic-memory db restore <backup_file>
```

**Example:**

```bash
basic-memory db restore ~/backups/basic-memory-20250101.db
```

#### Reset Database

Reset the database to an empty state.

```bash
basic-memory db reset [options]
```

**Options:**

- `--force`: Skip confirmation prompt
- `--backup`: Create a backup before resetting

**Example:**

```bash
basic-memory db reset --backup
```

#### Migrate Database

Migrate the database to the latest schema version.

```bash
basic-memory db migrate
```

**Example:**

```bash
basic-memory db migrate
```

### Project Commands

Manage Basic Memory projects.

#### List Projects

List available projects.

```bash
basic-memory project list
```

**Example:**

```bash
basic-memory project list
```

#### Create Project

Create a new project.

```bash
basic-memory project create <name> [options]
```

**Options:**

- `--description <description>`: Project description
- `--path <path>`: Custom path for project directory

**Example:**

```bash
basic-memory project create work --description "Work-related notes and knowledge"
```

#### Project Info

Show information about a project.

```bash
basic-memory project info [project_name]
```

**Example:**

```bash
# Show info about the current project
basic-memory project info

# Show info about a specific project
basic-memory project info work
```

## Examples

### Basic Workflow

1. Create a new project:

   ```bash
   basic-memory project create research --description "Research notes and findings"
   ```

2. Create entities from files:

   ```bash
   # Create entities from existing Markdown files
   basic-memory entity create --file ~/notes/research/topic1.md
   basic-memory entity create --file ~/notes/research/topic2.md
   ```

3. Create a relation between entities:

   ```bash
   basic-memory relation create --source topic1 --target topic2 --type references
   ```

4. Add observations:

   ```bash
   basic-memory observation create --entity topic1 --category note --content "This topic connects to topic2 in several ways"
   ```

5. Search for content:

   ```bash
   basic-memory search entities "important concept"
   ```

6. Start the MCP server for AI assistant integration:

   ```bash
   basic-memory mcp
   ```

### Continuous Sync Workflow

1. Start a continuous sync process:

   ```bash
   basic-memory sync --watch
   ```

2. Create or edit Markdown files in your project directory.

3. Basic Memory will automatically detect changes and update the knowledge base.

### Backup and Restore

1. Create a backup before making significant changes:

   ```bash
   basic-memory db backup --output ~/backups/basic-memory-before-changes.db
   ```

2. Make your changes to the knowledge base.

3. If needed, restore from the backup:

   ```bash
   basic-memory db restore ~/backups/basic-memory-before-changes.db
   ```
