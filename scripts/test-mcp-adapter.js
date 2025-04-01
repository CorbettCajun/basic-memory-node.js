/**
 * Test MCP Adapter
 * 
 * This script tests the MCP adapter helper to ensure it correctly
 * interfaces with MCP tools using the proper prefixes.
 */

import {
  listDocumentation,
  searchDocumentation,
  webSearch,
  fetchContent
} from './mcp-adapter.js';

// Simple delay utility
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Test each MCP function with proper error handling
async function runTests() {
  console.log('Testing MCP Adapter...');
  const results = {
    successful: [],
    failed: []
  };

  // Test listDocumentation
  try {
    console.log('\nTesting listDocumentation...');
    const docs = await listDocumentation();
    console.log(`✅ listDocumentation successful, found ${docs.length || 0} documents`);
    results.successful.push('listDocumentation');
  } catch (error) {
    console.error(`❌ listDocumentation failed: ${error.message}`);
    results.failed.push('listDocumentation');
  }
  
  // Brief delay between tests
  await delay(500);

  // Test searchDocumentation
  try {
    console.log('\nTesting searchDocumentation...');
    const query = 'database';
    const docs = await searchDocumentation(query);
    console.log(`✅ searchDocumentation successful for "${query}", found ${docs.length || 0} results`);
    results.successful.push('searchDocumentation');
  } catch (error) {
    console.error(`❌ searchDocumentation failed: ${error.message}`);
    results.failed.push('searchDocumentation');
  }
  
  await delay(500);

  // Test webSearch
  try {
    console.log('\nTesting webSearch...');
    const query = 'cross-language database compatibility';
    const searchResults = await webSearch(query, 3);
    console.log(`✅ webSearch successful for "${query}", found ${searchResults.length || 0} results`);
    results.successful.push('webSearch');
  } catch (error) {
    console.error(`❌ webSearch failed: ${error.message}`);
    results.failed.push('webSearch');
  }
  
  await delay(500);

  // Test fetchContent
  try {
    console.log('\nTesting fetchContent...');
    const url = 'https://modelcontextprotocol.github.io/';
    const content = await fetchContent(url, 1000);
    console.log(`✅ fetchContent successful for "${url}", retrieved ${content.length} characters`);
    results.successful.push('fetchContent');
  } catch (error) {
    console.error(`❌ fetchContent failed: ${error.message}`);
    results.failed.push('fetchContent');
  }

  // Print summary
  console.log('\n=== MCP Adapter Test Summary ===');
  console.log(`Successful tests: ${results.successful.length}`);
  console.log(`Failed tests: ${results.failed.length}`);
  
  if (results.successful.length > 0) {
    console.log('\nSuccessful:');
    results.successful.forEach(test => console.log(`  ✅ ${test}`));
  }
  
  if (results.failed.length > 0) {
    console.log('\nFailed:');
    results.failed.forEach(test => console.log(`  ❌ ${test}`));
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test runner failed:', error);
});
