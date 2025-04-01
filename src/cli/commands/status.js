/**
 * Status command for Basic Memory
 * 
 * Provides functionality to show the status of the Basic Memory system
 */

import { program, logger } from '../app.js';
import { entity, relation, observation } from '../../api/index.js';
import { join } from 'path';
import { homedir } from 'os';
import { statSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import chalk from 'chalk';

// Define the status command
program
  .command('status')
  .description('Show the status of Basic Memory')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(async (options) => {
    try {
      // Get package info
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const packagePath = join(__dirname, '..', '..', '..', 'package.json');
      const packageInfo = JSON.parse(statSync(packagePath) ? require('fs').readFileSync(packagePath, 'utf8') : '{}');
      
      // Get current project and home directory
      const projectName = process.env.BASIC_MEMORY_PROJECT || 'main';
      const homeDir = process.env.BASIC_MEMORY_HOME || join(homedir(), 'basic-memory');
      const dbPath = process.env.BASIC_MEMORY_DB_PATH || join(homeDir, '.basic-memory', `${projectName}.db`);
      
      // Collect entity stats
      const entities = await entity.list({ limit: 0 });
      const entityTypes = await entity.getTypes();
      
      // Collect relation stats
      const relationTypes = await relation.getTypes();
      const totalRelations = relationTypes.reduce((sum, type) => sum + type.count, 0);
      
      // Collect observation stats
      const observationCategories = await observation.getCategories();
      const totalObservations = observationCategories.reduce((sum, cat) => sum + cat.count, 0);
      
      // Build status object
      const status = {
        version: packageInfo.version || 'unknown',
        project: {
          name: projectName,
          home: homeDir,
          database: dbPath,
          exists: existsSync(dbPath)
        },
        stats: {
          entities: {
            total: entities.total,
            types: entityTypes
          },
          relations: {
            total: totalRelations,
            types: relationTypes
          },
          observations: {
            total: totalObservations,
            categories: observationCategories
          }
        }
      };
      
      if (options.format === 'json') {
        console.log(JSON.stringify(status, null, 2));
      } else {
        // Display system info
        logger.info(chalk.cyan(`Basic Memory Status`));
        logger.info(chalk.cyan(`Version: ${status.version}`));
        logger.info(chalk.cyan(`Project: ${status.project.name}`));
        logger.info(chalk.cyan(`Home Directory: ${status.project.home}`));
        logger.info(chalk.cyan(`Database: ${status.project.database}`));
        
        // Display entity stats
        logger.info(chalk.cyan(`\nEntities: ${status.stats.entities.total}`));
        if (status.stats.entities.types.length > 0) {
          for (const type of status.stats.entities.types) {
            logger.info(chalk.cyan(`  • ${type.type}: ${type.count}`));
          }
        }
        
        // Display relation stats
        logger.info(chalk.cyan(`\nRelations: ${status.stats.relations.total}`));
        if (status.stats.relations.types.length > 0) {
          for (const type of status.stats.relations.types) {
            logger.info(chalk.cyan(`  • ${type.type}: ${type.count}`));
          }
        }
        
        // Display observation stats
        logger.info(chalk.cyan(`\nObservations: ${status.stats.observations.total}`));
        if (status.stats.observations.categories.length > 0) {
          for (const category of status.stats.observations.categories) {
            logger.info(chalk.cyan(`  • ${category.category}: ${category.count}`));
          }
        }
      }
    } catch (error) {
      logger.error(chalk.red(`Failed to get status: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

export default program.commands.find(cmd => cmd.name() === 'status');
