/**
 * Content Operations Benchmark Suite
 * 
 * This suite tests the performance of content-related operations in Basic Memory.
 * It measures extraction, parsing, and analysis operations to establish
 * a baseline for comparison with the Python implementation.
 */

import { content, entity } from '../../src/api/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = path.join(dirname(dirname(__filename)), 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Create test markdown content
const SAMPLE_MARKDOWN = `---
title: Test Markdown Document
tags: [test, benchmark, markdown]
---

# Test Markdown Document

This is a sample markdown document used for benchmark testing.

## Features

- **Bold text** for emphasis
- *Italic text* for subtle emphasis
- Code blocks for \`inline code\`
- Links to [[Other Notes]]
- External links to [Basic Memory](https://github.com/basicmachines-co/basic-memory)

## Code Block

\`\`\`javascript
function testFunction() {
  console.log("Hello, world!");
  return true;
}
\`\`\`

## Lists

1. First item
2. Second item
3. Third item with a [[Note Link]]

## Tables

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Value 1  | Value 2  | Value 3  |
| Another  | Set of   | Values   |
`;

// Create sample HTML
const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test HTML Document</title>
</head>
<body>
  <header>
    <h1>Test HTML Document</h1>
    <nav>
      <ul>
        <li><a href="#section1">Section 1</a></li>
        <li><a href="#section2">Section 2</a></li>
        <li><a href="#section3">Section 3</a></li>
      </ul>
    </nav>
  </header>
  
  <main>
    <section id="section1">
      <h2>Section 1: Introduction</h2>
      <p>This is a sample HTML document used for benchmark testing.</p>
      <p>It contains multiple elements and <strong>formatting</strong> to test content extraction.</p>
      <a href="https://github.com/basicmachines-co/basic-memory">Basic Memory Repository</a>
    </section>
    
    <section id="section2">
      <h2>Section 2: Features</h2>
      <ul>
        <li>Feature 1</li>
        <li>Feature 2</li>
        <li>Feature 3</li>
      </ul>
    </section>
    
    <section id="section3">
      <h2>Section 3: Examples</h2>
      <pre><code>
function exampleCode() {
  return "Example code block";
}
      </code></pre>
      
      <table>
        <thead>
          <tr>
            <th>Column 1</th>
            <th>Column 2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Data 1</td>
            <td>Data 2</td>
          </tr>
          <tr>
            <td>Data 3</td>
            <td>Data 4</td>
          </tr>
        </tbody>
      </table>
    </section>
  </main>
  
  <footer>
    <p>Basic Memory Benchmark Test</p>
  </footer>
</body>
</html>`;

// Create sample text
const SAMPLE_TEXT = `Basic Memory Performance Test

This is a plain text document used for benchmark testing.
It contains multiple paragraphs and some formatting to test content extraction.

Features of the Basic Memory system include:
* Local-first data storage
* Markdown support
* Wiki-style links
* Search functionality
* MCP integration

The system uses [[Internal Links]] to connect related concepts and ideas.
You can also use external references like URLs (https://example.com).

Common patterns include:
1. Create entities
2. Establish relations
3. Search for information
4. Extract relevant content

This test will measure the performance of various content operations in the Basic Memory system.`;

// Helper to write test files
const writeTestFile = (filename, content) => {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
};

// Test suite definition
export const suite = {
  name: 'Content Operations',
  description: 'Benchmarks for content extraction and parsing operations',
  benchmarks: [
    // Extract links from markdown benchmark
    {
      name: 'Extract Links from Markdown',
      setup() {
        const filePath = writeTestFile('test-markdown.md', SAMPLE_MARKDOWN);
        return { filePath };
      },
      async fn({ filePath }) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return await content.extractLinks(fileContent, 'markdown');
      },
      cleanup({ filePath }) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    },
    
    // Extract frontmatter benchmark
    {
      name: 'Extract Frontmatter',
      setup() {
        const filePath = writeTestFile('test-frontmatter.md', SAMPLE_MARKDOWN);
        return { filePath };
      },
      async fn({ filePath }) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return await content.extractFrontmatter(fileContent);
      },
      cleanup({ filePath }) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    },
    
    // Parse markdown to HTML benchmark
    {
      name: 'Parse Markdown to HTML',
      setup() {
        const filePath = writeTestFile('test-md-to-html.md', SAMPLE_MARKDOWN);
        return { filePath };
      },
      async fn({ filePath }) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return await content.markdownToHtml(fileContent);
      },
      cleanup({ filePath }) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    },
    
    // Extract HTML content benchmark
    {
      name: 'Extract Content from HTML',
      setup() {
        const filePath = writeTestFile('test-html.html', SAMPLE_HTML);
        return { filePath };
      },
      async fn({ filePath }) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return await content.extractFromHtml(fileContent, {
          extractText: true,
          extractLinks: true,
          extractImages: true,
          extractMetadata: true
        });
      },
      cleanup({ filePath }) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    },
    
    // Extract links from HTML benchmark
    {
      name: 'Extract Links from HTML',
      setup() {
        const filePath = writeTestFile('test-html-links.html', SAMPLE_HTML);
        return { filePath };
      },
      async fn({ filePath }) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return await content.extractLinks(fileContent, 'html');
      },
      cleanup({ filePath }) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    },
    
    // Extract tags benchmark
    {
      name: 'Extract Tags from Content',
      setup() {
        const filePath = writeTestFile('test-tags.md', SAMPLE_MARKDOWN);
        return { filePath };
      },
      async fn({ filePath }) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return await content.extractTags(fileContent);
      },
      cleanup({ filePath }) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    },
    
    // Generate text summary benchmark
    {
      name: 'Generate Text Summary',
      setup() {
        const filePath = writeTestFile('test-summary.txt', SAMPLE_TEXT);
        return { filePath };
      },
      async fn({ filePath }) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return await content.generateSummary(fileContent, { maxLength: 100 });
      },
      cleanup({ filePath }) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    },
    
    // Parse file path benchmark
    {
      name: 'Parse File Path',
      setup() {
        const filePaths = [
          'test/folder/file.md',
          'test/folder/subfolder/another-file.md',
          '/absolute/path/to/document.md',
          'C:\\\\Users\\\\test\\\\Documents\\\\notes.md',
          './relative/path/image.png'
        ];
        const jsonPath = writeTestFile('test-paths.json', JSON.stringify(filePaths));
        return { jsonPath, filePaths };
      },
      async fn({ filePaths }) {
        const results = [];
        for (const filepath of filePaths) {
          results.push(await content.parseFilePath(filepath));
        }
        return results;
      },
      cleanup({ jsonPath }) {
        if (fs.existsSync(jsonPath)) {
          fs.unlinkSync(jsonPath);
        }
      }
    },
    
    // Process markdown file benchmark
    {
      name: 'Process Markdown File',
      setup() {
        const filePath = writeTestFile('test-process.md', SAMPLE_MARKDOWN);
        return { filePath };
      },
      async fn({ filePath }) {
        return await content.processMarkdownFile(filePath);
      },
      cleanup({ filePath }) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
  ]
};

// Helper to properly run setup and cleanup
export async function runContentBenchmarks() {
  const results = {
    name: suite.name,
    description: suite.description,
    timestamp: new Date().toISOString(),
    benchmarks: []
  };

  for (const benchmark of suite.benchmarks) {
    console.log(`Running ${benchmark.name}...`);
    
    try {
      // Setup
      let setupData = {};
      if (benchmark.setup) {
        setupData = benchmark.setup();
      }
      
      // Measure performance
      const start = performance.now();
      const result = await benchmark.fn(setupData);
      const end = performance.now();
      
      // Cleanup
      if (benchmark.cleanup) {
        benchmark.cleanup(setupData);
      }
      
      results.benchmarks.push({
        name: benchmark.name,
        duration: end - start,
        success: true
      });
      
      console.log(`✓ ${benchmark.name}: ${(end - start).toFixed(2)}ms`);
    } catch (error) {
      results.benchmarks.push({
        name: benchmark.name,
        duration: 0,
        success: false,
        error: error.message
      });
      
      console.log(`✗ ${benchmark.name}: Failed - ${error.message}`);
    }
  }
  
  return results;
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runContentBenchmarks()
    .then(results => {
      console.log(JSON.stringify(results, null, 2));
    })
    .catch(error => {
      console.error('Error running benchmarks:', error);
      process.exit(1);
    });
}
