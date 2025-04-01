#!/usr/bin/env node

/**
 * Test client for the Basic Memory MCP Server
 * Implements the 2025 MCP Standards for client-server communication
 */

import fetch from 'node-fetch';
import pino from 'pino';
import process from 'process';

// Setup logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { 
      colorize: true,
      translateTime: true
    }
  }
});

// Define colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Print colored message
function print(message, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`);
}

// Print header
function printHeader(message) {
  console.log('\n');
  print('════════════════════════════════════════════════════════════', colors.cyan);
  print(` ${message}`, colors.cyan + colors.bright);
  print('════════════════════════════════════════════════════════════', colors.cyan);
}

// Print step
function printStep(message) {
  print(`\n${colors.blue}${colors.bright}▶ ${message}${colors.reset}`);
}

// Print success
function printSuccess(message) {
  print(`${colors.green}✓ ${message}${colors.reset}`);
}

// Print error
function printError(message) {
  print(`${colors.red}✗ ${message}${colors.reset}`);
}

// MCP Server Prefix Mapping (March 2025 standard)
const mcpPrefixMapping = {
  fetch: "mcp3_",
  archon: "mcp0_",
  "sequential-thinking": "mcp8_",
  "memory-mcp": "mcp6_",
  "brave-search": "mcp1_",
  search1api: "mcp7_",
  "codex-keeper": "mcp2_",
  firecrawl: "mcp5_",
  filesystem: "mcp4_",
  // Basic-memory uses no prefix as it's a primary service
  "basic-memory": ""
};

/**
 * MCP Client implementation following 2025 standards
 */
class MCPClient {
  constructor(baseUrl, serverType = 'basic-memory') {
    this.baseUrl = baseUrl;
    this.serverType = serverType;
    this.prefix = mcpPrefixMapping[serverType] || '';
    this.jsonRpcId = 1;
    this.logger = logger.child({ component: 'MCPClient' });
  }

  /**
   * Make a JSON-RPC call to the MCP server
   */
  async callTool(toolName, params = {}) {
    const fullToolName = `${this.prefix}${toolName}`;
    printStep(`Calling tool: ${fullToolName}`);
    
    try {
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: fullToolName,
          params,
          id: this.jsonRpcId++
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(`Tool error: ${result.error.message}`);
      }
      
      return result.result;
    } catch (error) {
      printError(`Error calling tool ${fullToolName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get MCP server information
   */
  async getServerInfo() {
    try {
      printStep('Getting server info');
      const response = await fetch(`${this.baseUrl}/mcp`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      printError(`Error getting server info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check server health
   */
  async checkHealth() {
    try {
      printStep('Checking server health');
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      printError(`Error checking health: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Pretty-print JSON result
 */
function prettyPrintResult(result) {
  if (typeof result === 'object') {
    // Handle special case for search results and lists
    if (result.results && Array.isArray(result.results)) {
      print(`Found ${result.results.length} results:`, colors.bright);
      
      result.results.forEach((item, index) => {
        print(`\n  ${index + 1}. ${item.title}`, colors.yellow + colors.bright);
        if (item.permalink) print(`     Permalink: ${item.permalink}`, colors.dim);
        if (item.type) print(`     Type: ${item.type}`, colors.dim);
        if (item.excerpt) {
          print(`     Excerpt: ${item.excerpt.substring(0, 100)}${item.excerpt.length > 100 ? '...' : ''}`, colors.white);
        }
      });
      
      return;
    }
    
    // Handle canvas results
    if (result.nodes && result.edges) {
      print(`Graph with ${result.nodes.length} nodes and ${result.edges.length} edges:`, colors.bright);
      print(`  • Nodes: ${result.nodes.map(n => n.label).join(', ')}`, colors.yellow);
      return;
    }
    
    // Handle build_context results
    if (result.context && result.sources) {
      print(`Context built from ${result.source_count} sources:`, colors.bright);
      print(`  • Sources: ${result.sources.map(s => s.title).join(', ')}`, colors.yellow);
      const contextPreview = result.context.substring(0, 200) + (result.context.length > 200 ? '...' : '');
      print(`  • Preview: ${contextPreview}`, colors.white);
      return;
    }
    
    // For simple objects, print a formatted version
    const formatted = JSON.stringify(result, null, 2)
      .split('\n')
      .map(line => '  ' + line)
      .join('\n');
    
    print(formatted, colors.white);
  } else {
    print(`  ${result}`, colors.white);
  }
}

/**
 * Run a comprehensive test of the MCP server
 */
async function runComprehensiveTest(client) {
  printHeader('Running Comprehensive MCP Server Test');
  
  // Test steps
  const steps = [
    {
      name: 'Create Test Note',
      action: async () => {
        return await client.callTool('write_note', {
          title: 'Test Note',
          content: '# Test Note\n\nThis is a test note with a link to [[Another Test Note]].',
          attributes: {
            tags: ['test', 'example']
          }
        });
      }
    },
    {
      name: 'Read Test Note',
      action: async () => {
        return await client.callTool('read_note', {
          title: 'Test Note'
        });
      }
    },
    {
      name: 'Create Another Test Note',
      action: async () => {
        return await client.callTool('write_note', {
          title: 'Another Test Note',
          content: '# Another Test Note\n\nThis is another test note that links back to [[Test Note]].',
          attributes: {
            tags: ['test', 'example', 'another']
          }
        });
      }
    },
    {
      name: 'Search for Notes',
      action: async () => {
        return await client.callTool('search', {
          query: 'test',
          limit: 10
        });
      }
    },
    {
      name: 'Get Recent Activity',
      action: async () => {
        return await client.callTool('recent_activity', {
          limit: 5
        });
      }
    },
    {
      name: 'Generate Canvas',
      action: async () => {
        return await client.callTool('canvas', {
          query: 'Test Note',
          depth: 2
        });
      }
    },
    {
      name: 'Build Context',
      action: async () => {
        return await client.callTool('build_context', {
          query: 'test',
          max_results: 5
        });
      }
    },
    {
      name: 'Delete Test Notes',
      action: async () => {
        await client.callTool('delete_note', { title: 'Test Note' });
        return await client.callTool('delete_note', { title: 'Another Test Note' });
      }
    }
  ];
  
  // Run each test step
  for (const step of steps) {
    try {
      printStep(`Test: ${step.name}`);
      const result = await step.action();
      print('\nResult:', colors.bright);
      prettyPrintResult(result);
      printSuccess(`Test step "${step.name}" completed successfully`);
    } catch (error) {
      printError(`Test step "${step.name}" failed: ${error.message}`);
    }
  }
  
  printHeader('Comprehensive test completed');
}

// Run a test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const run = async () => {
    try {
      // Parse command line arguments
      const port = process.argv[2] || process.env.BASIC_MEMORY_PORT || '8765';
      const host = process.argv[3] || process.env.BASIC_MEMORY_HOST || 'localhost';
      const baseUrl = `http://${host}:${port}`;
      
      printHeader(`Basic Memory MCP Test Client`);
      print(`Connecting to server at ${baseUrl}\n`, colors.yellow);
      
      const client = new MCPClient(baseUrl);
      
      // Check server info
      const serverInfo = await client.getServerInfo();
      print('\nServer info:', colors.bright);
      prettyPrintResult(serverInfo);
      printSuccess('Server info retrieved successfully');
      
      // Check server health
      const health = await client.checkHealth();
      print('\nServer health:', colors.bright);
      prettyPrintResult(health);
      printSuccess('Server health check completed successfully');
      
      // Run comprehensive test if requested
      if (process.argv.includes('--comprehensive')) {
        await runComprehensiveTest(client);
      } else {
        // Or just run basic tests
        printHeader('Running Basic Tests');
        
        printStep('Testing search tool');
        const searchResult = await client.callTool('search', { query: 'test' });
        print('\nSearch result:', colors.bright);
        prettyPrintResult(searchResult);
        printSuccess('Search test completed successfully');
        
        printStep('Testing recent activity tool');
        const recentActivity = await client.callTool('recent_activity');
        print('\nRecent activity:', colors.bright);
        prettyPrintResult(recentActivity);
        printSuccess('Recent activity test completed successfully');
      }
      
      printHeader('All tests completed successfully');
    } catch (error) {
      printError(`Test failed: ${error.message}`);
      process.exit(1);
    }
  };
  
  run();
}

export default MCPClient;
