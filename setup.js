#!/usr/bin/env node

/**
 * Basic Memory Setup Script
 * 
 * Helps with initial setup and verification of the Node.js implementation
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { homedir } from 'os';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for prettier output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Print colored message
function print(message, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`);
}

// Print header
function printHeader(message) {
  console.log('\n');
  print('═══════════════════════════════════════════════', colors.cyan);
  print(` ${message}`, colors.cyan + colors.bright);
  print('═══════════════════════════════════════════════', colors.cyan);
}

// Print step
function printStep(message) {
  print(`\n${colors.blue}${colors.bright}▶ ${message}${colors.reset}`);
}

// Print success
function printSuccess(message) {
  print(`${colors.green}✓ ${message}${colors.reset}`);
}

// Print error
function printError(message) {
  print(`${colors.red}✗ ${message}${colors.reset}`);
}

// Run command with error handling
function runCommand(command, options = {}) {
  try {
    print(`  Running: ${command}`, colors.dim);
    execSync(command, { 
      stdio: 'inherit',
      cwd: options.cwd || __dirname,
      ...options
    });
    return true;
  } catch (error) {
    printError(`Command failed: ${command}`);
    return false;
  }
}

// Main function
async function main() {
  printHeader('Basic Memory Node.js Setup');
  
  // Check Node.js version
  printStep('Checking Node.js version');
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    printSuccess(`Node.js ${nodeVersion} detected`);
    
    // Verify Node.js version meets requirements
    const versionMatch = nodeVersion.match(/v(\d+)\./);
    if (versionMatch && parseInt(versionMatch[1]) < 18) {
      printError('Node.js version 18 or higher is required');
      process.exit(1);
    }
  } catch (error) {
    printError('Node.js not found. Please install Node.js 18 or higher');
    process.exit(1);
  }
  
  // Install dependencies
  printStep('Installing dependencies');
  if (!runCommand('npm install')) {
    printError('Failed to install dependencies');
    process.exit(1);
  }
  printSuccess('Dependencies installed successfully');
  
  // Check if environment configuration exists
  printStep('Checking environment configuration');
  if (!fs.existsSync(path.join(__dirname, '.env'))) {
    print('No .env file found, creating from example...', colors.yellow);
    try {
      fs.copyFileSync(
        path.join(__dirname, '.env.example'),
        path.join(__dirname, '.env')
      );
      
      // Replace home directory placeholder
      let envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
      envContent = envContent.replace('~/basic-memory', path.join(homedir(), 'basic-memory'));
      fs.writeFileSync(path.join(__dirname, '.env'), envContent);
      
      printSuccess('.env file created and configured');
    } catch (error) {
      printError(`Failed to create .env file: ${error.message}`);
    }
  } else {
    printSuccess('.env file already exists');
  }
  
  // Initialize Basic Memory
  printStep('Initializing Basic Memory');
  if (!runCommand('node bin/basic-memory.js init')) {
    printError('Failed to initialize Basic Memory');
    process.exit(1);
  }
  printSuccess('Basic Memory initialized successfully');
  
  // Display next steps
  printHeader('Setup Complete!');
  print('\nNext steps:', colors.bright);
  print('1. Start the MCP server:', colors.white);
  print('   npm run mcp', colors.yellow);
  print('\n2. Sync Markdown files with the database:', colors.white);
  print('   npm run sync', colors.yellow);
  print('\n3. Run continuous sync in watch mode:', colors.white);
  print('   npm run sync -- -w', colors.yellow);
  print('\n4. Connect Claude Desktop:', colors.white);
  print('   Open Claude Desktop → Preferences → MCP → Add Server', colors.white);
  print('   URL: http://localhost:8765', colors.yellow);
  print('   Name: Basic Memory', colors.yellow);
  print('\nDocumentation:', colors.bright);
  print('- See README.md for general information', colors.white);
  print('- See NODE.md for Node.js implementation details', colors.white);
  print('\n');
}

// Run the main function
main().catch(error => {
  printError(`Unexpected error: ${error.message}`);
  process.exit(1);
});
