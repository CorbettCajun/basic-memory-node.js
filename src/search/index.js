import fs from 'fs/promises';
import path from 'path';
import lunr from 'lunr';
import { getBasicMemoryConfig } from '../config/index.js';

class MemorySearchEngine {
  constructor() {
    this.index = null;
    this.documents = [];
  }

  async initialize() {
    const config = await getBasicMemoryConfig();
    const memoryDir = config.paths.memories || path.join(process.env.HOME, '.basic-memory', 'memories');

    // Load all memory files
    const memoryFiles = await this.loadMemoryFiles(memoryDir);
    
    // Build Lunr index
    this.index = lunr(function() {
      // Configure search fields
      this.field('title');
      this.field('content');
      this.field('tags');
      this.ref('id');

      // Add documents to index
      memoryFiles.forEach((doc, idx) => {
        this.add({
          id: idx,
          title: doc.title || '',
          content: doc.content || '',
          tags: (doc.tags || []).join(' ')
        });
      });
    });

    this.documents = memoryFiles;
  }

  async loadMemoryFiles(directory) {
    const memories = [];
    
    try {
      const files = await fs.readdir(directory);
      
      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = path.join(directory, file);
          const content = await fs.readFile(filePath, 'utf8');
          
          // Extract front matter and content
          const { frontmatter, body } = this.parseFrontMatter(content);
          
          memories.push({
            id: file,
            title: frontmatter.title || path.basename(file, '.md'),
            content: body,
            tags: frontmatter.tags || [],
            path: filePath
          });
        }
      }
    } catch (error) {
      console.error('Error loading memory files:', error);
    }
    
    return memories;
  }

  parseFrontMatter(fileContent) {
    const frontmatterMatch = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    if (frontmatterMatch) {
      const frontmatter = this.parseYAML(frontmatterMatch[1]);
      const body = frontmatterMatch[2];
      return { frontmatter, body };
    }
    
    return { 
      frontmatter: {}, 
      body: fileContent 
    };
  }

  parseYAML(yamlString) {
    const lines = yamlString.split('\n');
    const frontmatter = {};
    
    lines.forEach(line => {
      const [key, value] = line.split(':').map(part => part.trim());
      if (key && value) {
        frontmatter[key] = value.startsWith('[') && value.endsWith(']') 
          ? JSON.parse(value) 
          : value;
      }
    });
    
    return frontmatter;
  }

  search(query, options = {}) {
    if (!this.index) {
      throw new Error('Search index not initialized. Call initialize() first.');
    }

    // Default options
    const defaultOptions = {
      limit: 10,
      fields: ['title', 'content', 'tags'],
      minScore: 0.1
    };
    
    const searchOptions = { ...defaultOptions, ...options };

    // Perform search
    const results = this.index.search(query);

    // Filter and map results
    return results
      .filter(result => result.score >= searchOptions.minScore)
      .slice(0, searchOptions.limit)
      .map(result => {
        const doc = this.documents[result.ref];
        return {
          ...doc,
          score: result.score
        };
      });
  }

  async reindex() {
    await this.initialize();
  }
}

// Singleton pattern
const searchEngine = new MemorySearchEngine();

export default {
  initialize: () => searchEngine.initialize(),
  search: (query, options) => searchEngine.search(query, options),
  reindex: () => searchEngine.reindex()
};
