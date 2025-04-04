/**
 * Import command for Basic Memory CLI to import from JSON memory format
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
import { EntityMarkdown, EntityFrontmatter, Observation, Relation } from '../../db/models/entity.js';
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
 * Process memory.json file and create markdown files
 * @param {string} jsonPath - Path to memory.json file
 * @param {string} basePath - Base path for output
 * @param {MarkdownProcessor} markdownProcessor - Markdown processor
 * @returns {Promise<Object>} - Import statistics
 */
async function processMemoryJson(jsonPath, basePath, markdownProcessor) {
  const readProgressBar = new cliProgress.SingleBar(
    {}, 
    cliProgress.Presets.shades_classic
  );

  const writeProgressBar = new cliProgress.SingleBar(
    {}, 
    cliProgress.Presets.shades_classic
  );

  try {
    // First pass - collect all relations by source entity
    const entityRelations = new Map();
    const entities = new Map();

    // Read file and parse lines
    const fileHandle = await fs.open(jsonPath, 'r');

    // Ensure output folder exists
    await fs.mkdir(basePath, { recursive: true });

    // Track import statistics
    const stats = {
      total: 0,
      entities: 0,
      relations: 0,
      skipped: 0,
      errors: 0
    };

    // Count total lines
    for await (const _ of fileHandle.readLines()) {
      stats.total++;
    }

    // Start read progress bar
    readProgressBar.start(stats.total, 0);

    // Reset file stream
    await fileHandle.close();
    const fileHandleRead = await fs.open(jsonPath, 'r');

    // First pass - collect entities and relations
    let processedLines = 0;
    for await (const line of fileHandleRead.readLines()) {
      try {
        const data = JSON.parse(line);

        if (data.type === 'entity') {
          entities.set(data.name, data);
        } else if (data.type === 'relation') {
          const source = data.from || data.from_id;
          if (!entityRelations.has(source)) {
            entityRelations.set(source, []);
          }
          entityRelations.get(source).push(
            new Relation({
              type: data.relationType || data.relation_type,
              target: data.to || data.to_id
            })
          );
        }

        processedLines++;
        readProgressBar.increment();
      } catch (error) {
        logger.error(`Error parsing line: ${error.message}`);
        stats.skipped++;
        stats.errors++;
      }
    }

    readProgressBar.stop();

    // Start write progress bar
    writeProgressBar.start(entities.size, 0);

    // Second pass - create and write entities
    for (const [name, entityData] of entities) {
      try {
        const entity = new EntityMarkdown({
          frontmatter: new EntityFrontmatter({
            metadata: {
              type: entityData.entityType,
              title: name,
              permalink: `${entityData.entityType}/${name}`
            }
          }),
          content: `# ${name}\n`,
          observations: (entityData.observations || []).map(obs => 
            new Observation({ content: obs })
          ),
          relations: entityRelations.get(name) || []
        });

        // Let markdown processor handle writing
        const filePath = path.join(basePath, `${entityData.entityType}`, `${name}.md`);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, entity.toMarkdown());
        await markdownProcessor.importEntity(entity);

        stats.entities++;
        stats.relations += (entityRelations.get(name) || []).length;
        writeProgressBar.increment();
      } catch (error) {
        logger.error(`Error creating entity "${name}": ${error.message}`);
        stats.skipped++;
        stats.errors++;
      }
    }

    writeProgressBar.stop();

    // Log import summary
    logger.info(chalk.green(`Import Summary:`));
    logger.info(chalk.blue(`Total Lines Processed: ${stats.total}`));
    logger.info(chalk.green(`Entities Imported: ${stats.entities}`));
    logger.info(chalk.green(`Relations Imported: ${stats.relations}`));
    logger.info(chalk.yellow(`Skipped: ${stats.skipped}`));
    logger.info(chalk.red(`Errors: ${stats.errors}`));

    return stats;
  } catch (error) {
    logger.error(`Import failed: ${error.message}`);
    throw error;
  }
}

/**
 * Register memory JSON import command
 * @param {Command} program - Commander program instance
 */
export function registerImportMemoryJsonCommand(program) {
  // Check if capability is available
  if (!capabilities.has('IMPORT.MEMORY_JSON')) {
    logger.warn('Memory JSON import capability not available');
    return;
  }

  program
    .command('import-memory-json')
    .description('Import memory data from JSON file(s)')
    .option('-d, --discover <path>', 'Discover memory JSON files in directory')
    .requiredOption('-f, --file <path>', 'Path to memory JSON file')
    .option('-o, --output <folder>', 'Output folder for memory files', path.join(getHomeDir(), 'memory-imports'))
    .action(async (options) => {
      try {
        let jsonPaths = [options.file];

        // Discover files if discovery path provided
        if (options.discover) {
          await discovery.discoverResources(options.discover);
          const resources = discovery.getResources()
            .filter(res => res.type === 'MEMORY')
            .map(res => res.path);
          jsonPaths = [...new Set([...jsonPaths, ...resources])];
        }

        // Record command in session
        session.recordCommand(`import-memory-json ${jsonPaths.join(' ')}`);

        // Validate input files
        await Promise.all(jsonPaths.map(path => fs.access(path, fs.constants.R_OK)));

        // Create markdown processor
        const markdownProcessor = new MarkdownProcessor();

        // Process files in batch
        output.printHeader('Importing Memory Data');
        const results = await Promise.all(jsonPaths.map((jsonPath, index) => {
          output.printProgress(index + 1, jsonPaths.length);
          return processMemoryJson(jsonPath, path.resolve(options.output), markdownProcessor);
        }));

        const totalStats = results.reduce((acc, stats) => ({
          total: acc.total + stats.total,
          entities: acc.entities + stats.entities,
          relationships: acc.relationships + stats.relationships,
          skipped: acc.skipped + stats.skipped,
          errors: acc.errors + stats.errors
        }), { total: 0, entities: 0, relationships: 0, skipped: 0, errors: 0 });

        output.printSuccess('Memory data imported successfully!');
        output.printTable(
          ['Metric', 'Count'],
          [
            ['Total Files', totalStats.total],
            ['Entities Imported', totalStats.entities],
            ['Relationships Imported', totalStats.relationships],
            ['Skipped', totalStats.skipped],
            ['Errors', totalStats.errors]
          ]
        );

        // Save session state
        await session.save();
        process.exit(0);
      } catch (error) {
        // Record failed command in session
        session.recordCommand(`import-memory-json ${options.file} - FAILED`);
        await session.save();

        output.printError(`Import failed: ${error.message}`);
        process.exit(1);
      }
    });
}

export default registerImportMemoryJsonCommand;
