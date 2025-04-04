/**
 * Commands Index
 * 
 * Centralized registry for all CLI commands
 * This file exports all command modules to simplify imports in the main CLI application
 */

import { logger } from '../app.js';
import { Command } from 'commander';
import initCommand from './init.js';
// Import all command modules
import syncAction from './sync.js';
import mcpAction from './mcp.js';
import entityCommand from './entity.js';
import relationCommand from './relation.js';
import observationCommand from './observation.js';
import searchCommand from './search.js';
import statusAction from './status.js';
import dbAction from './db.js';
import projectAction from './project.js';
import { registerImportClaudeConversationsCommand } from './import_claude_conversations.js';
import { registerImportChatGPTCommand } from './import_chatgpt.js';
import { registerImportClaudeProjectsCommand } from './import_claude_projects.js';
import { registerImportMemoryJsonCommand } from './import_memory_json.js';
import projectInfoAction from './project_info.js';
import toolAction from './tool.js';
import migrateCommand from './migrate.js';
import { registerTagCommand } from './tag.js';
import { registerConfigCommand } from './config.js';

// Centralized command registry
const commandRegistry = {
  sync: syncAction,
  mcp: mcpAction,
  entity: entityCommand,
  relation: relationCommand,
  observation: observationCommand,
  search: searchCommand,
  status: statusAction,
  db: dbAction,
  project: projectAction,
  importClaudeConversations: registerImportClaudeConversationsCommand,
  importChatGPT: registerImportChatGPTCommand,
  importClaudeProjects: registerImportClaudeProjectsCommand,
  importMemoryJson: registerImportMemoryJsonCommand,
  projectInfo: projectInfoAction,
  tool: toolAction,
  migrate: migrateCommand,
  init: initCommand,
  tag: registerTagCommand(),
  config: registerConfigCommand()
};

/**
 * Register all commands with the CLI program
 * @param {import('commander').Command} program - The Commander program instance
 */
function registerCommands(program) {
  logger.debug('Registering CLI commands...');
  
  // Track successfully loaded commands
  const loadedCommands = [];
  // Track command names to prevent duplicates
  const commandNames = new Set();

  // Try to register each command
  Object.entries(commandRegistry).forEach(([name, command]) => {
    if (!command) {
      logger.warn(`Encountered undefined command: ${name}`);
      return;
    }
    
    try {
      // Handle different export patterns
      if (command.setup && typeof command.setup === 'function') {
        // Most of our commands export an object with a setup function
        const cmd = command.setup();
        // Check for duplicates
        if (!commandNames.has(cmd.name())) {
          program.addCommand(cmd);
          loadedCommands.push(cmd.name());
          commandNames.add(cmd.name());
        }
      } else if (command.name && typeof command.name === 'function') {
        // Handle commands that export the command object directly
        const cmdName = command.name();
        if (!commandNames.has(cmdName)) {
          program.addCommand(command);
          loadedCommands.push(cmdName);
          commandNames.add(cmdName);
        }
      } else {
        // For other formats
        let commandName = name;
        if (typeof command.addTo === 'function') {
          command.addTo(program);
        } else if (command instanceof Command) {
          if (!commandNames.has(commandName)) {
            program.addCommand(command);
          }
        }
        
        if (!commandNames.has(commandName)) {
          loadedCommands.push(commandName);
          commandNames.add(commandName);
        }
      }
    } catch (error) {
      logger.error(`Failed to register command: ${error.message}`);
      logger.debug(error.stack);
    }
  });

  logger.info(`Successfully registered ${loadedCommands.length} CLI commands`);
  return loadedCommands;
}

// Export the command registry and registration function
export {
  commandRegistry,
  registerCommands
};

// Create a default export with the entire module contents
export default {
  commandRegistry,
  registerCommands
};