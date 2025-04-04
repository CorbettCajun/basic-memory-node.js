# Basic Memory MCP Integration Guide

This guide explains how to integrate Basic Memory with AI assistants using the Model Context Protocol (MCP).

## What is MCP?

Model Context Protocol (MCP) is a standardized interface for AI models to interact with external tools and services. Basic Memory implements an MCP server that allows AI assistants like Claude Desktop to access and manipulate your knowledge base.

## Starting the MCP Server

To start the Basic Memory MCP server:

```bash
basic-memory mcp
```

By default, this starts the server on `localhost:8765`. You can customize the host and port with options:

```bash
basic-memory mcp --host 0.0.0.0 --port 9000
```

## Connecting to Claude Desktop

To connect Basic Memory to Claude Desktop:

1. Start the Basic Memory MCP server:

   ```bash
   basic-memory mcp
   ```

2. Open Claude Desktop and go to Settings > MCP Servers

3. Add a new MCP server with the URL `http://localhost:8765`

4. Confirm the connection, and Claude will be able to access your Basic Memory knowledge base

## Available MCP Tools

Basic Memory exposes the following tools through the MCP interface:

### `read_note`

Retrieve a note by title or permalink.

**Parameters:**

- `title` (String, optional): Title of the note to retrieve
- `permalink` (String, optional): Permalink of the note to retrieve

**Returns:**

- Entity object with content and metadata
- Null if the note doesn't exist

### `write_note`

Create or update a note.

**Parameters:**

- `title` (String): Title of the note
- `content` (String): Content of the note
- `type` (String, optional): Type of note (default: "note")
- `metadata` (Object, optional): Additional metadata for the note

**Returns:**

- Created or updated entity object

### `delete_note`

Delete a note by title or permalink.

**Parameters:**

- `title` (String, optional): Title of the note to delete
- `permalink` (String, optional): Permalink of the note to delete

**Returns:**

- Boolean indicating success or failure

### `search`

Search for notes in the knowledge base.

**Parameters:**

- `query` (String): Search query text
- `type` (String, optional): Filter by note type
- `limit` (Number, optional): Maximum number of results to return

**Returns:**

- Array of matching entity objects

### `recent_activity`

Get recently modified notes.

**Parameters:**

- `limit` (Number, optional): Maximum number of notes to return (default: 10)

**Returns:**

- Array of recently modified entity objects

### `canvas`

Generate graph visualization data for the knowledge base.

**Parameters:**

- `central_entity` (String, optional): Central entity ID to focus the graph on
- `depth` (Number, optional): Depth of relationships to include (default: 2)

**Returns:**

- Object containing nodes and edges for visualization

### `build_context`

Create context for AI assistants based on a query.

**Parameters:**

- `query` (String): Query to build context for
- `limit` (Number, optional): Maximum number of entities to include (default: 5)

**Returns:**

- String containing formatted context from relevant entities

### `project_info`

Get information about the current or specified project.

**Parameters:**

- `project_name` (String, optional): Name of the project to get info for

**Returns:**

- Object containing project information

### `read_content`

Read file content from the knowledge base directory.

**Parameters:**

- `file_path` (String): Path to the file within the knowledge base

**Returns:**

- String containing the file content
- Error object if the file doesn't exist or can't be read

## Example MCP Interactions

Here are some examples of how AI assistants can interact with Basic Memory through MCP:

### Retrieving a Note

```markdown
User: What do I have in my notes about quantum computing?

AI Assistant: Let me check your notes on quantum computing.

[AI uses MCP tool 'search' with query="quantum computing"]

AI Assistant: I found a note titled "Quantum Computing Basics" in your knowledge base. It covers quantum bits, superposition, and quantum algorithms. Would you like me to summarize the key points or provide the full note?
```

### Creating a New Note

```markdown
User: Create a note about the benefits of regular exercise.

AI Assistant: I'll create a note about the benefits of regular exercise.

[AI uses MCP tool 'write_note' with:
  title="Benefits of Regular Exercise"
  content="# Benefits of Regular Exercise\n\nRegular exercise provides numerous health benefits:\n\n- Improves cardiovascular health\n- Strengthens muscles and bones\n- Reduces stress and anxiety\n- Improves sleep quality\n- Helps maintain healthy weight\n- Boosts energy and cognitive function"
  type="note"
  metadata={"tags": ["health", "fitness", "wellness"]}
]

AI Assistant: I've created a note titled "Benefits of Regular Exercise" in your knowledge base. It includes sections on cardiovascular health, muscle strength, stress reduction, sleep improvement, weight management, and cognitive benefits. I've also tagged it with "health", "fitness", and "wellness" for easy retrieval.
```

### Building Context from the Knowledge Base

```markdown
User: I'm writing a paper on climate change. What relevant information do I have in my notes?

AI Assistant: Let me check your knowledge base for information related to climate change.

[AI uses MCP tool 'build_context' with query="climate change"]

AI Assistant: Based on your notes, I found several relevant pieces of information for your climate change paper:

1. From "Climate Science Basics": You have detailed notes on greenhouse gas mechanisms and global temperature trends.
2. From "Renewable Energy Solutions": You've documented various renewable technologies and their potential impact on emissions reduction.
3. From "Policy Approaches": You have notes comparing carbon tax vs. cap-and-trade policies from different countries.

Would you like me to elaborate on any of these areas for your paper?
```

## Creating Custom MCP Tools

If you're a developer, you can extend Basic Memory's MCP capabilities by creating custom tools. Here's how:

### Custom Tool Structure

Custom tools are defined in the `src/mcp/tools` directory. Each tool has:

1. A function that implements the tool's functionality
2. A schema that defines the tool's parameters and return type

### Example: Creating a Custom Tool

Here's an example of creating a simple custom tool that counts entities by type:

```javascript
// src/mcp/tools/count_by_type.js
import { entity } from '../../api/index.js';

export const countByTypeSchema = {
  name: 'count_by_type',
  description: 'Count entities by type',
  parameters: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: 'Entity type to count (optional)',
      },
    },
    required: [],
  },
};

export async function countByTypeTool(params) {
  try {
    const filter = params.type ? { type: params.type } : {};
    const entities = await entity.list(filter);

    if (params.type) {
      return {
        count: entities.length,
        type: params.type,
      };
    } else {
      // Group by type and count
      const counts = {};
      for (const e of entities) {
        counts[e.type] = (counts[e.type] || 0) + 1;
      }
      return counts;
    }
  } catch (error) {
    console.error('Error in count_by_type tool:', error);
    return { error: error.message };
  }
}
```

### Registering the Custom Tool

To register your custom tool with the MCP server, add it to the tools list in `src/mcp/index.js`:

```javascript
import { countByTypeSchema, countByTypeTool } from './tools/count_by_type.js';

// In the setupMcpServer function
const tools = [
  // ... existing tools
  {
    schema: countByTypeSchema,
    function: countByTypeTool,
  },
];
```

### Using Your Custom Tool

After restarting the MCP server, AI assistants can use your custom tool:

```markdown
User: How many notes do I have of each type?

AI Assistant: Let me check the types of notes in your knowledge base.

[AI uses MCP tool 'count_by_type']

AI Assistant: Here's a breakdown of your notes by type:
- note: 24
- concept: 15
- person: 7
- book: 12
- project: 5

You have a total of 63 notes across 5 different types.
```

## Troubleshooting MCP Connections

### Connection Issues

If Claude or another AI assistant can't connect to your Basic Memory MCP server:

1. **Check the server is running**:
   Make sure the Basic Memory MCP server is running by executing `basic-memory mcp`.

2. **Verify the server address**:
   Ensure you're using the correct address in Claude Desktop (default: `http://localhost:8765`).

3. **Check firewall settings**:
   Your firewall might be blocking the connection. Add an exception for the MCP server port.

4. **Try a different port**:
   If port 8765 is in use, try a different port with `basic-memory mcp --port 9000`.

### Tool Execution Errors

If you encounter errors when the AI assistant tries to use an MCP tool:

1. **Check tool parameters**:
   Make sure the AI is providing the correct parameters for each tool.

2. **Check server logs**:
   Run the MCP server with verbose output to see detailed logs: `basic-memory mcp --verbose`.

3. **Restart the server**:
   Sometimes a simple restart can resolve issues: `basic-memory mcp`.

## Security Considerations

The Basic Memory MCP server provides access to your knowledge base. Consider these security precautions:

1. **Local use only**:
   By default, the server only accepts connections from localhost for security. Only change this if you understand the implications.

2. **No authentication**:
   The current MCP implementation doesn't include authentication. Don't expose the server to untrusted networks.

3. **Data sensitivity**:
   Be mindful of the sensitive information in your knowledge base when connecting AI assistants.

4. **Read-only mode**:
   If you only want AI assistants to read but not modify your knowledge base, you can use a read-only MCP configuration (see Advanced Configuration).
