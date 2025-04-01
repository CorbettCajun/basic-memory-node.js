/**
 * read_note Tool Handler
 * 
 * Retrieves a note from the database by title or permalink
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
 * Read a note from the knowledge base
 * 
 * @param {Object} params - Tool parameters
 * @param {string} [params.title] - Title of the note to retrieve
 * @param {string} [params.permalink] - Permalink of the note to retrieve
 * @returns {Object} - The retrieved note
 */
export async function readNoteTool(params) {
  try {
    const { title, permalink } = params;
    
    if (!title && !permalink) {
      throw new Error('Either title or permalink must be provided');
    }
    
    let entity;
    
    // Search by permalink first (more reliable)
    if (permalink) {
      logger.debug(`Looking up note by permalink: ${permalink}`);
      entity = await Entity.findOne({ where: { permalink } });
    } 
    // Fallback to title search
    else if (title) {
      logger.debug(`Looking up note by title: ${title}`);
      entity = await Entity.findOne({ where: { title } });
    }
    
    if (!entity) {
      const searchKey = permalink || title;
      const errorMsg = `Note not found: ${searchKey}`;
      logger.warn(errorMsg);
      return { 
        found: false, 
        message: errorMsg
      };
    }
    
    logger.info(`Note found: ${entity.title}`);
    
    // Return the note data
    return {
      found: true,
      title: entity.title,
      content: entity.content,
      permalink: entity.permalink,
      type: entity.type,
      attributes: entity.attributes,
      last_modified: entity.last_modified
    };
  } catch (error) {
    logger.error(`Error in read_note tool: ${error.message}`);
    throw error;
  }
}
