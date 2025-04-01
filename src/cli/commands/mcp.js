/**
 * MCP command for Basic Memory
 * 
 * Provides functionality to start the Model Context Protocol server
 * for AI assistants to interact with Basic Memory
 */

import { program, logger } from '../app.js';
import { start } from '../../mcp.js';
import { initializeDatabase } from '../../db/index.js';
import chalk from 'chalk';

// Define the mcp command
program
  .command('mcp')
  .description('Start the MCP server for AI assistants to interact with Basic Memory')
  .option('-p, --port <number>', 'Port to run the server on', '8765')
  .option('-h, --host <string>', 'Host to bind the server to', 'localhost')
  .action(async (options) => {
    const { port, host } = options;
    process.env.BASIC_MEMORY_PORT = port;
    process.env.BASIC_MEMORY_HOST = host;
    
    logger.info(chalk.blue('Starting Basic Memory MCP server...'));
    logger.info(`Server will be available at http://${host}:${port}`);
    
    try {
      await start();
      logger.info(chalk.green('✓ MCP server started successfully'));
      logger.info('Press Ctrl+C to stop the server');
      
      // Keep process running
      await new Promise(() => {});
    } catch (error) {
      logger.error(chalk.red(`Failed to start MCP server: ${error.message}`));
      logger.debug(error.stack);
      process.exit(1);
    }
  });

export default program.commands.find(cmd => cmd.name() === 'mcp');
