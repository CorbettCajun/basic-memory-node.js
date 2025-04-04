/**
 * Markdown Processor for Basic Memory
 * 
 * Handles the conversion between entity objects and markdown files
 * Provides file operations for reading and writing markdown files
 */

import fs from 'fs/promises';
import path from 'path';
import { EntityMarkdown, EntityFrontmatter } from './models/entity.js';
import matter from 'gray-matter';
import { marked } from 'marked';
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
 * MarkdownProcessor class for handling markdown files
 */
export class MarkdownProcessor {
  /**
   * Create a new MarkdownProcessor
   * @param {string} homeDir - Base directory for markdown files
   */
  constructor(homeDir) {
    this.homeDir = homeDir;
    logger.debug(`Initialized MarkdownProcessor with home directory: ${homeDir}`);
  }

  /**
   * Read a markdown file and convert it to an EntityMarkdown object
   * @param {string} filePath - Path to the markdown file
   * @returns {Promise<EntityMarkdown>} - The entity object
   */
  async readFile(filePath) {
    try {
      const fullPath = this._resolveFullPath(filePath);
      logger.debug(`Reading markdown file: ${fullPath}`);
      
      const fileContents = await fs.readFile(fullPath, 'utf8');
      const { data: frontmatter, content } = matter(fileContents);
      
      return new EntityMarkdown({
        frontmatter: new EntityFrontmatter({ metadata: frontmatter }),
        content: content.trim()
      });
    } catch (error) {
      logger.error(`Error reading markdown file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Write an EntityMarkdown object to a file
   * @param {string} filePath - Path to write the file
   * @param {EntityMarkdown} entity - The entity to write
   * @returns {Promise<string>} - The path to the written file
   */
  async writeFile(filePath, entity) {
    try {
      const fullPath = this._resolveFullPath(filePath);
      logger.debug(`Writing markdown file: ${fullPath}`);
      
      // Ensure directory exists
      await this._ensureDirectoryExists(path.dirname(fullPath));
      
      // Format the frontmatter and content
      const metadata = entity.frontmatter.metadata || {};
      const content = entity.content || '';
      
      // Use gray-matter to create the full markdown content
      const fileContent = matter.stringify(content, metadata);
      
      // Write the file
      await fs.writeFile(fullPath, fileContent, 'utf8');
      
      return fullPath;
    } catch (error) {
      logger.error(`Error writing markdown file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert markdown content to HTML
   * @param {string} markdown - Markdown content
   * @returns {string} - HTML content
   */
  markdownToHtml(markdown) {
    try {
      return marked(markdown);
    } catch (error) {
      logger.error(`Error converting markdown to HTML: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ensure a directory exists, creating it if necessary
   * @param {string} dirPath - Path to the directory
   * @returns {Promise<void>}
   * @private
   */
  async _ensureDirectoryExists(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Ignore error if directory already exists
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Resolve a relative path to an absolute path
   * @param {string} filePath - Relative or absolute path
   * @returns {string} - Absolute path
   * @private
   */
  _resolveFullPath(filePath) {
    // If the path is already absolute, return it
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    
    // Otherwise, resolve it relative to the home directory
    return path.resolve(this.homeDir, filePath);
  }
}

export default MarkdownProcessor;
