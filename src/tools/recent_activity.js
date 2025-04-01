/**
 * recent_activity Tool Handler
 * 
 * Returns the most recently modified notes in the database
 */

import { Entity } from '../db/index.js';
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
 * Get recent activity from the knowledge base
 * 
 * @param {Object} params - Tool parameters
 * @param {number} [params.limit=10] - Maximum number of results to return
 * @param {string} [params.type] - Filter by entity type
 * @returns {Object} - Recent notes
 */
export async function recentActivityTool(params = {}) {
  try {
    const { limit = 10, type } = params;
    
    logger.info(`Getting recent activity (limit: ${limit}${type ? `, type: ${type}` : ''})`);
    
    // Build query conditions
    const whereConditions = {};
    
    // Add type filter if specified
    if (type) {
      whereConditions.type = type;
    }
    
    // Execute query
    const results = await Entity.findAll({
      where: whereConditions,
      limit: parseInt(limit, 10),
      order: [['last_modified', 'DESC']]
    });
    
    logger.info(`Found ${results.length} recent items`);
    
    // Format results
    const formattedResults = results.map(entity => ({
      title: entity.title,
      permalink: entity.permalink,
      type: entity.type,
      excerpt: extractExcerpt(entity.content, 150),
      last_modified: entity.last_modified
    }));
    
    return {
      count: formattedResults.length,
      results: formattedResults
    };
  } catch (error) {
    logger.error(`Error in recent_activity tool: ${error.message}`);
    throw error;
  }
}

/**
 * Extract a brief excerpt from content
 * 
 * @param {string} content - Content to extract excerpt from
 * @param {number} length - Maximum length of excerpt
 * @returns {string} - Extracted excerpt
 */
function extractExcerpt(content, length) {
  // Remove markdown headings
  const cleanContent = content.replace(/^#+ (.*)$/gm, '$1');
  
  // Extract first few characters
  const excerpt = cleanContent.substring(0, length).trim();
  
  // Add ellipsis if content is longer than excerpt
  return excerpt + (content.length > length ? '...' : '');
}
