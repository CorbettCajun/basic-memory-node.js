/**
 * Search API Operations
 * 
 * Provides search capabilities for the Basic Memory database.
 * These functions match the Python implementation's API exactly.
 */

import { Entity, Observation, Relation, SearchIndex } from '../db/index.js';
import { Op, literal, fn, col, QueryTypes } from 'sequelize';
import { sequelize } from '../db/index.js';
import { optimizeSearchQuery } from '../optimizations/search-optimizations.js';
import pino from 'pino';

// Configure logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Track if FTS is enabled
let ftsEnabled = false;

// Check if FTS is enabled on first use
async function checkFtsEnabled() {
  if (ftsEnabled) return true;
  
  try {
    const [results] = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='entity_fts'"
    );
    ftsEnabled = results.length > 0;
    return ftsEnabled;
  } catch (error) {
    logger.error('Error checking FTS status:', error);
    return false;
  }
}

/**
 * Search for entities matching the query
 * 
 * @param {Object} options - Search options
 * @param {string} options.query - Search query
 * @param {string} [options.type] - Filter by entity type
 * @param {string} [options.entity_type] - Filter by specific entity type
 * @param {boolean} [options.include_content=false] - Whether to search in content as well as title
 * @param {boolean} [options.semantic=false] - Whether to use semantic search
 * @param {number} [options.limit=20] - Maximum number of results
 * @param {number} [options.offset=0] - Offset for pagination
 * @returns {Promise<Object>} - Object with results array and total count
 */
export async function searchEntities(options) {
  try {
    // Prepare base query
    const query = {
      where: {},
      limit: options.limit || 20,
      offset: options.offset || 0,
      order: [['title', 'ASC']]
    };
    
    // Add type filters if provided
    if (options.type) {
      query.where.type = options.type;
    }
    
    if (options.entity_type) {
      query.where.entity_type = options.entity_type;
    }
    
    // If no search query, just filter by type
    if (!options.query || options.query.trim() === '') {
      const results = await Entity.findAll(query);
      const count = await Entity.count({ where: query.where });
      return { results, count };
    }
    
    // Check if semantic search is requested and supported
    if (options.semantic) {
      return await performSemanticSearch(
        options.query,
        query.where,
        query.limit,
        query.offset
      );
    }
    
    // Perform text search
    const hasFts = await checkFtsEnabled();
    return await performTextSearch(
      options.query,
      options.include_content || false,
      query,
      hasFts
    );
  } catch (error) {
    logger.error('Error in searchEntities:', error);
    throw error;
  }
}

/**
 * Perform text-based search
 * 
 * @private
 * @param {string} query - Search query
 * @param {boolean} includeContent - Whether to search in content as well
 * @param {Object} queryOptions - Query options
 * @param {boolean} useFts - Whether to use full-text search
 * @returns {Promise<Object>} - Object with results array and total count
 */
async function performTextSearch(query, includeContent, queryOptions, useFts = false) {
  try {
    // Use FTS if available for significant performance improvement
    if (useFts) {
      const optimizedQuery = optimizeSearchQuery(query);
      
      // Construct FTS query with any existing filters
      let whereClause = '';
      const params = [optimizedQuery];
      
      if (queryOptions.where.entity_type) {
        whereClause = ' AND entity_type = ?';
        params.push(queryOptions.where.entity_type);
      }
      
      // Execute FTS query
      const ftsResults = await sequelize.query(
        `SELECT id, title, content, entity_type, permalink, metadata, checksum, created_at, updated_at
         FROM entity_fts
         WHERE entity_fts MATCH ? ${whereClause}
         ORDER BY rank
         LIMIT ? OFFSET ?`,
        {
          replacements: [...params, queryOptions.limit, queryOptions.offset],
          type: QueryTypes.SELECT,
          mapToModel: true,
          model: Entity
        }
      );
      
      // Count total matches
      const [{ total }] = await sequelize.query(
        `SELECT COUNT(*) as total
         FROM entity_fts
         WHERE entity_fts MATCH ? ${whereClause}`,
        {
          replacements: [...params],
          type: QueryTypes.SELECT
        }
      );
      
      return { results: ftsResults, count: parseInt(total) };
    }
    
    // Fall back to LIKE-based search for compatibility
    const searchTerm = `%${query}%`;
    let whereClause = {
      ...queryOptions.where,
      title: { [Op.like]: searchTerm }
    };
    
    if (includeContent) {
      whereClause = {
        ...queryOptions.where,
        [Op.or]: [
          { title: { [Op.like]: searchTerm } },
          { content: { [Op.like]: searchTerm } }
        ]
      };
    }
    
    const results = await Entity.findAll({
      where: whereClause,
      limit: queryOptions.limit,
      offset: queryOptions.offset,
      order: queryOptions.order
    });
    
    const count = await countTextSearchResults(query, includeContent, queryOptions.where);
    
    return { results, count };
  } catch (error) {
    logger.error('Error in performTextSearch:', error);
    throw error;
  }
}

/**
 * Perform semantic search if vectors available
 * 
 * @private
 */
async function performSemanticSearch(query, whereClause, limit, offset) {
  try {
    // Check if semantic search is available (SearchIndex table exists)
    const hasSearchIndex = await SearchIndex.findOne();
    
    if (!hasSearchIndex) {
      logger.warn("Semantic search requested but no search indices found. Falling back to text search.");
      return {
        entities: await performTextSearch(query, true, { where: whereClause, limit, offset }),
        total: await countTextSearchResults(query, true, whereClause)
      };
    }
    
    // TODO: Implement vector search when embedding model is available
    // For now, we'll warn and fall back to text search
    logger.warn("Semantic search requested but embedding model not available. Falling back to text search.");
    return {
      entities: await performTextSearch(query, true, { where: whereClause, limit, offset }),
      total: await countTextSearchResults(query, true, whereClause)
    };
  } catch (error) {
    logger.error(`Error in semantic search: ${error.message}`);
    // Fall back to text search
    return {
      entities: await performTextSearch(query, true, { where: whereClause, limit, offset }),
      total: await countTextSearchResults(query, true, whereClause)
    };
  }
}

/**
 * Count results for text search
 * 
 * @private
 */
async function countTextSearchResults(query, includeContent, whereClause) {
  // Split query into words for better searching
  const words = query.split(/\s+/).filter(word => word.length > 0);
  
  // Prepare conditions
  const titleConditions = words.map(word => ({
    title: { [Op.like]: `%${word}%` }
  }));
  
  let searchConditions = {
    [Op.or]: titleConditions
  };
  
  // Add content search if requested
  if (includeContent) {
    const contentConditions = words.map(word => ({
      content: { [Op.like]: `%${word}%` }
    }));
    
    searchConditions = {
      [Op.or]: [...titleConditions, ...contentConditions]
    };
  }
  
  // Combine with other filters
  const combinedWhere = {
    ...whereClause,
    ...searchConditions
  };
  
  // Count results
  return Entity.count({ where: combinedWhere });
}

/**
 * Search for observations matching the query
 * 
 * @param {Object} options - Search options
 * @param {string} options.query - Search query
 * @param {string} [options.entity_permalink] - Filter by entity permalink
 * @param {string} [options.category] - Filter by observation category
 * @param {string} [options.tag] - Filter by observation tag
 * @param {number} [options.limit=20] - Maximum number of results
 * @param {number} [options.offset=0] - Offset for pagination
 * @returns {Promise<Object>} - Object with results array and total count
 */
export async function searchObservations(options) {
  try {
    // Prepare base query
    const query = {
      where: {},
      limit: options.limit || 20,
      offset: options.offset || 0,
      order: [['created_at', 'DESC']],
      include: []
    };
    
    // Add entity filter if provided
    if (options.entity_permalink) {
      const entity = await Entity.findOne({
        where: { permalink: options.entity_permalink }
      });
      
      if (entity) {
        query.where.entity_id = entity.id;
      } else {
        // If entity not found, return empty results
        return { results: [], total: 0, limit: options.limit || 20, offset: options.offset || 0 };
      }
    } else {
      // If no entity specified, include entity info in results
      query.include.push({
        model: Entity,
        attributes: ['id', 'title', 'permalink', 'type']
      });
    }
    
    // Add category filter if provided
    if (options.category) {
      query.where.category = options.category;
    }
    
    // Add tag filter if provided
    if (options.tag) {
      // Since tags are stored as JSON, we need a custom condition
      query.where.tags = {
        [Op.like]: `%${options.tag}%`
      };
    }
    
    // Add content search condition
    query.where.content = {
      [Op.like]: `%${options.query}%`
    };
    
    // Execute search
    const observations = await Observation.findAll(query);
    
    // Count total results (without pagination)
    const total = await Observation.count({
      where: query.where,
      include: query.include
    });
    
    return {
      results: observations,
      total,
      limit: options.limit || 20,
      offset: options.offset || 0
    };
  } catch (error) {
    logger.error(`Error searching observations: ${error.message}`);
    throw error;
  }
}

/**
 * Update search indices for an entity
 * 
 * @param {string} permalink - Entity permalink
 * @returns {Promise<boolean>} - Whether index was updated
 */
export async function updateSearchIndex(permalink) {
  try {
    // Find entity
    const entity = await Entity.findOne({
      where: { permalink }
    });
    
    if (!entity) {
      throw new Error(`Entity not found: ${permalink}`);
    }
    
    // Check if search index already exists
    let searchIndex = await SearchIndex.findOne({
      where: { entity_id: entity.id }
    });
    
    // Prepare index data
    const indexData = {
      entity_id: entity.id,
      title_tokens: entity.title.toLowerCase().split(/\s+/).filter(token => token.length > 0),
      content_tokens: entity.content 
        ? entity.content.toLowerCase().split(/\s+/).filter(token => token.length > 0).slice(0, 1000)
        : [],
      last_updated: new Date()
    };
    
    // Update or create search index
    if (searchIndex) {
      await searchIndex.update(indexData);
    } else {
      await SearchIndex.create(indexData);
    }
    
    logger.debug(`Updated search index for entity: ${permalink}`);
    
    return true;
  } catch (error) {
    logger.error(`Error updating search index: ${error.message}`);
    throw error;
  }
}

/**
 * Rebuild all search indices
 * 
 * @param {Object} [options] - Options for rebuilding indices
 * @param {boolean} [options.force=false] - Whether to force rebuild all indices
 * @returns {Promise<Object>} - Status object with counts
 */
export async function rebuildSearchIndices(options = {}) {
  try {
    const force = options.force || false;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    
    // Get all entities
    const entities = await Entity.findAll();
    
    // Process each entity
    for (const entity of entities) {
      try {
        // Check if index exists
        const existingIndex = await SearchIndex.findOne({
          where: { entity_id: entity.id }
        });
        
        // Skip if index exists and not forcing rebuild
        if (existingIndex && !force) {
          skipped++;
          continue;
        }
        
        // Prepare index data
        const indexData = {
          entity_id: entity.id,
          title_tokens: entity.title.toLowerCase().split(/\s+/).filter(token => token.length > 0),
          content_tokens: entity.content 
            ? entity.content.toLowerCase().split(/\s+/).filter(token => token.length > 0).slice(0, 1000)
            : [],
          last_updated: new Date()
        };
        
        // Update or create
        if (existingIndex) {
          await existingIndex.update(indexData);
          updated++;
        } else {
          await SearchIndex.create(indexData);
          created++;
        }
      } catch (error) {
        logger.error(`Error processing entity ${entity.id}: ${error.message}`);
      }
    }
    
    logger.info(`Rebuilt search indices. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
    
    return {
      created,
      updated,
      skipped,
      total: entities.length
    };
  } catch (error) {
    logger.error(`Error rebuilding search indices: ${error.message}`);
    throw error;
  }
}

// Export all functions as an object for CommonJS compatibility
export default {
  searchEntities,
  searchObservations,
  updateSearchIndex,
  rebuildSearchIndices
};
