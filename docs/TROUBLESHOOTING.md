# Basic Memory Troubleshooting Guide

This guide provides solutions for common issues you might encounter when using the Basic Memory Node.js implementation.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Database Issues](#database-issues)
- [Synchronization Issues](#synchronization-issues)
- [Search Issues](#search-issues)
- [MCP Server Issues](#mcp-server-issues)
- [API Usage Issues](#api-usage-issues)
- [Performance Issues](#performance-issues)
- [Common Error Messages](#common-error-messages)

## Installation Issues

### Package Installation Fails

**Problem**: `npm install` fails with dependency errors.

**Solution**:

1. Ensure you're using a compatible Node.js version (v14 or higher recommended)
2. Clear npm cache and retry:

```bash
npm cache clean --force
npm install
```

3. If specific packages are failing, try installing them individually:

```bash
npm install <problematic-package>
```

4. Check for conflicting global packages:

```bash
npm list -g --depth=0
```

### Wrong Node.js Version

**Problem**: The application fails with syntax errors or unsupported feature errors.

**Solution**:

1. Check your Node.js version:

```bash
node --version
```

2. Install the recommended version (v14 or higher) using nvm:

```bash
nvm install 14
nvm use 14
```

## Database Issues

### Database Connection Errors

**Problem**: The application cannot connect to the SQLite database.

**Solution**:

1. Check if the database file exists:

```bash
ls -la ~/basic-memory/basic-memory.db
```

2. Ensure you have write permissions to the database directory:

```bash
chmod -R 755 ~/basic-memory
```

3. Try initializing a new database:

```bash
npm run init
```

### Database Migration Failures

**Problem**: Database migrations fail to apply.

**Solution**:

1. Check the migration logs for specific errors
2. Reset the database (caution: this will delete all data):

```bash
rm ~/basic-memory/basic-memory.db
npm run init
```

3. Make sure no other process is locking the database file

### Database Corruption

**Problem**: Database queries return errors about corruption or invalid format.

**Solution**:

1. Create a backup of your current database file:

```bash
cp ~/basic-memory/basic-memory.db ~/basic-memory/basic-memory.db.backup
```

2. Use the SQLite recovery tool:

```bash
sqlite3 ~/basic-memory/basic-memory.db ".recover" | sqlite3 ~/basic-memory/basic-memory.db.recovered
```

3. Replace the corrupted database with the recovered one:

```bash
mv ~/basic-memory/basic-memory.db.recovered ~/basic-memory/basic-memory.db
```

## Synchronization Issues

### Files Not Being Detected

**Problem**: New or modified Markdown files are not being detected by the sync process.

**Solution**:

1. Make sure you're running the sync command in the correct directory:

```bash
npm run sync -- --directory=/path/to/your/files
```

2. Check file permissions and ownership
3. Verify that files have the correct `.md` extension
4. Try running sync with verbose logging:

```bash
npm run sync -- --verbose
```

### Sync Process Crashes

**Problem**: The sync process crashes with an error.

**Solution**:

1. Check for malformed Markdown files or front matter
2. Look for files with unusual characters in filenames
3. Run sync on individual files to identify problematic ones:

```bash
node scripts/sync-file.js /path/to/specific/file.md
```

### File Watching Not Working

**Problem**: The watch mode doesn't detect file changes.

**Solution**:

1. Ensure your file system supports file watching events
2. Increase the polling interval:

```bash
npm run sync -- --watch --poll-interval=2000
```

3. Check system limits for file watchers (Linux):

```bash
cat /proc/sys/fs/inotify/max_user_watches
```

4. Increase the limit if necessary:

```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
```

## Search Issues

### Search Returns No Results

**Problem**: Searches return no results even though matching content exists.

**Solution**:

1. Rebuild the search index:

```bash
npm run rebuild-index
```

2. Check that the search terms are correctly spelled
3. Try broadening your search or using partial words
4. Verify that the content is properly synchronized in the database:

```bash
npm run list entities
```

### Search Performance Is Slow

**Problem**: Search operations take a long time to complete.

**Solution**:

1. Limit the scope of your search to specific fields:

```javascript
search.entities('query', { fields: ['title'] });
```

2. Add a limit to the number of results:

```javascript
search.entities('query', { limit: 10 });
```

3. Consider optimizing your database (vacuum):

```bash
npm run db-optimize
```

## MCP Server Issues

### Port Configuration and Connection Issues

#### Port Conflicts and Dynamic Assignment

**Problem**: You're experiencing port conflicts when running multiple instances of the application.

**Solution**: 
- By default, the MCP server now uses dynamic port assignment.
- Set `BASIC_MEMORY_PORT=0` in your `.env` file to automatically find an available port.
- The assigned port will be displayed in the console output.

#### Checking Port Usage

1. Check if a port is in use:

```bash
# For a specific port (e.g., 8765)
lsof -i :8765  # On Unix-like systems
netstat -ano | findstr :8765  # On Windows
```

2. Specifying a Port (Optional)

You can still specify a specific port if needed:

```bash
# Using environment variable
BASIC_MEMORY_PORT=8766 node bin/basic-memory.js mcp

# Or using CLI argument
node bin/basic-memory.js mcp --port=8766
```

3. Ensure Proper Permissions
- Verify you have the necessary permissions to bind to network ports
- Check firewall settings to ensure the port is open

#### Troubleshooting Connection Issues

1. Verify the correct host and port in your connection settings
2. Check network connectivity
3. Ensure the MCP server is running
4. Verify firewall and security settings

### Connection Refused Error

**Problem**: AI assistants cannot connect to the MCP server.

**Solution**:

1. Verify the MCP server is running:

```bash
ps aux | grep mcp
```

2. Check firewall settings to ensure the port is open
3. Make sure you're connecting to the correct host and port
4. Try connecting to localhost instead of 127.0.0.1 or vice versa

### AI Assistant Integration Not Working

**Problem**: AI assistants connect but can't access Basic Memory data.

**Solution**:

1. Check MCP server logs for authorization or permission issues
2. Verify that your knowledge base is properly set up:

```bash
npm run list entities
```

3. Test the MCP tools directly using the API:

```javascript
const context = await mcp.buildContext('test query', { maxEntities: 3 });
console.log(context);
```

## API Usage Issues

### Promise Rejection Errors

**Problem**: API calls result in unhandled promise rejections.

**Solution**:

1. Properly implement error handling in your code:

```javascript
try {
  const result = await entity.get('non-existent-id');
  console.log(result);
} catch (error) {
  console.error('Error getting entity:', error.message);
}
```

2. Check that you're using the correct API parameters
3. Make sure you're awaiting all promises

### Type Errors

**Problem**: Getting type errors when using the API.

**Solution**:

1. Check the API documentation to verify parameter types
2. Use the correct input formats (e.g., strings for IDs, objects for metadata)
3. Ensure you're using the latest version of the library:

```bash
npm update basic-memory
```

### Entity Creation Fails

**Problem**: Creating or updating entities fails.

**Solution**:

1. Check for required fields (title is mandatory)
2. Ensure metadata is a valid object
3. Verify that content is a string and not too large
4. Check for unique constraint violations (e.g., duplicate permalinks)

## Performance Issues

### High Memory Usage

**Problem**: The application uses excessive memory.

**Solution**:

1. Limit batch sizes when processing large sets of entities:

```javascript
const entities = await entity.list({ limit: 100 });
for (const batch of chunks(entities, 10)) {
  // Process batch
}
```

2. Implement pagination for large result sets
3. Increase Node.js memory limit:

```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run start
```

### Slow Operations with Large Datasets

**Problem**: Operations become extremely slow with large numbers of entities.

**Solution**:

1. Add appropriate indexes to your database:

```bash
npm run add-index --field=title
```

2. Use more specific queries to reduce result sets
3. Implement caching for frequently accessed data:

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 });

async function getCachedEntity(id) {
  const cacheKey = `entity:${id}`;
  let result = cache.get(cacheKey);
  
  if (!result) {
    result = await entity.get(id);
    cache.set(cacheKey, result);
  }
  
  return result;
}
```

## Common Error Messages

### "SQLITE_BUSY: database is locked"

**Problem**: SQLite database is locked by another process.

**Solution**:

1. Identify and close other processes using the database:

```bash
lsof ~/basic-memory/basic-memory.db
```

2. Configure longer timeout for database operations:

```javascript
// In config.js
module.exports = {
  database: {
    busyTimeout: 5000 // 5 seconds
  }
}
```

3. If the issue persists, restart your application

### "Cannot find module 'basic-memory'"

**Problem**: The module cannot be found.

**Solution**:

1. Check if the package is installed:

```bash
npm list basic-memory
```

2. Install the package if missing:

```bash
npm install basic-memory
```

3. Verify your import/require statements
4. Check for path issues in your package.json

### "Entity not found with ID: X"

**Problem**: Attempting to access an entity that doesn't exist.

**Solution**:

1. Verify the entity ID exists:

```bash
npm run entity get <id>
```

2. Check for typos in the ID
3. Implement proper error handling in your code:

```javascript
const entity = await entityApi.get(id);
if (!entity) {
  console.log(`Entity with ID ${id} not found`);
  // Handle the case appropriately
} else {
  // Process the entity
}
```

### "Error: ENOENT: no such file or directory"

**Problem**: Attempting to access a file that doesn't exist.

**Solution**:

1. Check if the file path is correct
2. Verify file permissions
3. Make sure the directory exists:

```bash
mkdir -p ~/basic-memory
```

4. Use absolute paths instead of relative paths where possible

## Getting More Help

If you're still experiencing issues after trying the solutions in this guide:

1. Check the [GitHub Issues](https://github.com/your-org/basic-memory/issues) for similar problems
2. Search the [Basic Memory documentation](https://github.com/your-org/basic-memory/docs)
3. Create a new issue with:
   - A clear description of the problem
   - Steps to reproduce
   - Expected vs. actual results
   - Basic Memory version and Node.js version
   - Error messages and logs

---

## Advanced Troubleshooting

### Debugging Tools

For more complex issues, you can use these debugging techniques:

#### Enable Debug Logging

```bash
DEBUG=basic-memory:* npm run start
```

#### Use Node.js Inspector

```bash
node --inspect scripts/your-script.js
```

Then open Chrome and navigate to `chrome://inspect` to use the debugger.

#### Profile Memory Usage

```bash
node --inspect scripts/your-script.js
```

Use Chrome DevTools Memory tab to take heap snapshots.

### Database Recovery

For advanced database recovery:

```bash
# Export schema
sqlite3 ~/basic-memory/basic-memory.db .schema > schema.sql

# Export data
sqlite3 ~/basic-memory/basic-memory.db .dump > dump.sql

# Create new database
sqlite3 ~/basic-memory/basic-memory.db.new < schema.sql

# Import data
sqlite3 ~/basic-memory/basic-memory.db.new < dump.sql
```

### Performance Optimization

For advanced performance tuning:

1. Enable WAL mode for SQLite:

```javascript
const db = new sqlite3.Database('path/to/db', (err) => {
  if (err) return console.error(err.message);
  db.exec('PRAGMA journal_mode = WAL;');
});
```

2. Use prepared statements for repeated operations:

```javascript
const stmt = db.prepare('SELECT * FROM Entity WHERE id = ?');
for (const id of ids) {
  const row = stmt.get(id);
  // Process row
}
stmt.finalize();
```

3. Implement batch processing for large operations:

```javascript
async function processBulkEntities(entities, batchSize = 100) {
  const batches = [];
  for (let i = 0; i < entities.length; i += batchSize) {
    batches.push(entities.slice(i, i + batchSize));
  }
  
  for (const batch of batches) {
    await Promise.all(batch.map(e => processEntity(e)));
  }
}
```
