/**
 * project_info Tool Handler
 * 
 * Retrieves information about projects from the knowledge base
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
 * Get project information from the knowledge base
 * 
 * @param {Object} params - Tool parameters
 * @param {string} params.name - Name of the project to retrieve
 * @returns {Object} - Project information
 */
export async function projectInfoTool(params) {
  try {
    const { name } = params;
    
    if (!name) {
      throw new Error('Project name parameter is required');
    }
    
    logger.info(`Getting project info for: ${name}`);
    
    // Find project entity
    const project = await Entity.findOne({
      where: {
        [Op.and]: [
          { type: 'project' },
          {
            [Op.or]: [
              { title: name },
              { title: { [Op.like]: `%${name}%` } },
              { permalink: name }
            ]
          }
        ]
      }
    });
    
    if (!project) {
      logger.warn(`Project not found: ${name}`);
      return {
        found: false,
        message: `Project not found: ${name}`
      };
    }
    
    // Get related entities
    const outgoingLinks = await Link.findAll({
      where: { source_id: project.id },
      include: [{ model: Entity, as: 'target' }]
    });
    
    const incomingLinks = await Link.findAll({
      where: { target_id: project.id },
      include: [{ model: Entity, as: 'source' }]
    });
    
    // Format related notes
    const relatedNotes = [];
    
    // Add outgoing references
    for (const link of outgoingLinks) {
      if (link.target) {
        relatedNotes.push({
          title: link.target.title,
          permalink: link.target.permalink,
          type: link.target.type,
          relationship: 'referenced_by'
        });
      }
    }
    
    // Add incoming references
    for (const link of incomingLinks) {
      if (link.source) {
        relatedNotes.push({
          title: link.source.title,
          permalink: link.source.permalink,
          type: link.source.type,
          relationship: 'references'
        });
      }
    }
    
    // Extract project metadata
    const metadata = {
      status: project.attributes.status || 'unknown',
      start_date: project.attributes.start_date,
      due_date: project.attributes.due_date,
      tags: project.attributes.tags || [],
      priority: project.attributes.priority,
      ...project.attributes
    };
    
    logger.info(`Found project: ${project.title} with ${relatedNotes.length} related notes`);
    
    // Return formatted project info
    return {
      found: true,
      title: project.title,
      content: project.content,
      permalink: project.permalink,
      metadata,
      related_notes: relatedNotes,
      last_modified: project.last_modified
    };
  } catch (error) {
    logger.error(`Error in project_info tool: ${error.message}`);
    throw error;
  }
}
