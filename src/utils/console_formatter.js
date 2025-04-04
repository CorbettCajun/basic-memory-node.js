/**
 * Console Formatting Utility
 * Provides rich console output similar to Python's Rich library
 * @module ConsoleFormatter
 */

import chalk from 'chalk';
import { table } from 'table';
import boxen from 'boxen';
import figures from 'figures';
import stripAnsi from 'strip-ansi';
import cliProgress from 'cli-progress';
import hljs from 'highlight.js';

/**
 * ConsoleFormatter class
 */
class ConsoleFormatter {
  /**
   * Create a styled header
   * @param {string} text - Header text
   * @param {Object} [options] - Formatting options
   * @param {string} [options.style='bold'] - Text style
   * @param {string} [options.color='blue'] - Text color
   * @param {string} [options.align='center'] - Text alignment
   * @param {number} [options.width] - Header width
   * @returns {string} Formatted header
   */
  static header(text, options = {}) {
    const {
      style = 'bold',
      color = 'blue',
      align = 'center',
      width = process.stdout.columns || 80
    } = options;

    const styledText = chalk[color][style](text);
    const padding = ' '.repeat(Math.max(0, Math.floor((width - stripAnsi(styledText).length) / 2)));
    
    return `\n${padding}${styledText}\n${chalk.dim('-'.repeat(width))}\n`;
  }

  /**
   * Create a progress bar
   * @param {Object} [options] - Progress bar options
   * @param {number} [options.total=100] - Total progress units
   * @param {string} [options.format] - Progress bar format
   * @param {string} [options.barCompleteChar='='] - Character for completed progress
   * @param {string} [options.barIncompleteChar='-'] - Character for incomplete progress
   * @param {boolean} [options.hideCursor=true] - Hide cursor during progress
   * @param {boolean} [options.clearOnComplete=true] - Clear progress bar on completion
   * @returns {cliProgress.SingleBar} Progress bar instance
   */
  static progressBar(options = {}) {
    const {
      total = 100,
      format = '{bar} {percentage}% | {value}/{total} | ETA: {eta}s',
      barCompleteChar = '=',
      barIncompleteChar = '-',
      hideCursor = true,
      clearOnComplete = true
    } = options;

    return new cliProgress.SingleBar({
      format,
      barCompleteChar,
      barIncompleteChar,
      hideCursor,
      clearOnComplete
    });
  }

  /**
   * Create a formatted table
   * @param {Array<Array>} data - Table data
   * @param {Object} [options] - Table formatting options
   * @param {boolean} [options.header=true] - Include header row
   * @param {Object} [options.border] - Border characters
   * @param {Object} [options.columnDefault] - Default column settings
   * @returns {string} Formatted table
   */
  static formatTable(data, options = {}) {
    const {
      header = true,
      border = {
        topBody: '─',
        topJoin: '┬',
        topLeft: '┌',
        topRight: '┐',
        bottomBody: '─',
        bottomJoin: '┴',
        bottomLeft: '└',
        bottomRight: '┘',
        bodyLeft: '│',
        bodyRight: '│',
        bodyJoin: '│',
        joinBody: '─',
        joinLeft: '├',
        joinRight: '┤',
        joinJoin: '┼'
      },
      columnDefault = {
        width: 20,
        alignment: 'left'
      }
    } = options;

    return table(data, {
      border,
      columnDefault
    });
  }

  /**
   * Create a boxed message
   * @param {string} message - Message to box
   * @param {Object} [options] - Boxen options
   * @param {string} [options.title] - Box title
   * @param {number} [options.padding=1] - Padding inside the box
   * @param {number} [options.margin=1] - Margin around the box
   * @param {string} [options.borderStyle='round'] - Border style
   * @param {string} [options.borderColor='blue'] - Border color
   * @returns {string} Boxed message
   */
  static box(message, options = {}) {
    const {
      title,
      padding = 1,
      margin = 1,
      borderStyle = 'round',
      borderColor = 'blue'
    } = options;

    return boxen(message, {
      title,
      padding,
      margin,
      borderStyle,
      borderColor
    });
  }

  /**
   * Create a status indicator
   * @param {string} status - Status text
   * @param {string} [type='info'] - Status type (info, success, warning, error)
   * @returns {string} Formatted status
   */
  static status(status, type = 'info') {
    const statusIcons = {
      info: figures.info,
      success: figures.tick,
      warning: figures.warning,
      error: figures.cross
    };

    const statusColors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red
    };

    const icon = statusIcons[type] || statusIcons.info;
    const colorFn = statusColors[type] || statusColors.info;

    return colorFn(`${icon} ${status}`);
  }

  /**
   * Highlight code or text
   * @param {string} text - Text to highlight
   * @param {string} [language='javascript'] - Language for syntax highlighting
   * @returns {string} Highlighted text
   */
  static highlight(text, language = 'javascript') {
    try {
      const highlighted = hljs.highlight(text, { language }).value;
      return highlighted;
    } catch (error) {
      // Fallback to plain text if language not supported
      return text;
    }
  }

  /**
   * Create a multi-column layout
   * @param {string[]} columns - Column contents
   * @param {Object} [options] - Layout options
   * @param {number} [options.padding=2] - Padding between columns
   * @param {number} [options.columnWidth] - Width of each column
   * @returns {string} Multi-column layout
   */
  static multiColumn(columns, options = {}) {
    const {
      padding = 2,
      columnWidth = Math.floor(process.stdout.columns / columns.length)
    } = options;

    const columnLayouts = columns.map((col) => {
      const lines = col.split('\n');
      return lines.map((line) => 
        line.length > columnWidth 
          ? line.substring(0, columnWidth - 3) + '...' 
          : line.padEnd(columnWidth)
      );
    });

    const maxRows = Math.max(...columnLayouts.map((col) => col.length));
    const output = [];

    for (let i = 0; i < maxRows; i++) {
      const row = columnLayouts.map((col) => 
        col[i] || ' '.repeat(columnWidth)
      ).join(' '.repeat(padding));
      output.push(row);
    }

    return output.join('\n');
  }
}

export default ConsoleFormatter;
