import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { getConfig } from '../config/config.js';
import { getDatabase } from '../database/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Calculates project statistics
 * @returns {Object} Project statistics
 */
async function calculateProjectStats() {
  const database = await getDatabase();
  const config = await getConfig();

  // Count entities
  const entityStats = await database.countEntities();
  
  // Calculate storage usage
  const storageStats = await calculateStorageUsage(config.projectPath);

  // Get project metadata
  const projectMetadata = await getProjectMetadata(config.projectPath);

  return {
    entities: entityStats,
    storage: storageStats,
    metadata: projectMetadata
  };
}

/**
 * Calculate storage usage for the project
 * @param {string} projectPath 
 * @returns {Object} Storage usage statistics
 */
async function calculateStorageUsage(projectPath) {
  const walkDir = async (dir) => {
    const files = await fs.promises.readdir(dir, { withFileTypes: true });
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      fileTypes: {}
    };

    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        const subStats = await walkDir(fullPath);
        stats.totalFiles += subStats.totalFiles;
        stats.totalSize += subStats.totalSize;
        
        // Merge file type stats
        for (const [type, count] of Object.entries(subStats.fileTypes)) {
          stats.fileTypes[type] = (stats.fileTypes[type] || 0) + count;
        }
      } else {
        const fileStats = await fs.promises.stat(fullPath);
        stats.totalFiles++;
        stats.totalSize += fileStats.size;
        
        const ext = path.extname(file.name).toLowerCase();
        stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
      }
    }

    return stats;
  };

  try {
    return await walkDir(projectPath);
  } catch (error) {
    console.error(chalk.red('Error calculating storage usage:'), error);
    return {
      totalFiles: 0,
      totalSize: 0,
      fileTypes: {}
    };
  }
}

/**
 * Retrieve project metadata
 * @param {string} projectPath 
 * @returns {Object} Project metadata
 */
async function getProjectMetadata(projectPath) {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8'));

    return {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      dependencies: Object.keys(packageJson.dependencies || {}),
      devDependencies: Object.keys(packageJson.devDependencies || {})
    };
  } catch (error) {
    console.error(chalk.red('Error reading project metadata:'), error);
    return {
      name: 'Unknown',
      version: 'Unknown',
      description: 'No description',
      dependencies: [],
      devDependencies: []
    };
  }
}

/**
 * Format bytes to human-readable format
 * @param {number} bytes 
 * @returns {string} Formatted file size
 */
function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

/**
 * Display project information
 * @param {Object} options 
 */
async function displayProjectInfo(options) {
  try {
    console.log(chalk.blue.bold('=== Project Information ==='));
    
    const stats = await calculateProjectStats();
    const config = await getConfig();

    // Project Metadata
    console.log(chalk.green('\nProject Metadata:'));
    console.log(chalk.white(`Name: ${stats.metadata.name}`));
    console.log(chalk.white(`Version: ${stats.metadata.version}`));
    console.log(chalk.white(`Description: ${stats.metadata.description}`));

    // Storage Statistics
    console.log(chalk.green('\nStorage Statistics:'));
    console.log(chalk.white(`Total Files: ${stats.storage.totalFiles}`));
    console.log(chalk.white(`Total Size: ${formatBytes(stats.storage.totalSize)}`));
    
    console.log(chalk.green('\nFile Type Distribution:'));
    Object.entries(stats.storage.fileTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(chalk.white(`  ${type}: ${count}`));
      });

    // Entity Statistics
    console.log(chalk.green('\nEntity Statistics:'));
    Object.entries(stats.entities)
      .forEach(([type, count]) => {
        console.log(chalk.white(`  ${type}: ${count}`));
      });

    // Dependencies
    if (options.detailed) {
      console.log(chalk.green('\nDependencies:'));
      console.log(chalk.white('  Production:'));
      stats.metadata.dependencies.forEach(dep => 
        console.log(chalk.white(`    - ${dep}`))
      );
      
      console.log(chalk.white('\n  Development:'));
      stats.metadata.devDependencies.forEach(dep => 
        console.log(chalk.white(`    - ${dep}`))
      );
    }

    // Configuration
    console.log(chalk.green('\nConfiguration:'));
    console.log(chalk.white(`Project Path: ${config.projectPath}`));
    console.log(chalk.white(`Environment: ${config.environment}`));

  } catch (error) {
    console.error(chalk.red('Error retrieving project information:'), error);
  }
}

/**
 * Register project_info command
 * @param {Command} program 
 */
export function registerProjectInfoCommand(program) {
  program
    .command('project-info')
    .description('Display detailed project information')
    .option('-d, --detailed', 'Show detailed dependency information')
    .action(displayProjectInfo);
}

export default {
  registerProjectInfoCommand
};
