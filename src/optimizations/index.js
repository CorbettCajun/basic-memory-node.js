/**
 * Performance Optimizations
 * 
 * This module integrates various performance optimizations for the Basic Memory system.
 * The goal is to achieve superior performance compared to the Python implementation,
 * meeting or exceeding the targets set in the Performance Parity documentation.
 */

import searchOptimizations from './search-optimizations.js';

/**
 * Apply all performance optimizations
 * 
 * @returns {Promise<Object>} Status of optimization applications
 */
export async function applyAllOptimizations() {
  const status = {
    search: await searchOptimizations(),
    // Additional optimization categories can be added here
  };
  
  return status;
}

export { default as searchOptimizations } from './search-optimizations.js';

export default {
  applyAllOptimizations
};
