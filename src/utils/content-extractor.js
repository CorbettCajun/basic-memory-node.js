/**
 * Content Extraction Utilities
 * 
 * Tools for extracting and processing content from various formats
 * Compatible with the Python implementation's extraction capabilities
 */

import frontMatter from 'front-matter';
import { marked } from 'marked';
import { JSDOM } from 'jsdom';
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
 * Extract front matter and content from a Markdown string
 * 
 * @param {string} markdownContent - Raw markdown content
 * @returns {Object} - Object with attributes (from front matter) and body content
 */
export function extractFrontMatter(markdownContent) {
  try {
    const result = frontMatter(markdownContent);
    return {
      attributes: result.attributes,
      body: result.body,
      frontmatter: result.frontmatter
    };
  } catch (error) {
    logger.warn(`Error extracting front matter: ${error.message}`);
    return {
      attributes: {},
      body: markdownContent
    };
  }
}

/**
 * Extract wiki-style links from markdown content
 * 
 * @param {string} markdownContent - Markdown content to parse
 * @returns {Array<Object>} - Array of extracted links with title and original text
 */
export function extractWikiLinks(markdownContent) {
  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
  const links = [];
  let match;
  
  while ((match = wikiLinkRegex.exec(markdownContent)) !== null) {
    const fullMatch = match[0];
    const linkText = match[1];
    
    // Handle link text with pipe for display name
    let title, alias;
    if (linkText.includes('|')) {
      [title, alias] = linkText.split('|').map(s => s.trim());
    } else {
      title = linkText.trim();
      alias = null;
    }
    
    links.push({
      title,
      alias,
      originalText: fullMatch,
      position: match.index
    });
  }
  
  return links;
}

/**
 * Extract regular Markdown links
 * 
 * @param {string} markdownContent - Markdown content to parse
 * @returns {Array<Object>} - Array of extracted links with url, text and original markdown
 */
export function extractMarkdownLinks(markdownContent) {
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links = [];
  let match;
  
  while ((match = markdownLinkRegex.exec(markdownContent)) !== null) {
    const fullMatch = match[0];
    const text = match[1];
    const url = match[2];
    
    links.push({
      text,
      url,
      originalText: fullMatch,
      position: match.index
    });
  }
  
  return links;
}

/**
 * Extract heading structure from markdown content
 * 
 * @param {string} markdownContent - Markdown content to parse
 * @returns {Array<Object>} - Array of headings with level, text and position
 */
export function extractHeadings(markdownContent) {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings = [];
  let match;
  
  while ((match = headingRegex.exec(markdownContent)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    
    headings.push({
      level,
      text,
      position: match.index
    });
  }
  
  return headings;
}

/**
 * Extract inline tags from markdown content (hashtag style)
 * 
 * @param {string} markdownContent - Markdown content to parse
 * @returns {Array<string>} - Array of extracted tags without the # prefix
 */
export function extractInlineTags(markdownContent) {
  const tagRegex = /(?:^|\s)#([a-zA-Z0-9_-]+)/g;
  const tags = [];
  let match;
  
  while ((match = tagRegex.exec(markdownContent)) !== null) {
    const tag = match[1];
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }
  
  return tags;
}

/**
 * Extract code blocks from markdown content
 * 
 * @param {string} markdownContent - Markdown content to parse
 * @returns {Array<Object>} - Array of code blocks with language and content
 */
export function extractCodeBlocks(markdownContent) {
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)?\n([\s\S]*?)```/g;
  const codeBlocks = [];
  let match;
  
  while ((match = codeBlockRegex.exec(markdownContent)) !== null) {
    const language = match[1]?.trim() || null;
    const code = match[2];
    
    codeBlocks.push({
      language,
      code,
      position: match.index
    });
  }
  
  return codeBlocks;
}

/**
 * Convert markdown to HTML
 * 
 * @param {string} markdownContent - Markdown content to convert
 * @returns {string} - HTML content
 */
export function markdownToHtml(markdownContent) {
  return marked(markdownContent);
}

/**
 * Extract plain text content from markdown
 * 
 * @param {string} markdownContent - Markdown content to process
 * @returns {string} - Plain text content without markdown formatting
 */
export function markdownToPlainText(markdownContent) {
  // First convert to HTML
  const html = markdownToHtml(markdownContent);
  
  // Then extract text from HTML
  const dom = new JSDOM(html);
  const text = dom.window.document.body.textContent || '';
  
  // Clean up whitespace
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Split content into sections based on headings
 * 
 * @param {string} markdownContent - Markdown content to split
 * @returns {Array<Object>} - Array of sections with heading and content
 */
export function splitIntoSections(markdownContent) {
  const headings = extractHeadings(markdownContent);
  
  if (headings.length === 0) {
    return [{
      heading: null,
      level: 0,
      content: markdownContent
    }];
  }
  
  const sections = [];
  
  // Add content before the first heading if any
  if (headings[0].position > 0) {
    sections.push({
      heading: null,
      level: 0,
      content: markdownContent.substring(0, headings[0].position).trim()
    });
  }
  
  // Add each section with its heading
  for (let i = 0; i < headings.length; i++) {
    const currentHeading = headings[i];
    const nextHeading = headings[i + 1];
    
    const content = nextHeading
      ? markdownContent.substring(
          currentHeading.position, 
          nextHeading.position
        )
      : markdownContent.substring(currentHeading.position);
    
    // Extract just the heading line
    const headingMatch = content.match(/^(#{1,6}\s+.+)$/m);
    const headingLine = headingMatch ? headingMatch[1] : '';
    
    // Get content without the heading line
    const contentWithoutHeading = content.replace(headingLine, '').trim();
    
    sections.push({
      heading: currentHeading.text,
      level: currentHeading.level,
      content: contentWithoutHeading
    });
  }
  
  return sections;
}

/**
 * Generate a summary of markdown content
 * 
 * @param {string} markdownContent - Markdown content to summarize
 * @param {Object} options - Summary options
 * @param {number} options.maxLength - Maximum length of summary in characters
 * @returns {string} - Summary text
 */
export function generateSummary(markdownContent, options = {}) {
  const maxLength = options.maxLength || 200;
  
  // Extract front matter
  const { attributes, body } = extractFrontMatter(markdownContent);
  
  // Get plain text
  const plainText = markdownToPlainText(body);
  
  // Create summary by truncating plain text
  let summary = plainText.substring(0, maxLength);
  
  // Add ellipsis if truncated
  if (plainText.length > maxLength) {
    summary += '...';
  }
  
  return summary;
}

/**
 * Extract embedded JSON data from markdown code blocks
 * 
 * @param {string} markdownContent - Markdown content to parse
 * @returns {Array<Object>} - Array of extracted JSON objects
 */
export function extractJsonFromMarkdown(markdownContent) {
  const codeBlocks = extractCodeBlocks(markdownContent);
  const jsonBlocks = [];
  
  for (const block of codeBlocks) {
    if (block.language === 'json') {
      try {
        const json = JSON.parse(block.code);
        jsonBlocks.push(json);
      } catch (error) {
        logger.warn(`Error parsing JSON code block: ${error.message}`);
      }
    }
  }
  
  return jsonBlocks;
}

/**
 * Extract metadata from markdown content
 * This combines front matter attributes and inline tags
 * 
 * @param {string} markdownContent - Markdown content to analyze
 * @returns {Object} - Combined metadata
 */
export function extractMetadata(markdownContent) {
  // Get front matter attributes
  const { attributes } = extractFrontMatter(markdownContent);
  
  // Get inline tags
  const inlineTags = extractInlineTags(markdownContent);
  
  // Combine tags from front matter and inline
  let tags = Array.isArray(attributes.tags) ? [...attributes.tags] : [];
  if (typeof attributes.tags === 'string') {
    tags = [...tags, ...attributes.tags.split(',').map(t => t.trim())];
  }
  
  // Add inline tags
  tags = [...new Set([...tags, ...inlineTags])];
  
  // Create final metadata
  const metadata = {
    ...attributes,
    tags: tags.length > 0 ? tags : undefined
  };
  
  return metadata;
}

// Export all functions as a default object for CommonJS compatibility
export default {
  extractFrontMatter,
  extractWikiLinks,
  extractMarkdownLinks,
  extractHeadings,
  extractInlineTags,
  extractCodeBlocks,
  markdownToHtml,
  markdownToPlainText,
  splitIntoSections,
  generateSummary,
  extractJsonFromMarkdown,
  extractMetadata
};
