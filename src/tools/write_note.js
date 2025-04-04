/**
 * write_note Tool Handler
 * 
 * Creates or updates a note in the database
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { slugify } from '../utils/slugify.js';
import { logger } from '../utils/logger.js';
import { getHomeDir } from '../utils/environment.js';
import { EntityModel } from '../db/models/entity_model.js';
import { TagModel } from '../db/models/tag.js';
import matter from 'gray-matter';

/**
 * Extract wiki-style links from markdown content
 * 
 * @param {string} content - Markdown content to parse
 * @returns {Array<string>} - Array of extracted link titles
 */
function extractWikiLinks(content) {
  if (!content) return [];
  
  // Match [[link]] pattern
  const linkRegex = /\[\[(.*?)\]\]/g;
  const links = [];
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    // Extract the link text (without the brackets)
    const linkText = match[1]?.trim();
    if (linkText) {
      links.push(linkText);
    }
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
  try {
    // Parse front matter
    const { content, data } = matter(rawContent);
    
    // Extract wiki links
    const links = extractWikiLinks(content);
    
    return {
      content,
      attributes: data,
      links
    };
  } catch (error) {
    logger.error('Error processing content', { error: error.message });
    return {
      content: rawContent,
      attributes: {},
      links: []
    };
  }
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
    const { title, content, attributes = {}, type = 'note' } = params;
    
    if (!title) {
      throw new Error('Title is required');
    }
    
    if (!content) {
      throw new Error('Content is required');
    }
    
    // Generate permalink from title if not provided
    const permalink = params.permalink || slugify(title);
    
    logger.debug('Writing note', { title, permalink });
    
    // Process content to extract front matter and links
    const processedContent = processContent(content);
    
    // Merge attributes from parameters and front matter
    const mergedAttributes = {
      ...processedContent.attributes,
      ...attributes
    };
    
    // Ensure title is always set
    mergedAttributes.title = title;
    
    // Format content with front matter
    const frontMatter = matter.stringify(processedContent.content, mergedAttributes);
    
    // Find or create entity
    let entity = await EntityModel.findOne({
      where: { permalink }
    });
    
    if (entity) {
      // Update existing entity
      await entity.update({
        title,
        content: frontMatter,
        entity_type: type,
        last_modified: new Date()
      });
      
      // Clear existing tags and add new ones
      await entity.setTags([]);
    } else {
      // Create new entity
      entity = await EntityModel.create({
        permalink,
        title,
        content: frontMatter,
        entity_type: type,
        created_at: new Date(),
        last_modified: new Date()
      });
    }
    
    // Process tags if present in attributes
    if (mergedAttributes.tags && Array.isArray(mergedAttributes.tags)) {
      const tagInstances = [];
      
      for (const tagName of mergedAttributes.tags) {
        const [tag] = await TagModel.findOrCreate({
          where: { name: tagName }
        });
        
        tagInstances.push(tag);
      }
      
      await entity.setTags(tagInstances);
    }
    
    // Write file to disk by default, matching Python version behavior
    // Only skip if explicitly set to 'false'
    if (process.env.SYNC_TO_FILES !== 'false') {
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
        
        // Write to disk
        writeFileSync(filePath, frontMatter);
        logger.debug('Wrote file to disk', { filePath });
      } catch (error) {
        logger.error('Error writing file to disk', { error: error.message });
      }
    }
    
    // Reload entity with tags
    await entity.reload({
      include: [TagModel]
    });
    
    return {
      permalink,
      title,
      content: processedContent.content,
      tags: entity.Tags ? entity.Tags.map(tag => tag.name) : [],
      created: entity.created_at,
      modified: entity.last_modified,
      links: processedContent.links
    };
  } catch (error) {
    logger.error('Error in write_note tool', { error: error.message });
    throw error;
  }
}
