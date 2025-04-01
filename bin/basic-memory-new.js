#!/usr/bin/env node

/**
 * CLI Interface for Basic Memory
 * 
 * Provides command line access to Basic Memory functionality
 */

// Fix for MaxListenersExceededWarning
import process from 'process';
process.setMaxListeners(25);

// Import the CLI application
import { program, logger } from '../src/cli/app.js';

// Import all command modules to register them
import '../src/cli/commands/sync.js';
import '../src/cli/commands/mcp.js';
import '../src/cli/commands/entity.js';
import '../src/cli/commands/relation.js';
import '../src/cli/commands/observation.js';
import '../src/cli/commands/search.js';
import '../src/cli/commands/status.js';
import '../src/cli/commands/db.js';
import '../src/cli/commands/project.js';

// Display help when no command is provided
if (process.argv.length <= 2) {
  program.help();
}

// Parse the command line arguments and execute the appropriate command
program.parse(process.argv);
