const fs = require('fs');
const path = require('path');
const { ErrorHandler } = require('./error-handler');
const ConsoleFormatter = require('./console');

class PluginManager {
  constructor(pluginDir) {
    this.pluginDir = pluginDir;
    this.plugins = new Map();
    this.hooks = new Map();
  }

  /**
   * Load all plugins from the plugin directory
   */
  loadPlugins() {
    if (!fs.existsSync(this.pluginDir)) {
      fs.mkdirSync(this.pluginDir, { recursive: true });
      return;
    }

    const pluginFiles = fs.readdirSync(this.pluginDir)
      .filter(file => file.endsWith('.js'));

    pluginFiles.forEach(file => {
      try {
        const pluginPath = path.join(this.pluginDir, file);
        const plugin = require(pluginPath);
        
        this.registerPlugin(plugin);
      } catch (error) {
        ErrorHandler.handle(
          ErrorHandler.create('Configuration', `Failed to load plugin ${file}`, { error })
        );
      }
    });

    ConsoleFormatter.success(`Loaded ${this.plugins.size} plugins`);
  }

  /**
   * Register a single plugin
   * @param {Object} plugin - Plugin to register
   */
  registerPlugin(plugin) {
    if (!plugin.name || !plugin.version) {
      throw new Error('Invalid plugin: missing name or version');
    }

    const pluginKey = `${plugin.name}@${plugin.version}`;
    
    if (this.plugins.has(pluginKey)) {
      ConsoleFormatter.warning(`Plugin ${pluginKey} already registered. Skipping.`);
      return;
    }

    this.plugins.set(pluginKey, plugin);

    // Register plugin hooks
    if (plugin.hooks) {
      Object.entries(plugin.hooks).forEach(([hookName, hookFn]) => {
        this.registerHook(hookName, hookFn);
      });
    }

    ConsoleFormatter.success(`Registered plugin: ${pluginKey}`);
  }

  /**
   * Register a hook for plugins
   * @param {string} hookName - Name of the hook
   * @param {Function} hookFn - Hook function to register
   */
  registerHook(hookName, hookFn) {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }

    this.hooks.get(hookName).push(hookFn);
  }

  /**
   * Execute hooks for a specific event
   * @param {string} hookName - Name of the hook to execute
   * @param {Object} context - Context to pass to hook functions
   * @returns {Promise<Array>} Results of hook executions
   */
  async executeHooks(hookName, context = {}) {
    const hookFns = this.hooks.get(hookName) || [];
    
    const results = [];
    for (const hookFn of hookFns) {
      try {
        const result = await hookFn(context);
        results.push(result);
      } catch (error) {
        ErrorHandler.handle(
          ErrorHandler.create('Configuration', `Hook ${hookName} execution failed`, { error })
        );
      }
    }

    return results;
  }

  /**
   * Unload a specific plugin
   * @param {string} pluginName - Name of the plugin to unload
   * @param {string} [version] - Optional version of the plugin
   */
  unloadPlugin(pluginName, version) {
    const pluginKey = version 
      ? `${pluginName}@${version}` 
      : Array.from(this.plugins.keys())
          .find(key => key.startsWith(`${pluginName}@`));

    if (!pluginKey) {
      ConsoleFormatter.warning(`Plugin ${pluginName} not found`);
      return;
    }

    const plugin = this.plugins.get(pluginKey);

    // Remove hooks registered by this plugin
    if (plugin.hooks) {
      Object.keys(plugin.hooks).forEach(hookName => {
        const hookFns = this.hooks.get(hookName) || [];
        this.hooks.set(
          hookName, 
          hookFns.filter(fn => fn !== plugin.hooks[hookName])
        );
      });
    }

    this.plugins.delete(pluginKey);
    ConsoleFormatter.success(`Unloaded plugin: ${pluginKey}`);
  }

  /**
   * List all currently loaded plugins
   * @returns {Array} List of loaded plugins
   */
  listPlugins() {
    return Array.from(this.plugins.keys());
  }
}

module.exports = PluginManager;
