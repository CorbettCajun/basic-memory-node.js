import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { z } from 'zod';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

// Load environment variables
dotenv.config();

// Constants for configuration
const DATABASE_NAME = 'memory.db';
const DATA_DIR_NAME = '.basic-memory';
const CONFIG_FILE_NAME = 'config.json';

// Environment schema with more precise typing
const EnvironmentSchema = z.enum(['test', 'dev', 'user']);

// Project configuration schema
export const ProjectConfigSchema = z.object({
  env: EnvironmentSchema.default('dev'),
  home: z.string()
    .default(() => path.join(os.homedir(), 'basic-memory'))
    .transform(val => {
      const projectPath = path.resolve(val);
      
      // Ensure project path exists with proper permissions
      try {
        fs.mkdirSync(projectPath, { recursive: true, mode: 0o755 });
      } catch (error) {
        logger.error(`Failed to create project path: ${error.message}`);
        throw new Error(`Cannot create project directory: ${projectPath}`);
      }

      return projectPath;
    }),
  project: z.string()
    .default('default')
    .refine(val => val.length > 0 && val.length <= 50, {
      message: 'Project name must be 1-50 characters long'
    }),
  syncDelay: z.number()
    .int()
    .positive()
    .default(500)
    .refine(val => val >= 100 && val <= 5000, {
      message: 'Sync delay must be between 100 and 5000 milliseconds'
    }),
  logLevel: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).default('DEBUG')
}).transform(config => ({
  ...config,
  databasePath: () => {
    const databaseDir = path.join(config.home, DATA_DIR_NAME);
    const databasePath = path.join(databaseDir, DATABASE_NAME);
    
    // Ensure database directory exists with proper permissions
    try {
      fs.mkdirSync(databaseDir, { recursive: true, mode: 0o755 });
      
      // Create database file if it doesn't exist
      if (!fs.existsSync(databasePath)) {
        fs.writeFileSync(databasePath, '', { mode: 0o644 });
      }
    } catch (error) {
      logger.error(`Failed to create database path: ${error.message}`);
      throw new Error(`Cannot create database directory: ${databaseDir}`);
    }

    return databasePath;
  }
}));

// Global configuration schema
export const BasicMemoryConfigSchema = z.object({
  projects: z.record(z.string()).default({
    main: path.join(os.homedir(), 'basic-memory')
  }),
  defaultProject: z.string()
    .default('main')
    .refine(val => val.length > 0, {
      message: 'Default project name cannot be empty'
    })
}).transform(config => {
  // Ensure main project exists
  if (!config.projects.main) {
    config.projects.main = path.join(os.homedir(), 'basic-memory');
  }

  // Ensure default project is valid
  if (!config.projects[config.defaultProject]) {
    config.defaultProject = 'main';
  }

  return config;
});

// Configuration management class
export class ConfigManager {
  constructor() {
    this.configDir = path.join(os.homedir(), DATA_DIR_NAME);
    this.configFile = path.join(this.configDir, CONFIG_FILE_NAME);

    // Ensure config directory exists with proper permissions
    try {
      fs.mkdirSync(this.configDir, { recursive: true, mode: 0o755 });
    } catch (error) {
      logger.error(`Failed to create config directory: ${error.message}`);
      throw new Error(`Cannot create configuration directory: ${this.configDir}`);
    }

    // Load or create configuration
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      // Check if config file exists
      if (fs.existsSync(this.configFile)) {
        const rawConfig = JSON.parse(
          fs.readFileSync(this.configFile, 'utf8')
        );
        
        // Validate configuration
        return BasicMemoryConfigSchema.parse(rawConfig);
      }

      // Create default configuration
      const defaultConfig = BasicMemoryConfigSchema.parse({});
      this.saveConfig(defaultConfig);
      return defaultConfig;
    } catch (error) {
      logger.error(`Failed to load config: ${error.message}`);
      
      // Fallback to default configuration
      const defaultConfig = BasicMemoryConfigSchema.parse({});
      this.saveConfig(defaultConfig);
      return defaultConfig;
    }
  }

  saveConfig(config) {
    try {
      // Ensure config file has restricted permissions
      fs.writeFileSync(
        this.configFile, 
        JSON.stringify(config, null, 2),
        { mode: 0o600 }  // Read/write for owner only
      );
    } catch (error) {
      logger.error(`Failed to save config: ${error.message}`);
      throw new Error(`Cannot save configuration: ${error.message}`);
    }
  }

  getProjects() {
    return { ...this.config.projects };
  }

  getDefaultProject() {
    return this.config.defaultProject;
  }

  getProjectPath(projectName) {
    const name = projectName || 
      process.env.BASIC_MEMORY_PROJECT || 
      this.config.defaultProject;

    if (!(name in this.config.projects)) {
      throw new Error(`Project '${name}' not found in configuration`);
    }

    return this.config.projects[name];
  }

  addProject(name, projectPath) {
    // Validate project name
    if (name in this.config.projects) {
      throw new Error(`Project '${name}' already exists`);
    }

    // Validate and ensure path exists
    const resolvedPath = path.resolve(projectPath);
    try {
      fs.mkdirSync(resolvedPath, { recursive: true, mode: 0o755 });
    } catch (error) {
      logger.error(`Failed to create project path: ${error.message}`);
      throw new Error(`Cannot create project directory: ${resolvedPath}`);
    }

    this.config.projects[name] = resolvedPath;
    this.saveConfig(this.config);
  }

  removeProject(name) {
    if (!(name in this.config.projects)) {
      throw new Error(`Project '${name}' not found`);
    }

    if (name === this.config.defaultProject) {
      throw new Error(`Cannot remove the default project '${name}'`);
    }

    delete this.config.projects[name];
    this.saveConfig(this.config);
  }

  setDefaultProject(name) {
    if (!(name in this.config.projects)) {
      throw new Error(`Project '${name}' not found`);
    }

    this.config.defaultProject = name;
    this.saveConfig(this.config);
  }

  getProjectConfig(projectName) {
    const name = projectName || 
      process.env.BASIC_MEMORY_PROJECT || 
      this.config.defaultProject;

    const projectPath = this.getProjectPath(name);

    return ProjectConfigSchema.parse({
      home: projectPath,
      project: name
    });
  }
}

// Standalone function to get project configuration
export function getProjectConfig(projectName) {
  const configManager = new ConfigManager();

  try {
    return configManager.getProjectConfig(projectName);
  } catch (error) {
    logger.warning(`Project '${projectName}' not found, using default`);
    return configManager.getProjectConfig();
  }
}

const configManager = new ConfigManager();

export default configManager;
