/**
 * Tool registration and schemas for Basic Memory MCP server
 * 
 * Registers all tool handlers with the MCP server
 */

import pino from 'pino';

// Import tool handlers
import { readNoteTool } from './read_note.js';
import { writeNoteTool } from './write_note.js';
import { deleteNoteTool } from './delete_note.js';
import { searchTool } from './search.js';
import { recentActivityTool } from './recent_activity.js';
import { canvasTool } from './canvas.js';
import { buildContextTool } from './build_context.js';
import { projectInfoTool } from './project_info.js';
import { readContentTool } from './read_content.js';

// Configure logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Define JSON schema for tools
const toolSchemas = {
  read_note: {
    schema: {
      body: {
        type: 'object',
        properties: {
          jsonrpc: { type: 'string' },
          id: { type: ['string', 'number'] },
          method: { type: 'string' },
          params: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              permalink: { type: 'string' }
            },
            additionalProperties: false
          }
        },
        required: ['jsonrpc', 'id', 'method', 'params']
      }
    }
  },
  write_note: {
    schema: {
      body: {
        type: 'object',
        properties: {
          jsonrpc: { type: 'string' },
          id: { type: ['string', 'number'] },
          method: { type: 'string' },
          params: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              content: { type: 'string' },
              attributes: { 
                type: 'object',
                additionalProperties: true
              },
              type: { type: 'string' },
              permalink: { type: 'string' }
            },
            required: ['title', 'content'],
            additionalProperties: false
          }
        },
        required: ['jsonrpc', 'id', 'method', 'params']
      }
    }
  },
  delete_note: {
    schema: {
      body: {
        type: 'object',
        properties: {
          jsonrpc: { type: 'string' },
          id: { type: ['string', 'number'] },
          method: { type: 'string' },
          params: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              permalink: { type: 'string' }
            },
            additionalProperties: false
          }
        },
        required: ['jsonrpc', 'id', 'method', 'params']
      }
    }
  },
  search: {
    schema: {
      body: {
        type: 'object',
        properties: {
          jsonrpc: { type: 'string' },
          id: { type: ['string', 'number'] },
          method: { type: 'string' },
          params: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              limit: { type: 'number' },
              type: { type: 'string' }
            },
            required: ['query'],
            additionalProperties: false
          }
        },
        required: ['jsonrpc', 'id', 'method', 'params']
      }
    }
  },
  recent_activity: {
    schema: {
      body: {
        type: 'object',
        properties: {
          jsonrpc: { type: 'string' },
          id: { type: ['string', 'number'] },
          method: { type: 'string' },
          params: {
            type: 'object',
            properties: {
              limit: { type: 'number' },
              type: { type: 'string' }
            },
            additionalProperties: false
          }
        },
        required: ['jsonrpc', 'id', 'method']
      }
    }
  },
  canvas: {
    schema: {
      body: {
        type: 'object',
        properties: {
          jsonrpc: { type: 'string' },
          id: { type: ['string', 'number'] },
          method: { type: 'string' },
          params: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              depth: { type: 'number' }
            },
            required: ['query'],
            additionalProperties: false
          }
        },
        required: ['jsonrpc', 'id', 'method', 'params']
      }
    }
  },
  build_context: {
    schema: {
      body: {
        type: 'object',
        properties: {
          jsonrpc: { type: 'string' },
          id: { type: ['string', 'number'] },
          method: { type: 'string' },
          params: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              max_results: { type: 'number' },
              max_tokens: { type: 'number' }
            },
            required: ['query'],
            additionalProperties: false
          }
        },
        required: ['jsonrpc', 'id', 'method', 'params']
      }
    }
  },
  project_info: {
    schema: {
      body: {
        type: 'object',
        properties: {
          jsonrpc: { type: 'string' },
          id: { type: ['string', 'number'] },
          method: { type: 'string' },
          params: {
            type: 'object',
            properties: {
              name: { type: 'string' }
            },
            required: ['name'],
            additionalProperties: false
          }
        },
        required: ['jsonrpc', 'id', 'method', 'params']
      }
    }
  },
  read_content: {
    schema: {
      body: {
        type: 'object',
        properties: {
          jsonrpc: { type: 'string' },
          id: { type: ['string', 'number'] },
          method: { type: 'string' },
          params: {
            type: 'object',
            properties: {
              path: { type: 'string' }
            },
            required: ['path'],
            additionalProperties: false
          }
        },
        required: ['jsonrpc', 'id', 'method', 'params']
      }
    }
  }
};

// Register all tools with the MCP server
export function registerTools(server) {
  // Helper function for JSON-RPC responses
  const jsonRpcResponse = (id, result) => ({
    jsonrpc: '2.0',
    id,
    result
  });

  const jsonRpcError = (id, message, code = -32000, data = null) => ({
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      data
    }
  });

  // Map of method names to tool handlers
  const toolHandlers = {
    'read_note': readNoteTool,
    'write_note': writeNoteTool,
    'delete_note': deleteNoteTool,
    'search': searchTool,
    'recent_activity': recentActivityTool,
    'canvas': canvasTool,
    'build_context': buildContextTool,
    'project_info': projectInfoTool,
    'read_content': readContentTool
  };

  // Register a single handler for /mcp endpoint that dispatches to the appropriate tool
  server.post('/mcp', {
    schema: {
      body: {
        type: 'object',
        required: ['jsonrpc', 'method', 'id'],
        properties: {
          jsonrpc: { type: 'string' },
          method: { type: 'string' },
          id: { type: ['string', 'number'] },
          params: { 
            type: 'object',
            additionalProperties: true 
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id, method, params } = request.body;
    
    // Extract tool name from method (remove prefix if any)
    const toolName = method.includes('_') ? method.split('_').slice(1).join('_') : method;
    
    // Log request
    logger.info(`Handling MCP request: ${method} (id: ${id})`);
    
    // Check if tool exists
    if (!toolHandlers[toolName]) {
      logger.warn(`Unknown tool requested: ${toolName}`);
      return jsonRpcError(id, `Method not found: ${method}`, -32601);
    }
    
    try {
      // Call the appropriate tool handler
      const result = await toolHandlers[toolName](params || {});
      return jsonRpcResponse(id, result);
    } catch (error) {
      logger.error(`Error in ${toolName}: ${error.message}`);
      return jsonRpcError(id, error.message);
    }
  });

  // Log registered tools
  const toolNames = Object.keys(toolHandlers);
  toolNames.forEach(name => {
    logger.info(`Registered MCP tool: ${name}`);
  });
}

// Export schemas for testing
export { toolSchemas };
