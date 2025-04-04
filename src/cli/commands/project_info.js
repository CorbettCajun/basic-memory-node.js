/**
 * CLI command for project info status.
 * Node.js implementation matching the Python version's functionality
 */

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getHomeDir } from '../../db/index.js';
import { MarkdownProcessor } from '../../db/markdown_processor.js';
import pino from 'pino';
import { Console } from 'console';
import { createWriteStream } from 'fs';
import { logger } from '../app.js';
import { getDatabase } from '../database.js';
import { EntityMarkdown, EntityFrontmatter } from '../../db/models/entity.js';
import cliProgress from 'cli-progress';

// Logger is imported from ../app.js

// Create a rich-like console for output
const console = new Console({
  stdout: process.stdout,
  stderr: process.stderr
});

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Retrieve comprehensive project information
 * @returns {Promise<Object>} - Detailed project information
 */
async function getProjectInfo() {
  try {
    // Get home directory
    const homeDir = await getHomeDir();
    const markdownProcessor = new MarkdownProcessor(homeDir);

    // Placeholder for actual project info retrieval
    // This would typically involve database queries in a real implementation
    const projectInfo = {
      project_name: 'Basic Memory Project',
      project_path: homeDir,
      default_project: true,
      statistics: {
        total_entities: 0,
        total_observations: 0,
        total_relations: 0,
        total_unresolved_relations: 0,
        isolated_entities: 0,
        entity_types: {},
        most_connected_entities: []
      },
      activity: {
        recently_updated: []
      },
      system: {
        version: '0.1.0', // Replace with actual version
        database_path: path.join(homeDir, 'database'),
        database_size: '0 MB', // Replace with actual size
        timestamp: new Date(),
        watch_status: null
      },
      available_projects: {
        [this.project_name]: this.project_path
      }
    };

    return projectInfo;
  } catch (error) {
    logger.error(`Error retrieving project info: ${error.message}`);
    throw error;
  }
}

/**
 * Setup the project-info command
 */
export const setup = () => {
  const command = new Command('info')
    .description('Get detailed information about the Basic Memory project')
    .option('--json', 'Output project information in JSON format')
    .action(async (options) => {
      try {
        // Get project info
        const info = await getProjectInfo();

        if (options.json) {
          // Output as JSON
          console.log(JSON.stringify(info, null, 2));
          return;
        }

        // Rich text output
        console.log(chalk.bold('📊 Basic Memory Project Info'));
        console.log(chalk.cyan(`Project: ${info.project_name}`));
        console.log(chalk.cyan(`Path: ${info.project_path}`));
        console.log(chalk.cyan(`Default Project: ${info.default_project}`));
        console.log('');

        // Statistics section
        console.log(chalk.bold('📈 Statistics'));
        const statsTable = [
          ['Metric', 'Count'],
          ['Entities', info.statistics.total_entities],
          ['Observations', info.statistics.total_observations],
          ['Relations', info.statistics.total_relations],
          ['Unresolved Relations', info.statistics.total_unresolved_relations],
          ['Isolated Entities', info.statistics.isolated_entities]
        ];
        console.log(formatTable(statsTable));
        console.log('');

        // Entity Types
        if (Object.keys(info.statistics.entity_types).length > 0) {
          console.log(chalk.bold('📑 Entity Types'));
          const entityTypesTable = [
            ['Type', 'Count'],
            ...Object.entries(info.statistics.entity_types)
          ];
          console.log(formatTable(entityTypesTable));
          console.log('');
        }

        // Most Connected Entities
        if (info.statistics.most_connected_entities.length > 0) {
          console.log(chalk.bold('🔗 Most Connected Entities'));
          const connectedTable = [
            ['Title', 'Permalink', 'Relations'],
            ...info.statistics.most_connected_entities.map(entity => [
              entity.title, 
              entity.permalink, 
              entity.relation_count
            ])
          ];
          console.log(formatTable(connectedTable));
          console.log('');
        }

        // Recent Activity
        if (info.activity.recently_updated.length > 0) {
          console.log(chalk.bold('🕒 Recent Activity'));
          const recentTable = [
            ['Title', 'Type', 'Last Updated'],
            ...info.activity.recently_updated.slice(0, 5).map(entity => [
              entity.title,
              entity.entity_type,
              new Date(entity.updated_at).toLocaleString()
            ])
          ];
          console.log(formatTable(recentTable));
          console.log('');
        }

        // System Status
        console.log(chalk.bold('🖥️ System Status'));
        console.log(`Basic Memory version: ${info.system.version}`);
        console.log(`Database: ${info.system.database_path} (${info.system.database_size})`);

        // Watch Status
        if (info.system.watch_status) {
          console.log(chalk.bold('\nWatch Service'));
          console.log(`Status: ${info.system.watch_status.running ? 'Running' : 'Stopped'}`);
          if (info.system.watch_status.running) {
            console.log(`Running since: ${new Date(info.system.watch_status.start_time).toLocaleString()}`);
            console.log(`Files synced: ${info.system.watch_status.synced_files}`);
            console.log(`Errors: ${info.system.watch_status.error_count}`);
          }
        } else {
          console.log(chalk.yellow('Watch service not running'));
        }

        // Available Projects
        console.log(chalk.bold('\n📁 Available Projects'));
        const projectsTable = [
          ['Name', 'Path', 'Default'],
          ...Object.entries(info.available_projects).map(([name, path]) => [
            name, 
            path, 
            name === info.default_project ? '✓' : ''
          ])
        ];
        console.log(formatTable(projectsTable));

        // Timestamp
        console.log(`\nTimestamp: ${new Date(info.system.timestamp).toLocaleString()}`);

      } catch (error) {
        console.error(chalk.red(`Error getting project info: ${error.message}`));
        process.exit(1);
      }
    });
  
  return command;
};

/**
 * Format a 2D array as a table
 * @param {Array<Array<string>>} data - 2D array of table data
 * @returns {string} - Formatted table string
 */
function formatTable(data) {
  // Calculate column widths
  const colWidths = data[0].map((_, colIndex) => 
    Math.max(...data.map(row => String(row[colIndex]).length))
  );

  // Format header
  const header = data[0].map((cell, i) => 
    cell.padEnd(colWidths[i])
  ).join('  ');

  // Format rows
  const rows = data.slice(1).map(row => 
    row.map((cell, i) => 
      String(cell).padEnd(colWidths[i])
    ).join('  ')
  );

  // Combine with separator
  return [
    chalk.bold(header),
    '-'.repeat(header.length),
    ...rows
  ].join('\n');
}

export function registerProjectInfoCommand(program) {
  program
    .command('project-info')
    .description('Display detailed project information')
    .option('-j, --json', 'Output as JSON')
    .action(async (options) => {
      try {
        const projectInfo = await getProjectInfo();

        if (options.json) {
          console.log(JSON.stringify(projectInfo, null, 2));
        } else {
          displayProjectInfo(projectInfo);
        }

        process.exit(0);
      } catch (error) {
        logger.error(chalk.red(`Failed to get project info: ${error.message}`));
        process.exit(1);
      }
    });
}

/**
 * Get comprehensive project information
 * @returns {Promise<Object>} - Project information
 */
async function getProjectInfo() {
  const db = await getDatabase();

  const [entityCount, relationshipCount] = await Promise.all([
    db.entities.count(),
    db.relationships.count()
  ]);

  return {
    metadata: {
      name: 'Basic Memory Node.js',
      version: process.env.npm_package_version,
      database: {
        type: db.constructor.name,
        path: db.options.connection.filename
      }
    },
    statistics: {
      entities: entityCount,
      relationships: relationshipCount
    },
    configuration: {
      port: process.env.BASIC_MEMORY_PORT,
      host: process.env.BASIC_MEMORY_HOST
    }
  };
}

/**
 * Display project information in formatted text
 * @param {Object} projectInfo - Project information
 */
function displayProjectInfo(projectInfo) {
  console.log(chalk.bold.blue('\n=== Project Information ===\n'));

  // Display metadata
  console.log(chalk.bold('Metadata:'));
  console.log(`  Name: ${chalk.green(projectInfo.metadata.name)}`);
  console.log(`  Version: ${chalk.green(projectInfo.metadata.version)}`);
  console.log(`  Database:`);
  console.log(`    Type: ${chalk.green(projectInfo.metadata.database.type)}`);
  console.log(`    Path: ${chalk.green(projectInfo.metadata.database.path)}`);

  // Display statistics
  console.log(chalk.bold('\nStatistics:'));
  console.log(`  Entities: ${chalk.green(projectInfo.statistics.entities)}`);
  console.log(`  Relationships: ${chalk.green(projectInfo.statistics.relationships)}`);

  // Display configuration
  console.log(chalk.bold('\nConfiguration:'));
  console.log(`  Port: ${chalk.green(projectInfo.configuration.port)}`);
  console.log(`  Host: ${chalk.green(projectInfo.configuration.host)}`);

  console.log(chalk.bold.blue('\n==========================\n'));
}

export default { setup };
