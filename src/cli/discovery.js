import fs from 'fs/promises';
import path from 'path';
import { logger } from './app.js';
import { session } from './session.js';

class ResourceDiscovery {
  constructor() {
    this.resources = new Map();
  }

  async discoverResources(basePath) {
    try {
      const entries = await fs.readdir(basePath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(basePath, entry.name);
        if (entry.isDirectory()) {
          await this.discoverResources(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          this.resources.set(entry.name, {
            path: fullPath,
            type: this.determineResourceType(entry.name),
            lastModified: (await fs.stat(fullPath)).mtime
          });
        }
      }
    } catch (error) {
      logger.error(`Resource discovery failed: ${error.message}`);
    }
  }

  determineResourceType(filename) {
    if (filename.includes('chatgpt')) return 'CHATGPT';
    if (filename.includes('claude-conversations')) return 'CLAUDE_CONVERSATIONS';
    if (filename.includes('claude-projects')) return 'CLAUDE_PROJECTS';
    if (filename.includes('memory')) return 'MEMORY';
    return 'UNKNOWN';
  }

  getResources() {
    return Array.from(this.resources.values());
  }
}

// Singleton discovery instance
export const discovery = new ResourceDiscovery();
