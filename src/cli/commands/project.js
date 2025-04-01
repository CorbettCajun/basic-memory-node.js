/**
 * Project command for Basic Memory
 * 
 * Provides functionality to manage different Basic Memory projects
 */

import { program, logger } from '../app.js';
import { homedir } from 'os';
import { join, resolve } from 'path';
import { existsSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'fs';
import { initializeDatabase } from '../../db/index.js';
import { entity } from '../../api/index.js';
import chalk from 'chalk';

// Define the project command group
const projectCommand = program
  .command('project')
  .description('Manage Basic Memory projects');

// Define the list subcommand
projectCommand
  .command('list')
  .description('List available projects')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(async (options) => {
    try {
      // Get current project
      const currentProject = process.env.BASIC_MEMORY_PROJECT || 'main';
      
      // Find all projects by checking the .basic-memory directory
      const homeDir = process.env.BASIC_MEMORY_HOME || join(homedir(), 'basic-memory');
      const dbDir = join(homeDir, '.basic-memory');
      
      const projects = [];
      
      if (existsSync(dbDir)) {
        const files = readdirSync(dbDir);
        
        for (const file of files) {
          if (file.endsWith('.db')) {
            const projectName = file.replace(/\.db$/, '');
            const projectPath = join(dbDir, file);
            const stats = statSync(projectPath);
            
            projects.push({
              name: projectName,
              path: projectPath,
              size: stats.size,
              modified: stats.mtime,
              current: projectName === currentProject
            });
          }
        }
      }
      
      if (options.format === 'json') {
        console.log(JSON.stringify(projects, null, 2));
      } else {
        logger.info(chalk.cyan(`Basic Memory Projects:`));
        
        if (projects.length === 0) {
          logger.info(chalk.yellow(`No projects found`));
        } else {
          for (const project of projects) {
            const marker = project.current ? '* ' : '  ';
            const sizeMB = (project.size / (1024 * 1024)).toFixed(2);
            logger.info(chalk.cyan(`${marker}${project.name}`));
            logger.info(chalk.cyan(`    Path: ${project.path}`));
            logger.info(chalk.cyan(`    Size: ${sizeMB} MB`));
            logger.info(chalk.cyan(`    Modified: ${project.modified.toLocaleString()}`));
          }
          
          logger.info(chalk.cyan(`\nCurrent project: ${currentProject}`));
          logger.info(chalk.cyan(`Use 'basic-memory -p <project>' to switch projects`));
        }
      }
    } catch (error) {
      logger.error(chalk.red(`Failed to list projects: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the create subcommand
projectCommand
  .command('create')
  .description('Create a new project')
  .requiredOption('-n, --name <name>', 'Project name')
  .option('-d, --directory <path>', 'Base directory for the project (default: ~/basic-memory/<name>)', '')
  .option('--empty', 'Create an empty project without templates', false)
  .action(async (options) => {
    try {
      // Validate project name
      if (!/^[a-zA-Z0-9_-]+$/.test(options.name)) {
        logger.error(chalk.red(`Invalid project name. Use only letters, numbers, underscores, and hyphens.`));
        process.exit(1);
      }
      
      // Set up directory
      const homeDir = process.env.BASIC_MEMORY_HOME || join(homedir(), 'basic-memory');
      const projectDir = options.directory || join(homeDir, options.name);
      const dbDir = join(homeDir, '.basic-memory');
      const dbPath = join(dbDir, `${options.name}.db`);
      
      // Check if project already exists
      if (existsSync(dbPath)) {
        logger.error(chalk.red(`Project already exists: ${options.name}`));
        process.exit(1);
      }
      
      // Create directories
      if (!existsSync(projectDir)) {
        mkdirSync(projectDir, { recursive: true });
        logger.info(chalk.blue(`Created project directory: ${projectDir}`));
      }
      
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
      }
      
      // Initialize project with template files
      if (!options.empty) {
        // Create basic folder structure
        const folders = ['notes', 'concepts', 'projects', 'reference'];
        for (const folder of folders) {
          const folderPath = join(projectDir, folder);
          if (!existsSync(folderPath)) {
            mkdirSync(folderPath, { recursive: true });
            logger.info(chalk.blue(`Created folder: ${folder}`));
          }
        }
        
        // Create welcome note
        const welcomeNotePath = join(projectDir, 'notes', 'welcome.md');
        if (!existsSync(welcomeNotePath)) {
          const welcomeContent = `---
title: Welcome to ${options.name}
tags: [getting-started, welcome]
---

# Welcome to ${options.name}

This is your new Basic Memory project. Here are some tips to get started:

## Adding Notes

Create Markdown files in this directory or its subdirectories. Basic Memory will automatically import them.

## Linking Notes

Use wiki-style links like this: [[another note]] to create connections between your notes.

## Using Tags

Add tags in the front matter of your notes to organize them.

## Synchronization

Run \`basic-memory sync -w\` to continuously sync your notes with the knowledge base.

`;
          writeFileSync(welcomeNotePath, welcomeContent);
          logger.info(chalk.blue(`Created welcome note: welcome.md`));
        }
      }
      
      // Initialize database
      process.env.BASIC_MEMORY_PROJECT = options.name;
      process.env.BASIC_MEMORY_HOME = resolve(projectDir);
      process.env.BASIC_MEMORY_DB_PATH = dbPath;
      
      await initializeDatabase();
      logger.info(chalk.green(`Database initialized: ${dbPath}`));
      
      // Run initial sync if not empty
      if (!options.empty) {
        const sync = (await import('../../sync.js')).synchronize;
        await sync({ directory: projectDir });
        logger.info(chalk.green(`Initial sync completed`));
      }
      
      logger.info(chalk.green(`Project created successfully: ${options.name}`));
      logger.info(chalk.green(`Project directory: ${projectDir}`));
      logger.info(chalk.green(`Database path: ${dbPath}`));
      logger.info(chalk.green(`Use 'basic-memory -p ${options.name}' to use this project`));
    } catch (error) {
      logger.error(chalk.red(`Failed to create project: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

// Define the info subcommand
projectCommand
  .command('info')
  .description('Show information about a project')
  .option('-n, --name <name>', 'Project name (default: current project)')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(async (options) => {
    try {
      // Get project name
      const projectName = options.name || process.env.BASIC_MEMORY_PROJECT || 'main';
      
      // Set up paths
      const homeDir = process.env.BASIC_MEMORY_HOME || join(homedir(), 'basic-memory');
      const projectDir = join(homeDir, projectName);
      const dbDir = join(homeDir, '.basic-memory');
      const dbPath = join(dbDir, `${projectName}.db`);
      
      // Check if project exists
      if (!existsSync(dbPath)) {
        logger.error(chalk.red(`Project not found: ${projectName}`));
        process.exit(1);
      }
      
      // Get database stats
      const dbStats = existsSync(dbPath) ? statSync(dbPath) : null;
      
      // Get entity stats (temporarily switch to project if needed)
      const originalProject = process.env.BASIC_MEMORY_PROJECT;
      process.env.BASIC_MEMORY_PROJECT = projectName;
      process.env.BASIC_MEMORY_DB_PATH = dbPath;
      
      await initializeDatabase();
      const entities = await entity.list({ limit: 0 });
      const entityTypes = await entity.getTypes();
      
      // Restore original project
      process.env.BASIC_MEMORY_PROJECT = originalProject;
      
      // Build project info object
      const info = {
        name: projectName,
        directory: projectDir,
        database: {
          path: dbPath,
          exists: existsSync(dbPath),
          size: dbStats ? dbStats.size : 0,
          modified: dbStats ? dbStats.mtime : null
        },
        stats: {
          entities: {
            total: entities.total,
            types: entityTypes
          }
        }
      };
      
      if (options.format === 'json') {
        console.log(JSON.stringify(info, null, 2));
      } else {
        logger.info(chalk.cyan(`Project: ${info.name}`));
        logger.info(chalk.cyan(`Directory: ${info.directory}`));
        logger.info(chalk.cyan(`Database: ${info.database.path}`));
        
        if (info.database.exists) {
          const sizeMB = (info.database.size / (1024 * 1024)).toFixed(2);
          logger.info(chalk.cyan(`Database Size: ${sizeMB} MB`));
          logger.info(chalk.cyan(`Last Modified: ${info.database.modified.toLocaleString()}`));
        } else {
          logger.info(chalk.yellow(`Database does not exist`));
        }
        
        logger.info(chalk.cyan(`\nEntities: ${info.stats.entities.total}`));
        if (info.stats.entities.types.length > 0) {
          for (const type of info.stats.entities.types) {
            logger.info(chalk.cyan(`  • ${type.type}: ${type.count}`));
          }
        }
      }
    } catch (error) {
      logger.error(chalk.red(`Failed to get project info: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

export default projectCommand;
