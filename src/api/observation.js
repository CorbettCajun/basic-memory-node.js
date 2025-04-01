/**
 * Observation API Operations
 * 
 * Provides CRUD operations for observations in the Basic Memory database.
 * These functions match the Python implementation's API exactly.
 */

import { Entity, Observation } from '../db/index.js';
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
 * Create a new observation for an entity
 * 
 * @param {Object} observationData - Observation data
 * @param {string} observationData.entity_permalink - Entity permalink
 * @param {string} observationData.content - Observation content
 * @param {string} [observationData.category='note'] - Observation category
 * @param {string} [observationData.context] - Additional context
 * @param {Array} [observationData.tags=[]] - Tags for the observation
 * @returns {Promise<Object>} - Created observation
 */
export async function createObservation(observationData) {
  try {
    // Find entity
    const entity = await Entity.findOne({
      where: { permalink: observationData.entity_permalink }
    });
    
    if (!entity) {
      throw new Error(`Entity not found: ${observationData.entity_permalink}`);
    }
    
    // Create observation
    const observation = await Observation.create({
      entity_id: entity.id,
      content: observationData.content,
      category: observationData.category || 'note',
      context: observationData.context || null,
      tags: observationData.tags || []
    });
    
    logger.debug(`Created observation for entity: ${entity.permalink}`);
    
    return observation;
  } catch (error) {
    logger.error(`Error creating observation: ${error.message}`);
    throw error;
  }
}

/**
 * Get observations for an entity
 * 
 * @param {string} permalink - Entity permalink
 * @param {Object} [options] - Additional options
 * @param {string} [options.category] - Filter by category
 * @param {string} [options.tag] - Filter by tag
 * @param {string} [options.sort='created_at'] - Sort field
 * @param {string} [options.order='DESC'] - Sort order (ASC or DESC)
 * @param {number} [options.limit=100] - Maximum number of results
 * @param {number} [options.offset=0] - Offset for pagination
 * @returns {Promise<Object>} - Object with observations array and total count
 */
export async function getObservations(permalink, options = {}) {
  try {
    // Find entity
    const entity = await Entity.findOne({
      where: { permalink }
    });
    
    if (!entity) {
      throw new Error(`Entity not found: ${permalink}`);
    }
    
    // Prepare query
    const query = {
      where: { entity_id: entity.id },
      limit: options.limit || 100,
      offset: options.offset || 0,
      order: [[options.sort || 'created_at', options.order || 'DESC']]
    };
    
    // Apply category filter
    if (options.category) {
      query.where.category = options.category;
    }
    
    // Apply tag filter
    if (options.tag) {
      // Since tags are stored as JSON, we need a custom condition
      // This is a bit of a hack for SQLite, more elegant solutions exist for PostgreSQL
      query.where = {
        ...query.where,
        tags: {
          [Op.like]: `%${options.tag}%`
        }
      };
    }
    
    // Get total count
    const count = await Observation.count({ where: query.where });
    
    // Get observations
    const observations = await Observation.findAll(query);
    
    return {
      observations,
      total: count,
      limit: query.limit,
      offset: query.offset
    };
  } catch (error) {
    logger.error(`Error getting observations: ${error.message}`);
    throw error;
  }
}

/**
 * Get a specific observation by ID
 * 
 * @param {number} id - Observation ID
 * @returns {Promise<Object|null>} - Observation object or null if not found
 */
export async function getObservation(id) {
  try {
    const observation = await Observation.findByPk(id, {
      include: [{
        model: Entity,
        attributes: ['id', 'title', 'permalink']
      }]
    });
    
    return observation;
  } catch (error) {
    logger.error(`Error getting observation: ${error.message}`);
    throw error;
  }
}

/**
 * Update an observation
 * 
 * @param {number} id - Observation ID
 * @param {Object} updates - Fields to update
 * @param {string} [updates.content] - Updated content
 * @param {string} [updates.category] - Updated category
 * @param {string} [updates.context] - Updated context
 * @param {Array} [updates.tags] - Updated tags
 * @returns {Promise<Object|null>} - Updated observation or null if not found
 */
export async function updateObservation(id, updates) {
  try {
    // Find observation
    const observation = await Observation.findByPk(id);
    
    if (!observation) {
      logger.warn(`Observation not found for update: ${id}`);
      return null;
    }
    
    // Apply updates
    await observation.update(updates);
    
    logger.debug(`Updated observation: ${id}`);
    
    return observation;
  } catch (error) {
    logger.error(`Error updating observation: ${error.message}`);
    throw error;
  }
}

/**
 * Delete an observation
 * 
 * @param {number} id - Observation ID
 * @returns {Promise<boolean>} - Whether observation was deleted
 */
export async function deleteObservation(id) {
  try {
    const result = await Observation.destroy({ where: { id } });
    
    logger.debug(`Deleted observation: ${id}`);
    
    return result > 0;
  } catch (error) {
    logger.error(`Error deleting observation: ${error.message}`);
    throw error;
  }
}

/**
 * Get observation categories with counts
 * 
 * @returns {Promise<Array>} - Array of categories with counts
 */
export async function getObservationCategories() {
  try {
    const { fn, col } = sequelize;
    const result = await Observation.findAll({
      attributes: ['category', [fn('COUNT', col('id')), 'count']],
      group: ['category'],
      order: [['category', 'ASC']]
    });
    
    return result.map(item => ({
      category: item.category,
      count: parseInt(item.getDataValue('count'), 10)
    }));
  } catch (error) {
    logger.error(`Error getting observation categories: ${error.message}`);
    throw error;
  }
}

// Export all functions as an object for CommonJS compatibility
export default {
  createObservation,
  getObservations,
  getObservation,
  updateObservation,
  deleteObservation,
  getObservationCategories
};
