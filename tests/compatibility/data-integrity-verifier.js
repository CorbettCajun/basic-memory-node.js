/**
 * Data Integrity Verification Tool
 * 
 * This module provides tools to verify data integrity between Python and Node.js
 * implementations by comparing database states before and after operations.
 */

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const assert = require('assert');
const crypto = require('crypto');

/**
 * Create a snapshot of the current database state
 * @param {string} dbPath - Path to the SQLite database
 * @returns {Promise<Object>} Database snapshot
 */
async function createDatabaseSnapshot(dbPath) {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  // Get list of all tables
  const tables = await db.all(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `);
  
  const snapshot = {
    tables: {},
    metadata: {
      timestamp: new Date().toISOString(),
      dbPath,
      tableCount: tables.length
    }
  };
  
  // For each table, get all rows
  for (const table of tables) {
    const tableName = table.name;
    const rows = await db.all(`SELECT * FROM ${tableName}`);
    snapshot.tables[tableName] = rows;
  }
  
  await db.close();
  
  return snapshot;
}

/**
 * Save a database snapshot to disk
 * @param {Object} snapshot - Database snapshot object
 * @param {string} outputPath - Directory to save the snapshot
 * @returns {string} Path to saved snapshot file
 */
function saveDatabaseSnapshot(snapshot, outputPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `db_snapshot_${timestamp}.json`;
  const fullPath = path.join(outputPath, filename);
  
  fs.writeFileSync(fullPath, JSON.stringify(snapshot, null, 2));
  console.log(`Database snapshot saved to ${fullPath}`);
  
  return fullPath;
}

/**
 * Calculate a checksum for a row to enable comparison
 * @param {Object} row - Database row
 * @returns {string} Checksum of the row
 */
function calculateRowChecksum(row) {
  // Sort keys to ensure consistent order
  const orderedRow = {};
  Object.keys(row).sort().forEach(key => {
    orderedRow[key] = row[key];
  });
  
  const rowString = JSON.stringify(orderedRow);
  return crypto.createHash('md5').update(rowString).digest('hex');
}

/**
 * Compare two database snapshots and identify differences
 * @param {Object} snapshot1 - First database snapshot
 * @param {Object} snapshot2 - Second database snapshot
 * @returns {Object} Comparison results
 */
function compareSnapshots(snapshot1, snapshot2) {
  const results = {
    identical: true,
    missingTables: [],
    additionalTables: [],
    tableComparisons: {},
    summary: {
      tablesExamined: 0,
      rowsExamined: 0,
      differenceCount: 0
    }
  };
  
  // Check for missing or additional tables
  const tables1 = Object.keys(snapshot1.tables);
  const tables2 = Object.keys(snapshot2.tables);
  
  results.summary.tablesExamined = tables1.length;
  
  for (const table of tables1) {
    if (!tables2.includes(table)) {
      results.missingTables.push(table);
      results.identical = false;
    }
  }
  
  for (const table of tables2) {
    if (!tables1.includes(table)) {
      results.additionalTables.push(table);
      results.identical = false;
    }
  }
  
  // Compare contents of tables that exist in both snapshots
  const commonTables = tables1.filter(table => tables2.includes(table));
  
  for (const table of commonTables) {
    const rows1 = snapshot1.tables[table];
    const rows2 = snapshot2.tables[table];
    
    results.summary.rowsExamined += rows1.length;
    
    const tableResult = {
      identical: rows1.length === rows2.length,
      rowCount1: rows1.length,
      rowCount2: rows2.length,
      missingRows: [],
      additionalRows: [],
      modifiedRows: []
    };
    
    // Create maps of row checksums for efficient comparison
    const checksums1 = new Map();
    const checksums2 = new Map();
    
    rows1.forEach((row, index) => {
      const checksum = calculateRowChecksum(row);
      checksums1.set(checksum, { index, row });
    });
    
    rows2.forEach((row, index) => {
      const checksum = calculateRowChecksum(row);
      checksums2.set(checksum, { index, row });
    });
    
    // Find missing rows (in snapshot1 but not in snapshot2)
    for (const [checksum, { index, row }] of checksums1.entries()) {
      if (!checksums2.has(checksum)) {
        tableResult.missingRows.push({ index, row });
        tableResult.identical = false;
        results.identical = false;
        results.summary.differenceCount++;
      }
    }
    
    // Find additional rows (in snapshot2 but not in snapshot1)
    for (const [checksum, { index, row }] of checksums2.entries()) {
      if (!checksums1.has(checksum)) {
        tableResult.additionalRows.push({ index, row });
        tableResult.identical = false;
        results.identical = false;
        results.summary.differenceCount++;
      }
    }
    
    results.tableComparisons[table] = tableResult;
  }
  
  return results;
}

/**
 * Generate a human-readable report from comparison results
 * @param {Object} comparisonResults - Results from compareSnapshots
 * @returns {string} Markdown formatted report
 */
function generateComparisonReport(comparisonResults) {
  let report = `# Database Integrity Verification Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  // Overall summary
  report += `## Summary\n\n`;
  report += `- **Data Integrity Status**: ${comparisonResults.identical ? '✅ IDENTICAL' : '❌ DIFFERENCES DETECTED'}\n`;
  report += `- **Tables Examined**: ${comparisonResults.summary.tablesExamined}\n`;
  report += `- **Rows Examined**: ${comparisonResults.summary.rowsExamined}\n`;
  report += `- **Difference Count**: ${comparisonResults.summary.differenceCount}\n\n`;
  
  // Table existence issues
  if (comparisonResults.missingTables.length > 0) {
    report += `## Missing Tables\n\n`;
    report += `The following tables are missing from the second snapshot:\n\n`;
    comparisonResults.missingTables.forEach(table => {
      report += `- \`${table}\`\n`;
    });
    report += `\n`;
  }
  
  if (comparisonResults.additionalTables.length > 0) {
    report += `## Additional Tables\n\n`;
    report += `The following tables are present in the second snapshot but not in the first:\n\n`;
    comparisonResults.additionalTables.forEach(table => {
      report += `- \`${table}\`\n`;
    });
    report += `\n`;
  }
  
  // Table content comparisons
  report += `## Table Content Comparison\n\n`;
  
  for (const [table, comparison] of Object.entries(comparisonResults.tableComparisons)) {
    report += `### Table: \`${table}\`\n\n`;
    report += `- **Status**: ${comparison.identical ? '✅ IDENTICAL' : '❌ DIFFERENCES DETECTED'}\n`;
    report += `- **Row Count (First Snapshot)**: ${comparison.rowCount1}\n`;
    report += `- **Row Count (Second Snapshot)**: ${comparison.rowCount2}\n\n`;
    
    if (comparison.missingRows.length > 0) {
      report += `#### Missing Rows (${comparison.missingRows.length})\n\n`;
      report += `The following rows are missing from the second snapshot:\n\n`;
      
      comparison.missingRows.slice(0, 5).forEach(({ index, row }) => {
        report += `Row at index ${index}:\n\`\`\`json\n${JSON.stringify(row, null, 2)}\n\`\`\`\n\n`;
      });
      
      if (comparison.missingRows.length > 5) {
        report += `... and ${comparison.missingRows.length - 5} more missing rows\n\n`;
      }
    }
    
    if (comparison.additionalRows.length > 0) {
      report += `#### Additional Rows (${comparison.additionalRows.length})\n\n`;
      report += `The following rows are present in the second snapshot but not in the first:\n\n`;
      
      comparison.additionalRows.slice(0, 5).forEach(({ index, row }) => {
        report += `Row at index ${index}:\n\`\`\`json\n${JSON.stringify(row, null, 2)}\n\`\`\`\n\n`;
      });
      
      if (comparison.additionalRows.length > 5) {
        report += `... and ${comparison.additionalRows.length - 5} more additional rows\n\n`;
      }
    }
  }
  
  report += `## Conclusion\n\n`;
  
  if (comparisonResults.identical) {
    report += `✅ **The database snapshots are identical. Data integrity is maintained.**\n`;
  } else {
    report += `❌ **Data integrity issues detected. The implementations are not fully compatible.**\n\n`;
    report += `Recommendations:\n`;
    report += `- Review schema differences\n`;
    report += `- Check serialization formats\n`;
    report += `- Verify naming conventions\n`;
    report += `- Ensure type conversions are consistent\n`;
  }
  
  return report;
}

/**
 * Save comparison report to disk
 * @param {string} report - Comparison report content
 * @param {string} outputPath - Directory to save the report
 * @returns {string} Path to saved report file
 */
function saveComparisonReport(report, outputPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `integrity_report_${timestamp}.md`;
  const fullPath = path.join(outputPath, filename);
  
  fs.writeFileSync(fullPath, report);
  console.log(`Integrity report saved to ${fullPath}`);
  
  return fullPath;
}

/**
 * Verify data integrity between two database snapshots
 * @param {string} snapshot1Path - Path to first snapshot file
 * @param {string} snapshot2Path - Path to second snapshot file
 * @param {string} outputPath - Directory to save the comparison report
 * @returns {Object} Verification results
 */
function verifyDataIntegrity(snapshot1Path, snapshot2Path, outputPath) {
  // Load snapshots
  const snapshot1 = JSON.parse(fs.readFileSync(snapshot1Path, 'utf8'));
  const snapshot2 = JSON.parse(fs.readFileSync(snapshot2Path, 'utf8'));
  
  // Compare snapshots
  const comparisonResults = compareSnapshots(snapshot1, snapshot2);
  
  // Generate and save report
  const report = generateComparisonReport(comparisonResults);
  const reportPath = saveComparisonReport(report, outputPath);
  
  return {
    identical: comparisonResults.identical,
    differenceCount: comparisonResults.summary.differenceCount,
    reportPath
  };
}

/**
 * Complete verification workflow for cross-implementation testing
 * @param {string} dbPath - Path to the database
 * @param {string} outputPath - Directory to save snapshots and reports
 * @param {Function} operation - Database operation to perform between snapshots
 * @returns {Promise<Object>} Verification results
 */
async function verifyOperation(dbPath, outputPath, operation) {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  
  // Create before snapshot
  const beforeSnapshot = await createDatabaseSnapshot(dbPath);
  const beforeSnapshotPath = saveDatabaseSnapshot(beforeSnapshot, outputPath);
  
  // Perform the operation
  await operation();
  
  // Create after snapshot
  const afterSnapshot = await createDatabaseSnapshot(dbPath);
  const afterSnapshotPath = saveDatabaseSnapshot(afterSnapshot, outputPath);
  
  // Compare and generate report
  return verifyDataIntegrity(beforeSnapshotPath, afterSnapshotPath, outputPath);
}

// Export functions for use in other modules
module.exports = {
  createDatabaseSnapshot,
  saveDatabaseSnapshot,
  compareSnapshots,
  generateComparisonReport,
  saveComparisonReport,
  verifyDataIntegrity,
  verifyOperation
};
