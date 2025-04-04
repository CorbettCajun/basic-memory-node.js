import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/enhanced-logger.js';

class AutocompleteManager {
  constructor() {
    this._commands = new Map();
    this._registerDefaultCommands();
  }

  /**
   * Register default commands for autocomplete
   * @private
   */
  _registerDefaultCommands() {
    const defaultCommands = [
      'sync', 'status', 'db', 'import-memory-json', 'mcp', 
      'import-claude-conversations', 'import-claude-projects', 
      'import-chatgpt', 'tool', 'project', 'project-info', 
      'interactive', 'help'
    ];

    defaultCommands.forEach(cmd => this._commands.set(cmd, {}));
  }

  /**
   * Register a new command with autocomplete options
   * @param {string} command - Command name
   * @param {Object} options - Autocomplete options
   */
  registerCommand(command, options = {}) {
    this._commands.set(command, {
      description: options.description || '',
      subcommands: options.subcommands || [],
      flags: options.flags || [],
      autocomplete: options.autocomplete || null
    });
  }

  /**
   * Generate shell completion script
   * @param {string} shell - Target shell (bash, zsh, fish)
   * @returns {string} Completion script
   */
  generateCompletionScript(shell = 'bash') {
    const commands = Array.from(this._commands.keys());
    
    const scriptTemplates = {
      bash: this._generateBashCompletion(commands),
      zsh: this._generateZshCompletion(commands),
      fish: this._generateFishCompletion(commands)
    };

    return scriptTemplates[shell] || scriptTemplates['bash'];
  }

  /**
   * Install completion script
   * @param {string} shell - Target shell
   */
  installCompletion(shell = 'bash') {
    const script = this.generateCompletionScript(shell);
    const completionPath = this._getCompletionPath(shell);

    try {
      fs.writeFileSync(completionPath, script, 'utf8');
      logger.info(`Completion script installed for ${shell}`);
    } catch (error) {
      logger.error(`Failed to install completion script: ${error.message}`);
    }
  }

  /**
   * Get completion path for different shells
   * @param {string} shell - Target shell
   * @returns {string} Completion file path
   * @private
   */
  _getCompletionPath(shell) {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const completionPaths = {
      bash: path.join(homeDir, '.bash_completion'),
      zsh: path.join(homeDir, '.zsh_completion'),
      fish: path.join(homeDir, '.config', 'fish', 'completions', 'basic-memory.fish')
    };

    return completionPaths[shell] || completionPaths['bash'];
  }

  /**
   * Generate Bash completion script
   * @param {string[]} commands - Available commands
   * @returns {string} Bash completion script
   * @private
   */
  _generateBashCompletion(commands) {
    return `
_basic_memory_completion() {
    local cur prev words cword
    _init_completion || return

    case "$prev" in
        ${commands.map(cmd => `${cmd}) COMPREPLY=($(compgen -W "")) ;;`).join('\n        ')}
    esac

    COMPREPLY=($(compgen -W "${commands.join(' ')}" -- "$cur"))
    return 0
}

complete -F _basic_memory_completion basic-memory
`;
  }

  /**
   * Generate Zsh completion script
   * @param {string[]} commands - Available commands
   * @returns {string} Zsh completion script
   * @private
   */
  _generateZshCompletion(commands) {
    return `
#compdef basic-memory

_basic_memory_completion() {
    local words cword
    _arguments -C \
        "${commands.map(cmd => `'${cmd}[Description of ${cmd}]'`).join(' \\')}
}

compdef _basic_memory_completion basic-memory
`;
  }

  /**
   * Generate Fish completion script
   * @param {string[]} commands - Available commands
   * @returns {string} Fish completion script
   * @private
   */
  _generateFishCompletion(commands) {
    return `
complete -c basic-memory -f
${commands.map(cmd => `complete -c basic-memory -n "__fish_use_subcommand" -a "${cmd}"`).join('\n')}
`;
  }
}

export const autocompleteManager = new AutocompleteManager();

// Attach to Commander for CLI integration
program.on('command:*', (operands) => {
  const [cmd] = operands;
  if (!autocompleteManager._commands.has(cmd)) {
    logger.warn(`Unknown command: ${cmd}`);
  }
});

export default autocompleteManager;
