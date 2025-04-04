/**
 * Tool management and utility functions for Basic Memory MCP server.
 * @module tool
 */

const logger = require('loguru');
const { mcp } = require('../server');
const { listTools } = require('../utils/tool_registry');

/**
 * List and manage available MCP tools.
 * 
 * Provides functionality to:
 * - List all registered tools
 * - Get detailed information about specific tools
 * - Manage tool registration and discovery
 * 
 * @param {Object} options - Configuration options for tool management
 * @param {string} [options.filter] - Filter tools by name or category
 * @param {boolean} [options.verbose=false] - Show detailed tool information
 * 
 * @returns {Promise<Array>} List of available tools with optional details
 * 
 * @example
 * // List all tools
 * const tools = await tool();
 * 
 * // List tools with a specific filter
 * const filteredTools = await tool({ filter: 'import' });
 */
async function tool(options = {}) {
    const { filter, verbose = false } = options;

    try {
        logger.info('Retrieving available MCP tools');

        // Get list of registered tools
        const tools = await listTools(filter);

        if (verbose) {
            // Return detailed tool information
            return tools.map(tool => ({
                name: tool.name,
                description: tool.description,
                category: tool.category,
                parameters: tool.parameters
            }));
        }

        // Return basic tool names
        return tools.map(tool => tool.name);
    } catch (error) {
        logger.error('Failed to retrieve tools', error);
        throw error;
    }
}

// Register the tool with the MCP server
mcp.tool({
    name: 'tool',
    description: 'List and manage available MCP tools.',
    handler: tool
});

module.exports = { tool };
