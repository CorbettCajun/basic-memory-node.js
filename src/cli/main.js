#!/usr/bin/env node

/**
 * Main CLI entry point for Basic Memory
 * 
 * This file registers all commands and serves as the entry point
 * for the basic-memory CLI application.
 */

import { fileURLToPath } from 'url';
import { program, logger } from './app.js';

// Import all commands
import './commands/sync.js';
import './commands/mcp.js';
import './commands/entity.js';
import './commands/relation.js';
import './commands/observation.js';
import './commands/search.js';
import './commands/status.js';
import './commands/db.js';
import './commands/project.js';

/**
 * Main function to execute the CLI
 */
function main() {
  // Display help when no command is provided
  if (process.argv.length <= 2) {
    program.help();
  }

  // Parse the command line arguments and execute the appropriate command
  program.parse(process.argv);
}

// Execute if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { program, main };
