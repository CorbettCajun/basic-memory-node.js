import fs from 'fs/promises';
import path from 'path';
import searchEngine from '../src/search/index.js';

describe('Memory Search Engine', () => {
  let tempMemoryDir;

  beforeAll(async () => {
    // Create a temporary directory for test memories
    tempMemoryDir = await fs.mkdtemp(path.join(process.cwd(), 'test-memories-'));

    // Create test memory files
    const testMemories = [
      {
        filename: 'project_notes.md',
        content: `---
title: Project Planning Notes
tags: [project, planning]
---
Initial project planning meeting discussed key objectives and milestones for the upcoming quarter.`
      },
      {
        filename: 'tech_research.md',
        content: `---
title: Machine Learning Research
tags: [ml, research, ai]
---
Exploring advanced machine learning techniques for predictive analytics.`
      },
      {
        filename: 'meeting_notes.md',
        content: `---
title: Team Sync Meeting
tags: [meeting, team]
---
Discussed project progress, challenges, and upcoming sprint goals.`
      }
    ];

    // Write test memories
    for (const memory of testMemories) {
      await fs.writeFile(
        path.join(tempMemoryDir, memory.filename), 
        memory.content
      );
    }

    // Mock config to use temp directory
    jest.mock('../src/config/index.js', () => ({
      getBasicMemoryConfig: jest.fn().mockResolvedValue({
        paths: { memories: tempMemoryDir }
      })
    }));
  });

  afterAll(async () => {
    // Clean up temporary directory
    await fs.rm(tempMemoryDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Reinitialize search engine before each test
    await searchEngine.initialize();
  });

  test('initializes search index successfully', async () => {
    const results = searchEngine.search('project');
    expect(results.length).toBeGreaterThan(0);
  });

  test('searches across multiple fields', async () => {
    const titleResults = searchEngine.search('planning', { fields: ['title'] });
    const contentResults = searchEngine.search('objectives', { fields: ['content'] });
    const tagResults = searchEngine.search('ml', { fields: ['tags'] });

    expect(titleResults.length).toBeGreaterThan(0);
    expect(contentResults.length).toBeGreaterThan(0);
    expect(tagResults.length).toBeGreaterThan(0);
  });

  test('respects result limit', async () => {
    // Create more test memories to test limit
    const additionalMemories = Array.from({ length: 15 }, (_, i) => ({
      filename: `additional_memory_${i}.md`,
      content: `---
title: Additional Memory ${i}
tags: [test]
---
This is a test memory content for testing result limits.`
    }));

    for (const memory of additionalMemories) {
      await fs.writeFile(
        path.join(tempMemoryDir, memory.filename), 
        memory.content
      );
    }

    await searchEngine.reindex();

    const limitedResults = searchEngine.search('test', { limit: 5 });
    expect(limitedResults.length).toBe(5);
  });

  test('filters by minimum score', async () => {
    const results = searchEngine.search('project', { minScore: 0.5 });
    
    // Verify all results meet minimum score
    results.forEach(result => {
      expect(result.score).toBeGreaterThanOrEqual(0.5);
    });
  });

  test('handles empty search query', async () => {
    const results = searchEngine.search('');
    expect(results.length).toBe(0);
  });

  test('handles complex search queries', async () => {
    const complexResults = searchEngine.search('project AND team');
    const orResults = searchEngine.search('project OR meeting');

    expect(complexResults.length).toBeGreaterThan(0);
    expect(orResults.length).toBeGreaterThan(0);
  });
});
