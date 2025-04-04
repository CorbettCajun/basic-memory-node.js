import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { performance } from 'perf_hooks';
import BasicMemoryError from '../errors/base-error.js';

/**
 * Advanced caching mechanism with file system and in-memory support
 */
export class CacheManager {
    /**
     * Create a new CacheManager instance
     * @param {Object} [options={}] - Cache configuration
     */
    constructor(options = {}) {
        this.options = {
            // Default cache directory
            cacheDir: options.cacheDir || path.join(process.cwd(), '.cache'),
            
            // Default TTL: 1 hour
            defaultTTL: options.defaultTTL || 3600000,
            
            // Maximum cache size (in bytes)
            maxCacheSize: options.maxCacheSize || 1024 * 1024 * 100, // 100 MB
            
            // In-memory cache enabled
            inMemoryEnabled: options.inMemoryEnabled ?? true,
            
            // File system cache enabled
            fileSystemEnabled: options.fileSystemEnabled ?? true
        };

        // In-memory cache store
        this.memoryCache = new Map();

        // Ensure cache directory exists
        this._initializeCacheDirectory();
    }

    /**
     * Initialize cache directory
     * @private
     */
    async _initializeCacheDirectory() {
        try {
            await fs.mkdir(this.options.cacheDir, { recursive: true });
        } catch (error) {
            throw new BasicMemoryError('Failed to create cache directory', {
                code: BasicMemoryError.ErrorCodes.FILESYSTEM_ERROR,
                metadata: { 
                    cacheDir: this.options.cacheDir,
                    originalError: error.message 
                }
            });
        }
    }

    /**
     * Generate a secure cache key
     * @param {string} key - Original key
     * @returns {string} Hashed key
     * @private
     */
    _generateCacheKey(key) {
        return crypto
            .createHash('sha256')
            .update(key)
            .digest('hex');
    }

    /**
     * Set a value in the cache
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {Object} [options={}] - Caching options
     * @returns {Promise<void>}
     */
    async set(key, value, options = {}) {
        const startTime = performance.now();
        const hashedKey = this._generateCacheKey(key);
        const ttl = options.ttl || this.options.defaultTTL;

        const cacheEntry = {
            value,
            timestamp: Date.now(),
            ttl
        };

        // In-memory caching
        if (this.options.inMemoryEnabled) {
            this.memoryCache.set(hashedKey, cacheEntry);
        }

        // File system caching
        if (this.options.fileSystemEnabled) {
            try {
                const cacheFilePath = path.join(this.options.cacheDir, hashedKey);
                await fs.writeFile(
                    cacheFilePath, 
                    JSON.stringify(cacheEntry), 
                    'utf8'
                );
            } catch (error) {
                throw new BasicMemoryError('Failed to write cache file', {
                    code: BasicMemoryError.ErrorCodes.FILESYSTEM_ERROR,
                    metadata: { 
                        key: hashedKey,
                        originalError: error.message 
                    }
                });
            }
        }

        const endTime = performance.now();
        return {
            metadata: {
                processingTime: endTime - startTime,
                key: hashedKey
            }
        };
    }

    /**
     * Get a value from the cache
     * @param {string} key - Cache key
     * @returns {Promise<*>} Cached value or null
     */
    async get(key) {
        const startTime = performance.now();
        const hashedKey = this._generateCacheKey(key);

        // Check in-memory cache first
        if (this.options.inMemoryEnabled) {
            const memoryEntry = this.memoryCache.get(hashedKey);
            if (memoryEntry && this._isValidEntry(memoryEntry)) {
                return memoryEntry.value;
            }
        }

        // Check file system cache
        if (this.options.fileSystemEnabled) {
            try {
                const cacheFilePath = path.join(this.options.cacheDir, hashedKey);
                const fileContent = await fs.readFile(cacheFilePath, 'utf8');
                const fileEntry = JSON.parse(fileContent);

                if (this._isValidEntry(fileEntry)) {
                    // Update in-memory cache if file cache is valid
                    if (this.options.inMemoryEnabled) {
                        this.memoryCache.set(hashedKey, fileEntry);
                    }
                    
                    const endTime = performance.now();
                    return {
                        value: fileEntry.value,
                        metadata: {
                            processingTime: endTime - startTime,
                            source: 'filesystem'
                        }
                    };
                }
            } catch (error) {
                // Not finding a cache entry is not an error
                if (error.code !== 'ENOENT') {
                    throw new BasicMemoryError('Failed to read cache file', {
                        code: BasicMemoryError.ErrorCodes.FILESYSTEM_ERROR,
                        metadata: { 
                            key: hashedKey,
                            originalError: error.message 
                        }
                    });
                }
            }
        }

        return null;
    }

    /**
     * Check if a cache entry is valid
     * @param {Object} entry - Cache entry
     * @returns {boolean} Whether the entry is valid
     * @private
     */
    _isValidEntry(entry) {
        return entry && 
               (Date.now() - entry.timestamp) < entry.ttl;
    }

    /**
     * Clear expired cache entries
     * @returns {Promise<Object>} Cleanup metadata
     */
    async clearExpired() {
        const startTime = performance.now();
        let memoryEntriesCleared = 0;
        let fileEntriesCleared = 0;

        // Clear in-memory cache
        if (this.options.inMemoryEnabled) {
            for (const [key, entry] of this.memoryCache.entries()) {
                if (!this._isValidEntry(entry)) {
                    this.memoryCache.delete(key);
                    memoryEntriesCleared++;
                }
            }
        }

        // Clear file system cache
        if (this.options.fileSystemEnabled) {
            try {
                const files = await fs.readdir(this.options.cacheDir);
                for (const file of files) {
                    const filePath = path.join(this.options.cacheDir, file);
                    try {
                        const fileContent = await fs.readFile(filePath, 'utf8');
                        const fileEntry = JSON.parse(fileContent);

                        if (!this._isValidEntry(fileEntry)) {
                            await fs.unlink(filePath);
                            fileEntriesCleared++;
                        }
                    } catch {
                        // Ignore individual file read errors
                    }
                }
            } catch (error) {
                throw new BasicMemoryError('Failed to clear expired cache', {
                    code: BasicMemoryError.ErrorCodes.FILESYSTEM_ERROR,
                    metadata: { originalError: error.message }
                });
            }
        }

        const endTime = performance.now();
        return {
            metadata: {
                processingTime: endTime - startTime,
                memoryEntriesCleared,
                fileEntriesCleared
            }
        };
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache usage statistics
     */
    getStats() {
        return {
            memoryEntries: this.memoryCache.size,
            cacheDir: this.options.cacheDir,
            maxCacheSize: this.options.maxCacheSize,
            inMemoryEnabled: this.options.inMemoryEnabled,
            fileSystemEnabled: this.options.fileSystemEnabled
        };
    }
}

export default new CacheManager();
