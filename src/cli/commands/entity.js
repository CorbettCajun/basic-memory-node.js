/**
 * Entity command for Basic Memory
 * 
 * Provides functionality to manage entities in the Basic Memory database
 */

import { program, logger } from '../app.js';
import { entity } from '../../api/index.js';
import chalk from 'chalk';
import fs from 'fs';
import { join, dirname } from 'path';
import slugify from 'slugify';

// Create the entity command group
const entityCommand = program
  .command('entity')
  .description('Manage entities in the knowledge base');

// Define the create subcommand
entityCommand
  .command('create')
  .description('Create a new entity')
  .requiredOption('-t, --title <title>', 'Entity title')
  .option('-c, --content <content>', 'Entity content')
  .option('-f, --file <path>', 'File path to read content from')
  .option('-p, --permalink <permalink>', 'Custom permalink (defaults to slugified title)')
  .option('-y, --type <type>', 'Entity type', 'note')
  .option('--content-type <contentType>', 'Content MIME type', 'text/markdown')
  .option('-m, --metadata <json>', 'Entity metadata as JSON string')
  .action(async (options) => {
    try {
      let content = options.content || '';
      
      // Read content from file if specified
      if (options.file) {
        if (!fs.existsSync(options.file)) {
          logger.error(chalk.red(`File not found: ${options.file}`));
          process.exit(1);
        }
        content = fs.readFileSync(options.file, 'utf8');
      }
      
      // Generate permalink if not provided
      const permalink = options.permalink || 
                       slugify(options.title, { lower: true, strict: true });
      
      // Parse metadata if provided
      let metadata = {};
      if (options.metadata) {
        try {
          metadata = JSON.parse(options.metadata);
        } catch (error) {
          logger.error(chalk.red(`Invalid JSON metadata: ${error.message}`));
          process.exit(1);
        }
      }
      
      // Create entity
      const newEntity = await entity.createOrUpdate({
        title: options.title,
        content: content,
        permalink: permalink,
        type: options.type,
        content_type: options.contentType,
        entity_metadata: metadata
      });
      
      logger.info(chalk.green(`Entity created: ${newEntity.title} (${newEntity.permalink})`));
    } catch (error) {
      logger.error(chalk.red(`Failed to create entity: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the get subcommand
entityCommand
  .command('get')
  .description('Get an entity by permalink')
  .requiredOption('-p, --permalink <permalink>', 'Entity permalink')
  .option('-r, --include-relations', 'Include entity relations', false)
  .option('-o, --include-observations', 'Include entity observations', false)
  .option('--output <path>', 'Write entity content to file')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(async (options) => {
    try {
      const result = await entity.get(options.permalink, {
        includeRelations: options.includeRelations,
        includeObservations: options.includeObservations
      });
      
      if (!result) {
        logger.error(chalk.red(`Entity not found: ${options.permalink}`));
        process.exit(1);
      }
      
      if (options.format === 'json') {
        const json = JSON.stringify(result, null, 2);
        
        if (options.output) {
          const dir = dirname(options.output);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(options.output, json);
          logger.info(chalk.green(`Entity saved to ${options.output}`));
        } else {
          console.log(json);
        }
      } else {
        logger.info(chalk.cyan(`Title: ${result.title}`));
        logger.info(chalk.cyan(`Permalink: ${result.permalink}`));
        logger.info(chalk.cyan(`Type: ${result.type}`));
        logger.info(chalk.cyan(`Created: ${new Date(result.created_at).toLocaleString()}`));
        logger.info(chalk.cyan(`Updated: ${new Date(result.updated_at).toLocaleString()}`));
        
        if (options.output) {
          const dir = dirname(options.output);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(options.output, result.content);
          logger.info(chalk.green(`Content saved to ${options.output}`));
        } else {
          logger.info(chalk.cyan(`\nContent:`));
          console.log(result.content);
        }
        
        if (options.includeRelations && 
           (result.outgoingRelations?.length > 0 || result.incomingRelations?.length > 0)) {
          logger.info(chalk.cyan(`\nRelations:`));
          
          if (result.outgoingRelations?.length > 0) {
            logger.info(chalk.cyan(`  Outgoing:`));
            for (const relation of result.outgoingRelations) {
              logger.info(chalk.cyan(`    → ${relation.target_id} (${relation.type})`));
            }
          }
          
          if (result.incomingRelations?.length > 0) {
            logger.info(chalk.cyan(`  Incoming:`));
            for (const relation of result.incomingRelations) {
              logger.info(chalk.cyan(`    ← ${relation.source_id} (${relation.type})`));
            }
          }
        }
        
        if (options.includeObservations && result.observations?.length > 0) {
          logger.info(chalk.cyan(`\nObservations:`));
          for (const observation of result.observations) {
            logger.info(chalk.cyan(`  • ${observation.content} (${observation.category})`));
          }
        }
      }
    } catch (error) {
      logger.error(chalk.red(`Failed to get entity: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the delete subcommand
entityCommand
  .command('delete')
  .description('Delete an entity by permalink')
  .requiredOption('-p, --permalink <permalink>', 'Entity permalink')
  .option('--delete-file', 'Also delete the associated file if any', false)
  .action(async (options) => {
    try {
      const result = await entity.delete(options.permalink, {
        deleteFile: options.deleteFile
      });
      
      if (result) {
        logger.info(chalk.green(`Entity deleted: ${options.permalink}`));
      } else {
        logger.warn(chalk.yellow(`Entity not found: ${options.permalink}`));
      }
    } catch (error) {
      logger.error(chalk.red(`Failed to delete entity: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the list subcommand
entityCommand
  .command('list')
  .description('List entities')
  .option('-t, --type <type>', 'Filter by entity type')
  .option('-q, --query <query>', 'Search query for title or content')
  .option('-l, --limit <number>', 'Maximum number of results', '20')
  .option('-o, --offset <number>', 'Offset for pagination', '0')
  .option('-s, --sort <field>', 'Sort field (title, created_at, updated_at)', 'title')
  .option('--order <direction>', 'Sort order (asc, desc)', 'asc')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(async (options) => {
    try {
      const result = await entity.list({
        type: options.type,
        query: options.query,
        limit: parseInt(options.limit, 10),
        offset: parseInt(options.offset, 10),
        sort: options.sort,
        order: options.order.toUpperCase()
      });
      
      if (options.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        logger.info(chalk.cyan(`Found ${result.total} entities:`));
        
        for (const e of result.entities) {
          logger.info(chalk.cyan(`  • ${e.title} (${e.permalink}) - ${e.type}`));
        }
        
        if (result.total > result.entities.length) {
          logger.info(chalk.cyan(`\nShowing ${result.entities.length} of ${result.total} results`));
          logger.info(chalk.cyan(`Use --limit and --offset to paginate`));
        }
      }
    } catch (error) {
      logger.error(chalk.red(`Failed to list entities: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the types subcommand
entityCommand
  .command('types')
  .description('Get all entity types with counts')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(async (options) => {
    try {
      const types = await entity.getTypes();
      
      if (options.format === 'json') {
        console.log(JSON.stringify(types, null, 2));
      } else {
        logger.info(chalk.cyan(`Entity types:`));
        for (const type of types) {
          logger.info(chalk.cyan(`  • ${type.type}: ${type.count} entities`));
        }
      }
    } catch (error) {
      logger.error(chalk.red(`Failed to get entity types: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the update-metadata subcommand
entityCommand
  .command('update-metadata')
  .description('Update entity metadata')
  .requiredOption('-p, --permalink <permalink>', 'Entity permalink')
  .requiredOption('-m, --metadata <json>', 'Entity metadata as JSON string')
  .option('--replace', 'Replace existing metadata instead of merging', false)
  .action(async (options) => {
    try {
      // Parse metadata
      let metadata;
      try {
        metadata = JSON.parse(options.metadata);
      } catch (error) {
        logger.error(chalk.red(`Invalid JSON metadata: ${error.message}`));
        process.exit(1);
      }
      
      const result = await entity.updateMetadata(
        options.permalink, 
        metadata, 
        options.replace
      );
      
      if (result) {
        logger.info(chalk.green(`Metadata updated for entity: ${options.permalink}`));
      } else {
        logger.error(chalk.red(`Entity not found: ${options.permalink}`));
        process.exit(1);
      }
    } catch (error) {
      logger.error(chalk.red(`Failed to update metadata: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

export default entityCommand;
