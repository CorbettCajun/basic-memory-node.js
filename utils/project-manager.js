const fs = require('fs');
const path = require('path');
const { ErrorHandler } = require('./error-handler');
const ConsoleFormatter = require('./console');

class ProjectManager {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.metadataFile = path.join(projectRoot, '.memory-project.json');
  }

  /**
   * Initialize a new project
   * @param {Object} metadata - Project metadata
   */
  initProject(metadata = {}) {
    const defaultMetadata = {
      name: path.basename(this.projectRoot),
      created: new Date().toISOString(),
      version: '1.0.0',
      tags: [],
      description: ''
    };

    const projectMetadata = { ...defaultMetadata, ...metadata };

    try {
      fs.writeFileSync(
        this.metadataFile, 
        JSON.stringify(projectMetadata, null, 2)
      );
      ConsoleFormatter.success(`Project initialized: ${projectMetadata.name}`);
    } catch (error) {
      ErrorHandler.handle(
        ErrorHandler.create('Configuration', 'Failed to initialize project', { error })
      );
    }
  }

  /**
   * Get project metadata
   * @returns {Object} Project metadata
   */
  getProjectMetadata() {
    try {
      if (!fs.existsSync(this.metadataFile)) {
        throw new Error('Project not initialized');
      }
      return JSON.parse(fs.readFileSync(this.metadataFile, 'utf8'));
    } catch (error) {
      ErrorHandler.handle(
        ErrorHandler.create('Configuration', 'Cannot read project metadata', { error })
      );
      return null;
    }
  }

  /**
   * Generate project statistics
   * @returns {Object} Project statistics
   */
  generateProjectStatistics() {
    const stats = {
      totalFiles: 0,
      fileTypes: {},
      lastUpdated: new Date().toISOString()
    };

    const scanDirectory = (dir) => {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else {
          stats.totalFiles++;
          
          const ext = path.extname(file);
          stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
        }
      });
    };

    try {
      scanDirectory(this.projectRoot);
      return stats;
    } catch (error) {
      ErrorHandler.handle(
        ErrorHandler.create('Configuration', 'Failed to generate project statistics', { error })
      );
      return null;
    }
  }

  /**
   * Create a project template
   * @param {string} templateName - Name of the template
   * @param {Object} templateConfig - Template configuration
   */
  createProjectTemplate(templateName, templateConfig) {
    const templatesDir = path.join(this.projectRoot, '.project-templates');
    
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }

    const templatePath = path.join(templatesDir, `${templateName}.json`);
    
    try {
      fs.writeFileSync(
        templatePath, 
        JSON.stringify(templateConfig, null, 2)
      );
      ConsoleFormatter.success(`Project template created: ${templateName}`);
    } catch (error) {
      ErrorHandler.handle(
        ErrorHandler.create('Configuration', 'Failed to create project template', { error })
      );
    }
  }

  /**
   * List available project templates
   * @returns {string[]} List of template names
   */
  listProjectTemplates() {
    const templatesDir = path.join(this.projectRoot, '.project-templates');
    
    try {
      if (!fs.existsSync(templatesDir)) {
        return [];
      }
      
      return fs.readdirSync(templatesDir)
        .filter(file => file.endsWith('.json'))
        .map(file => path.basename(file, '.json'));
    } catch (error) {
      ErrorHandler.handle(
        ErrorHandler.create('Configuration', 'Failed to list project templates', { error })
      );
      return [];
    }
  }
}

module.exports = ProjectManager;
