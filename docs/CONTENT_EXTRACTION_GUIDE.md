# Content Extraction Guide

This guide provides detailed information about Basic Memory's content extraction utilities, which allow you to extract structured information from various types of content, particularly Markdown files.

## Overview

The content extraction module provides tools for:

- Extracting YAML front matter from Markdown
- Finding and processing wiki-style and standard Markdown links
- Analyzing document structure through headings
- Extracting tags, code blocks, and other elements
- Converting Markdown to HTML or plain text
- Splitting content into logical sections
- Processing embedded data formats

## API Reference

All content extraction functions are available through the `content` API module:

```javascript
import { content } from 'basic-memory';

// Now you can use content.extractFrontMatter, content.extractLinks, etc.
```

### Front Matter Extraction

```javascript
content.extractFrontMatter(markdownContent)
```

Extracts YAML front matter from Markdown content and returns both the parsed front matter and the content with front matter removed.

**Example:**

```javascript
const markdown = `---
title: Example Note
tags: [example, documentation]
date: 2025-04-01
---
# Example Note
This is an example note with front matter.`;

const { frontMatter, content } = content.extractFrontMatter(markdown);
console.log(frontMatter);
// Output: { title: 'Example Note', tags: ['example', 'documentation'], date: '2025-04-01' }
```

### Link Extraction

```javascript
content.extractLinks(markdownContent)
```

Extracts both wiki-style links (`[[link]]`) and standard Markdown links (`[text](url)`) from content.

**Example:**

```javascript
const markdown = `# Links Example
Here is a [standard link](https://example.com) and a [[wiki link]].
You can also have [[nested/wiki/links]] and [[links with custom text|alias]].`;

const links = content.extractLinks(markdown);
console.log(links);
/* Output:
[
  {
    text: 'standard link',
    url: 'https://example.com',
    type: 'markdown',
    position: { start: 18, end: 49 }
  },
  {
    text: 'wiki link',
    url: 'wiki link',
    type: 'wiki',
    position: { start: 58, end: 71 }
  },
  {
    text: 'nested/wiki/links',
    url: 'nested/wiki/links',
    type: 'wiki',
    position: { start: 88, end: 108 }
  },
  {
    text: 'links with custom text',
    url: 'alias',
    type: 'wiki',
    position: { start: 113, end: 142 }
  }
]
*/
```

### Heading Extraction

```javascript
content.extractHeadings(markdownContent)
```

Extracts headings from Markdown content, including their level and position.

**Example:**

```javascript
const markdown = `# Main Heading
Some content
## Sub Heading
More content
### Sub-sub Heading
Even more content`;

const headings = content.extractHeadings(markdown);
console.log(headings);
/* Output:
[
  {
    text: 'Main Heading',
    level: 1,
    position: { start: 0, end: 14 }
  },
  {
    text: 'Sub Heading',
    level: 2,
    position: { start: 27, end: 41 }
  },
  {
    text: 'Sub-sub Heading',
    level: 3,
    position: { start: 54, end: 71 }
  }
]
*/
```

### Tag Extraction

```javascript
content.extractTags(markdownContent, options)
```

Extracts tags from both front matter and hashtags in the content.

**Parameters:**
- `markdownContent`: The Markdown content to process
- `options` (optional): An object with the following properties:
  - `includeFrontMatter`: Whether to include tags from front matter (default: `true`)
  - `includeHashtags`: Whether to include hashtags from content (default: `true`)

**Example:**

```javascript
const markdown = `---
title: Example Note
tags: [documentation, example]
---
# Example Note
This is an example note with #hashtags in the content. #important #todo`;

const tags = content.extractTags(markdown);
console.log(tags);
// Output: ['documentation', 'example', 'hashtags', 'important', 'todo']
```

### Code Block Extraction

```javascript
content.extractCodeBlocks(markdownContent)
```

Extracts code blocks from Markdown content, including their language and position.

**Example:**

```javascript
const markdown = `# Code Examples

\`\`\`javascript
function hello() {
  console.log('Hello, world!');
}
\`\`\`

And some Python:

\`\`\`python
def hello():
    print('Hello, world!')
\`\`\``;

const codeBlocks = content.extractCodeBlocks(markdown);
console.log(codeBlocks);
/* Output:
[
  {
    language: 'javascript',
    code: 'function hello() {\n  console.log(\'Hello, world!\');\n}',
    position: { start: 15, end: 67 }
  },
  {
    language: 'python',
    code: 'def hello():\n    print(\'Hello, world!\')',
    position: { start: 85, end: 128 }
  }
]
*/
```

### Markdown Conversion

#### Convert to HTML

```javascript
content.markdownToHtml(markdownContent)
```

Converts Markdown content to HTML.

**Example:**

```javascript
const markdown = `# Example Heading
This is **bold** and *italic* text.`;

const html = content.markdownToHtml(markdown);
console.log(html);
// Output: '<h1>Example Heading</h1>\n<p>This is <strong>bold</strong> and <em>italic</em> text.</p>'
```

#### Convert to Plain Text

```javascript
content.markdownToPlainText(markdownContent)
```

Converts Markdown content to plain text, removing all formatting.

**Example:**

```javascript
const markdown = `# Example Heading
This is **bold** and *italic* text.`;

const plainText = content.markdownToPlainText(markdown);
console.log(plainText);
// Output: 'Example Heading\nThis is bold and italic text.'
```

### Section Splitting

```javascript
content.splitSections(markdownContent)
```

Splits Markdown content into sections based on headings.

**Example:**

```javascript
const markdown = `# Main Heading
Introduction text.
## First Section
Section content.
## Second Section
More section content.`;

const sections = content.splitSections(markdown);
console.log(sections);
/* Output:
[
  {
    title: 'Main Heading',
    level: 1,
    content: 'Introduction text.'
  },
  {
    title: 'First Section',
    level: 2,
    content: 'Section content.'
  },
  {
    title: 'Second Section',
    level: 2,
    content: 'More section content.'
  }
]
*/
```

### JSON Extraction

```javascript
content.extractJson(markdownContent)
```

Extracts JSON data from code blocks in Markdown content.

**Example:**

```javascript
const markdown = `# Data Example

Here's some structured data:

\`\`\`json
{
  "name": "Example Project",
  "version": "1.0.0",
  "description": "An example project"
}
\`\`\``;

const jsonData = content.extractJson(markdown);
console.log(jsonData);
/* Output:
[
  {
    data: {
      name: 'Example Project',
      version: '1.0.0',
      description: 'An example project'
    },
    position: { start: 39, end: 109 }
  }
]
*/
```

### Summary Generation

```javascript
content.generateSummary(markdownContent, options)
```

Generates a concise summary of Markdown content.

**Parameters:**
- `markdownContent`: The Markdown content to summarize
- `options` (optional): An object with the following properties:
  - `maxLength`: Maximum length of the summary in characters (default: `200`)
  - `includeTags`: Whether to include tags in the summary (default: `true`)

**Example:**

```javascript
const markdown = `---
title: Quantum Computing
tags: [physics, computing, technology]
---
# Quantum Computing

Quantum computing is a type of computation that harnesses the collective properties of quantum states, such as superposition, interference, and entanglement, to perform calculations.

## Key Concepts

Quantum computing utilizes quantum bits or qubits, which can exist in multiple states simultaneously, unlike classical bits.`;

const summary = content.generateSummary(markdown, { maxLength: 100 });
console.log(summary);
// Output: 'Quantum computing is a type of computation that harnesses the collective properties of quantum states... [physics, computing, technology]'
```

## Practical Applications

### Extracting Data for Entity Creation

```javascript
import { content, entity } from 'basic-memory';
import fs from 'fs';

async function createEntityFromFile(filePath) {
  // Read file
  const markdownContent = fs.readFileSync(filePath, 'utf-8');
  
  // Extract front matter and content
  const { frontMatter, content: contentWithoutFrontMatter } = content.extractFrontMatter(markdownContent);
  
  // Extract tags
  const tags = content.extractTags(markdownContent);
  
  // Create entity data
  const entityData = {
    id: frontMatter.id || `entity-${Date.now()}`,
    title: frontMatter.title || 'Untitled',
    type: frontMatter.type || 'note',
    content: contentWithoutFrontMatter,
    metadata: {
      ...frontMatter,
      tags
    }
  };
  
  // Create entity
  return await entity.createOrUpdate(entityData);
}
```

### Analyzing Content Structure

```javascript
import { content } from 'basic-memory';

function analyzeDocumentStructure(markdownContent) {
  // Extract headings to understand document structure
  const headings = content.extractHeadings(markdownContent);
  
  // Extract links to see connections
  const links = content.extractLinks(markdownContent);
  
  // Split into sections for detailed analysis
  const sections = content.splitSections(markdownContent);
  
  return {
    documentLevel: headings.length > 0 ? headings[0].level : 0,
    sectionCount: sections.length,
    linkCount: links.length,
    wikiLinkCount: links.filter(link => link.type === 'wiki').length,
    externalLinkCount: links.filter(link => link.type === 'markdown').length,
    averageSectionLength: sections.reduce((sum, section) => sum + section.content.length, 0) / sections.length
  };
}
```

### Building a Table of Contents

```javascript
import { content } from 'basic-memory';

function generateTableOfContents(markdownContent) {
  const headings = content.extractHeadings(markdownContent);
  
  let toc = '# Table of Contents\n\n';
  
  headings.forEach(heading => {
    // Add indentation based on heading level
    const indent = '  '.repeat(heading.level - 1);
    toc += `${indent}- [${heading.text}](#${heading.text.toLowerCase().replace(/\s+/g, '-')})\n`;
  });
  
  return toc;
}
```

### Finding Related Content

```javascript
import { content, search } from 'basic-memory';

async function findRelatedContent(markdownContent) {
  // Extract important elements
  const { frontMatter } = content.extractFrontMatter(markdownContent);
  const tags = content.extractTags(markdownContent);
  const headings = content.extractHeadings(markdownContent);
  
  // Build search query from extracted elements
  const searchTerms = [
    frontMatter.title,
    ...tags,
    ...headings.map(h => h.text)
  ].filter(Boolean);
  
  // Search for related entities
  const query = searchTerms.slice(0, 5).join(' ');
  return await search.entities(query);
}
```

## Tips and Best Practices

### Performance Considerations

- For large files, consider processing only the sections you need using `splitSections`
- Extraction functions are synchronous and may block the event loop with very large content
- Cache extraction results when processing the same content multiple times

### Handling Special Cases

- Wiki links with custom text (`[[link|text]]`) are handled correctly by `extractLinks`
- Code fences (triple backticks) within code blocks are properly detected
- Front matter must be at the beginning of the file and surrounded by `---`

### Error Handling

All content extraction functions are designed to be safe and will not throw exceptions for malformed input. However, they may return empty arrays or objects if no matching content is found.

```javascript
try {
  const { frontMatter } = content.extractFrontMatter(markdownContent);
  // frontMatter will be an empty object if no front matter is found
} catch (error) {
  // This block will only execute for programming errors, not content parsing issues
  console.error('Error during front matter extraction:', error);
}
```

### Extending the Content Extraction API

You can extend the content extraction functionality by creating wrapper functions for specific use cases:

```javascript
function extractAuthors(markdownContent) {
  const { frontMatter } = content.extractFrontMatter(markdownContent);
  
  // Extract authors from front matter
  const authors = frontMatter.authors || frontMatter.author || [];
  
  // Convert single author to array
  return Array.isArray(authors) ? authors : [authors];
}
```

## Integration with Other Systems

### Using with Basic Memory CLI

The content extraction utilities can be used with the CLI commands:

```bash
# Extract front matter and create entity
basic-memory entity create --file document.md
```

### Using with MCP

AI assistants can use the content extraction capabilities through the MCP interface:

```
User: Can you analyze the structure of my note about quantum computing?

AI Assistant: Let me analyze your quantum computing note.

[AI uses MCP tool 'read_note' with title="Quantum Computing"]

AI Assistant: I've analyzed your Quantum Computing note:
- It has 5 main sections
- Contains 12 wiki-style links to other notes
- Includes 3 code examples in Python
- The most detailed section is "Quantum Algorithms" with 500 words
- Tags found: physics, computing, technology, quantum
```

## Examples

### Complete Document Analysis

Here's a comprehensive example that analyzes a document using multiple extraction utilities:

```javascript
import { content } from 'basic-memory';
import fs from 'fs';

function analyzeDocument(filePath) {
  const markdownContent = fs.readFileSync(filePath, 'utf-8');
  
  // Extract various components
  const { frontMatter, content: contentWithoutFrontMatter } = content.extractFrontMatter(markdownContent);
  const headings = content.extractHeadings(markdownContent);
  const links = content.extractLinks(markdownContent);
  const tags = content.extractTags(markdownContent);
  const codeBlocks = content.extractCodeBlocks(markdownContent);
  const sections = content.splitSections(markdownContent);
  
  // Calculate statistics
  const wordCount = contentWithoutFrontMatter.split(/\s+/).length;
  const averageSectionLength = sections.reduce((sum, section) => sum + section.content.length, 0) / sections.length;
  
  return {
    title: frontMatter.title || 'Untitled',
    metadata: frontMatter,
    structure: {
      headingCount: headings.length,
      sectionCount: sections.length,
      mainHeading: headings.length > 0 ? headings[0].text : null,
      subheadings: headings.slice(1).map(h => h.text)
    },
    content: {
      wordCount,
      characterCount: contentWithoutFrontMatter.length,
      averageSectionLength
    },
    links: {
      total: links.length,
      internal: links.filter(link => link.type === 'wiki').length,
      external: links.filter(link => link.type === 'markdown').length,
      wikis: links.filter(link => link.type === 'wiki').map(link => link.text)
    },
    tags,
    code: {
      blockCount: codeBlocks.length,
      languages: [...new Set(codeBlocks.map(block => block.language))]
    }
  };
}
```

## Best Practices for Content Creation

For optimal extraction, follow these guidelines when creating Markdown content:

1. **Use Front Matter**: Put metadata at the top of your files:
   ```markdown
   ---
   title: My Document
   tags: [tag1, tag2]
   date: 2025-04-01
   ---
   ```

2. **Follow Heading Hierarchy**: Start with a single level-1 heading (#) and use proper nesting:
   ```markdown
   # Main Title
   Content...
   ## Sub-section
   More content...
   ### Deeper section
   Even more content...
   ```

3. **Use Wiki-Style Links**: Link to other notes using double brackets:
   ```markdown
   This connects to [[Another Note]] and [[Special Topic|with custom text]].
   ```

4. **Tag Important Concepts**: Use hashtags for important concepts:
   ```markdown
   This is a #key-concept that relates to #another-idea.
   ```

5. **Code Blocks**: Use fenced code blocks with language specification:
   ```markdown
   ```javascript
   function example() {
     return 'This is a code example';
   }
   ```
   ```
