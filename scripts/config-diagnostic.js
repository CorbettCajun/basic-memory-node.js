#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Diagnostic configuration schema
const DiagnosticConfigSchema = z.object({
  env: z.enum(['test', 'dev', 'user']).default('dev'),
  home: z.string()
    .default(() => path.join(os.homedir(), 'basic-memory'))
    .transform(val => path.resolve(val)),
  project: z.string()
    .default('default')
    .refine(val => val.length > 0 && val.length <= 50, {
      message: 'Project name must be 1-50 characters long'
    }),
  mcpConfigPaths: z.array(z.string()).default([
    path.join(process.cwd(), 'mcp_config.json'),
    path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json'),
    path.join(os.homedir(), '.roo', 'mcp.json')
  ])
});

async function runConfigDiagnostics() {
  console.log('=== Basic Memory Configuration Diagnostics ===');
  
  // Environment Variables Check
  console.log('\n1. Environment Variables:');
  Object.entries(process.env).forEach(([key, value]) => {
    if (key.startsWith('BASIC_MEMORY_') || key.startsWith('MCP_')) {
      console.log(`  ${key}: ${value ? 'SET' : 'UNSET'}`);
    }
  });

  // Configuration Paths Check
  console.log('\n2. Configuration Paths:');
  const configPaths = DiagnosticConfigSchema.parse({}).mcpConfigPaths;
  
  for (const configPath of configPaths) {
    try {
      await fs.access(configPath);
      const stats = await fs.stat(configPath);
      console.log(`  ${configPath}: 
    - Exists: ✓
    - Size: ${stats.size} bytes
    - Last Modified: ${stats.mtime}`);
      
      // Attempt to read and parse config
      try {
        const configContent = await fs.readFile(configPath, 'utf8');
        JSON.parse(configContent);
        console.log('    - Valid JSON: ✓');
      } catch (parseError) {
        console.log(`    - Invalid JSON: ${parseError.message}`);
      }
    } catch {
      console.log(`  ${configPath}: Not Found`);
    }
  }

  // Home Directory Check
  console.log('\n3. Home Directory:');
  const homeDir = DiagnosticConfigSchema.parse({}).home;
  try {
    await fs.access(homeDir);
    const stats = await fs.stat(homeDir);
    console.log(`  ${homeDir}:
    - Exists: ✓
    - Writable: ${await isDirectoryWritable(homeDir)}`);
  } catch {
    console.log(`  Creating home directory: ${homeDir}`);
    try {
      await fs.mkdir(homeDir, { recursive: true });
      console.log('  Directory created successfully');
    } catch (mkdirError) {
      console.error('  Failed to create directory:', mkdirError);
    }
  }
}

async function isDirectoryWritable(dirPath) {
  try {
    const testFile = path.join(dirPath, '.writability-test');
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
    return true;
  } catch {
    return false;
  }
}

// Run diagnostics
runConfigDiagnostics().catch(error => {
  console.error('Diagnostic failed:', error);
  process.exit(1);
});
