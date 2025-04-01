/**
 * write_note Tool Handler
 * 
 * Creates or updates a note in the database
 */

import { Entity, Link } from '../db/index.js';
import slugify from 'slugify';
import { marked } from 'marked';
import frontMatter from 'front-matter';
import pino from 'pino';
import { join } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { getHomeDir } from '../db/index.js';

// Configure logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

/**
 * Extract wiki-style links from markdown content
 * 
 * @param {string} content - Markdown content to parse
 * @returns {Array<string>} - Array of extracted link titles
 */
function extractWikiLinks(content) {
  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
  const links = [];
  let match;
  
  while ((match = wikiLinkRegex.exec(content)) !== null) {
    links.push(match[1]);
  }
  
  return links;
}

/**
 * Process the raw markdown content to extract front matter and parse links
 * 
 * @param {string} rawContent - Raw markdown content with potential front matter
 * @returns {Object} - Processed content and attributes
 */
function processContent(rawContent) {
  // Parse front matter
  const { attributes, body } = frontMatter(rawContent);
  
  // Extract wiki-style links
  const wikiLinks = extractWikiLinks(body);
  
  // Convert markdown to HTML for storage
  const htmlContent = marked(body);
  
  return {
    content: body,
    htmlContent,
    attributes,
    wikiLinks
  };
}

/**
 * Create or update a note in the knowledge base
 * 
 * @param {Object} params - Tool parameters
 * @param {string} params.title - Title of the note
 * @param {string} params.content - Markdown content of the note
 * @param {Object} [params.attributes] - Additional metadata for the note
 * @param {string} [params.type='note'] - Type of the entity
 * @param {string} [params.permalink] - Custom permalink (defaults to slugified title)
 * @returns {Object} - The created or updated note
 */
export async function writeNoteTool(params) {
  try {
    const { title, content: rawContent, type = 'note' } = params;
    let { attributes = {}, permalink } = params;
    
    // Process the content
    const { content, htmlContent, wikiLinks } = processContent(rawContent);
    
    // If attributes provided in params, merge with any from front matter
    if (typeof attributes === 'string') {
      attributes = JSON.parse(attributes);
    }
    
    // Generate permalink if not provided
    permalink = permalink || attributes.permalink || slugify(title, { lower: true, strict: true });
    
    // Try to find existing entity
    let entity = await Entity.findOne({ where: { permalink } });
    let created = false;
    
    // Create or update the entity
    if (entity) {
      logger.info(`Updating existing note: ${title}`);
      await entity.update({
        title,
        content,
        raw_content: rawContent,
        type,
        attributes,
        last_modified: new Date()
      });
    } else {
      logger.info(`Creating new note: ${title}`);
      entity = await Entity.create({
        title,
        permalink,
        content,
        raw_content: rawContent,
        type,
        attributes,
        last_modified: new Date()
      });
      created = true;
    }
    
    // Process wiki links and create relationships
    if (wikiLinks.length > 0) {
      logger.debug(`Processing ${wikiLinks.length} wiki links`);
      
      for (const linkTitle of wikiLinks) {
        // Generate permalink for the linked entity
        const linkPermalink = slugify(linkTitle, { lower: true, strict: true });
        
        // Find or create the target entity
        let targetEntity = await Entity.findOne({ where: { permalink: linkPermalink } });
        
        if (!targetEntity) {
          // Create a stub entity that can be filled in later
          targetEntity = await Entity.create({
            title: linkTitle,
            permalink: linkPermalink,
            content: `# ${linkTitle}\n\nThis is a stub note created from a link.`,
            raw_content: `# ${linkTitle}\n\nThis is a stub note created from a link.`,
            type: 'stub',
            attributes: {},
            last_modified: new Date()
          });
          logger.debug(`Created stub entity: ${linkTitle}`);
        }
        
        // Create link between source and target
        await Link.findOrCreate({
          where: {
            source_id: entity.id,
            target_id: targetEntity.id,
            type: 'reference'
          },
          defaults: {
            attributes: {}
          }
        });
      }
    }
    
    // Write file to disk if enabled
    if (process.env.SYNC_TO_FILES === 'true') {
      try {
        const home = getHomeDir();
        const dirPath = join(home, type + 's');
        const filePath = join(dirPath, `${permalink}.md`);
        
        // Ensure directory exists
        if (!existsSync(dirPath)) {
          mkdirSync(dirPath, { recursive: true });
        }
        
        // Update file path in entity
        await entity.update({ file_path: filePath });
        
        // Write content to file
        writeFileSync(filePath, rawContent);
        logger.debug(`Wrote note to file: ${filePath}`);
      } catch (error) {
        logger.error(`Error writing file: ${error.message}`);
        // Continue even if file write fails
      }
    }
    
    // Return the result
    return {
      title: entity.title,
      permalink: entity.permalink,
      created,
      updated: !created,
      type: entity.type,
      last_modified: entity.last_modified
    };
  } catch (error) {
    logger.error(`Error in write_note tool: ${error.message}`);
    throw error;
  }
}
