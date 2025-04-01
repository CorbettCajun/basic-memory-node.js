/**
 * MCP Tool Adapter
 * 
 * Helper utility for working with MCP tools with proper prefixes,
 * error handling and fallback strategies.
 * 
 * Based on MCP Registry from March 2025.
 */

// Server to prefix mapping according to latest protocol
const SERVER_PREFIX_MAP = {
  fetch: "mcp3_",
  archon: "mcp0_",
  "sequential-thinking": "mcp8_",
  "memory-mcp": "mcp6_",
  "brave-search": "mcp1_",
  search1api: "mcp7_",
  "codex-keeper": "mcp2_",
  firecrawl: "mcp5_",
  filesystem: "mcp4_"
};

// Override for specific tools that don't follow the general pattern
// Based on empirical testing
const TOOL_PREFIX_OVERRIDE = {
  // Documentation tools actually use mcp0_ prefix according to testing
  "list_documentation": "mcp0_",
  "search_documentation": "mcp0_", 
  "add_documentation": "mcp0_",
  "remove_documentation": "mcp0_",
  "update_documentation": "mcp0_"
};

// Fallback strategies for different tool types
const FALLBACK_STRATEGIES = {
  // Web search fallbacks
  "brave_web_search": async (params) => {
    try {
      // Attempt fallback to search1api
      return await global.mcp7_search({
        query: params.query,
        max_results: params.count || 5
      });
    } catch (error) {
      // Final fallback to standard search_web
      return await global.search_web({
        query: params.query
      });
    }
  },
  
  // Content retrieval fallbacks
  "fetch": async (params) => {
    try {
      // Attempt fallback to search1api crawl
      return await global.mcp7_crawl({
        url: params.url
      });
    } catch (error) {
      // Final fallback to standard read_url_content
      return await global.read_url_content({
        Url: params.url
      });
    }
  }
};

/**
 * Get the correct MCP tool name with proper prefix
 * 
 * @param {string} serverName - Name of the MCP server
 * @param {string} toolName - Name of the tool
 * @returns {string} - Properly prefixed tool name
 */
function getMCPToolName(serverName, toolName) {
  // Check if there's a specific override for this tool
  if (TOOL_PREFIX_OVERRIDE[toolName]) {
    return `${TOOL_PREFIX_OVERRIDE[toolName]}${toolName}`;
  }
  
  // Otherwise use the server-to-prefix mapping
  const prefix = SERVER_PREFIX_MAP[serverName];
  if (!prefix) {
    console.warn(`Unknown MCP server: ${serverName}. Tool calls may fail.`);
    return toolName; // Return unprefixed as fallback
  }
  
  return `${prefix}${toolName}`;
}

/**
 * Call an MCP tool with proper error handling and fallbacks
 * 
 * @param {string} serverName - Name of the MCP server
 * @param {string} toolName - Name of the tool without prefix
 * @param {Object} parameters - Parameters for the tool
 * @returns {Promise<any>} - Result of the tool call
 */
async function callMCPTool(serverName, toolName, parameters = {}) {
  const fullToolName = getMCPToolName(serverName, toolName);
  
  try {
    // Check if the tool exists in the global scope
    if (typeof global[fullToolName] !== 'function') {
      console.warn(`MCP tool not found: ${fullToolName}`);
      // Try fallback strategy if available
      if (FALLBACK_STRATEGIES[toolName]) {
        console.log(`Attempting fallback for ${toolName}`);
        return await FALLBACK_STRATEGIES[toolName](parameters);
      }
      throw new Error(`MCP tool not available: ${fullToolName}`);
    }
    
    // Call the tool with the provided parameters
    return await global[fullToolName](parameters);
  } catch (error) {
    console.error(`Error calling ${fullToolName}: ${error.message}`);
    
    // Try fallback strategy if available
    if (FALLBACK_STRATEGIES[toolName]) {
      console.log(`Attempting fallback for ${toolName} after error`);
      return await FALLBACK_STRATEGIES[toolName](parameters);
    }
    
    // Re-throw the error if no fallback available
    throw error;
  }
}

/**
 * Helper functions for common MCP tool categories
 */

// Documentation related tools
async function searchDocumentation(query, category = null, tag = null) {
  const params = { query };
  if (category) params.category = category;
  if (tag) params.tag = tag;
  
  return await callMCPTool("codex-keeper", "search_documentation", params);
}

async function listDocumentation(category = null, tag = null) {
  const params = {};
  if (category) params.category = category;
  if (tag) params.tag = tag;
  
  return await callMCPTool("codex-keeper", "list_documentation", params);
}

async function addDocumentation(name, url, category = "Standards", description = "", tags = []) {
  return await callMCPTool("codex-keeper", "add_documentation", {
    name,
    url,
    category,
    description,
    tags
  });
}

// Web search tools
async function webSearch(query, count = 5) {
  return await callMCPTool("brave-search", "brave_web_search", {
    query,
    count
  });
}

// Content retrieval tools
async function fetchContent(url, maxLength = 5000, startIndex = 0) {
  return await callMCPTool("fetch", "fetch", {
    url,
    max_length: maxLength,
    start_index: startIndex
  });
}

/**
 * Retrieve full content from a URL with pagination handling
 */
async function retrieveFullContent(url, chunkSize = 5000) {
  let fullContent = "";
  let startIndex = 0;
  
  while (true) {
    try {
      const result = await fetchContent(url, chunkSize, startIndex);
      
      if (!result || !result.includes("Content truncated")) {
        // We got the full content or an empty result
        fullContent += result;
        break;
      }
      
      // Add the chunk and continue
      fullContent += result.replace(/Content truncated.+/g, "");
      startIndex += chunkSize;
    } catch (error) {
      console.error(`Error retrieving content: ${error.message}`);
      throw error;
    }
  }
  
  return fullContent;
}

// Export helper functions
export {
  callMCPTool,
  getMCPToolName,
  searchDocumentation,
  listDocumentation,
  addDocumentation,
  webSearch,
  fetchContent,
  retrieveFullContent
};
