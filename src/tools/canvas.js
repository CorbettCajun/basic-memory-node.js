/**
 * canvas Tool Handler
 * 
 * Generates a graph structure for visualizing note connections
 */

import { Entity, Link, sequelize } from '../db/index.js';
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
 * Generate a graph structure for visualization
 * 
 * @param {Object} params - Tool parameters
 * @param {string} params.query - Search query to center the graph around
 * @param {number} [params.depth=1] - Depth of connections to include
 * @returns {Object} - Graph structure for visualization
 */
export async function canvasTool(params) {
  try {
    const { query, depth = 1 } = params;
    
    if (!query) {
      throw new Error('Query parameter is required');
    }
    
    logger.info(`Generating canvas for: ${query} (depth: ${depth})`);
    
    // Find central entities
    const centralEntities = await Entity.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${query}%` } },
          { content: { [Op.like]: `%${query}%` } }
        ]
      },
      limit: 5
    });
    
    if (centralEntities.length === 0) {
      logger.warn(`No entities found for query: ${query}`);
      return {
        nodes: [],
        edges: [],
        query
      };
    }
    
    // Track processed entities to avoid duplicates
    const processedEntityIds = new Set(centralEntities.map(e => e.id));
    
    // Initialize nodes and edges
    let nodes = centralEntities.map(entity => ({
      id: entity.id,
      label: entity.title,
      type: entity.type,
      permalink: entity.permalink,
      central: true
    }));
    
    let edges = [];
    
    // Process connections up to the specified depth
    let currentEntities = [...centralEntities];
    
    for (let i = 0; i < depth; i++) {
      const nextEntities = [];
      
      for (const entity of currentEntities) {
        // Get outgoing links
        const outgoingLinks = await Link.findAll({
          where: { source_id: entity.id },
          include: [
            { model: Entity, as: 'target' }
          ]
        });
        
        // Get incoming links
        const incomingLinks = await Link.findAll({
          where: { target_id: entity.id },
          include: [
            { model: Entity, as: 'source' }
          ]
        });
        
        // Process outgoing links
        for (const link of outgoingLinks) {
          if (!link.target) continue;
          
          // Add edge
          edges.push({
            id: `edge-${link.id}`,
            source: link.source_id,
            target: link.target_id,
            type: link.type
          });
          
          // Add connected entity if not processed
          if (!processedEntityIds.has(link.target_id)) {
            processedEntityIds.add(link.target_id);
            nodes.push({
              id: link.target.id,
              label: link.target.title,
              type: link.target.type,
              permalink: link.target.permalink,
              central: false
            });
            nextEntities.push(link.target);
          }
        }
        
        // Process incoming links
        for (const link of incomingLinks) {
          if (!link.source) continue;
          
          // Add edge
          edges.push({
            id: `edge-${link.id}`,
            source: link.source_id,
            target: link.target_id,
            type: link.type
          });
          
          // Add connected entity if not processed
          if (!processedEntityIds.has(link.source_id)) {
            processedEntityIds.add(link.source_id);
            nodes.push({
              id: link.source.id,
              label: link.source.title,
              type: link.source.type,
              permalink: link.source.permalink,
              central: false
            });
            nextEntities.push(link.source);
          }
        }
      }
      
      // Update current entities for next iteration
      currentEntities = nextEntities;
    }
    
    logger.info(`Generated canvas with ${nodes.length} nodes and ${edges.length} edges`);
    
    return {
      nodes,
      edges,
      query
    };
  } catch (error) {
    logger.error(`Error in canvas tool: ${error.message}`);
    throw error;
  }
}
