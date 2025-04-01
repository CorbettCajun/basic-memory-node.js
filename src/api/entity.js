/**
 * Entity API Operations
 * 
 * Provides CRUD operations for entities in the Basic Memory database.
 * These functions match the Python implementation's API exactly.
 */

import { Entity, Relation, Observation } from '../db/index.js';
import { Op } from 'sequelize';
import slugify from 'slugify';
import pino from 'pino';
import crypto from 'crypto';

// Configure logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

/**
 * Calculate checksum for content
 * @param {string} content - Content to calculate checksum for
 * @returns {string} - MD5 checksum
 */
function calculateChecksum(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Create a new entity or update an existing one
 * 
 * @param {Object} entityData - Entity data
 * @param {string} entityData.title - Entity title
 * @param {string} entityData.content - Entity content
 * @param {string} [entityData.permalink] - Entity permalink (will be generated from title if not provided)
 * @param {string} [entityData.type='note'] - Entity type
 * @param {string} [entityData.entity_type] - More specific entity type classification
 * @param {Object} [entityData.entity_metadata={}] - Additional metadata
 * @param {string} [entityData.content_type='text/markdown'] - Content MIME type
 * @param {string} [entityData.file_path] - Path to associated file
 * @returns {Promise<Object>} - Created or updated entity
 */
export async function createOrUpdateEntity(entityData) {
  try {
    // Generate permalink if not provided
    const permalink = entityData.permalink || 
                     slugify(entityData.title, { lower: true, strict: true });
    
    // Calculate content checksum
    const checksum = calculateChecksum(entityData.content);
    
    // Prepare entity data with defaults
    const data = {
      title: entityData.title,
      content: entityData.content,
      raw_content: entityData.content, // Store raw content as-is
      permalink: permalink,
      type: entityData.type || 'note',
      entity_type: entityData.entity_type || null,
      entity_metadata: entityData.entity_metadata || {},
      content_type: entityData.content_type || 'text/markdown',
      checksum: checksum,
      file_path: entityData.file_path || null,
      last_modified: new Date()
    };
    
    // Find existing entity or create new one
    const [entity, created] = await Entity.findOrCreate({
      where: { permalink: permalink },
      defaults: data
    });
    
    // Update existing entity if not created
    if (!created) {
      // Only update if content has changed (check checksum)
      if (entity.checksum !== checksum) {
        await entity.update(data);
      }
    }
    
    logger.debug(`Entity ${created ? 'created' : 'updated'}: ${permalink}`);
    
    return entity;
  } catch (error) {
    logger.error(`Error creating/updating entity: ${error.message}`);
    throw error;
  }
}

/**
 * Get entity by permalink
 * 
 * @param {string} permalink - Entity permalink
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.includeRelations=false] - Whether to include relations
 * @param {boolean} [options.includeObservations=false] - Whether to include observations
 * @returns {Promise<Object|null>} - Entity object or null if not found
 */
export async function getEntity(permalink, options = {}) {
  try {
    const query = {
      where: { permalink },
      include: []
    };
    
    // Include relations if requested
    if (options.includeRelations) {
      query.include.push({
        model: Relation,
        as: 'outgoingRelations'
      });
      query.include.push({
        model: Relation,
        as: 'incomingRelations'
      });
    }
    
    // Include observations if requested
    if (options.includeObservations) {
      query.include.push({
        model: Observation,
        as: 'observations'
      });
    }
    
    // Get entity
    const entity = await Entity.findOne(query);
    
    return entity;
  } catch (error) {
    logger.error(`Error getting entity: ${error.message}`);
    throw error;
  }
}

/**
 * Delete entity by permalink
 * 
 * @param {string} permalink - Entity permalink
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.deleteFile=false] - Whether to delete associated file
 * @param {boolean} [options.cascade=true] - Whether to delete related records (relations, observations)
 * @returns {Promise<boolean>} - Whether entity was deleted
 */
export async function deleteEntity(permalink, options = {}) {
  try {
    // Get entity
    const entity = await Entity.findOne({ where: { permalink } });
    
    if (!entity) {
      logger.warn(`Entity not found for deletion: ${permalink}`);
      return false;
    }
    
    // Delete file if requested and file path exists
    if (options.deleteFile && entity.file_path) {
      try {
        const fs = await import('fs');
        if (fs.existsSync(entity.file_path)) {
          fs.unlinkSync(entity.file_path);
          logger.debug(`Deleted file: ${entity.file_path}`);
        }
      } catch (fileError) {
        logger.error(`Error deleting file: ${fileError.message}`);
      }
    }
    
    // Delete entity
    const result = await Entity.destroy({ where: { permalink } });
    
    logger.debug(`Entity deleted: ${permalink}`);
    
    return result > 0;
  } catch (error) {
    logger.error(`Error deleting entity: ${error.message}`);
    throw error;
  }
}

/**
 * List entities with filtering options
 * 
 * @param {Object} [options] - Filtering options
 * @param {string} [options.type] - Filter by entity type
 * @param {string} [options.entity_type] - Filter by specific entity type
 * @param {string} [options.query] - Search query for title or content
 * @param {number} [options.limit] - Maximum number of results
 * @param {number} [options.offset] - Offset for pagination
 * @param {string} [options.sort='title'] - Sort field
 * @param {string} [options.order='ASC'] - Sort order (ASC or DESC)
 * @returns {Promise<Object>} - Object with entities array and total count
 */
export async function listEntities(options = {}) {
  try {
    const query = {
      where: {},
      limit: options.limit || 100,
      offset: options.offset || 0,
      order: [[options.sort || 'title', options.order || 'ASC']]
    };
    
    // Apply type filter
    if (options.type) {
      query.where.type = options.type;
    }
    
    // Apply entity_type filter
    if (options.entity_type) {
      query.where.entity_type = options.entity_type;
    }
    
    // Apply search query
    if (options.query) {
      query.where[Op.or] = [
        { title: { [Op.like]: `%${options.query}%` } },
        { content: { [Op.like]: `%${options.query}%` } }
      ];
    }
    
    // Get total count
    const count = await Entity.count({ where: query.where });
    
    // Get entities
    const entities = await Entity.findAll(query);
    
    return {
      entities,
      total: count,
      limit: query.limit,
      offset: query.offset
    };
  } catch (error) {
    logger.error(`Error listing entities: ${error.message}`);
    throw error;
  }
}

/**
 * Get entity types with counts
 * 
 * @returns {Promise<Array>} - Array of entity types with counts
 */
export async function getEntityTypes() {
  try {
    const result = await Entity.findAll({
      attributes: ['type', [fn('COUNT', 'id'), 'count']],
      group: ['type'],
      order: [['type', 'ASC']]
    });
    
    return result.map(item => ({
      type: item.type,
      count: parseInt(item.getDataValue('count'), 10)
    }));
  } catch (error) {
    logger.error(`Error getting entity types: ${error.message}`);
    throw error;
  }
}

/**
 * Update entity metadata
 * 
 * @param {string} permalink - Entity permalink
 * @param {Object} metadata - Metadata to update
 * @param {boolean} [replace=false] - Whether to replace existing metadata (true) or merge (false)
 * @returns {Promise<Object|null>} - Updated entity or null if not found
 */
export async function updateEntityMetadata(permalink, metadata, replace = false) {
  try {
    // Get entity
    const entity = await Entity.findOne({ where: { permalink } });
    
    if (!entity) {
      logger.warn(`Entity not found for metadata update: ${permalink}`);
      return null;
    }
    
    // Update metadata
    let updatedMetadata;
    
    if (replace) {
      updatedMetadata = metadata;
    } else {
      // Merge with existing metadata
      const existingMetadata = entity.entity_metadata || {};
      updatedMetadata = { ...existingMetadata, ...metadata };
    }
    
    // Save updated entity
    await entity.update({ entity_metadata: updatedMetadata });
    
    logger.debug(`Updated metadata for entity: ${permalink}`);
    
    return entity;
  } catch (error) {
    logger.error(`Error updating entity metadata: ${error.message}`);
    throw error;
  }
}

// Export all functions as an object for CommonJS compatibility
export default {
  createOrUpdateEntity,
  getEntity,
  deleteEntity,
  listEntities,
  getEntityTypes,
  updateEntityMetadata
};
