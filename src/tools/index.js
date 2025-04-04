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
export async function registerTools(server) {
  logger.info('Registering MCP tools...');
  
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

  // Use Promise.all to handle registering endpoints concurrently
  const registrationPromises = Object.entries(toolSchemas).map(async ([name, config]) => {
    logger.debug(`Registering REST endpoint for tool: ${name}`);
    
    try {
      server.post(`/${name}`, {
        schema: {
          body: config.schema.body
        }
      }, async (request, reply) => {
        try {
          const handler = toolHandlers[name];
          if (!handler) {
            throw new Error(`Tool handler not found for: ${name}`);
          }
          
          const result = await handler(request.body);
          return { result };
        } catch (error) {
          logger.error(`Error in tool ${name}: ${error.message}`);
          
          let code = -32603; // Internal error
          if (error.validation) code = -32602; // Invalid params
          if (error.notFound) code = -32601; // Method not found
          if (error.auth) code = -32000; // Authorization error
          
          reply.status(error.statusCode || 500).send({
            error: error.message,
            code: code,
            data: process.env.NODE_ENV === 'development' ? error.stack : undefined
          });
        }
      });
      
      return true; // Successfully registered
    } catch (error) {
      logger.error(`Failed to register tool ${name}: ${error.message}`);
      return false; // Failed to register
    }
  });
  
  // Wait for all registrations to complete
  const results = await Promise.all(registrationPromises);
  const successCount = results.filter(Boolean).length;
  
  logger.info(`Successfully registered ${successCount} of ${Object.keys(toolSchemas).length} MCP tools`);

  // Register the main JSON-RPC compatible endpoint for backward compatibility
  try {
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
    
    logger.info('Registered main MCP JSON-RPC endpoint');
  } catch (error) {
    logger.error(`Failed to register main MCP endpoint: ${error.message}`);
    throw error; // This is critical, so propagate the error
  }
  
  return { 
    success: true, 
    registeredTools: Object.keys(toolHandlers)
  };
}

// Export schemas for testing
export { toolSchemas };
