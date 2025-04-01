/**
 * read_content Tool Handler
 * 
 * Reads content from a file path and returns it as markdown
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { extname, join, resolve } from 'path';
import { getHomeDir } from '../db/index.js';
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
 * Read content from a file path
 * 
 * @param {Object} params - Tool parameters
 * @param {string} params.path - Path to the file to read (relative to home directory)
 * @returns {Object} - Content of the file
 */
export async function readContentTool(params) {
  try {
    const { path } = params;
    
    if (!path) {
      throw new Error('Path parameter is required');
    }
    
    // Get home directory
    const homeDir = getHomeDir();
    
    // Resolve path (ensure it's within home directory)
    const targetPath = resolve(homeDir, path);
    if (!targetPath.startsWith(homeDir)) {
      throw new Error('Path must be within the basic-memory home directory');
    }
    
    // Check if file exists
    if (!existsSync(targetPath)) {
      logger.warn(`File not found: ${targetPath}`);
      return {
        found: false,
        message: `File not found: ${path}`
      };
    }
    
    // Check if it's a directory
    const stats = statSync(targetPath);
    if (stats.isDirectory()) {
      logger.warn(`Path is a directory, not a file: ${targetPath}`);
      return {
        found: false,
        message: `Path is a directory, not a file: ${path}`
      };
    }
    
    // Read file content
    const rawContent = readFileSync(targetPath, 'utf8');
    
    // Get file extension
    const extension = extname(targetPath).toLowerCase();
    
    // Process content based on file type
    let content = rawContent;
    let contentType = 'text/plain';
    
    if (extension === '.md' || extension === '.markdown') {
      contentType = 'text/markdown';
    } else if (extension === '.json') {
      contentType = 'application/json';
      try {
        // Pretty-print JSON
        const jsonObj = JSON.parse(rawContent);
        content = JSON.stringify(jsonObj, null, 2);
      } catch (error) {
        logger.warn(`Failed to parse JSON file: ${error.message}`);
      }
    } else if (extension === '.html' || extension === '.htm') {
      contentType = 'text/html';
    } else if (['.jpg', '.jpeg', '.png', '.gif', '.svg'].includes(extension)) {
      // For image files, return a markdown image reference
      const relativePath = path.replace(/\\/g, '/');
      content = `![Image: ${relativePath}](file://${targetPath})`;
      contentType = 'text/markdown';
    }
    
    logger.info(`Read content from file: ${targetPath}`);
    
    return {
      found: true,
      content,
      content_type: contentType,
      path: targetPath,
      relative_path: path,
      file_size: stats.size,
      last_modified: stats.mtime
    };
  } catch (error) {
    logger.error(`Error in read_content tool: ${error.message}`);
    throw error;
  }
}
