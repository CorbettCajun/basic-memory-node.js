import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { getConfig } from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Discover and list available tools in the project
 * @returns {Array} List of available tools
 */
async function discoverTools() {
  const config = await getConfig();
  const toolsPath = path.join(config.projectPath, 'src', 'tools');
  
  try {
    const toolFiles = await fs.promises.readdir(toolsPath);
    return toolFiles
      .filter(file => file.endsWith('.js'))
      .map(file => path.basename(file, '.js'));
  } catch (error) {
    console.error(chalk.red('Error discovering tools:'), error);
    return [];
  }
}

/**
 * Get detailed information about a specific tool
 * @param {string} toolName 
 * @returns {Object} Tool details
 */
async function getToolDetails(toolName) {
  const config = await getConfig();
  const toolPath = path.join(config.projectPath, 'src', 'tools', `${toolName}.js`);

  try {
    const toolModule = await import(`file://${toolPath}`);
    
    return {
      name: toolName,
      description: toolModule.description || 'No description available',
      parameters: toolModule.parameters || {},
      usage: toolModule.usage || 'No usage information available'
    };
  } catch (error) {
    console.error(chalk.red(`Error loading tool ${toolName}:`), error);
    return null;
  }
}

/**
 * List all available tools
 * @param {Object} options 
 */
async function listTools(options) {
  try {
    const tools = await discoverTools();
    
    console.log(chalk.blue.bold('=== Available Tools ==='));
    
    for (const tool of tools) {
      const details = await getToolDetails(tool);
      
      console.log(chalk.green(`\n${tool}:`));
      console.log(chalk.white(`  Description: ${details.description}`));
      
      if (options.detailed) {
        console.log(chalk.white('  Parameters:'));
        Object.entries(details.parameters).forEach(([param, details]) => {
          console.log(chalk.white(`    - ${param}: ${details.description || 'No description'}`));
        });
        
        console.log(chalk.white('\n  Usage:'));
        console.log(chalk.white(`    ${details.usage}`));
      }
    }
  } catch (error) {
    console.error(chalk.red('Error listing tools:'), error);
  }
}

/**
 * Run a specific tool with given parameters
 * @param {string} toolName 
 * @param {Object} options 
 */
async function runTool(toolName, options) {
  try {
    const details = await getToolDetails(toolName);
    
    if (!details) {
      console.error(chalk.red(`Tool ${toolName} not found.`));
      return;
    }
    
    const toolModule = await import(`file://${path.join(await getConfig().projectPath, 'src', 'tools', `${toolName}.js`)}`);
    
    if (!toolModule.run) {
      console.error(chalk.red(`Tool ${toolName} does not have a run method.`));
      return;
    }
    
    console.log(chalk.blue(`Running tool: ${toolName}`));
    const result = await toolModule.run(options);
    
    console.log(chalk.green('Tool execution result:'));
    console.log(result);
  } catch (error) {
    console.error(chalk.red(`Error running tool ${toolName}:`), error);
  }
}

/**
 * Register tool-related commands
 * @param {Command} program 
 */
export function registerToolCommands(program) {
  const toolCommand = program
    .command('tool')
    .description('Manage and explore project tools');

  toolCommand
    .command('list')
    .description('List available tools')
    .option('-d, --detailed', 'Show detailed tool information')
    .action(listTools);

  toolCommand
    .command('run <toolName>')
    .description('Run a specific tool')
    .option('-p, --param <params...>', 'Tool-specific parameters')
    .action(runTool);
}

export default {
  registerToolCommands
};
