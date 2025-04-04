const fs = require('fs');
const path = require('path');

class PerformanceOptimizer {
  constructor(cacheDir = path.join(__dirname, '.cache')) {
    this.cacheDir = cacheDir;
    
    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Batch process an array of items
   * @param {Array} items - Items to process
   * @param {Function} processFn - Processing function
   * @param {Object} [options={}] - Processing options
   */
  async batchProcess(items, processFn, options = {}) {
    const {
      batchSize = 100,
      concurrency = 5,
      progressCallback = null
    } = options;

    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Limit concurrency
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          try {
            return await processFn(item);
          } catch (error) {
            console.error(`Batch processing error: ${error.message}`);
            return null;
          }
        })
      );

      results.push(...batchResults.filter(r => r !== null));

      if (progressCallback) {
        progressCallback(i + batch.length, items.length);
      }
    }

    return results;
  }

  /**
   * Create a cached version of a function
   * @param {string} key - Unique cache key
   * @param {Function} fn - Function to cache
   * @param {number} [ttl=3600] - Time to live in seconds
   */
  memoize(key, fn, ttl = 3600) {
    const cacheFile = path.join(this.cacheDir, `${key}.json`);

    return async (...args) => {
      // Check if cached result exists and is valid
      if (fs.existsSync(cacheFile)) {
        const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        if (Date.now() - cachedData.timestamp < ttl * 1000) {
          return cachedData.result;
        }
      }

      // Execute function and cache result
      const result = await fn(...args);
      fs.writeFileSync(cacheFile, JSON.stringify({
        result,
        timestamp: Date.now()
      }));

      return result;
    };
  }

  /**
   * Clear cache for a specific key or entire cache
   * @param {string} [key] - Optional specific cache key to clear
   */
  clearCache(key) {
    if (key) {
      const cacheFile = path.join(this.cacheDir, `${key}.json`);
      if (fs.existsSync(cacheFile)) {
        fs.unlinkSync(cacheFile);
      }
    } else {
      // Clear entire cache directory
      fs.rmSync(this.cacheDir, { recursive: true, force: true });
      fs.mkdirSync(this.cacheDir);
    }
  }
}

module.exports = PerformanceOptimizer;
