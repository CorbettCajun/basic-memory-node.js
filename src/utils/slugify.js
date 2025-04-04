/**
 * Slugify Utility
 * 
 * Wrapper around the slugify package to ensure consistent slug generation across the application.
 * This provides a standardized way to create permalinks and slugs for entities.
 */

import slugifyLib from 'slugify';

/**
 * Convert a string to a URL-friendly slug
 * 
 * @param {string} text - Text to convert to a slug
 * @param {Object} options - Slugify options
 * @returns {string} URL-friendly slug
 */
export function slugify(text, options = {}) {
  const defaultOptions = {
    lower: true,       // Convert to lowercase
    strict: true,      // Remove special characters
    trim: true,        // Trim leading and trailing whitespace
    replacement: '-'   // Replace spaces with hyphens
  };
  
  // Merge default options with any provided options
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Return null if input is falsy
  if (!text) {
    return null;
  }
  
  return slugifyLib(text, mergedOptions);
}
