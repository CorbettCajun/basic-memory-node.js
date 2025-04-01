#!/usr/bin/env node

/**
 * CLI Interface for Basic Memory
 * 
 * Provides command line access to Basic Memory functionality
 */

// Fix for MaxListenersExceededWarning
import process from 'process';
process.setMaxListeners(25);

import { Command } from 'commander';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { homedir } from 'os';
import fs from 'fs';
import { start } from '../src/mcp.js';
import { initializeDatabase } from '../src/db/index.js';
import { synchronize, watchDirectory } from '../src/sync.js';
import pino from 'pino';

// Set up paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  logger.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise);
  logger.error('Reason:', reason);
});

// Get package info
const packagePath = join(__dirname, '..', 'package.json');
const packageInfo = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Create CLI program
const program = new Command();
program
  .name('basic-memory')
  .description('Local-first knowledge management combining Zettelkasten with knowledge graphs')
  .version(packageInfo.version);

// MCP command - Start the MCP server
program
  .command('mcp')
  .description('Start the MCP server for AI assistants to interact with Basic Memory')
  .option('-p, --port <number>', 'Port to run the server on', '8765')
  .option('-h, --host <string>', 'Host to bind the server to', 'localhost')
  .action(async (options) => {
    process.env.BASIC_MEMORY_PORT = options.port;
    process.env.BASIC_MEMORY_HOST = options.host;
    
    logger.info('Starting Basic Memory MCP server...');
    try {
      await initializeDatabase();
      await start();
    } catch (error) {
      logger.error(`Failed to start MCP server: ${error.message}`);
      logger.error(error.stack);
      process.exit(1);
    }
  });

// Sync command - Synchronize files with the database
program
  .command('sync')
  .description('Synchronize Markdown files with the knowledge base')
  .option('-w, --watch', 'Watch for file changes and sync continuously', false)
  .option('-d, --directory <path>', 'Directory to sync (default: ~/basic-memory)', 
          join(homedir(), 'basic-memory'))
  .action(async (options) => {
    process.env.BASIC_MEMORY_HOME = options.directory;
    
    logger.info(`Syncing directory: ${options.directory}`);
    
    try {
      await initializeDatabase();
      
      // Initial sync
      await synchronize({ directory: options.directory });
      
      // Watch for changes if requested
      if (options.watch) {
        logger.info(`Watching for changes in ${options.directory}`);
        
        const watcher = watchDirectory(options.directory);
        
        // Keep process running
        logger.info('Press Ctrl+C to stop watching');
        await new Promise(() => {});
      }
    } catch (error) {
      logger.error(`Sync failed: ${error.message}`);
      logger.error(error.stack);
      process.exit(1);
    }
  });

// Init command - Initialize a new Basic Memory repository
program
  .command('init')
  .description('Initialize a new Basic Memory repository')
  .option('-d, --directory <path>', 'Directory to initialize (default: ~/basic-memory)', 
          join(homedir(), 'basic-memory'))
  .action(async (options) => {
    logger.info(`Initializing Basic Memory in ${options.directory}`);
    
    try {
      // Create directory if it doesn't exist
      if (!fs.existsSync(options.directory)) {
        fs.mkdirSync(options.directory, { recursive: true });
        logger.info(`Created directory: ${options.directory}`);
      }
      
      // Create basic structure
      const folders = ['notes', 'concepts', 'projects', 'reference'];
      folders.forEach(folder => {
        const folderPath = join(options.directory, folder);
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
          logger.info(`Created folder: ${folder}`);
        }
      });
      
      // Create sample note
      const sampleNotePath = join(options.directory, 'notes', 'welcome.md');
      if (!fs.existsSync(sampleNotePath)) {
        const sampleContent = `---
title: Welcome to Basic Memory
tags: [getting-started, welcome]
---

# Welcome to Basic Memory

This is your new knowledge management system. Here are some tips to get started:

## Adding Notes

Create Markdown files in this directory or its subdirectories. Basic Memory will automatically import them.

## Linking Notes

Use wiki-style links like this: [[another note]] to create connections between your notes.

## Using Tags

Add tags in the front matter of your notes to organize them.

## Synchronization

Run \`basic-memory sync -w\` to continuously sync your notes with the knowledge base.

`;
        fs.writeFileSync(sampleNotePath, sampleContent);
        logger.info(`Created sample note: welcome.md`);
      }
      
      // Initialize database
      process.env.BASIC_MEMORY_HOME = options.directory;
      await initializeDatabase();
      
      // Sync files
      await synchronize({ directory: options.directory });
      
      logger.info('Basic Memory initialized successfully');
      logger.info(`To start using it, run: basic-memory mcp`);
    } catch (error) {
      logger.error(`Initialization failed: ${error.message}`);
      logger.error(error.stack);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
