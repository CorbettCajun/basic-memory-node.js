const fs = require('fs');
const path = require('path');
const jsdoc = require('jsdoc-api');
const marked = require('marked');
const { ErrorHandler } = require('./error-handler');
const ConsoleFormatter = require('./console');

class DocumentationGenerator {
  constructor(sourceDir, outputDir) {
    this.sourceDir = sourceDir;
    this.outputDir = outputDir;
  }

  /**
   * Generate documentation for all JavaScript files
   * @param {Object} [options={}] - Documentation generation options
   */
  async generateDocs(options = {}) {
    const {
      includePrivate = false,
      templateDir = null
    } = options;

    try {
      // Ensure output directory exists
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }

      // Collect all JavaScript files
      const files = this.collectJSFiles(this.sourceDir);

      // Generate JSDoc configuration
      const config = this.createJSDocConfig(files, { includePrivate, templateDir });

      // Run JSDoc
      const results = await jsdoc.renderSync(config);

      // Process and save documentation
      this.processDocumentation(results);

      ConsoleFormatter.success(`Documentation generated in ${this.outputDir}`);
    } catch (error) {
      ErrorHandler.handle(
        ErrorHandler.create('Configuration', 'Failed to generate documentation', { error })
      );
    }
  }

  /**
   * Collect all JavaScript files recursively
   * @param {string} dir - Directory to search
   * @returns {string[]} List of JavaScript file paths
   */
  collectJSFiles(dir) {
    const files = [];
    
    const traverse = (currentPath) => {
      const entries = fs.readdirSync(currentPath);
      
      entries.forEach(entry => {
        const fullPath = path.join(currentPath, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (entry.endsWith('.js')) {
          files.push(fullPath);
        }
      });
    };

    traverse(dir);
    return files;
  }

  /**
   * Create JSDoc configuration
   * @param {string[]} files - List of files to document
   * @param {Object} options - Documentation options
   * @returns {Object} JSDoc configuration
   */
  createJSDocConfig(files, options) {
    return {
      files,
      configure: path.join(__dirname, 'jsdoc.json'),
      destination: this.outputDir,
      private: options.includePrivate,
      template: options.templateDir
    };
  }

  /**
   * Process and save generated documentation
   * @param {Object} results - JSDoc generation results
   */
  processDocumentation(results) {
    // Create an index.html with an overview
    const indexContent = this.createIndexPage(results);
    fs.writeFileSync(path.join(this.outputDir, 'index.html'), indexContent);

    // Generate markdown summary
    const markdownSummary = this.generateMarkdownSummary(results);
    fs.writeFileSync(path.join(this.outputDir, 'SUMMARY.md'), markdownSummary);
  }

  /**
   * Create an index page for the documentation
   * @param {Object} results - JSDoc generation results
   * @returns {string} HTML content for index page
   */
  createIndexPage(results) {
    const modules = results.filter(item => item.kind === 'module');
    
    const moduleList = modules.map(module => `
      <li>
        <h3>${module.name}</h3>
        <p>${module.description || 'No description available'}</p>
      </li>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Basic Memory Documentation</title>
        </head>
        <body>
          <h1>Basic Memory Documentation</h1>
          <ul>${moduleList}</ul>
        </body>
      </html>
    `;
  }

  /**
   * Generate a markdown summary of the documentation
   * @param {Object} results - JSDoc generation results
   * @returns {string} Markdown summary
   */
  generateMarkdownSummary(results) {
    const sections = results.reduce((summary, item) => {
      if (item.kind === 'module') {
        summary += `## ${item.name}\n\n`;
        summary += `${item.description || 'No description available'}\n\n`;
        
        // Add functions and classes
        const members = results.filter(
          member => member.memberof === item.longname
        );
        
        members.forEach(member => {
          summary += `### ${member.name}\n\n`;
          summary += `${member.description || 'No description available'}\n\n`;
        });
      }
      return summary;
    }, '# Basic Memory Documentation\n\n');

    return sections;
  }
}

module.exports = DocumentationGenerator;
