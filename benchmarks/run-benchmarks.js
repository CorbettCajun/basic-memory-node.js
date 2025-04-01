#!/usr/bin/env node

/**
 * Basic Memory Benchmark Runner
 * 
 * This script automates the process of running benchmarks for both Node.js and Python
 * implementations and generating comparison reports.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RESULTS_DIR = path.join(__dirname, 'results');

// Promisify exec
const execAsync = promisify(exec);

// Available benchmark suites
const BENCHMARK_SUITES = ['entity', 'observation', 'search'];

/**
 * Run a Node.js benchmark suite
 * 
 * @param {string} suite - Name of the benchmark suite
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Results from the benchmark
 */
async function runNodejsBenchmark(suite, options = {}) {
  console.log(`\n📊 Running Node.js benchmark suite: ${suite}`);
  
  try {
    const cmdOptions = [];
    if (options.iterations) cmdOptions.push(`--iterations ${options.iterations}`);
    if (options.verbose) cmdOptions.push('--verbose');
    
    const command = `node ${path.join(__dirname, 'runner.js')} run ${suite} --save ${suite}_nodejs.json ${cmdOptions.join(' ')}`;
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error('Error during Node.js benchmark:', stderr);
    }
    
    console.log(stdout);
    
    // Load and return the results
    const resultsPath = path.join(RESULTS_DIR, `${suite}_nodejs.json`);
    if (fs.existsSync(resultsPath)) {
      return JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    }
    
    return null;
  } catch (error) {
    console.error(`Error running Node.js benchmark for ${suite}:`, error);
    return null;
  }
}

/**
 * Run a Python benchmark suite
 * 
 * @param {string} suite - Name of the benchmark suite
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Results from the benchmark
 */
async function runPythonBenchmark(suite, options = {}) {
  console.log(`\n📊 Running Python benchmark suite: ${suite}`);
  
  try {
    const cmdOptions = [];
    if (options.iterations) cmdOptions.push(`--iterations ${options.iterations}`);
    if (options.verbose) cmdOptions.push('--verbose');
    
    // Note: Adjust the python command based on your environment (python3, python, etc.)
    const command = `python ${path.join(__dirname, 'python', 'benchmark_runner.py')} ${suite} --save ${suite}_python.json ${cmdOptions.join(' ')}`;
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error('Error during Python benchmark:', stderr);
    }
    
    console.log(stdout);
    
    // Load and return the results
    const resultsPath = path.join(RESULTS_DIR, `${suite}_python.json`);
    if (fs.existsSync(resultsPath)) {
      return JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    }
    
    return null;
  } catch (error) {
    console.error(`Error running Python benchmark for ${suite}:`, error);
    return null;
  }
}

/**
 * Compare benchmark results and generate a report
 * 
 * @param {string} suite - Name of the benchmark suite
 * @param {Object} nodejsResults - Node.js benchmark results
 * @param {Object} pythonResults - Python benchmark results
 * @returns {Object} - Comparison report
 */
function generateComparisonReport(suite, nodejsResults, pythonResults) {
  if (!nodejsResults || !pythonResults) {
    console.error('Cannot generate comparison report: Missing benchmark results');
    return null;
  }
  
  console.log(`\n📊 Generating comparison report for ${suite}`);
  
  // Map benchmarks by name for easier comparison
  const pythonBenchmarks = {};
  pythonResults.benchmarks.forEach(bench => {
    pythonBenchmarks[bench.name] = bench;
  });
  
  const comparisons = [];
  const summary = {
    fasterCount: 0,
    slowerCount: 0,
    parityCount: 0,
    totalBenchmarks: nodejsResults.benchmarks.length,
    averagePerformanceDiff: 0
  };
  
  // Analyze each benchmark
  for (const nodejsBench of nodejsResults.benchmarks) {
    const pythonBench = pythonBenchmarks[nodejsBench.name];
    
    if (!pythonBench) {
      console.log(`⚠️ Benchmark "${nodejsBench.name}" not found in Python results`);
      continue;
    }
    
    // Calculate performance difference (positive = Node.js is slower)
    const meanDiff = ((nodejsBench.mean / pythonBench.mean) - 1) * 100;
    const medianDiff = ((nodejsBench.median / pythonBench.median) - 1) * 100;
    
    // Display metrics
    console.log(`\n🔍 ${nodejsBench.name}:`);
    console.log(`   Mean time:`);
    console.log(`     Node.js: ${nodejsBench.mean.toFixed(2)}ms`);
    console.log(`     Python:  ${pythonBench.mean.toFixed(2)}ms`);
    console.log(`     Difference: ${meanDiff > 0 ? '+' : ''}${meanDiff.toFixed(2)}% (Node.js ${meanDiff > 0 ? 'slower' : 'faster'})`);
    
    // Determine performance category
    let performanceCategory;
    if (Math.abs(meanDiff) < 10) {
      performanceCategory = 'parity';
      summary.parityCount++;
      console.log(`   ✅ Performance parity achieved (within 10%)`);
    } else if (meanDiff < 0) {
      performanceCategory = 'faster';
      summary.fasterCount++;
      console.log(`   ✅ Node.js implementation is ${Math.abs(meanDiff).toFixed(2)}% faster`);
    } else {
      performanceCategory = 'slower';
      summary.slowerCount++;
      console.log(`   ⚠️ Node.js implementation is ${meanDiff.toFixed(2)}% slower`);
    }
    
    // Add to comparisons
    comparisons.push({
      name: nodejsBench.name,
      nodejs: {
        mean: nodejsBench.mean,
        median: nodejsBench.median,
        min: nodejsBench.min,
        max: nodejsBench.max
      },
      python: {
        mean: pythonBench.mean,
        median: pythonBench.median,
        min: pythonBench.min,
        max: pythonBench.max
      },
      difference: {
        mean: meanDiff,
        median: medianDiff
      },
      performanceCategory
    });
    
    // Add to average calculation
    summary.averagePerformanceDiff += meanDiff;
  }
  
  // Calculate overall average performance difference
  summary.averagePerformanceDiff /= comparisons.length;
  
  // Print summary
  console.log('\n📋 Summary:');
  console.log(`   Total benchmarks: ${summary.totalBenchmarks}`);
  console.log(`   Node.js faster: ${summary.fasterCount}`);
  console.log(`   Node.js slower: ${summary.slowerCount}`);
  console.log(`   Performance parity (within 10%): ${summary.parityCount}`);
  console.log(`   Average performance difference: ${summary.averagePerformanceDiff > 0 ? '+' : ''}${summary.averagePerformanceDiff.toFixed(2)}%`);
  
  // Calculate performance parity percentage
  const parityPercentage = ((summary.fasterCount + summary.parityCount) / summary.totalBenchmarks) * 100;
  console.log(`   Overall performance parity: ${parityPercentage.toFixed(2)}%`);
  
  // Create full report
  const report = {
    suite,
    summary,
    comparisons,
    nodejsResults,
    pythonResults,
    timestamp: new Date().toISOString()
  };
  
  // Save report
  const reportPath = path.join(RESULTS_DIR, `${suite}_comparison.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📝 Comparison report saved to ${reportPath}`);
  
  return report;
}

/**
 * Generate an overall performance dashboard from all benchmark results
 * 
 * @param {Array<Object>} reports - Array of comparison reports
 */
function generatePerformanceDashboard(reports) {
  if (!reports || reports.length === 0) {
    console.error('Cannot generate performance dashboard: No comparison reports available');
    return;
  }
  
  console.log('\n📊 Generating Performance Dashboard');
  console.log('==================================');
  
  // Aggregate statistics
  const totalBenchmarks = reports.reduce((sum, report) => sum + report.summary.totalBenchmarks, 0);
  const fasterCount = reports.reduce((sum, report) => sum + report.summary.fasterCount, 0);
  const parityCount = reports.reduce((sum, report) => sum + report.summary.parityCount, 0);
  const slowerCount = reports.reduce((sum, report) => sum + report.summary.slowerCount, 0);
  
  // Calculate overall performance parity
  const overallParityPercentage = ((fasterCount + parityCount) / totalBenchmarks) * 100;
  
  // Calculate weighted average performance difference
  const weightedDiffSum = reports.reduce((sum, report) => {
    return sum + (report.summary.averagePerformanceDiff * report.summary.totalBenchmarks);
  }, 0);
  const averagePerformanceDiff = weightedDiffSum / totalBenchmarks;
  
  // Create dashboard data
  const dashboard = {
    title: 'Basic Memory Performance Dashboard',
    timestamp: new Date().toISOString(),
    summary: {
      totalBenchmarks,
      fasterCount,
      parityCount,
      slowerCount,
      overallParityPercentage,
      averagePerformanceDiff
    },
    suites: reports.map(report => ({
      name: report.suite,
      totalBenchmarks: report.summary.totalBenchmarks,
      fasterCount: report.summary.fasterCount,
      parityCount: report.summary.parityCount,
      slowerCount: report.summary.slowerCount,
      parityPercentage: ((report.summary.fasterCount + report.summary.parityCount) / report.summary.totalBenchmarks) * 100,
      averagePerformanceDiff: report.summary.averagePerformanceDiff
    })),
    performanceStatus: overallParityPercentage >= 90 ? 'Great' : overallParityPercentage >= 75 ? 'Good' : 'Needs Improvement'
  };
  
  // Display dashboard
  console.log(`\n📈 Performance Dashboard (${new Date().toISOString()})`);
  console.log(`Total Benchmarks: ${totalBenchmarks}`);
  console.log(`Node.js Faster: ${fasterCount} (${((fasterCount / totalBenchmarks) * 100).toFixed(2)}%)`);
  console.log(`Performance Parity: ${parityCount} (${((parityCount / totalBenchmarks) * 100).toFixed(2)}%)`);
  console.log(`Node.js Slower: ${slowerCount} (${((slowerCount / totalBenchmarks) * 100).toFixed(2)}%)`);
  console.log(`Average Performance Difference: ${averagePerformanceDiff > 0 ? '+' : ''}${averagePerformanceDiff.toFixed(2)}%`);
  console.log(`Overall Performance Parity: ${overallParityPercentage.toFixed(2)}%`);
  console.log(`Status: ${dashboard.performanceStatus}`);
  
  // Suite breakdown
  console.log('\nSuite Breakdown:');
  dashboard.suites.forEach(suite => {
    console.log(`  ${suite.name}:`);
    console.log(`    Parity: ${suite.parityPercentage.toFixed(2)}%`);
    console.log(`    Avg Diff: ${suite.averagePerformanceDiff > 0 ? '+' : ''}${suite.averagePerformanceDiff.toFixed(2)}%`);
  });
  
  // Save dashboard
  const dashboardPath = path.join(RESULTS_DIR, 'performance_dashboard.json');
  fs.writeFileSync(dashboardPath, JSON.stringify(dashboard, null, 2));
  console.log(`\n📝 Performance dashboard saved to ${dashboardPath}`);
  
  // Generate HTML report
  const htmlReport = generateHtmlReport(dashboard, reports);
  const htmlPath = path.join(RESULTS_DIR, 'performance_dashboard.html');
  fs.writeFileSync(htmlPath, htmlReport);
  console.log(`📊 HTML performance dashboard saved to ${htmlPath}`);
}

/**
 * Generate an HTML report from the dashboard data
 * 
 * @param {Object} dashboard - Dashboard data
 * @param {Array<Object>} reports - Comparison reports
 * @returns {string} - HTML report
 */
function generateHtmlReport(dashboard, reports) {
  // Generate benchmark details
  const benchmarkDetails = reports.map(report => {
    const benchmarkRows = report.comparisons.map(comparison => {
      const performanceClass = comparison.performanceCategory === 'faster' 
        ? 'faster' 
        : comparison.performanceCategory === 'parity' 
          ? 'parity' 
          : 'slower';
          
      return `
        <tr>
          <td>${comparison.name}</td>
          <td>${comparison.nodejs.mean.toFixed(2)}ms</td>
          <td>${comparison.python.mean.toFixed(2)}ms</td>
          <td class="${performanceClass}">
            ${comparison.difference.mean > 0 ? '+' : ''}${comparison.difference.mean.toFixed(2)}%
          </td>
          <td>${comparison.performanceCategory}</td>
        </tr>
      `;
    }).join('');
    
    return `
      <div class="suite-section">
        <h3>${report.suite} Benchmarks</h3>
        <table class="benchmark-table">
          <thead>
            <tr>
              <th>Benchmark</th>
              <th>Node.js (ms)</th>
              <th>Python (ms)</th>
              <th>Difference</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${benchmarkRows}
          </tbody>
        </table>
      </div>
    `;
  }).join('');
  
  // Generate suite overview
  const suiteRows = dashboard.suites.map(suite => {
    const parityClass = suite.parityPercentage >= 90 
      ? 'faster' 
      : suite.parityPercentage >= 75 
        ? 'parity' 
        : 'slower';
        
    return `
      <tr>
        <td>${suite.name}</td>
        <td>${suite.totalBenchmarks}</td>
        <td>${suite.fasterCount}</td>
        <td>${suite.parityCount}</td>
        <td>${suite.slowerCount}</td>
        <td class="${parityClass}">${suite.parityPercentage.toFixed(2)}%</td>
        <td class="${suite.averagePerformanceDiff <= 0 ? 'faster' : suite.averagePerformanceDiff <= 10 ? 'parity' : 'slower'}">
          ${suite.averagePerformanceDiff > 0 ? '+' : ''}${suite.averagePerformanceDiff.toFixed(2)}%
        </td>
      </tr>
    `;
  }).join('');
  
  // Generate HTML
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Basic Memory Performance Dashboard</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    .dashboard-header {
      margin-bottom: 30px;
      border-bottom: 1px solid #eee;
      padding-bottom: 20px;
    }
    .summary-card {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    .summary-stat {
      background-color: white;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .summary-stat h3 {
      margin: 0;
      font-size: 14px;
      color: #6c757d;
    }
    .summary-stat p {
      margin: 10px 0 0;
      font-size: 24px;
      font-weight: bold;
      color: #343a40;
    }
    .status-indicator {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 20px;
      font-weight: bold;
      margin-top: 10px;
    }
    .status-great {
      background-color: #d4edda;
      color: #155724;
    }
    .status-good {
      background-color: #fff3cd;
      color: #856404;
    }
    .status-needs-improvement {
      background-color: #f8d7da;
      color: #721c24;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      box-shadow: 0 2px 3px rgba(0,0,0,0.1);
    }
    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #e9ecef;
    }
    th {
      background-color: #f8f9fa;
      font-weight: 600;
    }
    tbody tr:hover {
      background-color: #f1f3f5;
    }
    .faster {
      color: #28a745;
      font-weight: bold;
    }
    .parity {
      color: #6c757d;
    }
    .slower {
      color: #dc3545;
      font-weight: bold;
    }
    .suite-section {
      margin-bottom: 40px;
    }
    .timestamp {
      color: #6c757d;
      font-size: 14px;
      margin-top: 10px;
    }
    .chart-container {
      height: 300px;
      margin-bottom: 30px;
    }
  </style>
</head>
<body>
  <div class="dashboard-header">
    <h1>Basic Memory Performance Dashboard</h1>
    <p class="timestamp">Generated on ${new Date(dashboard.timestamp).toLocaleString()}</p>
  </div>
  
  <div class="summary-card">
    <h2>Performance Summary</h2>
    <div class="summary-grid">
      <div class="summary-stat">
        <h3>Total Benchmarks</h3>
        <p>${dashboard.summary.totalBenchmarks}</p>
      </div>
      <div class="summary-stat">
        <h3>Node.js Faster</h3>
        <p>${dashboard.summary.fasterCount} (${((dashboard.summary.fasterCount / dashboard.summary.totalBenchmarks) * 100).toFixed(2)}%)</p>
      </div>
      <div class="summary-stat">
        <h3>Performance Parity</h3>
        <p>${dashboard.summary.parityCount} (${((dashboard.summary.parityCount / dashboard.summary.totalBenchmarks) * 100).toFixed(2)}%)</p>
      </div>
      <div class="summary-stat">
        <h3>Node.js Slower</h3>
        <p>${dashboard.summary.slowerCount} (${((dashboard.summary.slowerCount / dashboard.summary.totalBenchmarks) * 100).toFixed(2)}%)</p>
      </div>
      <div class="summary-stat">
        <h3>Average Difference</h3>
        <p class="${dashboard.summary.averagePerformanceDiff <= 0 ? 'faster' : dashboard.summary.averagePerformanceDiff <= 10 ? 'parity' : 'slower'}">
          ${dashboard.summary.averagePerformanceDiff > 0 ? '+' : ''}${dashboard.summary.averagePerformanceDiff.toFixed(2)}%
        </p>
      </div>
      <div class="summary-stat">
        <h3>Overall Parity</h3>
        <p>${dashboard.summary.overallParityPercentage.toFixed(2)}%</p>
        <div class="status-indicator status-${dashboard.performanceStatus.toLowerCase().replace(' ', '-')}">
          ${dashboard.performanceStatus}
        </div>
      </div>
    </div>
  </div>
  
  <h2>Suite Overview</h2>
  <table>
    <thead>
      <tr>
        <th>Suite</th>
        <th>Total</th>
        <th>Faster</th>
        <th>Parity</th>
        <th>Slower</th>
        <th>Parity %</th>
        <th>Avg. Diff</th>
      </tr>
    </thead>
    <tbody>
      ${suiteRows}
    </tbody>
  </table>
  
  <h2>Benchmark Details</h2>
  ${benchmarkDetails}
  
  <div class="dashboard-footer">
    <p>Generated by Basic Memory Performance Benchmarking Tool</p>
  </div>
</body>
</html>
  `;
}

/**
 * Main function to run benchmarks and generate comparisons
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    suites: [],
    iterations: null,
    verbose: false,
    skipNodejs: false,
    skipPython: false,
    compareOnly: false
  };
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      console.log('Basic Memory Benchmark Runner');
      console.log('Usage: node run-benchmarks.js [options] [suites...]');
      console.log('\nOptions:');
      console.log('  --help, -h         Show this help message');
      console.log('  --iterations N     Set number of iterations');
      console.log('  --verbose, -v      Show detailed output');
      console.log('  --skip-nodejs      Skip Node.js benchmarks');
      console.log('  --skip-python      Skip Python benchmarks');
      console.log('  --compare-only     Only compare existing results, skip running benchmarks');
      console.log('\nAvailable suites:');
      BENCHMARK_SUITES.forEach(suite => console.log(`  ${suite}`));
      return;
    } else if (arg === '--iterations') {
      options.iterations = parseInt(args[++i], 10);
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--skip-nodejs') {
      options.skipNodejs = true;
    } else if (arg === '--skip-python') {
      options.skipPython = true;
    } else if (arg === '--compare-only') {
      options.compareOnly = true;
    } else if (BENCHMARK_SUITES.includes(arg)) {
      options.suites.push(arg);
    } else {
      console.warn(`Unknown argument: ${arg}`);
    }
  }
  
  // Default to all suites if none specified
  if (options.suites.length === 0) {
    options.suites = [...BENCHMARK_SUITES];
  }
  
  console.log('Basic Memory Benchmark Runner');
  console.log('=============================');
  console.log(`Suites: ${options.suites.join(', ')}`);
  if (options.iterations) console.log(`Iterations: ${options.iterations}`);
  if (options.verbose) console.log('Verbose output enabled');
  if (options.skipNodejs) console.log('Skipping Node.js benchmarks');
  if (options.skipPython) console.log('Skipping Python benchmarks');
  if (options.compareOnly) console.log('Only comparing existing results');
  
  // Ensure results directory exists
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  
  const reports = [];
  
  // Run benchmarks and generate comparisons for each suite
  for (const suite of options.suites) {
    console.log(`\n====== Processing ${suite} benchmark suite ======`);
    
    let nodejsResults = null;
    let pythonResults = null;
    
    // Run Node.js benchmarks
    if (!options.skipNodejs && !options.compareOnly) {
      nodejsResults = await runNodejsBenchmark(suite, options);
    } else {
      // Try to load existing results
      const nodejsPath = path.join(RESULTS_DIR, `${suite}_nodejs.json`);
      if (fs.existsSync(nodejsPath)) {
        nodejsResults = JSON.parse(fs.readFileSync(nodejsPath, 'utf8'));
        console.log(`Loaded existing Node.js results for ${suite}`);
      } else if (!options.skipNodejs) {
        console.warn(`No existing Node.js results found for ${suite}`);
      }
    }
    
    // Run Python benchmarks
    if (!options.skipPython && !options.compareOnly) {
      pythonResults = await runPythonBenchmark(suite, options);
    } else {
      // Try to load existing results
      const pythonPath = path.join(RESULTS_DIR, `${suite}_python.json`);
      if (fs.existsSync(pythonPath)) {
        pythonResults = JSON.parse(fs.readFileSync(pythonPath, 'utf8'));
        console.log(`Loaded existing Python results for ${suite}`);
      } else if (!options.skipPython) {
        console.warn(`No existing Python results found for ${suite}`);
      }
    }
    
    // Generate comparison if both results are available
    if (nodejsResults && pythonResults) {
      const report = generateComparisonReport(suite, nodejsResults, pythonResults);
      reports.push(report);
    } else {
      console.warn(`Cannot generate comparison for ${suite}: Missing benchmark results`);
    }
  }
  
  // Generate overall performance dashboard
  if (reports.length > 0) {
    generatePerformanceDashboard(reports);
  }
}

// Run main function
main().catch(error => {
  console.error('Error running benchmarks:', error);
  process.exit(1);
});
