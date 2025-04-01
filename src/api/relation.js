/**
 * Relation API Operations
 * 
 * Provides CRUD operations for relations (links) between entities in the Basic Memory database.
 * These functions match the Python implementation's API exactly.
 */

import { Entity, Relation } from '../db/index.js';
import { Op } from 'sequelize';
import pino from 'pino';

// Configure logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

/**
 * Create a relation between two entities
 * 
 * @param {Object} relationData - Relation data
 * @param {string} relationData.source_permalink - Source entity permalink
 * @param {string} relationData.target_permalink - Target entity permalink
 * @param {string} [relationData.type='reference'] - Relation type
 * @param {string} [relationData.to_name] - Specific name for the target entity in this relation
 * @param {string} [relationData.context] - Additional context for the relation
 * @param {Object} [relationData.attributes={}] - Additional attributes
 * @returns {Promise<Object>} - Created or updated relation
 */
export async function createRelation(relationData) {
  try {
    // Find source entity
    const sourceEntity = await Entity.findOne({
      where: { permalink: relationData.source_permalink }
    });
    
    if (!sourceEntity) {
      throw new Error(`Source entity not found: ${relationData.source_permalink}`);
    }
    
    // Find target entity
    const targetEntity = await Entity.findOne({
      where: { permalink: relationData.target_permalink }
    });
    
    if (!targetEntity) {
      throw new Error(`Target entity not found: ${relationData.target_permalink}`);
    }
    
    // Check if relation already exists
    const existingRelation = await Relation.findOne({
      where: {
        source_id: sourceEntity.id,
        target_id: targetEntity.id,
        type: relationData.type || 'reference'
      }
    });
    
    if (existingRelation) {
      // Update existing relation
      const updates = {
        to_name: relationData.to_name !== undefined ? relationData.to_name : existingRelation.to_name,
        context: relationData.context !== undefined ? relationData.context : existingRelation.context,
        attributes: relationData.attributes !== undefined ? relationData.attributes : existingRelation.attributes
      };
      
      await existingRelation.update(updates);
      logger.debug(`Updated relation: ${sourceEntity.permalink} -> ${targetEntity.permalink}`);
      
      return existingRelation;
    }
    
    // Create new relation
    const newRelation = await Relation.create({
      source_id: sourceEntity.id,
      target_id: targetEntity.id,
      type: relationData.type || 'reference',
      to_name: relationData.to_name || null,
      context: relationData.context || null,
      attributes: relationData.attributes || {}
    });
    
    logger.debug(`Created relation: ${sourceEntity.permalink} -> ${targetEntity.permalink}`);
    
    return newRelation;
  } catch (error) {
    logger.error(`Error creating relation: ${error.message}`);
    throw error;
  }
}

/**
 * Get relations for an entity
 * 
 * @param {string} permalink - Entity permalink
 * @param {Object} [options] - Additional options
 * @param {string} [options.direction='both'] - Relation direction ('outgoing', 'incoming', or 'both')
 * @param {string} [options.type] - Filter by relation type
 * @param {boolean} [options.includeEntities=false] - Whether to include full entity data
 * @returns {Promise<Object>} - Object with outgoing and incoming relations
 */
export async function getRelations(permalink, options = {}) {
  try {
    // Find entity
    const entity = await Entity.findOne({
      where: { permalink }
    });
    
    if (!entity) {
      throw new Error(`Entity not found: ${permalink}`);
    }
    
    const result = {
      outgoing: [],
      incoming: []
    };
    
    // Handle outgoing relations
    if (options.direction === 'both' || options.direction === 'outgoing' || !options.direction) {
      const outgoingQuery = {
        where: { source_id: entity.id },
        include: []
      };
      
      // Filter by type
      if (options.type) {
        outgoingQuery.where.type = options.type;
      }
      
      // Include target entity if requested
      if (options.includeEntities) {
        outgoingQuery.include.push({
          model: Entity,
          as: 'target',
          attributes: ['id', 'title', 'permalink', 'type', 'entity_type']
        });
      }
      
      const outgoingRelations = await Relation.findAll(outgoingQuery);
      result.outgoing = outgoingRelations;
    }
    
    // Handle incoming relations
    if (options.direction === 'both' || options.direction === 'incoming' || !options.direction) {
      const incomingQuery = {
        where: { target_id: entity.id },
        include: []
      };
      
      // Filter by type
      if (options.type) {
        incomingQuery.where.type = options.type;
      }
      
      // Include source entity if requested
      if (options.includeEntities) {
        incomingQuery.include.push({
          model: Entity,
          as: 'source',
          attributes: ['id', 'title', 'permalink', 'type', 'entity_type']
        });
      }
      
      const incomingRelations = await Relation.findAll(incomingQuery);
      result.incoming = incomingRelations;
    }
    
    return result;
  } catch (error) {
    logger.error(`Error getting relations: ${error.message}`);
    throw error;
  }
}

/**
 * Delete a relation
 * 
 * @param {Object} criteria - Criteria to identify the relation
 * @param {string} [criteria.id] - Relation ID
 * @param {string} [criteria.source_permalink] - Source entity permalink
 * @param {string} [criteria.target_permalink] - Target entity permalink
 * @param {string} [criteria.type] - Relation type
 * @returns {Promise<boolean>} - Whether relation was deleted
 */
export async function deleteRelation(criteria) {
  try {
    const where = {};
    
    // If relation ID is provided, use it directly
    if (criteria.id) {
      where.id = criteria.id;
    } else {
      // Otherwise, construct query from permalinks
      if (criteria.source_permalink) {
        const sourceEntity = await Entity.findOne({
          where: { permalink: criteria.source_permalink }
        });
        
        if (!sourceEntity) {
          throw new Error(`Source entity not found: ${criteria.source_permalink}`);
        }
        
        where.source_id = sourceEntity.id;
      }
      
      if (criteria.target_permalink) {
        const targetEntity = await Entity.findOne({
          where: { permalink: criteria.target_permalink }
        });
        
        if (!targetEntity) {
          throw new Error(`Target entity not found: ${criteria.target_permalink}`);
        }
        
        where.target_id = targetEntity.id;
      }
      
      if (criteria.type) {
        where.type = criteria.type;
      }
    }
    
    // Ensure we have at least some criteria
    if (Object.keys(where).length === 0) {
      throw new Error('No valid criteria provided for deleting relation');
    }
    
    // Delete relation(s)
    const count = await Relation.destroy({ where });
    
    logger.debug(`Deleted ${count} relation(s)`);
    
    return count > 0;
  } catch (error) {
    logger.error(`Error deleting relation: ${error.message}`);
    throw error;
  }
}

/**
 * Get relation types with counts
 * 
 * @returns {Promise<Array>} - Array of relation types with counts
 */
export async function getRelationTypes() {
  try {
    const { fn, col } = sequelize;
    const result = await Relation.findAll({
      attributes: ['type', [fn('COUNT', col('id')), 'count']],
      group: ['type'],
      order: [['type', 'ASC']]
    });
    
    return result.map(item => ({
      type: item.type,
      count: parseInt(item.getDataValue('count'), 10)
    }));
  } catch (error) {
    logger.error(`Error getting relation types: ${error.message}`);
    throw error;
  }
}

/**
 * Find all entities related to the given entity
 * 
 * @param {string} permalink - Entity permalink
 * @param {Object} [options] - Additional options
 * @param {number} [options.depth=1] - Relation depth (how many hops to follow)
 * @param {string} [options.type] - Filter by relation type
 * @param {string} [options.entity_type] - Filter by entity type
 * @returns {Promise<Array>} - Array of related entities with relation info
 */
export async function findRelatedEntities(permalink, options = {}) {
  try {
    // Find entity
    const entity = await Entity.findOne({
      where: { permalink }
    });
    
    if (!entity) {
      throw new Error(`Entity not found: ${permalink}`);
    }
    
    // Set default depth
    const depth = options.depth || 1;
    
    // Initialize result set and visited set to avoid duplicates
    const result = [];
    const visited = new Set([entity.id]);
    
    // Find related entities at the specified depth
    await findRelatedEntitiesRecursive(
      entity.id, 
      result, 
      visited, 
      depth, 
      options.type, 
      options.entity_type
    );
    
    return result;
  } catch (error) {
    logger.error(`Error finding related entities: ${error.message}`);
    throw error;
  }
}

/**
 * Recursive helper for findRelatedEntities
 * 
 * @private
 */
async function findRelatedEntitiesRecursive(
  entityId, 
  result, 
  visited, 
  remainingDepth, 
  relationType, 
  entityType
) {
  if (remainingDepth <= 0) {
    return;
  }
  
  // Find outgoing relations
  const outgoingQuery = {
    where: { source_id: entityId },
    include: [{
      model: Entity,
      as: 'target',
      attributes: ['id', 'title', 'permalink', 'type', 'entity_type']
    }]
  };
  
  // Apply relation type filter
  if (relationType) {
    outgoingQuery.where.type = relationType;
  }
  
  // Apply entity type filter to target
  if (entityType) {
    outgoingQuery.include[0].where = {
      [Op.or]: [
        { type: entityType },
        { entity_type: entityType }
      ]
    };
  }
  
  const outgoingRelations = await Relation.findAll(outgoingQuery);
  
  // Find incoming relations
  const incomingQuery = {
    where: { target_id: entityId },
    include: [{
      model: Entity,
      as: 'source',
      attributes: ['id', 'title', 'permalink', 'type', 'entity_type']
    }]
  };
  
  // Apply relation type filter
  if (relationType) {
    incomingQuery.where.type = relationType;
  }
  
  // Apply entity type filter to source
  if (entityType) {
    incomingQuery.include[0].where = {
      [Op.or]: [
        { type: entityType },
        { entity_type: entityType }
      ]
    };
  }
  
  const incomingRelations = await Relation.findAll(incomingQuery);
  
  // Process outgoing relations
  for (const relation of outgoingRelations) {
    const targetEntity = relation.target;
    
    if (!visited.has(targetEntity.id)) {
      // Add to result
      result.push({
        entity: targetEntity,
        relation: relation,
        direction: 'outgoing'
      });
      
      // Mark as visited
      visited.add(targetEntity.id);
      
      // Recurse if needed
      if (remainingDepth > 1) {
        await findRelatedEntitiesRecursive(
          targetEntity.id,
          result,
          visited,
          remainingDepth - 1,
          relationType,
          entityType
        );
      }
    }
  }
  
  // Process incoming relations
  for (const relation of incomingRelations) {
    const sourceEntity = relation.source;
    
    if (!visited.has(sourceEntity.id)) {
      // Add to result
      result.push({
        entity: sourceEntity,
        relation: relation,
        direction: 'incoming'
      });
      
      // Mark as visited
      visited.add(sourceEntity.id);
      
      // Recurse if needed
      if (remainingDepth > 1) {
        await findRelatedEntitiesRecursive(
          sourceEntity.id,
          result,
          visited,
          remainingDepth - 1,
          relationType,
          entityType
        );
      }
    }
  }
}

// Export all functions as an object for CommonJS compatibility
export default {
  createRelation,
  getRelations,
  deleteRelation,
  getRelationTypes,
  findRelatedEntities
};
