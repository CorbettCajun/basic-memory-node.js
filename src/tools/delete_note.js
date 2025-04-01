/**
 * delete_note Tool Handler
 * 
 * Deletes a note from the database by title or permalink
 */

import { Entity, Link } from '../db/index.js';
import { Op } from 'sequelize';
import { unlinkSync, existsSync } from 'fs';
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
 * Delete a note from the knowledge base
 * 
 * @param {Object} params - Tool parameters
 * @param {string} [params.title] - Title of the note to delete
 * @param {string} [params.permalink] - Permalink of the note to delete
 * @returns {Object} - Result of the deletion operation
 */
export async function deleteNoteTool(params) {
  try {
    const { title, permalink } = params;
    
    if (!title && !permalink) {
      throw new Error('Either title or permalink must be provided');
    }
    
    // Find the entity to delete
    let entity;
    
    if (permalink) {
      logger.debug(`Looking up note to delete by permalink: ${permalink}`);
      entity = await Entity.findOne({ where: { permalink } });
    } else if (title) {
      logger.debug(`Looking up note to delete by title: ${title}`);
      entity = await Entity.findOne({ where: { title } });
    }
    
    if (!entity) {
      const searchKey = permalink || title;
      const errorMsg = `Note not found: ${searchKey}`;
      logger.warn(errorMsg);
      return { 
        deleted: false, 
        message: errorMsg
      };
    }
    
    // Delete file if it exists and sync is enabled
    if (process.env.SYNC_TO_FILES === 'true' && entity.file_path) {
      try {
        if (existsSync(entity.file_path)) {
          unlinkSync(entity.file_path);
          logger.debug(`Deleted file: ${entity.file_path}`);
        }
      } catch (error) {
        logger.error(`Error deleting file: ${error.message}`);
        // Continue even if file deletion fails
      }
    }
    
    // Delete all links to and from this entity
    await Link.destroy({
      where: {
        [Op.or]: [
          { source_id: entity.id },
          { target_id: entity.id }
        ]
      }
    });
    
    // Delete the entity
    await entity.destroy();
    
    logger.info(`Deleted note: ${entity.title}`);
    
    // Return the result
    return {
      deleted: true,
      title: entity.title,
      permalink: entity.permalink
    };
  } catch (error) {
    logger.error(`Error in delete_note tool: ${error.message}`);
    throw error;
  }
}
