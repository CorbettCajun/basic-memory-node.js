import { session } from './session.js';

// Supported capabilities
const CAPABILITIES = {
  IMPORT: {
    CHATGPT: 'import-chatgpt',
    CLAUDE_CONVERSATIONS: 'import-claude-conversations',
    CLAUDE_PROJECTS: 'import-claude-projects',
    MEMORY_JSON: 'import-memory-json'
  },
  TOOL: {
    LIST: 'tool-list',
    INFO: 'tool-info',
    RUN: 'tool-run'
  },
  PROJECT: {
    INFO: 'project-info',
    STATS: 'project-stats'
  }
};

class Capabilities {
  constructor() {
    this.available = new Set(Object.values(CAPABILITIES).flatMap(group => Object.values(group)));
    this.negotiated = new Set();
  }

  negotiate(capabilities) {
    // Validate requested capabilities
    const validCapabilities = capabilities.filter(cap => this.available.has(cap));
    this.negotiated = new Set(validCapabilities);
    return Array.from(this.negotiated);
  }

  has(capability) {
    return this.negotiated.has(capability);
  }

  list() {
    return Array.from(this.negotiated);
  }
}

// Singleton capabilities instance
export const capabilities = new Capabilities();
