/**
 * Import command for Basic Memory CLI to import project data from Claude.ai
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
import { logger } from '../app.js';
import { createWriteStream } from 'fs';
import { getDatabase } from '../database.js';
import { session } from '../session.js';
import { capabilities } from '../capabilities.js';
import { discovery } from '../discovery.js';
import { output } from '../output.js';
import { Console } from 'console';

// Configure logger level dynamically
logger.level = process.env.LOG_LEVEL || 'info';

// Create a rich-like console for progress
const console = new Console({
  stdout: createWriteStream(null),
  stderr: createWriteStream(null)
});

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Convert text to safe filename
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
 * Format a project document as a Basic Memory entity
 * @param {Object} project - Project details
 * @param {Object} doc - Document details
 * @returns {EntityMarkdown} - Formatted entity
 */
function formatProjectMarkdown(project, doc) {
  // Extract timestamps
  const createdAt = doc.created_at || project.created_at;
  const modifiedAt = project.updated_at;

  // Generate clean names for organization
  const projectDir = cleanFilename(project.name);
  const docFile = cleanFilename(doc.filename);

  // Create entity
  return new EntityMarkdown({
    frontmatter: new EntityFrontmatter({
      metadata: {
        type: 'project_doc',
        title: doc.filename,
        created: createdAt,
        modified: modifiedAt,
        permalink: `${projectDir}/docs/${docFile}`,
        project_name: project.name,
        project_uuid: project.uuid,
        doc_uuid: doc.uuid,
      }
    }),
    content: doc.content
  });
}

/**
 * Format project prompt template as a Basic Memory entity
 * @param {Object} project - Project details
 * @returns {EntityMarkdown|null} - Formatted entity or null
 */
function formatPromptMarkdown(project) {
  if (!project.prompt_template) return null;

  // Extract timestamps
  const createdAt = project.created_at;
  const modifiedAt = project.updated_at;

  // Generate clean project directory name
  const projectDir = cleanFilename(project.name);

  // Create entity
  return new EntityMarkdown({
    frontmatter: new EntityFrontmatter({
      metadata: {
        type: 'prompt_template',
        title: `Prompt Template: ${project.name}`,
        created: createdAt,
        modified: modifiedAt,
        permalink: `${projectDir}/prompt-template`,
        project_name: project.name,
        project_uuid: project.uuid,
      }
    }),
    content: `# Prompt Template: ${project.name}\n\n${project.prompt_template}`
  });
}

/**
 * Process projects JSON and create markdown files
 * @param {string} jsonPath - Path to projects JSON file
 * @param {string} basePath - Base path for output
 * @param {MarkdownProcessor} markdownProcessor - Markdown processor
 * @returns {Promise<Object>} - Import statistics
 */
async function processProjectsJson(jsonPath, basePath, markdownProcessor) {
  const progressBar = new cliProgress.SingleBar(
    {}, 
    cliProgress.Presets.shades_classic
  );

  try {
    // Read project data
    const fileContent = await fs.readFile(jsonPath, 'utf8');
    const data = JSON.parse(fileContent);

    // Ensure output folder exists
    await fs.mkdir(basePath, { recursive: true });

    // Track import statistics
    const stats = {
      total: data.length,
      documents: 0,
      prompts: 0,
      skipped: 0,
      errors: 0
    };

    // Start progress bar
    progressBar.start(stats.total, 0);

    // Process each project
    for (const project of data) {
      try {
        const projectDir = cleanFilename(project.name);
        const docsDir = path.join(basePath, projectDir, 'docs');

        // Create project directories
        await fs.mkdir(docsDir, { recursive: true });

        // Import prompt template if it exists
        const promptEntity = formatPromptMarkdown(project);
        if (promptEntity) {
          const filePath = path.join(basePath, `${promptEntity.frontmatter.metadata.permalink}.md`);
          await fs.writeFile(filePath, promptEntity.toMarkdown());
          await markdownProcessor.importEntity(promptEntity);
          stats.prompts++;
        }

        // Import project documents
        for (const doc of project.docs || []) {
          const entity = formatProjectMarkdown(project, doc);
          const filePath = path.join(basePath, `${entity.frontmatter.metadata.permalink}.md`);
          await fs.writeFile(filePath, entity.toMarkdown());
          await markdownProcessor.importEntity(entity);
          stats.documents++;
        }
      } catch (importError) {
        logger.error(`Failed to import project: ${importError.message}`);
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
    logger.info(chalk.blue(`Total Projects: ${stats.total}`));
    logger.info(chalk.green(`Documents Imported: ${stats.documents}`));
    logger.info(chalk.green(`Prompt Templates Imported: ${stats.prompts}`));
    logger.info(chalk.yellow(`Skipped: ${stats.skipped}`));
    logger.info(chalk.red(`Errors: ${stats.errors}`));

    return stats;
  } catch (error) {
    logger.error(`Import failed: ${error.message}`);
    throw error;
  }
}

/**
 * Register Claude projects import command
 * @param {Command} program - Commander program instance
 */
export function registerImportClaudeProjectsCommand(program) {
  // Check if capability is available
  if (!capabilities.has(CAPABILITIES.IMPORT.CLAUDE_PROJECTS)) {
    logger.warn('Claude projects import capability not available');
    return;
  }

  program
    .command('import-claude-projects')
    .description('Import Claude projects from JSON file(s)')
    .option('-d, --discover <path>', 'Discover Claude projects JSON files in directory')
    .requiredOption('-f, --file <path>', 'Path to Claude projects JSON file')
    .option('-o, --output <folder>', 'Output folder for markdown files', path.join(process.cwd(), 'claude-projects'))
    .action(async (options) => {
      try {
        let jsonPaths = [options.file];

        // Discover files if discovery path provided
        if (options.discover) {
          await discovery.discoverResources(options.discover);
          const resources = discovery.getResources()
            .filter(res => res.type === 'CLAUDE_PROJECTS')
            .map(res => res.path);
          jsonPaths = [...new Set([...jsonPaths, ...resources])];
        }

        // Record command in session
        session.recordCommand(`import-claude-projects ${jsonPaths.join(' ')}`);

        // Validate input files
        await Promise.all(jsonPaths.map(path => fs.access(path, fs.constants.R_OK)));

        // Create markdown processor
        const markdownProcessor = new MarkdownProcessor();

        // Process files in batch
        output.printHeader('Importing Claude Projects');
        const results = await Promise.all(jsonPaths.map((jsonPath, index) => {
          output.printProgress(index + 1, jsonPaths.length);
          return processClaudeProjectsJson(jsonPath, path.resolve(options.output), markdownProcessor);
        }));

        const totalStats = results.reduce((acc, stats) => ({
          total: acc.total + stats.total,
          documents: acc.documents + stats.documents,
          prompts: acc.prompts + stats.prompts,
          skipped: acc.skipped + stats.skipped,
          errors: acc.errors + stats.errors
        }), { total: 0, documents: 0, prompts: 0, skipped: 0, errors: 0 });

        output.printSuccess('Claude projects imported successfully!');
        output.printTable(
          ['Metric', 'Count'],
          [
            ['Total Files', totalStats.total],
            ['Documents Imported', totalStats.documents],
            ['Prompt Templates Imported', totalStats.prompts],
            ['Skipped', totalStats.skipped],
            ['Errors', totalStats.errors]
          ]
        );

        // Save session state
        await session.save();
        process.exit(0);
      } catch (error) {
        // Record failed command in session
        session.recordCommand(`import-claude-projects ${options.file} - FAILED`);
        await session.save();

        output.printError(`Import failed: ${error.message}`);
        process.exit(1);
      }
    });
}

/**
 * Process Claude projects
 * @param {string} jsonPath - Path to JSON file
 * @param {string} folder - Output folder
 * @param {MarkdownProcessor} markdownProcessor - Markdown processor
 * @returns {Promise<Object>} - Import results
 */
async function processClaudeProjectsJson(jsonPath, folder, markdownProcessor) {
  const progressBar = new cliProgress.SingleBar(
    {}, 
    cliProgress.Presets.shades_classic
  );

  try {
    // Read JSON file
    const rawData = await fs.readFile(jsonPath, 'utf8');
    const projects = JSON.parse(rawData);

    // Ensure output folder exists
    await fs.mkdir(folder, { recursive: true });

    const stats = {
      total: projects.length,
      imported: 0,
      skipped: 0,
      errors: 0
    };

    progressBar.start(stats.total, 0);

    // Process each project
    for (const project of projects) {
      try {
        // Create project folder
        const projectFolder = path.join(folder, project.id);
        await fs.mkdir(projectFolder, { recursive: true });

        // Save project metadata
        const projectMarkdown = `# ${project.name}\n**ID**: ${project.id}\n**Created**: ${new Date(project.createdAt).toLocaleString()}\n**Updated**: ${new Date(project.updatedAt).toLocaleString()}\n\n## Description\n${project.description || ''}`;
        await fs.writeFile(path.join(projectFolder, 'project.md'), projectMarkdown);

        // Save conversations
        for (const conversation of project.conversations) {
          const conversationMarkdown = formatClaudeConversationMarkdown(conversation);
          const fileName = `${conversation.id}.md`;
          await fs.writeFile(path.join(projectFolder, fileName), conversationMarkdown);
        }

        stats.imported++;
      } catch (error) {
        stats.skipped++;
        stats.errors++;
      }

      progressBar.increment();
    }

    progressBar.stop();

    // Log import summary
    logger.info(chalk.green(`Import Summary:`));
    logger.info(chalk.blue(`Total Projects: ${stats.total}`));
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

export { registerImportClaudeProjectsCommand as default };
