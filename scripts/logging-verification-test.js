const { 
  logger, 
  dbLogger, 
  syncLogger, 
  mcpLogger, 
  migrationLogger 
} = require('../src/utils/enhanced-logger.js');

async function runLoggingTest() {
  console.log('Starting Comprehensive Logging Verification Test');

  // Test 1: Duplicate Message Prevention
  console.log('\n--- Test 1: Duplicate Message Prevention ---');
  logger.info('Duplicate prevention test');
  logger.info('Duplicate prevention test');  // Should not log twice
  
  // Test 2: Child Logger Functionality
  console.log('\n--- Test 2: Child Logger Functionality ---');
  dbLogger.info('Database operation started');
  syncLogger.info('Synchronization process initiated');
  mcpLogger.info('MCP communication established');
  migrationLogger.info('Checking database migrations');

  // Test 3: Multiple Log Levels
  console.log('\n--- Test 3: Multiple Log Levels ---');
  logger.debug('Debug level message');
  logger.info('Information level message');
  logger.warn('Warning level message');
  logger.error('Error level message');

  // Test 4: Complex Object Logging
  console.log('\n--- Test 4: Complex Object Logging ---');
  const complexObject = {
    name: 'Test Object',
    nested: {
      value1: 42,
      value2: 'nested string'
    },
    array: [1, 2, 3]
  };
  logger.info('Logging complex object', complexObject);

  // Test 5: Repeated Logs with Slight Variations
  console.log('\n--- Test 5: Repeated Logs with Variations ---');
  logger.info('Repeated log test', { attempt: 1 });
  logger.info('Repeated log test', { attempt: 1 });  // Should not duplicate
  logger.info('Repeated log test', { attempt: 2 });  // Should log (different object)

  console.log('\nLogging Verification Test Complete');
}

// Set log level to debug for comprehensive testing
process.env.BASIC_MEMORY_LOG_LEVEL = 'debug';

// Run the test
runLoggingTest().catch(error => {
  console.error('Test failed:', error);
});
