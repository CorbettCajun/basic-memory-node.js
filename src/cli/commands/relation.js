/**
 * Relation command for Basic Memory
 * 
 * Provides functionality to manage relations between entities
 */

import { program, logger } from '../app.js';
import { relation, entity } from '../../api/index.js';
import chalk from 'chalk';

// Create the relation command group
const relationCommand = program
  .command('relation')
  .description('Manage relations between entities');

// Define the create subcommand
relationCommand
  .command('create')
  .description('Create a relation between two entities')
  .requiredOption('-s, --source <permalink>', 'Source entity permalink')
  .requiredOption('-t, --target <permalink>', 'Target entity permalink')
  .option('-y, --type <type>', 'Relation type', 'reference')
  .option('-n, --name <name>', 'Name for the target entity in this relation')
  .option('-c, --context <context>', 'Additional context for the relation')
  .option('-a, --attributes <json>', 'Additional attributes as JSON string')
  .action(async (options) => {
    try {
      // Parse attributes if provided
      let attributes = {};
      if (options.attributes) {
        try {
          attributes = JSON.parse(options.attributes);
        } catch (error) {
          logger.error(chalk.red(`Invalid JSON attributes: ${error.message}`));
          process.exit(1);
        }
      }
      
      // Create relation
      const newRelation = await relation.create({
        source_permalink: options.source,
        target_permalink: options.target,
        type: options.type,
        to_name: options.name,
        context: options.context,
        attributes: attributes
      });
      
      logger.info(chalk.green(`Relation created: ${options.source} → ${options.target} (${options.type})`));
    } catch (error) {
      logger.error(chalk.red(`Failed to create relation: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the get subcommand
relationCommand
  .command('get')
  .description('Get relations for an entity')
  .requiredOption('-p, --permalink <permalink>', 'Entity permalink')
  .option('-d, --direction <direction>', 'Relation direction (outgoing, incoming, both)', 'both')
  .option('-t, --type <type>', 'Filter by relation type')
  .option('-e, --include-entities', 'Include full entity data', false)
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(async (options) => {
    try {
      const result = await relation.get(options.permalink, {
        direction: options.direction,
        type: options.type,
        includeEntities: options.includeEntities
      });
      
      if (options.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const entityInfo = await entity.get(options.permalink);
        logger.info(chalk.cyan(`Relations for entity: ${entityInfo?.title || options.permalink}`));
        
        if (result.outgoing.length > 0) {
          logger.info(chalk.cyan(`\nOutgoing relations:`));
          for (const rel of result.outgoing) {
            const targetName = rel.target ? rel.target.title : rel.target_id;
            logger.info(chalk.cyan(`  → ${targetName} (${rel.type})`));
            if (rel.context) {
              logger.info(chalk.cyan(`    Context: ${rel.context}`));
            }
          }
        } else if (options.direction === 'outgoing' || options.direction === 'both') {
          logger.info(chalk.cyan(`No outgoing relations`));
        }
        
        if (result.incoming.length > 0) {
          logger.info(chalk.cyan(`\nIncoming relations:`));
          for (const rel of result.incoming) {
            const sourceName = rel.source ? rel.source.title : rel.source_id;
            logger.info(chalk.cyan(`  ← ${sourceName} (${rel.type})`));
            if (rel.context) {
              logger.info(chalk.cyan(`    Context: ${rel.context}`));
            }
          }
        } else if (options.direction === 'incoming' || options.direction === 'both') {
          logger.info(chalk.cyan(`No incoming relations`));
        }
      }
    } catch (error) {
      logger.error(chalk.red(`Failed to get relations: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the delete subcommand
relationCommand
  .command('delete')
  .description('Delete a relation')
  .option('-i, --id <id>', 'Relation ID')
  .option('-s, --source <permalink>', 'Source entity permalink')
  .option('-t, --target <permalink>', 'Target entity permalink')
  .option('-y, --type <type>', 'Relation type')
  .action(async (options) => {
    try {
      if (!options.id && !(options.source && options.target)) {
        logger.error(chalk.red(`Must provide either relation ID or both source and target permalinks`));
        process.exit(1);
      }
      
      const criteria = {};
      if (options.id) {
        criteria.id = options.id;
      } else {
        criteria.source_permalink = options.source;
        criteria.target_permalink = options.target;
        if (options.type) {
          criteria.type = options.type;
        }
      }
      
      const result = await relation.delete(criteria);
      
      if (result) {
        if (options.id) {
          logger.info(chalk.green(`Relation deleted: ID ${options.id}`));
        } else if (options.type) {
          logger.info(chalk.green(`Relation deleted: ${options.source} → ${options.target} (${options.type})`));
        } else {
          logger.info(chalk.green(`Relation(s) deleted between ${options.source} and ${options.target}`));
        }
      } else {
        logger.warn(chalk.yellow(`No matching relations found`));
      }
    } catch (error) {
      logger.error(chalk.red(`Failed to delete relation: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the types subcommand
relationCommand
  .command('types')
  .description('Get all relation types with counts')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(async (options) => {
    try {
      const types = await relation.getTypes();
      
      if (options.format === 'json') {
        console.log(JSON.stringify(types, null, 2));
      } else {
        logger.info(chalk.cyan(`Relation types:`));
        for (const type of types) {
          logger.info(chalk.cyan(`  • ${type.type}: ${type.count} relations`));
        }
      }
    } catch (error) {
      logger.error(chalk.red(`Failed to get relation types: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the find-related subcommand
relationCommand
  .command('find-related')
  .description('Find entities related to the given entity')
  .requiredOption('-p, --permalink <permalink>', 'Entity permalink')
  .option('-d, --depth <number>', 'Relation depth (how many hops to follow)', '1')
  .option('-t, --type <type>', 'Filter by relation type')
  .option('-e, --entity-type <entityType>', 'Filter by entity type')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(async (options) => {
    try {
      const result = await relation.findRelated(options.permalink, {
        depth: parseInt(options.depth, 10),
        type: options.type,
        entity_type: options.entityType
      });
      
      if (options.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const entityInfo = await entity.get(options.permalink);
        logger.info(chalk.cyan(`Entities related to: ${entityInfo?.title || options.permalink}`));
        logger.info(chalk.cyan(`Found ${result.length} related entities:`));
        
        for (const item of result) {
          const directionSymbol = item.direction === 'outgoing' ? '→' : '←';
          logger.info(chalk.cyan(`  • ${item.entity.title} ${directionSymbol} (${item.relation.type})`));
        }
      }
    } catch (error) {
      logger.error(chalk.red(`Failed to find related entities: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

export default relationCommand;
