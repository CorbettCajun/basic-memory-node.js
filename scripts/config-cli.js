#!/usr/bin/env node
import { program } from 'commander';
import configManager from '../src/config/index.js';
import fs from 'fs/promises';
import path from 'path';

program
  .name('basic-memory-config')
  .description('Configuration management for Basic Memory')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize default configuration')
  .action(async () => {
    const configPath = path.join(process.cwd(), 'config.json');
    try {
      await configManager.saveToFile(configPath);
      console.log(`Configuration initialized at ${configPath}`);
    } catch (error) {
      console.error('Failed to initialize configuration:', error);
      process.exit(1);
    }
  });

program
  .command('view')
  .description('View current configuration')
  .option('-f, --file <path>', 'Path to configuration file')
  .action(async (options) => {
    try {
      if (options.file) {
        await configManager.loadFromFile(options.file);
      }
      console.log(JSON.stringify(configManager.config, null, 2));
    } catch (error) {
      console.error('Failed to view configuration:', error);
      process.exit(1);
    }
  });

program
  .command('edit')
  .description('Edit configuration')
  .option('-f, --file <path>', 'Path to configuration file')
  .option('-k, --key <key>', 'Configuration key to modify')
  .option('-v, --value <value>', 'New value for the key')
  .action(async (options) => {
    try {
      if (options.file) {
        await configManager.loadFromFile(options.file);
      }

      if (options.key) {
        configManager.set(options.key, options.value);
        await configManager.saveToFile();
        console.log(`Updated ${options.key} to ${options.value}`);
      } else {
        console.error('Please specify a key to edit');
        process.exit(1);
      }
    } catch (error) {
      console.error('Failed to edit configuration:', error);
      process.exit(1);
    }
  });

program
  .command('platform')
  .description('Get platform-specific configuration')
  .action(() => {
    const platformConfig = configManager.getPlatformConfig();
    console.log(JSON.stringify(platformConfig, null, 2));
  });

program.parse(process.argv);
