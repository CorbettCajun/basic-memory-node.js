/**
 * Benchmark Runner for Basic Memory
 * 
 * This module provides a framework for running performance benchmarks
 * to measure and compare the Node.js and Python implementations.
 */

import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OPERATIONS_DIR = path.join(__dirname, 'operations');
const RESULTS_DIR = path.join(__dirname, 'results');

/**
 * Run a single benchmark
 * 
 * @param {Function} fn - Function to benchmark
 * @param {Array} args - Arguments to pass to the function
 * @param {number} iterations - Number of iterations to run
 * @param {Object} options - Additional options
 * @returns {Object} - Benchmark results
 */
export async function runBenchmark(fn, args = [], iterations = 100, options = {}) {
  // Warm up
  if (options.warmup) {
    for (let i = 0; i < Math.min(10, iterations / 10); i++) {
      await fn(...args);
    }
  }
  
  // Run timed iterations
  const times = [];
  const memoryUsage = [];
  
  for (let i = 0; i < iterations; i++) {
    // Record memory before
    const memBefore = process.memoryUsage();
    
    // Time the operation
    const startTime = performance.now();
    const result = await fn(...args);
    const endTime = performance.now();
    
    // Record memory after
    const memAfter = process.memoryUsage();
    
    // Calculate metrics
    const duration = endTime - startTime;
    times.push(duration);
    
    // Calculate memory delta (in MB)
    const memDelta = {
      rss: (memAfter.rss - memBefore.rss) / (1024 * 1024),
      heapTotal: (memAfter.heapTotal - memBefore.heapTotal) / (1024 * 1024),
      heapUsed: (memAfter.heapUsed - memBefore.heapUsed) / (1024 * 1024)
    };
    memoryUsage.push(memDelta);
    
    // Optional progress logging
    if (options.progress && i % Math.ceil(iterations / 10) === 0) {
      console.log(`Iteration ${i}/${iterations} - ${duration.toFixed(2)}ms`);
    }
    
    // Optional callback for each iteration
    if (options.onIteration) {
      options.onIteration(i, duration, result);
    }
  }
  
  // Calculate statistics
  const sortedTimes = [...times].sort((a, b) => a - b);
  const totalTime = times.reduce((sum, time) => sum + time, 0);
  const results = {
    name: options.name || fn.name,
    iterations,
    total: totalTime,
    mean: totalTime / iterations,
    median: sortedTimes[Math.floor(iterations / 2)],
    min: sortedTimes[0],
    max: sortedTimes[iterations - 1],
    p95: sortedTimes[Math.floor(iterations * 0.95)],
    memory: {
      mean: {
        rss: memoryUsage.reduce((sum, mem) => sum + mem.rss, 0) / iterations,
        heapTotal: memoryUsage.reduce((sum, mem) => sum + mem.heapTotal, 0) / iterations,
        heapUsed: memoryUsage.reduce((sum, mem) => sum + mem.heapUsed, 0) / iterations
      },
      max: {
        rss: Math.max(...memoryUsage.map(mem => mem.rss)),
        heapTotal: Math.max(...memoryUsage.map(mem => mem.heapTotal)),
        heapUsed: Math.max(...memoryUsage.map(mem => mem.heapUsed))
      }
    },
    timestamp: new Date().toISOString()
  };
  
  // Save results if filename provided
  if (options.saveFile) {
    const resultPath = path.join(RESULTS_DIR, options.saveFile);
    fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
    console.log(`Results saved to ${resultPath}`);
  }
  
  return results;
}

/**
 * Run a benchmark suite (collection of benchmarks)
 * 
 * @param {Object} suite - Benchmark suite definition
 * @param {Object} options - Suite options
 * @returns {Object} - Suite results
 */
export async function runSuite(suite, options = {}) {
  console.log(`\n🚀 Running benchmark suite: ${suite.name}`);
  console.log('---------------------------------------');
  
  const suiteResults = {
    name: suite.name,
    description: suite.description,
    benchmarks: [],
    timestamp: new Date().toISOString(),
    implementation: 'nodejs'
  };
  
  for (const benchmark of suite.benchmarks) {
    console.log(`\n▶️ Running benchmark: ${benchmark.name}`);
    
    try {
      // Default options
      const benchOptions = {
        name: benchmark.name,
        warmup: options.warmup ?? true,
        progress: options.verbose ?? false,
        saveFile: options.saveIndividual 
          ? `${suite.name}_${benchmark.name.replace(/\s+/g, '_').toLowerCase()}.json` 
          : null
      };
      
      // Run the benchmark
      const result = await runBenchmark(
        benchmark.fn,
        benchmark.args || [],
        benchmark.iterations || 100,
        benchOptions
      );
      
      // Add to suite results
      suiteResults.benchmarks.push(result);
      
      // Display results
      console.log(`✅ ${benchmark.name}:`);
      console.log(`   Mean: ${result.mean.toFixed(2)}ms`);
      console.log(`   Median: ${result.median.toFixed(2)}ms`);
      console.log(`   Min/Max: ${result.min.toFixed(2)}ms / ${result.max.toFixed(2)}ms`);
      console.log(`   Memory usage (mean): ${result.memory.mean.heapUsed.toFixed(2)}MB`);
    } catch (error) {
      console.error(`❌ Error in benchmark ${benchmark.name}:`, error);
      suiteResults.benchmarks.push({
        name: benchmark.name,
        error: error.message,
        stack: error.stack
      });
    }
  }
  
  // Save suite results
  if (options.saveFile) {
    const resultPath = path.join(RESULTS_DIR, options.saveFile);
    fs.writeFileSync(resultPath, JSON.stringify(suiteResults, null, 2));
    console.log(`\n📊 Suite results saved to ${resultPath}`);
  }
  
  return suiteResults;
}

/**
 * Compare benchmark results between Node.js and Python implementations
 * 
 * @param {string} nodejsResultFile - Path to Node.js benchmark results
 * @param {string} pythonResultFile - Path to Python benchmark results
 * @param {Object} options - Comparison options
 */
export function compareResults(nodejsResultFile, pythonResultFile, options = {}) {
  // Load result files
  const nodejsResults = JSON.parse(fs.readFileSync(
    path.join(RESULTS_DIR, nodejsResultFile)
  ));
  
  const pythonResults = JSON.parse(fs.readFileSync(
    path.join(RESULTS_DIR, pythonResultFile)
  ));
  
  console.log('\n📊 Performance Comparison Results');
  console.log('===============================');
  console.log(`Node.js vs Python: ${nodejsResults.name}`);
  console.log('---------------------------------------');
  
  // Map benchmarks by name for easier comparison
  const pythonBenchmarks = {};
  pythonResults.benchmarks.forEach(bench => {
    pythonBenchmarks[bench.name] = bench;
  });
  
  // Compare each benchmark
  for (const nodejsBench of nodejsResults.benchmarks) {
    const pythonBench = pythonBenchmarks[nodejsBench.name];
    
    if (!pythonBench) {
      console.log(`⚠️ Benchmark "${nodejsBench.name}" not found in Python results`);
      continue;
    }
    
    console.log(`\n🔍 ${nodejsBench.name}:`);
    
    // Calculate performance difference
    const meanDiff = ((nodejsBench.mean / pythonBench.mean) - 1) * 100;
    const medianDiff = ((nodejsBench.median / pythonBench.median) - 1) * 100;
    
    // Display metrics
    console.log(`   Mean time:`);
    console.log(`     Node.js: ${nodejsBench.mean.toFixed(2)}ms`);
    console.log(`     Python:  ${pythonBench.mean.toFixed(2)}ms`);
    console.log(`     Difference: ${meanDiff > 0 ? '+' : ''}${meanDiff.toFixed(2)}% (Node.js ${meanDiff > 0 ? 'slower' : 'faster'})`);
    
    console.log(`   Median time:`);
    console.log(`     Node.js: ${nodejsBench.median.toFixed(2)}ms`);
    console.log(`     Python:  ${pythonBench.median.toFixed(2)}ms`);
    console.log(`     Difference: ${medianDiff > 0 ? '+' : ''}${medianDiff.toFixed(2)}% (Node.js ${medianDiff > 0 ? 'slower' : 'faster'})`);
    
    // Display performance rating
    if (Math.abs(meanDiff) < 10) {
      console.log(`   ✅ Performance parity achieved (within 10%)`);
    } else if (meanDiff < 0) {
      console.log(`   ✅ Node.js implementation is ${Math.abs(meanDiff).toFixed(2)}% faster`);
    } else {
      console.log(`   ⚠️ Node.js implementation is ${meanDiff.toFixed(2)}% slower`);
    }
  }
  
  // Save comparison report if requested
  if (options.saveReport) {
    const comparisonReport = {
      nodejs: nodejsResults,
      python: pythonResults,
      comparisons: nodejsResults.benchmarks.map(nodejsBench => {
        const pythonBench = pythonBenchmarks[nodejsBench.name];
        if (!pythonBench) return { name: nodejsBench.name, missing: true };
        
        const meanDiff = ((nodejsBench.mean / pythonBench.mean) - 1) * 100;
        const medianDiff = ((nodejsBench.median / pythonBench.median) - 1) * 100;
        
        return {
          name: nodejsBench.name,
          nodejs: {
            mean: nodejsBench.mean,
            median: nodejsBench.median
          },
          python: {
            mean: pythonBench.mean,
            median: pythonBench.median
          },
          difference: {
            mean: meanDiff,
            median: medianDiff
          },
          parity: Math.abs(meanDiff) < 10
        };
      }),
      timestamp: new Date().toISOString()
    };
    
    const reportPath = path.join(RESULTS_DIR, options.saveReport);
    fs.writeFileSync(reportPath, JSON.stringify(comparisonReport, null, 2));
    console.log(`\n📝 Comparison report saved to ${reportPath}`);
  }
}

/**
 * Run a benchmark CLI command
 */
export async function runBenchmarkCommand() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === 'help') {
    console.log('Basic Memory Benchmark Runner');
    console.log('Usage:');
    console.log('  node benchmarks/runner.js <command> [options]');
    console.log('\nCommands:');
    console.log('  list              List available benchmark suites');
    console.log('  run <suite>       Run a benchmark suite');
    console.log('  compare <file1> <file2> [--save <filename>]  Compare benchmark results');
    console.log('  python <suite>    Run a benchmark suite with the Python implementation');
    console.log('\nOptions:');
    console.log('  --save <file>     Save results to file');
    console.log('  --verbose         Show detailed output');
    return;
  }
  
  // List available benchmarks
  if (command === 'list') {
    const files = fs.readdirSync(OPERATIONS_DIR)
      .filter(file => file.endsWith('.js'));
    
    console.log('Available benchmark suites:');
    for (const file of files) {
      const suiteName = file.replace('.js', '');
      try {
        const { suite } = await import(path.join(OPERATIONS_DIR, file));
        console.log(`- ${suiteName}: ${suite.name} (${suite.benchmarks.length} benchmarks)`);
        if (suite.description) {
          console.log(`  ${suite.description}`);
        }
      } catch (error) {
        console.log(`- ${suiteName}: [Error loading suite]`);
      }
    }
    return;
  }
  
  // Run a benchmark suite
  if (command === 'run') {
    const suiteName = args[1];
    if (!suiteName) {
      console.error('Error: Missing suite name');
      return;
    }
    
    try {
      const modulePath = path.join(OPERATIONS_DIR, `${suiteName}.js`);
      const { suite } = await import(modulePath);
      
      const options = {
        verbose: args.includes('--verbose'),
        saveFile: args.includes('--save') 
          ? args[args.indexOf('--save') + 1] || `${suiteName}_nodejs.json`
          : `${suiteName}_nodejs.json`,
        saveIndividual: args.includes('--save-individual')
      };
      
      await runSuite(suite, options);
    } catch (error) {
      console.error(`Error running benchmark suite "${suiteName}":`, error);
    }
    return;
  }
  
  // Run Python benchmarks
  if (command === 'python') {
    const suiteName = args[1];
    if (!suiteName) {
      console.error('Error: Missing suite name');
      return;
    }
    
    try {
      // Check if Python script exists
      const pythonScript = path.join(__dirname, 'python', `${suiteName}.py`);
      if (!fs.existsSync(pythonScript)) {
        console.error(`Error: Python benchmark script not found: ${pythonScript}`);
        return;
      }
      
      console.log(`Running Python benchmark suite "${suiteName}"...`);
      const output = execSync(`python ${pythonScript}`, { encoding: 'utf-8' });
      console.log(output);
    } catch (error) {
      console.error(`Error running Python benchmark suite "${suiteName}":`, error);
    }
    return;
  }
  
  // Compare benchmark results
  if (command === 'compare') {
    const file1 = args[1];
    const file2 = args[2];
    
    if (!file1 || !file2) {
      console.error('Error: Missing result files to compare');
      return;
    }
    
    const options = {
      saveReport: args.includes('--save') 
        ? args[args.indexOf('--save') + 1] || 'comparison_report.json'
        : null
    };
    
    try {
      compareResults(file1, file2, options);
    } catch (error) {
      console.error('Error comparing benchmark results:', error);
    }
    return;
  }
  
  console.error(`Unknown command: ${command}`);
}

// Run as CLI if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBenchmarkCommand();
}
