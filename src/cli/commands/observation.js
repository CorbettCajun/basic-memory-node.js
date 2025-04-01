/**
 * Observation command for Basic Memory
 * 
 * Provides functionality to manage observations for entities
 */

import { program, logger } from '../app.js';
import { observation, entity } from '../../api/index.js';
import chalk from 'chalk';
import fs from 'fs';

// Create the observation command group
const observationCommand = program
  .command('observation')
  .description('Manage observations for entities');

// Define the create subcommand
observationCommand
  .command('create')
  .description('Create a new observation for an entity')
  .requiredOption('-e, --entity <permalink>', 'Entity permalink')
  .requiredOption('-c, --content <content>', 'Observation content')
  .option('-f, --file <path>', 'File path to read content from')
  .option('--category <category>', 'Observation category', 'note')
  .option('--context <context>', 'Additional context')
  .option('-t, --tags <tags>', 'Comma-separated list of tags')
  .action(async (options) => {
    try {
      let content = options.content;
      
      // Read content from file if specified
      if (options.file) {
        if (!fs.existsSync(options.file)) {
          logger.error(chalk.red(`File not found: ${options.file}`));
          process.exit(1);
        }
        content = fs.readFileSync(options.file, 'utf8');
      }
      
      // Parse tags if provided
      const tags = options.tags 
        ? options.tags.split(',').map(tag => tag.trim()) 
        : [];
      
      // Create observation
      const newObservation = await observation.create({
        entity_permalink: options.entity,
        content: content,
        category: options.category,
        context: options.context,
        tags: tags
      });
      
      logger.info(chalk.green(`Observation created for entity: ${options.entity}`));
      logger.info(chalk.green(`Observation ID: ${newObservation.id}`));
    } catch (error) {
      logger.error(chalk.red(`Failed to create observation: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the get subcommand
observationCommand
  .command('get')
  .description('Get observations for an entity')
  .requiredOption('-e, --entity <permalink>', 'Entity permalink')
  .option('--category <category>', 'Filter by category')
  .option('-t, --tag <tag>', 'Filter by tag')
  .option('-s, --sort <field>', 'Sort field (created_at, updated_at)', 'created_at')
  .option('--order <direction>', 'Sort order (asc, desc)', 'desc')
  .option('-l, --limit <number>', 'Maximum number of results', '20')
  .option('-o, --offset <number>', 'Offset for pagination', '0')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(async (options) => {
    try {
      const result = await observation.get(options.entity, {
        category: options.category,
        tag: options.tag,
        sort: options.sort,
        order: options.order.toUpperCase(),
        limit: parseInt(options.limit, 10),
        offset: parseInt(options.offset, 10)
      });
      
      if (options.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const entityInfo = await entity.get(options.entity);
        logger.info(chalk.cyan(`Observations for entity: ${entityInfo?.title || options.entity}`));
        logger.info(chalk.cyan(`Found ${result.total} observations:`));
        
        for (const obs of result.observations) {
          const tags = obs.tags?.length > 0 
            ? ` [${obs.tags.join(', ')}]` 
            : '';
          
          logger.info(chalk.cyan(`\n#${obs.id} - ${obs.category}${tags}`));
          logger.info(chalk.cyan(`Created: ${new Date(obs.created_at).toLocaleString()}`));
          logger.info(chalk.cyan(`${obs.content}`));
        }
        
        if (result.total > result.observations.length) {
          logger.info(chalk.cyan(`\nShowing ${result.observations.length} of ${result.total} results`));
          logger.info(chalk.cyan(`Use --limit and --offset to paginate`));
        }
      }
    } catch (error) {
      logger.error(chalk.red(`Failed to get observations: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the get-by-id subcommand
observationCommand
  .command('get-by-id')
  .description('Get a specific observation by ID')
  .requiredOption('-i, --id <id>', 'Observation ID')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(async (options) => {
    try {
      const obs = await observation.getById(options.id);
      
      if (!obs) {
        logger.error(chalk.red(`Observation not found: ${options.id}`));
        process.exit(1);
      }
      
      if (options.format === 'json') {
        console.log(JSON.stringify(obs, null, 2));
      } else {
        const tags = obs.tags?.length > 0 
          ? ` [${obs.tags.join(', ')}]` 
          : '';
        
        logger.info(chalk.cyan(`Observation #${obs.id} - ${obs.category}${tags}`));
        logger.info(chalk.cyan(`Entity: ${obs.entity?.title || obs.entity_id}`));
        logger.info(chalk.cyan(`Created: ${new Date(obs.created_at).toLocaleString()}`));
        logger.info(chalk.cyan(`Updated: ${new Date(obs.updated_at).toLocaleString()}`));
        
        if (obs.context) {
          logger.info(chalk.cyan(`Context: ${obs.context}`));
        }
        
        logger.info(chalk.cyan(`\nContent:`));
        console.log(obs.content);
      }
    } catch (error) {
      logger.error(chalk.red(`Failed to get observation: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the update subcommand
observationCommand
  .command('update')
  .description('Update an observation')
  .requiredOption('-i, --id <id>', 'Observation ID')
  .option('-c, --content <content>', 'Updated content')
  .option('-f, --file <path>', 'File path to read content from')
  .option('--category <category>', 'Updated category')
  .option('--context <context>', 'Updated context')
  .option('-t, --tags <tags>', 'Comma-separated list of tags')
  .action(async (options) => {
    try {
      const updates = {};
      
      if (options.content || options.file) {
        let content = options.content;
        
        // Read content from file if specified
        if (options.file) {
          if (!fs.existsSync(options.file)) {
            logger.error(chalk.red(`File not found: ${options.file}`));
            process.exit(1);
          }
          content = fs.readFileSync(options.file, 'utf8');
        }
        
        updates.content = content;
      }
      
      if (options.category) {
        updates.category = options.category;
      }
      
      if (options.context) {
        updates.context = options.context;
      }
      
      if (options.tags) {
        updates.tags = options.tags.split(',').map(tag => tag.trim());
      }
      
      if (Object.keys(updates).length === 0) {
        logger.warn(chalk.yellow(`No updates specified`));
        process.exit(0);
      }
      
      const result = await observation.update(options.id, updates);
      
      if (result) {
        logger.info(chalk.green(`Observation updated: ${options.id}`));
      } else {
        logger.error(chalk.red(`Observation not found: ${options.id}`));
        process.exit(1);
      }
    } catch (error) {
      logger.error(chalk.red(`Failed to update observation: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the delete subcommand
observationCommand
  .command('delete')
  .description('Delete an observation')
  .requiredOption('-i, --id <id>', 'Observation ID')
  .action(async (options) => {
    try {
      const result = await observation.delete(options.id);
      
      if (result) {
        logger.info(chalk.green(`Observation deleted: ${options.id}`));
      } else {
        logger.warn(chalk.yellow(`Observation not found: ${options.id}`));
      }
    } catch (error) {
      logger.error(chalk.red(`Failed to delete observation: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the categories subcommand
observationCommand
  .command('categories')
  .description('Get all observation categories with counts')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(async (options) => {
    try {
      const categories = await observation.getCategories();
      
      if (options.format === 'json') {
        console.log(JSON.stringify(categories, null, 2));
      } else {
        logger.info(chalk.cyan(`Observation categories:`));
        for (const category of categories) {
          logger.info(chalk.cyan(`  • ${category.category}: ${category.count} observations`));
        }
      }
    } catch (error) {
      logger.error(chalk.red(`Failed to get observation categories: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

export default observationCommand;
