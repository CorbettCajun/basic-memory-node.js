/**
 * CLI tool commands for Basic Memory.
 * Node.js implementation matching the Python version's functionality
 */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getHomeDir } from '../../db/index.js';
import pino from 'pino';
import { Console } from 'console';
import { createWriteStream } from 'fs';

// Import MCP tools
import { 
  buildContext as mcpBuildContext,
  readNote as mcpReadNote,
  recentActivity as mcpRecentActivity,
  search as mcpSearch,
  writeNote as mcpWriteNote,
  continueConversation as mcpContinueConversation
} from '../../mcp/tools/index.js';

// Import custom error types
import BasicMemoryError from '../../errors/base-error.js';

// Configure logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { 
      colorize: true,
      maxListeners: 1 
    }
  },
  base: null,
  timestamp: false
});

// Create a rich-like console for output
const console = new Console({
  stdout: process.stdout,
  stderr: process.stderr
});

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Error Codes
const ERROR_CODES = {
  INVALID_INPUT: 'TOOL_001',
  MISSING_PARAMETER: 'TOOL_002',
  PROCESSING_ERROR: 'TOOL_003',
  VALIDATION_ERROR: 'TOOL_004'
};

// Input Validation Utilities
const validateInput = {
  isNonEmptyString(value, fieldName) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BasicMemoryError({
        code: ERROR_CODES.INVALID_INPUT,
        message: `${fieldName} must be a non-empty string`,
        details: { value, fieldName }
      });
    }
  },

  isPositiveInteger(value, fieldName) {
    const num = Number(value);
    if (!Number.isInteger(num) || num <= 0) {
      throw new BasicMemoryError({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: `${fieldName} must be a positive integer`,
        details: { value, fieldName }
      });
    }
  },

  isValidTimeframe(timeframe) {
    const validTimeframeRegex = /^(\d+)([dwmy])$/;
    if (timeframe && !validTimeframeRegex.test(timeframe)) {
      throw new BasicMemoryError({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Invalid timeframe format. Use format like "7d", "1w", "2m", "1y"',
        details: { timeframe }
      });
    }
  }
};

// Typed Command Implementations
class ToolCommands {
  /**
   * Write a note with comprehensive validation
   * @param {string} title - Note title
   * @param {string} folder - Folder to save note
   * @param {Object} options - Additional note options
   */
  static async writeNoteCommand(title, folder, options) {
    try {
      // Validate inputs
      validateInput.isNonEmptyString(title, 'Title');
      validateInput.isNonEmptyString(folder, 'Folder');

      // Handle content from stdin or options
      let content = options.content;
      if (!content && !process.stdin.isTTY) {
        content = await fs.readFile(0, 'utf8');
      }

      // Validate content
      if (!content || content.trim() === '') {
        throw new BasicMemoryError({
          code: ERROR_CODES.MISSING_PARAMETER,
          message: 'Note content cannot be empty'
        });
      }

      // Call MCP write note with validated inputs
      const note = await mcpWriteNote(
        title, 
        content, 
        folder, 
        options.tags || []
      );

      console.log(chalk.green('Note written successfully:'), note);
      return note;
    } catch (error) {
      logger.error({ 
        message: 'Error writing note', 
        error: error.message,
        code: error.code || ERROR_CODES.PROCESSING_ERROR
      });
      throw error;
    }
  }

  /**
   * Read a note with input validation
   * @param {string} identifier - Note identifier
   * @param {Object} options - Reading options
   */
  static async readNoteCommand(identifier, options) {
    try {
      validateInput.isNonEmptyString(identifier, 'Note Identifier');
      
      const page = options.page || 1;
      const pageSize = options.pageSize || 10;

      validateInput.isPositiveInteger(page, 'Page');
      validateInput.isPositiveInteger(pageSize, 'Page Size');

      const note = await mcpReadNote(
        identifier, 
        Number(page), 
        Number(pageSize)
      );

      console.log(chalk.blue('Note retrieved:'), note);
      return note;
    } catch (error) {
      logger.error({ 
        message: 'Error reading note', 
        error: error.message,
        code: error.code || ERROR_CODES.PROCESSING_ERROR
      });
      throw error;
    }
  }

  /**
   * Build context with comprehensive validation
   * @param {string} url - URL to build context for
   * @param {Object} options - Context building options
   */
  static async buildContextCommand(url, options) {
    try {
      validateInput.isNonEmptyString(url, 'URL');
      
      const depth = options.depth || 1;
      const timeframe = options.timeframe || '7d';
      const page = options.page || 1;
      const pageSize = options.pageSize || 10;
      const maxRelated = options.maxRelated || 10;

      validateInput.isPositiveInteger(depth, 'Depth');
      validateInput.isValidTimeframe(timeframe);
      validateInput.isPositiveInteger(page, 'Page');
      validateInput.isPositiveInteger(pageSize, 'Page Size');
      validateInput.isPositiveInteger(maxRelated, 'Max Related');

      const context = await mcpBuildContext(
        url,
        Number(depth),
        timeframe,
        Number(page),
        Number(pageSize),
        Number(maxRelated)
      );

      console.log(chalk.cyan('Context built:'), context);
      return context;
    } catch (error) {
      logger.error({ 
        message: 'Error building context', 
        error: error.message,
        code: error.code || ERROR_CODES.PROCESSING_ERROR
      });
      throw error;
    }
  }

  /**
   * Get recent activity with input validation
   * @param {Object} options - Activity options
   */
  static async recentActivityCommand(options) {
    try {
      const type = options.type;
      const depth = options.depth || 1;
      const timeframe = options.timeframe || '7d';
      const page = options.page || 1;
      const pageSize = options.pageSize || 10;
      const maxRelated = options.maxRelated || 10;

      if (type) {
        validateInput.isNonEmptyString(type, 'Type');
      }

      validateInput.isPositiveInteger(depth, 'Depth');
      validateInput.isValidTimeframe(timeframe);
      validateInput.isPositiveInteger(page, 'Page');
      validateInput.isPositiveInteger(pageSize, 'Page Size');
      validateInput.isPositiveInteger(maxRelated, 'Max Related');

      const context = await mcpRecentActivity({
        type,
        depth: Number(depth),
        timeframe,
        page: Number(page),
        pageSize: Number(pageSize),
        maxRelated: Number(maxRelated)
      });

      console.log(chalk.cyan('Recent activity:'), context);
      return context;
    } catch (error) {
      logger.error({ 
        message: 'Error retrieving recent activity', 
        error: error.message,
        code: error.code || ERROR_CODES.PROCESSING_ERROR
      });
      throw error;
    }
  }

  /**
   * Search for items with input validation
   * @param {string} query - Search query
   * @param {Object} options - Search options
   */
  static async searchCommand(query, options) {
    try {
      validateInput.isNonEmptyString(query, 'Query');

      const permalink = options.permalink;
      const title = options.title;
      const afterDate = options.afterDate;
      const page = options.page || 1;
      const pageSize = options.pageSize || 10;

      if (permalink && title) {
        throw new BasicMemoryError({
          code: ERROR_CODES.INVALID_INPUT,
          message: 'Cannot search both permalink and title'
        });
      }

      if (permalink) {
        validateInput.isNonEmptyString(permalink, 'Permalink');
      }

      if (title) {
        validateInput.isNonEmptyString(title, 'Title');
      }

      validateInput.isPositiveInteger(page, 'Page');
      validateInput.isPositiveInteger(pageSize, 'Page Size');

      const searchQuery = {
        permalink,
        text: !permalink && !title ? query : null,
        title,
        afterDate,
        page: Number(page),
        pageSize: Number(pageSize)
      };

      const results = await mcpSearch(searchQuery);

      console.log(chalk.cyan('Search results:'), results);
      return results;
    } catch (error) {
      logger.error({ 
        message: 'Error searching', 
        error: error.message,
        code: error.code || ERROR_CODES.PROCESSING_ERROR
      });
      throw error;
    }
  }

  /**
   * Continue a conversation with input validation
   * @param {Object} options - Conversation options
   */
  static async continueConversationCommand(options) {
    try {
      const topic = options.topic;
      const timeframe = options.timeframe;

      if (topic) {
        validateInput.isNonEmptyString(topic, 'Topic');
      }

      if (timeframe) {
        validateInput.isValidTimeframe(timeframe);
      }

      const conversation = await mcpContinueConversation({
        topic,
        timeframe
      });

      console.log(chalk.cyan('Conversation continued:'), conversation);
      return conversation;
    } catch (error) {
      logger.error({ 
        message: 'Error continuing conversation', 
        error: error.message,
        code: error.code || ERROR_CODES.PROCESSING_ERROR
      });
      throw error;
    }
  }
}

/**
 * Setup the tool command
 */
function setup() {
  const command = new Command('tool')
    .description('Direct access to MCP tools via CLI');

  // Write Note Command
  command
    .command('write-note')
    .description('Create or update a markdown note')
    .requiredOption('-t, --title <title>', 'Title of the note')
    .option('-f, --folder <folder>', 'Folder to create the note in', 'notes')
    .option('-c, --content <content>', 'Content of the note')
    .option('--tags <tags...>', 'Tags to apply to the note')
    .action(ToolCommands.writeNoteCommand);

  // Read Note Command
  command
    .command('read-note')
    .description('Read a note by identifier')
    .argument('<identifier>', 'Note identifier')
    .option('--page <page>', 'Page number', '1')
    .option('--page-size <pageSize>', 'Number of items per page', '10')
    .action(ToolCommands.readNoteCommand);

  // Build Context Command
  command
    .command('build-context')
    .description('Build context for a given URL')
    .argument('<url>', 'URL to build context for')
    .option('--depth <depth>', 'Depth of context', '1')
    .option('--timeframe <timeframe>', 'Timeframe for context', '7d')
    .option('--page <page>', 'Page number', '1')
    .option('--page-size <pageSize>', 'Number of items per page', '10')
    .option('--max-related <maxRelated>', 'Maximum number of related items', '10')
    .action(ToolCommands.buildContextCommand);

  // Recent Activity Command
  command
    .command('recent-activity')
    .description('Get recent activity')
    .option('--type <type...>', 'Types of items to retrieve')
    .option('--depth <depth>', 'Depth of activity', '1')
    .option('--timeframe <timeframe>', 'Timeframe for activity', '7d')
    .option('--page <page>', 'Page number', '1')
    .option('--page-size <pageSize>', 'Number of items per page', '10')
    .option('--max-related <maxRelated>', 'Maximum number of related items', '10')
    .action(ToolCommands.recentActivityCommand);

  // Search Command
  command
    .command('search')
    .description('Search for items')
    .argument('<query>', 'Search query')
    .option('--permalink', 'Search permalink values')
    .option('--title', 'Search title values')
    .option('--after-date <afterDate>', 'Search results after date')
    .option('--page <page>', 'Page number', '1')
    .option('--page-size <pageSize>', 'Number of items per page', '10')
    .action(ToolCommands.searchCommand);

  // Continue Conversation Command
  command
    .command('continue-conversation')
    .description('Continue a previous conversation or work session')
    .option('--topic <topic>', 'Topic or keyword to search for')
    .option('--timeframe <timeframe>', 'How far back to look for activity')
    .action(ToolCommands.continueConversationCommand);

  // Tool Management Commands
  const toolCommand = command.command('tool-management')
    .description('Manage and interact with MCP tools');

  toolCommand
    .command('list')
    .description('List all available MCP tools')
    .action(async () => {
      try {
        const tools = await getTools();
        displayTools(tools);
        process.exit(0);
      } catch (error) {
        logger.error(chalk.red(`Failed to list tools: ${error.message}`));
        process.exit(1);
      }
    });

  toolCommand
    .command('info <toolName>')
    .description('Get detailed information about a specific tool')
    .action(async (toolName) => {
      try {
        const toolInfo = await getToolInfo(toolName);
        displayToolInfo(toolInfo);
        process.exit(0);
      } catch (error) {
        logger.error(chalk.red(`Failed to get tool info: ${error.message}`));
        process.exit(1);
      }
    });

  toolCommand
    .command('run <toolName>')
    .description('Run a specific tool')
    .option('-c, --config <path>', 'Path to tool configuration file')
    .action(async (toolName, options) => {
      try {
        const result = await runTool(toolName, options);
        logger.info(chalk.green(`Tool ${toolName} completed successfully`));
        process.exit(0);
      } catch (error) {
        logger.error(chalk.red(`Tool ${toolName} failed: ${error.message}`));
        process.exit(1);
      }
    });

  return command;
}

// Tool Management Functions

/**
 * Get list of available tools
 * @returns {Promise<Array<Object>>} - List of tools
 */
async function getTools() {
  // TODO: Implement tool discovery
  return [
    { name: 'archon', description: 'Archon agent for complex tasks' },
    { name: 'codex-keeper', description: 'Documentation management' },
    { name: 'fetch', description: 'URL content fetching' },
    { name: 'firecrawl', description: 'Web scraping and crawling' }
  ];
}

/**
 * Display list of tools
 * @param {Array<Object>} tools - List of tools
 */
function displayTools(tools) {
  console.log(chalk.bold.blue('\n=== Available Tools ===\n'));

  tools.forEach(tool => {
    console.log(`  ${chalk.green(tool.name)}: ${tool.description}`);
  });

  console.log(chalk.bold.blue('\n======================\n'));
}

/**
 * Get detailed information about a tool
 * @param {string} toolName - Name of the tool
 * @returns {Promise<Object>} - Tool information
 */
async function getToolInfo(toolName) {
  // TODO: Implement tool info retrieval
  return {
    name: toolName,
    description: 'Tool description',
    version: '1.0.0',
    endpoints: [],
    configuration: {}
  };
}

/**
 * Display tool information
 * @param {Object} toolInfo - Tool information
 */
function displayToolInfo(toolInfo) {
  console.log(chalk.bold.blue('\n=== Tool Information ===\n'));

  console.log(`  ${chalk.bold('Name')}: ${chalk.green(toolInfo.name)}`);
  console.log(`  ${chalk.bold('Description')}: ${toolInfo.description}`);
  console.log(`  ${chalk.bold('Version')}: ${chalk.green(toolInfo.version)}`);

  if (toolInfo.endpoints.length > 0) {
    console.log(`\n  ${chalk.bold('Endpoints')}:`);
    toolInfo.endpoints.forEach(endpoint => {
      console.log(`    - ${chalk.green(endpoint)}`);
    });
  }

  console.log(chalk.bold.blue('\n========================\n'));
}

/**
 * Run a tool
 * @param {string} toolName - Name of the tool
 * @param {Object} options - Tool options
 * @returns {Promise<Object>} - Tool execution result
 */
async function runTool(toolName, options) {
  // TODO: Implement tool execution
  return { success: true };
}

export default { 
  setup, 
  ERROR_CODES,
  validateInput 
};
