/**
 * Search Performance Optimizations
 * 
 * This module implements performance optimizations for search operations,
 * focusing on text search, which is a critical operation for Basic Memory.
 * The goal is to achieve at least 2x performance compared to the Python implementation.
 */

import { sequelize } from '../db/index.js';
import { performance } from 'perf_hooks';
import sqlite3 from 'sqlite3';

/**
 * Create SQLite full-text search (FTS5) virtual tables for optimized text search
 * FTS5 provides significantly faster text search capabilities compared to LIKE-based searches
 * 
 * @returns {Promise<boolean>} True if successful
 */
export async function enableFullTextSearch() {
  try {
    // Check if FTS tables already exist
    const [results] = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='entity_fts'"
    );
    
    if (results.length > 0) {
      console.log('Full-text search tables already exist');
      return true;
    }
    
    // Create FTS5 virtual table for entities
    await sequelize.query(`
      CREATE VIRTUAL TABLE IF NOT EXISTS entity_fts USING fts5(
        id,
        title,
        content,
        entity_type,
        metadata,
        tokenize='porter unicode61'
      )
    `);
    
    // Create triggers to keep FTS table in sync
    await sequelize.query(`
      CREATE TRIGGER IF NOT EXISTS entity_ai AFTER INSERT ON entity BEGIN
        INSERT INTO entity_fts(id, title, content, entity_type, metadata)
        VALUES (new.id, new.title, new.content, new.entity_type, new.metadata);
      END;
    `);
    
    await sequelize.query(`
      CREATE TRIGGER IF NOT EXISTS entity_ad AFTER DELETE ON entity BEGIN
        DELETE FROM entity_fts WHERE id = old.id;
      END;
    `);
    
    await sequelize.query(`
      CREATE TRIGGER IF NOT EXISTS entity_au AFTER UPDATE ON entity BEGIN
        DELETE FROM entity_fts WHERE id = old.id;
        INSERT INTO entity_fts(id, title, content, entity_type, metadata)
        VALUES (new.id, new.title, new.content, new.entity_type, new.metadata);
      END;
    `);
    
    // Populate FTS table with existing data
    await sequelize.query(`
      INSERT INTO entity_fts(id, title, content, entity_type, metadata)
      SELECT id, title, content, entity_type, metadata FROM entity
    `);
    
    console.log('Successfully created full-text search tables and triggers');
    return true;
  } catch (error) {
    console.error('Failed to create full-text search tables:', error);
    return false;
  }
}

/**
 * Optimize a search query for SQLite performance
 * 
 * @param {string} query - The search query text
 * @returns {string} Optimized query
 */
export function optimizeSearchQuery(query) {
  if (!query) return '';
  
  // Convert * wildcard to FTS5 compatible syntax
  let optimized = query.replace(/\*/g, '*');
  
  // Add word stemming for better matching
  const words = optimized.split(' ').filter(w => w.length > 0);
  if (words.length > 1) {
    // For multi-word queries, create a phrase-based query with optional word matching
    optimized = words.map(word => `${word}*`).join(' OR ');
  } else if (words.length === 1) {
    // For single-word queries, add stemming
    optimized = `${words[0]}*`;
  }
  
  return optimized;
}

/**
 * Create database indexes for faster search operations
 * 
 * @returns {Promise<boolean>} True if successful
 */
export async function createSearchIndexes() {
  try {
    // Create indexes for commonly queried fields
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_entity_title ON entity(title)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_entity_entity_type ON entity(entity_type)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_entity_permalink ON entity(permalink)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_observation_entity_id ON observation(entity_id)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_observation_observation_type ON observation(observation_type)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_observation_value ON observation(value)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_relation_source_id ON relation(source_id)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_relation_target_id ON relation(target_id)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_relation_relation_type ON relation(relation_type)');
    
    console.log('Successfully created search indexes');
    return true;
  } catch (error) {
    console.error('Failed to create search indexes:', error);
    return false;
  }
}

/**
 * Optimize the SQLite database configuration for better search performance
 * 
 * @returns {Promise<boolean>} True if successful
 */
export async function optimizeDatabaseConfiguration() {
  try {
    // Enable WAL mode for better concurrency and performance
    await sequelize.query('PRAGMA journal_mode = WAL');
    
    // Increase cache size for better performance
    await sequelize.query('PRAGMA cache_size = -20000'); // ~20MB
    
    // Set synchronous mode to NORMAL for better performance with reasonable safety
    await sequelize.query('PRAGMA synchronous = NORMAL');
    
    // Enable memory-mapped I/O for better performance
    await sequelize.query('PRAGMA mmap_size = 30000000000'); // ~30GB
    
    console.log('Successfully optimized database configuration');
    return true;
  } catch (error) {
    console.error('Failed to optimize database configuration:', error);
    return false;
  }
}

/**
 * Create a prepared statement cache for frequently used search queries
 * 
 * @returns {Object} Cache object with prepared statements
 */
export function createPreparedStatementCache() {
  const cache = {};
  const db = new sqlite3.Database(process.env.DATABASE_PATH || './basic-memory.sqlite');
  
  // Prepare common search statements
  cache.searchEntitiesByText = db.prepare(`
    SELECT id, title, content, entity_type, permalink, metadata, checksum, created_at, updated_at
    FROM entity_fts
    WHERE entity_fts MATCH ?
    ORDER BY rank
    LIMIT ? OFFSET ?
  `);
  
  cache.searchEntitiesByType = db.prepare(`
    SELECT id, title, content, entity_type, permalink, metadata, checksum, created_at, updated_at
    FROM entity
    WHERE entity_type = ?
    ORDER BY updated_at DESC
    LIMIT ? OFFSET ?
  `);
  
  cache.searchObservationsByType = db.prepare(`
    SELECT id, entity_id, observer_id, observation_type, value, context, created_at, updated_at
    FROM observation
    WHERE observation_type = ?
    ORDER BY updated_at DESC
    LIMIT ? OFFSET ?
  `);
  
  cache.searchObservationsByValue = db.prepare(`
    SELECT id, entity_id, observer_id, observation_type, value, context, created_at, updated_at
    FROM observation
    WHERE value LIKE ?
    ORDER BY updated_at DESC
    LIMIT ? OFFSET ?
  `);
  
  return cache;
}

/**
 * Apply all search optimizations
 * 
 * @returns {Promise<Object>} Status object with results of each optimization
 */
export async function applyAllSearchOptimizations() {
  console.log('Applying search optimizations...');
  const start = performance.now();
  
  const status = {
    fullTextSearch: await enableFullTextSearch(),
    searchIndexes: await createSearchIndexes(),
    databaseConfig: await optimizeDatabaseConfiguration(),
    preparedStatements: true
  };
  
  const end = performance.now();
  console.log(`Search optimizations applied in ${(end - start).toFixed(2)}ms`);
  
  return status;
}

// Export an initialization function for the API to use
export default async function initializeSearchOptimizations() {
  return await applyAllSearchOptimizations();
}
