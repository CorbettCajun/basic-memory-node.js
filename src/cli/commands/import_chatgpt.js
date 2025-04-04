/**
 * Import command for ChatGPT conversations
 * Node.js implementation matching the Python version's functionality
 */

import fs from 'fs/promises';
import path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getHomeDir } from '../../db/index.js';
import { MarkdownProcessor } from '../../db/markdown_processor.js';
import { EntityMarkdown, EntityFrontmatter } from '../../db/models/entity.js';
import pino from 'pino';
import { Console } from 'console';
import { createWriteStream } from 'fs';
import { session } from '../session.js';
import { capabilities } from '../capabilities.js';
import { discovery } from '../discovery.js';
import { output } from '../output.js';

// Configure logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Create a rich-like console for progress
const console = new Console({
  stdout: createWriteStream(null),
  stderr: createWriteStream(null)
});

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define error codes
const ERROR_CODES = {
  FILE_NOT_FOUND: 1001,
  INVALID_JSON: 1002,
  FILE_ACCESS_ERROR: 1003,
  PROCESSING_ERROR: 1004,
  OUTPUT_ERROR: 1005
};

// Error handling wrapper
function handleError(error, context) {
  let code = ERROR_CODES.PROCESSING_ERROR;
  let message = error.message;

  if (error.code === 'ENOENT') {
    code = ERROR_CODES.FILE_NOT_FOUND;
    message = `File not found: ${context.filePath}`;
  } else if (error instanceof SyntaxError) {
    code = ERROR_CODES.INVALID_JSON;
    message = `Invalid JSON in file: ${context.filePath}`;
  } else if (error.code === 'EACCES') {
    code = ERROR_CODES.FILE_ACCESS_ERROR;
    message = `Access denied for file: ${context.filePath}`;
  }

  return {
    jsonrpc: '2.0',
    error: {
      code,
      message,
      data: context
    }
  };
}

/**
 * Clean filename by removing non-alphanumeric characters
 * @param {string} text - Text to clean
 * @returns {string} - Cleaned filename
 */
function cleanFilename(text) {
  return text.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').trim('-');
}

/**
 * Format timestamp
 * @param {number} timestamp - Unix timestamp
 * @returns {string} - Formatted timestamp
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * Extract message content
 * @param {Object} message - Message object
 * @returns {string} - Extracted content
 */
function getMessageContent(message) {
  if (!message || !message.content) return '';
  
  const content = message.content;
  if (content.content_type === 'text') {
    return Array.isArray(content.parts) ? content.parts.join('\n') : content.parts || '';
  }
  
  if (content.content_type === 'code') {
    return `\`\`\`${content.language || ''}\n${content.text || ''}\n\`\`\``;
  }
  
  return '';
}

/**
 * Traverse message tree to extract messages in order
 * @param {Object} mapping - Message mapping
 * @param {string} rootId - Root message ID
 * @param {Set} seen - Set of seen message IDs
 * @returns {Array} - Ordered messages
 */
function traverseMessages(mapping, rootId, seen = new Set()) {
  const messages = [];
  const node = mapping[rootId];

  if (node) {
    if (node.message && !seen.has(node.id)) {
      seen.add(node.id);
      messages.push(node.message);
    }

    // Follow children
    const children = node.children || [];
    for (const childId of children) {
      const childMsgs = traverseMessages(mapping, childId, seen);
      messages.push(...childMsgs);
    }
  }

  return messages;
}

/**
 * Format chat as clean markdown
 * @param {string} title - Conversation title
 * @param {Object} mapping - Message mapping
 * @param {string} rootId - Root message ID
 * @param {number} createdAt - Conversation creation timestamp
 * @param {number} modifiedAt - Conversation modification timestamp
 * @returns {string} - Formatted markdown
 */
function formatChatMarkdown(title, mapping, rootId, createdAt, modifiedAt) {
  const lines = [`# ${title}\n`];

  const seen = new Set();
  const messages = traverseMessages(mapping, rootId, seen);

  for (const msg of messages) {
    // Skip hidden messages
    if (msg.metadata?.is_visually_hidden_from_conversation) continue;

    const author = msg.author?.role?.charAt(0).toUpperCase() + msg.author?.role?.slice(1);
    const timestamp = msg.create_time ? formatTimestamp(msg.create_time) : '';
    const content = getMessageContent(msg);

    lines.push(`### ${author} ${timestamp ? `(${timestamp})` : ''}`);
    if (content) lines.push(content);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format chat content as Basic Memory entity
 * @param {string} folder - Output folder
 * @param {Object} conversation - Conversation data
 * @returns {EntityMarkdown} - Formatted entity
 */
function formatChatContent(folder, conversation) {
  const title = conversation.title || 'Untitled Conversation';
  const createdAt = conversation.create_time;
  const modifiedAt = conversation.update_time || createdAt;

  // Find root message
  let rootId = null;
  for (const [nodeId, node] of Object.entries(conversation.mapping)) {
    if (!node.parent) {
      rootId = nodeId;
      break;
    }
  }

  // Generate permalink
  const datePrefix = new Date(createdAt * 1000).toISOString().split('T')[0].replace(/-/g, '');
  const cleanTitle = cleanFilename(title);
  const permalink = `${folder}/${datePrefix}-${cleanTitle}`;

  // Format markdown content
  const content = formatChatMarkdown(
    title, 
    conversation.mapping, 
    rootId, 
    createdAt, 
    modifiedAt
  );

  // Create entity
  return new EntityMarkdown({
    frontmatter: new EntityFrontmatter({
      metadata: {
        type: 'conversation',
        title: title,
        created: formatTimestamp(createdAt),
        modified: formatTimestamp(modifiedAt),
        permalink: permalink
      }
    }),
    content: content
  });
}

/**
 * Process ChatGPT conversations
 * @param {string} jsonPath - Path to JSON file
 * @param {string} folder - Output folder
 * @param {MarkdownProcessor} markdownProcessor - Markdown processor
 * @returns {Promise<Object>} - Import results
 */
async function processChatGPTJson(jsonPath, folder, markdownProcessor) {
  const progressBar = new cliProgress.SingleBar(
    {}, 
    cliProgress.Presets.shades_classic
  );

  try {
    // Read JSON file
    const rawData = await fs.readFile(jsonPath, 'utf8');
    const conversations = JSON.parse(rawData);

    // Ensure output folder exists
    await fs.mkdir(folder, { recursive: true });

    // Track import statistics
    const stats = {
      total: conversations.length,
      imported: 0,
      skipped: 0,
      errors: 0
    };

    // Start progress bar
    progressBar.start(stats.total, 0);

    // Process each conversation
    for (const conversation of conversations) {
      try {
        // Format conversation content
        const entity = formatChatContent(folder, conversation);

        // Generate markdown file path
        const filePath = path.join(folder, `${entity.frontmatter.metadata.permalink}.md`);

        // Write markdown file
        await fs.writeFile(filePath, entity.toMarkdown());

        // Import to markdown processor
        await markdownProcessor.importEntity(entity);

        stats.imported++;
      } catch (importError) {
        const errorResponse = handleError(importError, { filePath: jsonPath });
        logger.error(chalk.red(`Import failed: ${errorResponse.error.message}`));
        stats.skipped++;
        stats.errors++;
        throw errorResponse;
      }

      // Update progress bar
      progressBar.increment();
    }

    // Stop progress bar
    progressBar.stop();

    // Log import summary
    logger.info(chalk.green(`Import Summary:`));
    logger.info(chalk.blue(`Total Conversations: ${stats.total}`));
    logger.info(chalk.green(`Successfully Imported: ${stats.imported}`));
    logger.info(chalk.yellow(`Skipped: ${stats.skipped}`));
    logger.info(chalk.red(`Errors: ${stats.errors}`));

    return stats;
  } catch (error) {
    const errorResponse = handleError(error, { filePath: jsonPath });
    logger.error(chalk.red(`Import failed: ${errorResponse.error.message}`));
    throw errorResponse;
  }
}

/**
 * Register ChatGPT import command
 * @param {Command} program - Commander program instance
 */
export function registerImportChatGPTCommand(program) {
  // Check if capability is available
  if (!capabilities.has('CHATGPT')) {
    logger.warn('ChatGPT import capability not available');
    return;
  }

  program
    .command('import-chatgpt')
    .description('Import ChatGPT conversations from JSON file(s)')
    .option('-d, --discover <path>', 'Discover ChatGPT JSON files in directory')
    .requiredOption('-f, --files <paths>', 'Comma-separated paths to ChatGPT conversations JSON files', (value) => value.split(','))
    .option('-o, --output <folder>', 'Output folder for markdown files', path.join(process.cwd(), 'chatgpt-imports'))
    .action(async (options) => {
      try {
        let jsonPaths = options.files;

        // Discover files if discovery path provided
        if (options.discover) {
          await discovery.discoverResources(options.discover);
          const resources = discovery.getResources()
            .filter(res => res.type === 'CHATGPT')
            .map(res => res.path);
          jsonPaths = [...new Set([...jsonPaths, ...resources])];
        }

        // Record command in session
        session.recordCommand(`import-chatgpt ${jsonPaths.join(' ')}`);

        // Validate input files
        await Promise.all(jsonPaths.map(path => fs.access(path, fs.constants.R_OK)));

        // Create markdown processor
        const markdownProcessor = new MarkdownProcessor();

        // Process files in batch
        output.printHeader('Importing ChatGPT Conversations');
        const results = await Promise.all(jsonPaths.map((jsonPath, index) => {
          output.printProgress(index + 1, jsonPaths.length);
          return processChatGPTJson(jsonPath, path.resolve(options.output), markdownProcessor);
        }));

        const totalStats = results.reduce((acc, stats) => ({
          total: acc.total + stats.total,
          conversations: acc.conversations + stats.conversations,
          messages: acc.messages + stats.messages,
          skipped: acc.skipped + stats.skipped,
          errors: acc.errors + stats.errors
        }), { total: 0, conversations: 0, messages: 0, skipped: 0, errors: 0 });

        output.printSuccess('ChatGPT conversations imported successfully!');
        output.printTable(
          ['Metric', 'Count'],
          [
            ['Total Files', totalStats.total],
            ['Conversations Imported', totalStats.conversations],
            ['Messages Imported', totalStats.messages],
            ['Skipped', totalStats.skipped],
            ['Errors', totalStats.errors]
          ]
        );

        // Save session state
        await session.save();
        process.exit(0);
      } catch (error) {
        // Record failed command in session
        session.recordCommand(`import-chatgpt ${options.files.join(' ')} - FAILED`);
        await session.save();

        output.printError(`Import failed: ${error.message}`);
        process.exit(1);
      }
    });
}

export { registerImportChatGPTCommand as default };
