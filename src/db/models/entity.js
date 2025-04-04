/**
 * Entity Models for Basic Memory
 * 
 * Defines the core data structures for entities in the system
 * including Markdown entities and their frontmatter
 */

/**
 * Class representing entity frontmatter metadata
 */
export class EntityFrontmatter {
  /**
   * Create an entity frontmatter
   * @param {Object} params - Frontmatter parameters
   * @param {Object} params.metadata - Metadata object
   */
  constructor({ metadata = {} } = {}) {
    this.metadata = metadata;
  }

  /**
   * Get a specific metadata value
   * @param {string} key - Metadata key
   * @param {*} defaultValue - Default value if key doesn't exist
   * @returns {*} - Metadata value or default
   */
  get(key, defaultValue = null) {
    return key in this.metadata ? this.metadata[key] : defaultValue;
  }

  /**
   * Set a metadata value
   * @param {string} key - Metadata key
   * @param {*} value - Metadata value
   */
  set(key, value) {
    this.metadata[key] = value;
  }

  /**
   * Convert to a plain object
   * @returns {Object} - Plain object representation
   */
  toObject() {
    return { ...this.metadata };
  }

  /**
   * Get the title from metadata
   * @returns {string} - Title or empty string
   */
  get title() {
    return this.get('title', '');
  }

  /**
   * Set the title in metadata
   * @param {string} value - Title value
   */
  set title(value) {
    this.set('title', value);
  }

  /**
   * Get the permalink from metadata
   * @returns {string} - Permalink or empty string
   */
  get permalink() {
    return this.get('permalink', '');
  }

  /**
   * Set the permalink in metadata
   * @param {string} value - Permalink value
   */
  set permalink(value) {
    this.set('permalink', value);
  }

  /**
   * Get the type from metadata
   * @returns {string} - Type or 'note' as default
   */
  get type() {
    return this.get('type', 'note');
  }

  /**
   * Set the type in metadata
   * @param {string} value - Type value
   */
  set type(value) {
    this.set('type', value);
  }

  /**
   * Get the tags from metadata
   * @returns {Array} - Tags array or empty array
   */
  get tags() {
    return this.get('tags', []);
  }

  /**
   * Set the tags in metadata
   * @param {Array} value - Tags array
   */
  set tags(value) {
    this.set('tags', Array.isArray(value) ? value : []);
  }

  /**
   * Get the created timestamp
   * @returns {string} - Created timestamp or current ISO string
   */
  get created() {
    return this.get('created', new Date().toISOString());
  }

  /**
   * Set the created timestamp
   * @param {string} value - Created timestamp
   */
  set created(value) {
    this.set('created', value);
  }

  /**
   * Get the modified timestamp
   * @returns {string} - Modified timestamp or current ISO string
   */
  get modified() {
    return this.get('modified', new Date().toISOString());
  }

  /**
   * Set the modified timestamp
   * @param {string} value - Modified timestamp
   */
  set modified(value) {
    this.set('modified', value);
  }
}

/**
 * Class representing a markdown entity
 */
export class EntityMarkdown {
  /**
   * Create an entity markdown
   * @param {Object} params - Entity parameters
   * @param {EntityFrontmatter} params.frontmatter - Frontmatter object
   * @param {string} params.content - Content string
   */
  constructor({ frontmatter = new EntityFrontmatter(), content = '' } = {}) {
    this.frontmatter = frontmatter;
    this.content = content;
  }

  /**
   * Convert to a plain object
   * @returns {Object} - Plain object representation
   */
  toObject() {
    return {
      frontmatter: this.frontmatter.toObject(),
      content: this.content
    };
  }

  /**
   * Create an entity from a plain object
   * @param {Object} obj - Plain object
   * @returns {EntityMarkdown} - New entity
   */
  static fromObject(obj) {
    return new EntityMarkdown({
      frontmatter: new EntityFrontmatter({ metadata: obj.frontmatter || {} }),
      content: obj.content || ''
    });
  }

  /**
   * Get the title from frontmatter
   * @returns {string} - Title
   */
  get title() {
    return this.frontmatter.title;
  }

  /**
   * Get the permalink from frontmatter
   * @returns {string} - Permalink
   */
  get permalink() {
    return this.frontmatter.permalink;
  }

  /**
   * Get the type from frontmatter
   * @returns {string} - Type
   */
  get type() {
    return this.frontmatter.type;
  }

  /**
   * Get the tags from frontmatter
   * @returns {Array} - Tags
   */
  get tags() {
    return this.frontmatter.tags;
  }

  /**
   * Get the created timestamp from frontmatter
   * @returns {string} - Created timestamp
   */
  get created() {
    return this.frontmatter.created;
  }

  /**
   * Get the modified timestamp from frontmatter
   * @returns {string} - Modified timestamp
   */
  get modified() {
    return this.frontmatter.modified;
  }
}

export default { EntityMarkdown, EntityFrontmatter };
