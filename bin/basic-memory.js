#!/usr/bin/env node
import { program } from 'commander';
import { createLogger } from '../src/utils/enhanced-logger.js';
import { envConfig } from '../src/utils/env-config.js';
import { autocompleteManager } from '../src/cli/autocomplete.js';
import { 
  syncCommand, 
  statusCommand, 
  dbCommand, 
  importMemoryJsonCommand,
  mcpCommand,
  importClaudeConversationsCommand,
  importClaudeProjectsCommand,
  importChatGPTCommand,
  toolCommand,
  projectCommand,
  projectInfoCommand
} from '../src/cli/commands/index.js';

const logger = createLogger('CLI');

// Validate critical environment variables
try {
  envConfig.validate([
    'BASIC_MEMORY_DB_PATH', 
    'BASIC_MEMORY_LOG_LEVEL'
  ]);
} catch (error) {
  logger.error('Environment configuration error', { error: error.message });
  process.exit(1);
}

// Configure CLI program with enhanced features
program
  .name('basic-memory')
  .description('Local-first knowledge management system')
  .version('0.10.0')
  .option('--env <path>', 'Path to custom environment file')
  .option('--install-completion [shell]', 'Install shell completion script')
  .configureHelp({
    formatHelp: (cmd, helper) => {
      const terminalWidth = process.stdout.columns || 80;
      return helper.formatHelp(cmd, {
        ...helper.padWidth,
        terminalWidth
      });
    }
  });

// Handle custom environment file
program.on('option:env', (path) => {
  if (path) {
    process.env.ENV_FILE = path;
    envConfig._loadEnvironmentFiles();
  }
});

// Handle completion script installation
program.on('option:install-completion', (shell = 'bash') => {
  autocompleteManager.installCompletion(shell);
  logger.info(`Installed completion script for ${shell}`);
  process.exit(0);
});

// Add comprehensive command set matching Python implementation
program
  .command('sync')
  .description('Synchronize knowledge base')
  .option('-f, --force', 'Force synchronization')
  .action(syncCommand);

program
  .command('status')
  .description('Show current knowledge base status')
  .option('-v, --verbose', 'Show detailed status')
  .action(statusCommand);

program
  .command('db')
  .description('Database management commands')
  .option('--reset', 'Reset database')
  .option('--migrate', 'Run database migrations')
  .action(dbCommand);

program
  .command('import-memory-json')
  .description('Import memory from JSON file')
  .argument('<file>', 'JSON file to import')
  .action(importMemoryJsonCommand);

program
  .command('mcp')
  .description('Model Context Protocol operations')
  .option('--test', 'Run MCP compatibility tests')
  .action(mcpCommand);

program
  .command('import-claude-conversations')
  .description('Import conversations from Claude')
  .option('-p, --path <path>', 'Path to conversations')
  .action(importClaudeConversationsCommand);

program
  .command('import-claude-projects')
  .description('Import projects from Claude')
  .option('-p, --path <path>', 'Path to projects')
  .action(importClaudeProjectsCommand);

program
  .command('import-chatgpt')
  .description('Import conversations from ChatGPT')
  .option('-p, --path <path>', 'Path to conversations')
  .action(importChatGPTCommand);

program
  .command('tool')
  .description('Advanced tool operations')
  .option('--list', 'List available tools')
  .option('--run <tool>', 'Run specific tool')
  .action(toolCommand);

program
  .command('project')
  .description('Project management commands')
  .option('--create', 'Create new project')
  .option('--list', 'List projects')
  .action(projectCommand);

program
  .command('project-info')
  .description('Show detailed project information')
  .argument('[projectName]', 'Specific project name')
  .action(projectInfoCommand);

// Interactive mode
program
  .command('interactive')
  .description('Start interactive knowledge management session')
  .action(() => {
    logger.info('Starting interactive mode...');
    // Implement interactive REPL
    const repl = require('repl');
    const replServer = repl.start({
      prompt: 'basic-memory> ',
      eval: async (cmd, context, filename, callback) => {
        try {
          const result = await interpretCommand(cmd.trim());
          callback(null, result);
        } catch (error) {
          callback(error);
        }
      }
    });

    replServer.context.help = () => {
      console.log('Available commands: sync, status, import, mcp, project, tool');
    };
  });

// Enhanced error handling
program.configureHelp({
  showGlobalOptions: true
});

program.on('command:*', (operands) => {
  logger.error(`Unknown command: ${operands[0]}`);
  process.exit(1);
});

// Parse arguments with enhanced error handling
try {
  program.parse(process.argv);
} catch (error) {
  logger.error('CLI execution failed', { error: error.message });
  process.exit(1);
}

// Placeholder for command interpretation in interactive mode
async function interpretCommand(cmd) {
  // Implement basic command parsing and routing
  switch(cmd.split(' ')[0]) {
    case 'sync':
      return await syncCommand();
    case 'status':
      return await statusCommand();
    // Add more command mappings
    default:
      throw new Error(`Unsupported command: ${cmd}`);
  }
}
