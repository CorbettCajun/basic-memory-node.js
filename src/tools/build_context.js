/**
 * build_context Tool Handler
 * 
 * Builds contextual information from the knowledge base for AI assistants
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
 * Build context from the knowledge base for AI assistants
 * 
 * @param {Object} params - Tool parameters
 * @param {string} params.query - Query to find relevant context
 * @param {number} [params.max_results=5] - Maximum number of notes to include
 * @param {number} [params.max_tokens=4000] - Maximum total tokens to return
 * @returns {Object} - Contextual information
 */
export async function buildContextTool(params) {
  try {
    const { query, max_results = 5, max_tokens = 4000 } = params;
    
    if (!query) {
      throw new Error('Query parameter is required');
    }
    
    logger.info(`Building context for: ${query} (max_results: ${max_results}, max_tokens: ${max_tokens})`);
    
    // Find relevant entities
    const entities = await Entity.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${query}%` } },
          { content: { [Op.like]: `%${query}%` } }
        ]
      },
      order: [
        [sequelize.literal(`CASE 
          WHEN title LIKE '%${query}%' THEN 1 
          ELSE 2 
        END`), 'ASC'],
        ['last_modified', 'DESC']
      ],
      limit: parseInt(max_results, 10)
    });
    
    if (entities.length === 0) {
      logger.warn(`No relevant context found for query: ${query}`);
      return {
        context: `No relevant information found for "${query}"`,
        source_count: 0,
        sources: []
      };
    }
    
    // Estimating tokens (rough approximation: 1 token ≈ 4 characters)
    const estimatedTokensPerChar = 0.25;
    
    // Build context, respecting token limit
    let contextParts = [];
    let totalTokens = 0;
    let sources = [];
    
    for (const entity of entities) {
      // Estimate tokens for this entity
      const entityContent = `## ${entity.title}\n\n${entity.content}`;
      const estimatedTokens = Math.ceil(entityContent.length * estimatedTokensPerChar);
      
      // Check if adding this would exceed token limit
      if (totalTokens + estimatedTokens > max_tokens) {
        // If it's the first entity, include a truncated version
        if (contextParts.length === 0) {
          const availableTokens = max_tokens;
          const availableChars = Math.floor(availableTokens / estimatedTokensPerChar);
          
          const truncatedContent = `## ${entity.title}\n\n${entity.content.substring(0, availableChars)}...\n\n(Content truncated due to token limit)`;
          contextParts.push(truncatedContent);
          
          sources.push({
            title: entity.title,
            permalink: entity.permalink,
            type: entity.type,
            truncated: true
          });
        }
        break;
      }
      
      // Add entity to context
      contextParts.push(`## ${entity.title}\n\n${entity.content}`);
      totalTokens += estimatedTokens;
      
      sources.push({
        title: entity.title,
        permalink: entity.permalink,
        type: entity.type,
        truncated: false
      });
    }
    
    // Combine all parts
    const context = contextParts.join('\n\n---\n\n');
    
    logger.info(`Built context with ${sources.length} sources (approx. ${totalTokens} tokens)`);
    
    return {
      context,
      source_count: sources.length,
      sources
    };
  } catch (error) {
    logger.error(`Error in build_context tool: ${error.message}`);
    throw error;
  }
}
