/**
 * Import command for Basic Memory CLI to import chat data from conversations2.json format
 * Node.js implementation matching the Python version's functionality
 */

import fs from 'fs/promises';
import path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { EntityMarkdown, EntityFrontmatter } from '../../db/models/entity.js';
import { MarkdownProcessor } from '../../db/markdown_processor.js';
import { getHomeDir } from '../../db/index.js';
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

/**
 * Convert text to a safe filename
 * @param {string} text - Text to convert
 * @returns {string} - Safe filename
 */
function cleanFilename(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Format ISO timestamp for display
 * @param {string} ts - ISO timestamp
 * @returns {string} - Formatted timestamp
 */
function formatTimestamp(ts) {
  const dt = new Date(ts.replace('Z', '+00:00'));
  return dt.toLocaleString('en-US', {
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
  if (!message) return '';
  
  // Handle text content
  let content = message.text || '';
  
  // Handle complex content
  if (message.content && Array.isArray(message.content)) {
    content = message.content
      .map(c => c.text || '')
      .filter(Boolean)
      .join(' ');
  }
  
  return content;
}

/**
 * Format chat as clean markdown
 * @param {string} name - Chat name
 * @param {Array} messages - Chat messages
 * @param {string} createdAt - Creation timestamp
 * @param {string} modifiedAt - Modification timestamp
 * @param {string} permalink - Permalink
 * @returns {string} - Formatted markdown
 */
function formatChatMarkdown(name, messages, createdAt, modifiedAt, permalink) {
  // Start with title
  const lines = [`# ${name}\n`];

  // Add messages
  for (const msg of messages) {
    // Format timestamp
    const ts = formatTimestamp(msg.created_at);

    // Add message header
    lines.push(`### ${msg.sender.charAt(0).toUpperCase() + msg.sender.slice(1)} (${ts})`);

    // Handle message content
    const content = getMessageContent(msg);
    if (content) lines.push(content);

    // Handle attachments
    const attachments = msg.attachments || [];
    for (const attachment of attachments) {
      if (attachment.file_name) {
        lines.push(`\n**Attachment: ${attachment.file_name}**`);
        if (attachment.extracted_content) {
          lines.push('```');
          lines.push(attachment.extracted_content);
          lines.push('```');
        }
      }
    }

    // Add spacing between messages
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Convert chat messages to Basic Memory entity format
 * @param {string} basePath - Base path for permalinks
 * @param {Object} chat - Chat conversation object
 * @returns {EntityMarkdown} - Formatted entity
 */
function formatChatContent(basePath, chat) {
  // Generate permalink
  const datePrefix = new Date(chat.created_at).toISOString().split('T')[0].replace(/-/g, '');
  const cleanTitle = cleanFilename(chat.name);
  const permalink = `${basePath}/${datePrefix}-${cleanTitle}`;

  // Format content
  const content = formatChatMarkdown(
    chat.name,
    chat.chat_messages,
    chat.created_at,
    chat.updated_at,
    permalink
  );

  // Create entity
  return new EntityMarkdown({
    frontmatter: new EntityFrontmatter({
      metadata: {
        type: 'conversation',
        title: chat.name,
        created: chat.created_at,
        modified: chat.updated_at,
        permalink: permalink
      }
    }),
    content
  });
}

/**
 * Process conversations JSON file
 * @param {string} jsonPath - Path to JSON file
 * @param {string} basePath - Base path for output
 * @param {MarkdownProcessor} markdownProcessor - Markdown processor
 * @returns {Promise<Object>} - Import results
 */
async function processConversationsJson(jsonPath, basePath, markdownProcessor) {
  const progressBar = new cliProgress.SingleBar(
    {}, 
    cliProgress.Presets.shades_classic
  );

  try {
    // Read chat data
    const fileContent = await fs.readFile(jsonPath, 'utf8');
    const data = JSON.parse(fileContent);
    const conversations = Array.isArray(data) ? data : [];

    // Ensure output folder exists
    await fs.mkdir(basePath, { recursive: true });

    // Track import statistics
    const stats = {
      total: conversations.length,
      imported: 0,
      skipped: 0,
      errors: 0
    };

    // Start progress bar
    progressBar.start(stats.total, 0);

    for (const chat of conversations) {
      try {
        // Convert to entity
        const entity = formatChatContent(basePath, chat);

        // Generate markdown file path
        const filePath = path.join(basePath, `${entity.frontmatter.metadata.permalink}.md`);

        // Write markdown file
        await fs.writeFile(filePath, entity.toMarkdown());

        // Import to markdown processor
        await markdownProcessor.importEntity(entity);

        stats.imported++;
      } catch (importError) {
        logger.error(`Failed to import conversation: ${importError.message}`);
        stats.skipped++;
        stats.errors++;
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
    logger.error(`Import failed: ${error.message}`);
    throw error;
  }
}

/**
 * Register Claude conversations import command
 * @param {Command} program - Commander program instance
 */
export function registerImportClaudeConversationsCommand(program) {
  // Check if capability is available
  if (!capabilities.has(CAPABILITIES.IMPORT.CLAUDE_CONVERSATIONS)) {
    logger.warn('Claude conversations import capability not available');
    return;
  }

  program
    .command('import-claude-conversations')
    .description('Import Claude conversations from JSON file(s)')
    .option('-d, --discover <path>', 'Discover Claude conversations JSON files in directory')
    .requiredOption('-f, --file <path>', 'Path to Claude conversations JSON file')
    .option('-o, --output <folder>', 'Output folder for markdown files', path.join(process.cwd(), 'claude-imports'))
    .action(async (options) => {
      try {
        let jsonPaths = [options.file];

        // Discover files if discovery path provided
        if (options.discover) {
          await discovery.discoverResources(options.discover);
          const resources = discovery.getResources()
            .filter(res => res.type === 'CLAUDE_CONVERSATIONS')
            .map(res => res.path);
          jsonPaths = [...new Set([...jsonPaths, ...resources])];
        }

        // Record command in session
        session.recordCommand(`import-claude-conversations ${jsonPaths.join(' ')}`);

        // Validate input files
        await Promise.all(jsonPaths.map(path => fs.access(path, fs.constants.R_OK)));

        // Create markdown processor
        const markdownProcessor = new MarkdownProcessor();

        // Process files in batch
        output.printHeader('Importing Claude Conversations');
        const results = await Promise.all(jsonPaths.map((jsonPath, index) => {
          output.printProgress(index + 1, jsonPaths.length);
          return processClaudeConversationsJson(jsonPath, path.resolve(options.output), markdownProcessor);
        }));

        const totalStats = results.reduce((acc, stats) => ({
          total: acc.total + stats.total,
          conversations: acc.conversations + stats.conversations,
          messages: acc.messages + stats.messages,
          skipped: acc.skipped + stats.skipped,
          errors: acc.errors + stats.errors
        }), { total: 0, conversations: 0, messages: 0, skipped: 0, errors: 0 });

        output.printSuccess('Claude conversations imported successfully!');
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
        session.recordCommand(`import-claude-conversations ${options.file} - FAILED`);
        await session.save();

        output.printError(`Import failed: ${error.message}`);
        process.exit(1);
      }
    });
}

/**
 * Process Claude conversations
 * @param {string} jsonPath - Path to JSON file
 * @param {string} folder - Output folder
 * @param {MarkdownProcessor} markdownProcessor - Markdown processor
 * @returns {Promise<Object>} - Import results
 */
async function processClaudeConversationsJson(jsonPath, folder, markdownProcessor) {
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

    const stats = {
      total: conversations.length,
      conversations: 0,
      messages: 0,
      skipped: 0,
      errors: 0
    };

    progressBar.start(stats.total, 0);

    // Process each conversation
    for (const conversation of conversations) {
      try {
        // Create markdown file
        const markdown = formatClaudeConversationMarkdown(conversation);
        const fileName = `${conversation.id}.md`;
        const filePath = path.join(folder, fileName);

        await fs.writeFile(filePath, markdown);
        stats.conversations++;
        stats.messages += conversation.messages.length;
      } catch (error) {
        stats.skipped++;
        stats.errors++;
      }

      progressBar.increment();
    }

    progressBar.stop();

    // Log import summary
    logger.info(chalk.green(`Import Summary:`));
    logger.info(chalk.blue(`Total Conversations: ${stats.total}`));
    logger.info(chalk.green(`Conversations Imported: ${stats.conversations}`));
    logger.info(chalk.green(`Messages Imported: ${stats.messages}`));
    logger.info(chalk.yellow(`Skipped: ${stats.skipped}`));
    logger.info(chalk.red(`Errors: ${stats.errors}`));

    return stats;
  } catch (error) {
    logger.error(`Import failed: ${error.message}`);
    throw error;
  }
}

/**
 * Format Claude conversation as markdown
 * @param {Object} conversation - Claude conversation
 * @returns {string} - Formatted markdown
 */
function formatClaudeConversationMarkdown(conversation) {
  const lines = [`# ${conversation.title}\n`];

  for (const message of conversation.messages) {
    const author = message.role === 'assistant' ? 'Claude' : 'You';
    const timestamp = new Date(message.timestamp).toLocaleString();
    lines.push(`### ${author} (${timestamp})`);
    lines.push(message.content);
    lines.push('');
  }

  return lines.join('\n');
}

export { registerImportClaudeConversationsCommand as default };
