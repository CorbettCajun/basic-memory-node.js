/**
 * File Synchronization for Basic Memory
 * 
 * Synchronizes Markdown files with the database in both directions
 */

import { join, parse, relative } from 'path';
import { readFileSync, writeFileSync, existsSync, unlinkSync, statSync } from 'fs';
import { mkdirSync, readdirSync } from 'fs';
import chokidar from 'chokidar';
import frontMatter from 'front-matter';
import slugify from 'slugify';
import { Entity, Relation, initializeDatabase } from './db/index.js';
import pino from 'pino';
import { glob } from 'glob';
import { Op } from 'sequelize';

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
 * Process a single Markdown file and add/update it in the database
 * 
 * @param {string} filePath - Path to the markdown file
 * @param {string} directory - Base directory for calculating relative paths
 * @returns {Object} - The created or updated entity
 */
async function processFile(filePath, directory) {
  try {
    // Get file stats
    const stats = statSync(filePath);
    
    // Read file content
    const rawContent = readFileSync(filePath, 'utf8');
    
    // Parse front matter
    const { attributes, body } = frontMatter(rawContent);
    
    // Extract title from front matter or filename
    const fileInfo = parse(filePath);
    let title = attributes.title;
    
    if (!title) {
      // Try to extract title from first heading
      const headingMatch = body.match(/^# (.*)$/m);
      if (headingMatch) {
        title = headingMatch[1].trim();
      } else {
        // Fallback to filename
        title = fileInfo.name
          .replace(/-/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
      }
    }
    
    // Determine entity type from directory structure
    const relPath = relative(directory, filePath);
    const pathParts = relPath.split(/[\\/]/);
    let type = 'note';
    
    if (pathParts.length > 1) {
      // Use parent directory as type, singular form
      type = pathParts[0].replace(/s$/, '');
    }
    
    // Generate permalink if not in front matter
    const permalink = attributes.permalink || 
                     slugify(fileInfo.name, { lower: true, strict: true });
    
    // Extract wiki links
    const wikiLinks = extractWikiLinks(body);
    
    // Find or create entity
    let entity = await Entity.findOne({ where: { permalink } });
    let created = false;
    
    if (entity) {
      // Only update if file is newer than last modification
      if (new Date(stats.mtime) > new Date(entity.last_modified)) {
        logger.debug(`Updating entity from file: ${permalink}`);
        await entity.update({
          title,
          content: body,
          raw_content: rawContent,
          type,
          attributes,
          file_path: filePath,
          last_modified: stats.mtime
        });
      }
    } else {
      logger.info(`Creating new entity from file: ${permalink}`);
      entity = await Entity.create({
        title,
        permalink,
        content: body,
        raw_content: rawContent,
        type,
        attributes,
        file_path: filePath,
        last_modified: stats.mtime
      });
      created = true;
    }
    
    // Process wiki links
    if (wikiLinks.length > 0) {
      logger.debug(`Processing ${wikiLinks.length} wiki links in ${permalink}`);
      
      for (const linkTitle of wikiLinks) {
        // Generate permalink for the linked entity
        const linkPermalink = slugify(linkTitle, { lower: true, strict: true });
        
        // Find or create the target entity
        let targetEntity = await Entity.findOne({ where: { permalink: linkPermalink } });
        
        if (!targetEntity) {
          // Check if there's a corresponding file
          const potentialFilePaths = [
            join(directory, `${linkPermalink}.md`),
            join(directory, 'notes', `${linkPermalink}.md`),
            join(directory, 'concepts', `${linkPermalink}.md`),
            join(directory, 'projects', `${linkPermalink}.md`),
            join(directory, 'references', `${linkPermalink}.md`)
          ];
          
          let fileExists = false;
          let existingFilePath;
          
          for (const path of potentialFilePaths) {
            if (existsSync(path)) {
              fileExists = true;
              existingFilePath = path;
              break;
            }
          }
          
          if (fileExists) {
            // Process the existing file
            await processFile(existingFilePath, directory);
            targetEntity = await Entity.findOne({ where: { permalink: linkPermalink } });
          } else {
            // Create a stub entity
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
        }
        
        // Create link between source and target
        await Relation.findOrCreate({
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
    
    return { entity, created };
  } catch (error) {
    logger.error(`Error processing file ${filePath}: ${error.message}`);
    throw error;
  }
}

/**
 * Handle file deletion event
 * 
 * @param {string} filePath - Path to the deleted file
 */
async function handleDeletedFile(filePath) {
  try {
    // Find entity by file path
    const entity = await Entity.findOne({ where: { file_path: filePath } });
    
    if (!entity) {
      logger.warn(`No entity found for deleted file: ${filePath}`);
      return;
    }
    
    logger.info(`Deleting entity for removed file: ${entity.title}`);
    
    // Delete links
    await Relation.destroy({
      where: {
        [Op.or]: [
          { source_id: entity.id },
          { target_id: entity.id }
        ]
      }
    });
    
    // Delete entity
    await entity.destroy();
  } catch (error) {
    logger.error(`Error handling deleted file ${filePath}: ${error.message}`);
  }
}

/**
 * Synchronize database entries to files
 * 
 * @param {string} directory - Base directory for markdown files
 */
async function syncDatabaseToFiles(directory) {
  try {
    logger.info('Synchronizing database to files...');
    
    // Get all entities that don't have a file path or have a non-existent file path
    const entities = await Entity.findAll({
      where: {
        [Op.or]: [
          { file_path: null },
          { file_path: '' }
        ]
      }
    });
    
    logger.info(`Found ${entities.length} entities to sync to files`);
    
    for (const entity of entities) {
      try {
        // Determine directory based on type
        let typePath;
        if (entity.type === 'stub') {
          typePath = join(directory, 'notes');
        } else {
          typePath = join(directory, `${entity.type}s`);
        }
        
        // Ensure directory exists
        if (!existsSync(typePath)) {
          mkdirSync(typePath, { recursive: true });
        }
        
        // Create file path
        const filePath = join(typePath, `${entity.permalink}.md`);
        
        // Write content to file
        writeFileSync(filePath, entity.raw_content);
        
        // Update entity with file path
        await entity.update({ file_path: filePath });
        
        logger.debug(`Wrote entity to file: ${entity.title} -> ${filePath}`);
      } catch (error) {
        logger.error(`Error syncing entity ${entity.title} to file: ${error.message}`);
      }
    }
    
    logger.info('Database to files synchronization completed');
  } catch (error) {
    logger.error(`Error syncing database to files: ${error.message}`);
  }
}

/**
 * Synchronize files to database
 * 
 * @param {string} directory - Base directory for markdown files
 */
export async function synchronize({ directory }) {
  try {
    logger.info(`Starting synchronization from ${directory}`);
    
    // Ensure database is initialized
    await initializeDatabase();
    
    // Find all markdown files recursively
    const files = await glob('**/*.md', { cwd: directory, absolute: true });
    
    logger.info(`Found ${files.length} markdown files to process`);
    
    // Process each file
    let created = 0;
    let updated = 0;
    
    for (const file of files) {
      try {
        const result = await processFile(file, directory);
        if (result.created) {
          created++;
        } else {
          updated++;
        }
      } catch (error) {
        logger.error(`Error processing file ${file}: ${error.message}`);
      }
    }
    
    logger.info(`Processed ${files.length} files: ${created} created, ${updated} updated`);
    
    // Sync database entries to files
    await syncDatabaseToFiles(directory);
    
    return {
      success: true,
      processed: files.length,
      created,
      updated
    };
  } catch (error) {
    logger.error(`Synchronization failed: ${error.message}`);
    throw error;
  }
}

/**
 * Watch directory for changes and sync automatically
 * 
 * @param {string} directory - Directory to watch
 * @returns {Object} - Watcher instance
 */
export function watchDirectory(directory) {
  logger.info(`Setting up file watcher for ${directory}`);
  
  // Initialize chokidar watcher
  const watcher = chokidar.watch(directory, {
    ignored: /(^|[\/\\])\../, // Ignore dot files
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });
  
  // File add/change events
  watcher.on('add', async (path) => {
    if (path.endsWith('.md')) {
      logger.info(`File added: ${path}`);
      try {
        await processFile(path, directory);
      } catch (error) {
        logger.error(`Error processing added file: ${error.message}`);
      }
    }
  });
  
  watcher.on('change', async (path) => {
    if (path.endsWith('.md')) {
      logger.info(`File changed: ${path}`);
      try {
        await processFile(path, directory);
      } catch (error) {
        logger.error(`Error processing changed file: ${error.message}`);
      }
    }
  });
  
  // File delete events
  watcher.on('unlink', async (path) => {
    if (path.endsWith('.md')) {
      logger.info(`File deleted: ${path}`);
      try {
        await handleDeletedFile(path);
      } catch (error) {
        logger.error(`Error handling deleted file: ${error.message}`);
      }
    }
  });
  
  // Error handling
  watcher.on('error', (error) => {
    logger.error(`Watcher error: ${error}`);
  });
  
  logger.info('File watcher started successfully');
  
  return watcher;
}

// Export functions for command-line usage
export default {
  synchronize,
  watchDirectory
};
