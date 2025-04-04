import { performance } from 'perf_hooks';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import fs from 'fs/promises';
import path from 'path';

/**
 * Performance optimization utility for Basic Memory
 */
export class PerformanceOptimizer {
    /**
     * Batch file processing with parallel workers
     * @param {string} inputDir - Directory containing files to process
     * @param {Function} processFn - Function to process each file
     * @param {Object} [options={}] - Processing options
     * @returns {Promise<Array>} Processed results
     */
    static async batchProcessFiles(inputDir, processFn, options = {}) {
        const {
            maxConcurrency = Math.max(require('os').cpus().length - 1, 1),
            fileFilter = () => true
        } = options;

        // Get list of files to process
        const files = await fs.readdir(inputDir);
        const filteredFiles = files.filter(fileFilter);

        // Use worker threads for parallel processing
        const results = [];
        const workers = [];

        for (let i = 0; i < filteredFiles.length; i += maxConcurrency) {
            const batchFiles = filteredFiles.slice(i, i + maxConcurrency);
            const batchPromises = batchFiles.map(async (file) => {
                const filePath = path.join(inputDir, file);
                return processFn(filePath);
            });

            results.push(...await Promise.all(batchPromises));
        }

        return results;
    }

    /**
     * Create a memoization cache with configurable options
     * @param {Function} fn - Function to memoize
     * @param {Object} [options={}] - Caching options
     * @returns {Function} Memoized function
     */
    static memoize(fn, options = {}) {
        const {
            maxSize = 1000,
            ttl = 5 * 60 * 1000 // 5 minutes default
        } = options;

        const cache = new Map();

        return function memoized(...args) {
            const key = JSON.stringify(args);

            // Check if result is in cache
            if (cache.has(key)) {
                const { value, timestamp } = cache.get(key);
                
                // Check cache expiration
                if (Date.now() - timestamp < ttl) {
                    return value;
                }
            }

            // Compute and cache result
            const result = fn.apply(this, args);
            
            // Manage cache size
            if (cache.size >= maxSize) {
                const oldestKey = cache.keys().next().value;
                cache.delete(oldestKey);
            }

            cache.set(key, { 
                value: result, 
                timestamp: Date.now() 
            });

            return result;
        };
    }

    /**
     * Measure and profile function execution
     * @param {Function} fn - Function to profile
     * @param {string} [label=''] - Optional label for the profiling
     * @returns {Function} Profiled function
     */
    static profile(fn, label = '') {
        return function profiled(...args) {
            const start = performance.now();
            const result = fn.apply(this, args);
            const end = performance.now();

            console.log(`[PROFILE] ${label}: ${end - start}ms`);
            return result;
        };
    }

    /**
     * Throttle function execution
     * @param {Function} fn - Function to throttle
     * @param {number} [delay=300] - Minimum delay between executions
     * @returns {Function} Throttled function
     */
    static throttle(fn, delay = 300) {
        let lastCall = 0;
        return function throttled(...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return fn.apply(this, args);
            }
        };
    }

    /**
     * Create a stream-based file processor for large files
     * @param {string} inputPath - Path to input file
     * @param {Function} processFn - Function to process file chunks
     * @returns {Promise<void>}
     */
    static async streamProcess(inputPath, processFn) {
        const fileStream = fs.createReadStream(inputPath, { 
            highWaterMark: 64 * 1024 // 64KB chunks
        });

        return new Promise((resolve, reject) => {
            fileStream.on('data', (chunk) => {
                processFn(chunk);
            });

            fileStream.on('end', resolve);
            fileStream.on('error', reject);
        });
    }
}

// If running as a worker thread
if (!isMainThread) {
    const { inputFile, processFn } = workerData;
    
    try {
        const result = processFn(inputFile);
        parentPort.postMessage({ result });
    } catch (error) {
        parentPort.postMessage({ error });
    }
}

export default PerformanceOptimizer;
