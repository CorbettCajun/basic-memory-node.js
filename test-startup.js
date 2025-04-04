import { program } from './src/cli/app.js';
import { start } from './src/mcp.js';
import { initializeDatabase } from './src/db/index.js';

async function testStartup() {
  const startTime = Date.now();
  const TIMEOUT_MS = 30000; // 30 seconds timeout

  try {
    console.log('Starting database initialization...');
    const dbResult = await initializeDatabase();
    console.log('Database initialization result:', dbResult);

    console.log('Attempting to start MCP server...');
    const serverStartPromise = start();

    // Add a timeout to the server start
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('MCP Server startup timed out after 30 seconds'));
      }, TIMEOUT_MS);
    });

    await Promise.race([serverStartPromise, timeoutPromise]);
    
    console.log('MCP server started successfully');
    console.log(`Total startup time: ${(Date.now() - startTime) / 1000} seconds`);
    process.exit(0);
  } catch (error) {
    console.error('FULL STARTUP ERROR:', error);
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error(`Total runtime before error: ${(Date.now() - startTime) / 1000} seconds`);
    process.exit(1);
  }
}

// Ensure the process exits even if something goes wrong
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

testStartup();
