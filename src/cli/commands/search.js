/**
 * Search command for Basic Memory
 * 
 * Provides functionality to search entities and observations
 */

import { program, logger } from '../app.js';
import { search } from '../../api/index.js';
import chalk from 'chalk';

// Create the search command group
const searchCommand = program
  .command('search')
  .description('Search the knowledge base');

// Define the entities subcommand
searchCommand
  .command('entities')
  .description('Search for entities matching the query')
  .requiredOption('-q, --query <query>', 'Search query')
  .option('-t, --type <type>', 'Filter by entity type')
  .option('--entity-type <entityType>', 'Filter by specific entity type')
  .option('-c, --include-content', 'Search in content as well as title', false)
  .option('-s, --semantic', 'Use semantic search if available', false)
  .option('-l, --limit <number>', 'Maximum number of results', '20')
  .option('-o, --offset <number>', 'Offset for pagination', '0')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(async (options) => {
    try {
      const result = await search.entities({
        query: options.query,
        type: options.type,
        entity_type: options.entityType,
        include_content: options.includeContent,
        semantic: options.semantic,
        limit: parseInt(options.limit, 10),
        offset: parseInt(options.offset, 10)
      });
      
      if (options.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        logger.info(chalk.cyan(`Search results for "${options.query}":`));
        logger.info(chalk.cyan(`Found ${result.total} matches:`));
        
        for (const entity of result.results) {
          logger.info(chalk.cyan(`\n• ${entity.title} (${entity.permalink})`));
          logger.info(chalk.cyan(`  Type: ${entity.type}`));
          
          // Show a snippet of content
          if (entity.content) {
            const snippet = entity.content.substring(0, 100).replace(/\n/g, ' ');
            logger.info(chalk.cyan(`  Snippet: ${snippet}${entity.content.length > 100 ? '...' : ''}`));
          }
        }
        
        if (result.total > result.results.length) {
          logger.info(chalk.cyan(`\nShowing ${result.results.length} of ${result.total} results`));
          logger.info(chalk.cyan(`Use --limit and --offset to paginate`));
        }
      }
    } catch (error) {
      logger.error(chalk.red(`Search failed: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the observations subcommand
searchCommand
  .command('observations')
  .description('Search for observations matching the query')
  .requiredOption('-q, --query <query>', 'Search query')
  .option('-e, --entity <permalink>', 'Filter by entity permalink')
  .option('-c, --category <category>', 'Filter by observation category')
  .option('-t, --tag <tag>', 'Filter by observation tag')
  .option('-l, --limit <number>', 'Maximum number of results', '20')
  .option('-o, --offset <number>', 'Offset for pagination', '0')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(async (options) => {
    try {
      const result = await search.observations({
        query: options.query,
        entity_permalink: options.entity,
        category: options.category,
        tag: options.tag,
        limit: parseInt(options.limit, 10),
        offset: parseInt(options.offset, 10)
      });
      
      if (options.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        logger.info(chalk.cyan(`Search results for "${options.query}":`));
        logger.info(chalk.cyan(`Found ${result.total} matches:`));
        
        for (const obs of result.results) {
          const entityInfo = obs.entity 
            ? `${obs.entity.title} (${obs.entity.permalink})` 
            : `Entity #${obs.entity_id}`;
          
          const tags = obs.tags?.length > 0 
            ? ` [${obs.tags.join(', ')}]` 
            : '';
          
          logger.info(chalk.cyan(`\n• Observation #${obs.id} - ${obs.category}${tags}`));
          logger.info(chalk.cyan(`  Entity: ${entityInfo}`));
          logger.info(chalk.cyan(`  Date: ${new Date(obs.created_at).toLocaleString()}`));
          
          // Show a snippet of content
          const snippet = obs.content.substring(0, 100).replace(/\n/g, ' ');
          logger.info(chalk.cyan(`  Content: ${snippet}${obs.content.length > 100 ? '...' : ''}`));
        }
        
        if (result.total > result.results.length) {
          logger.info(chalk.cyan(`\nShowing ${result.results.length} of ${result.total} results`));
          logger.info(chalk.cyan(`Use --limit and --offset to paginate`));
        }
      }
    } catch (error) {
      logger.error(chalk.red(`Search failed: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the update-index subcommand
searchCommand
  .command('update-index')
  .description('Update search index for an entity')
  .requiredOption('-p, --permalink <permalink>', 'Entity permalink')
  .action(async (options) => {
    try {
      const result = await search.updateIndex(options.permalink);
      
      if (result) {
        logger.info(chalk.green(`Search index updated for entity: ${options.permalink}`));
      } else {
        logger.error(chalk.red(`Failed to update search index`));
        process.exit(1);
      }
    } catch (error) {
      logger.error(chalk.red(`Failed to update search index: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the rebuild-indices subcommand
searchCommand
  .command('rebuild-indices')
  .description('Rebuild all search indices')
  .option('-f, --force', 'Force rebuild of all indices', false)
  .action(async (options) => {
    try {
      logger.info(chalk.blue('Rebuilding search indices...'));
      
      const result = await search.rebuildIndices({ force: options.force });
      
      logger.info(chalk.green('Search indices rebuilt successfully'));
      logger.info(chalk.green(`Created: ${result.created}, Updated: ${result.updated}, Skipped: ${result.skipped}`));
    } catch (error) {
      logger.error(chalk.red(`Failed to rebuild search indices: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

export default searchCommand;
