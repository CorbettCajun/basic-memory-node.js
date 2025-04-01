/**
 * search Tool Handler
 * 
 * Searches for notes in the database using a query string
 */

import { Entity, sequelize } from '../db/index.js';
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
 * Search for notes in the knowledge base
 * 
 * @param {Object} params - Tool parameters
 * @param {string} params.query - Search query string
 * @param {number} [params.limit=10] - Maximum number of results to return
 * @param {string} [params.type] - Filter by entity type
 * @returns {Object} - Search results
 */
export async function searchTool(params) {
  try {
    const { query, limit = 10, type } = params;
    
    if (!query) {
      throw new Error('Query parameter is required');
    }
    
    logger.info(`Searching for: ${query} (limit: ${limit}${type ? `, type: ${type}` : ''})`);
    
    // Build search conditions
    const whereConditions = {
      [Op.or]: [
        { title: { [Op.like]: `%${query}%` } },
        { content: { [Op.like]: `%${query}%` } }
      ]
    };
    
    // Add type filter if specified
    if (type) {
      whereConditions.type = type;
    }
    
    // Execute search query
    const results = await Entity.findAll({
      where: whereConditions,
      limit: parseInt(limit, 10),
      order: [['last_modified', 'DESC']]
    });
    
    logger.info(`Found ${results.length} results for query: ${query}`);
    
    // Format results
    const formattedResults = results.map(entity => ({
      title: entity.title,
      permalink: entity.permalink,
      type: entity.type,
      excerpt: extractExcerpt(entity.content, query, 200),
      last_modified: entity.last_modified
    }));
    
    return {
      count: formattedResults.length,
      query,
      results: formattedResults
    };
  } catch (error) {
    logger.error(`Error in search tool: ${error.message}`);
    throw error;
  }
}

/**
 * Extract a relevant excerpt from content containing the query
 * 
 * @param {string} content - Content to extract excerpt from
 * @param {string} query - Query string to look for
 * @param {number} length - Maximum length of excerpt
 * @returns {string} - Extracted excerpt
 */
function extractExcerpt(content, query, length) {
  // Normalize content and query for case-insensitive comparison
  const normalizedContent = content.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  
  // Find position of query in content
  const position = normalizedContent.indexOf(normalizedQuery);
  
  if (position === -1) {
    // Query not found in content, return beginning of content
    return content.substring(0, length) + (content.length > length ? '...' : '');
  }
  
  // Calculate start position for excerpt
  let start = Math.max(0, position - length / 2);
  
  // Find beginning of word
  while (start > 0 && content[start] !== ' ' && content[start] !== '\n') {
    start--;
  }
  
  // Calculate end position for excerpt
  let end = Math.min(content.length, position + query.length + length / 2);
  
  // Find end of word
  while (end < content.length && content[end] !== ' ' && content[end] !== '\n') {
    end++;
  }
  
  // Extract excerpt
  let excerpt = content.substring(start, end).trim();
  
  // Add ellipsis if excerpt doesn't start/end at content boundaries
  if (start > 0) {
    excerpt = '...' + excerpt;
  }
  if (end < content.length) {
    excerpt = excerpt + '...';
  }
  
  return excerpt;
}
