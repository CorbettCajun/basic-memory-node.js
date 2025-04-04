const chalk = require('chalk');
const Table = require('cli-table3');

class ConsoleFormatter {
  /**
   * Create a formatted info message
   * @param {string} message - The message to display
   */
  static info(message) {
    console.log(chalk.blue('ℹ️ ') + chalk.blueBright(message));
  }

  /**
   * Create a formatted success message
   * @param {string} message - The message to display
   */
  static success(message) {
    console.log(chalk.green('✓ ') + chalk.greenBright(message));
  }

  /**
   * Create a formatted warning message
   * @param {string} message - The message to display
   */
  static warning(message) {
    console.log(chalk.yellow('⚠️ ') + chalk.yellowBright(message));
  }

  /**
   * Create a formatted error message
   * @param {string} message - The message to display
   */
  static error(message) {
    console.log(chalk.red('✖ ') + chalk.redBright(message));
  }

  /**
   * Create a progress bar
   * @param {number} current - Current progress
   * @param {number} total - Total progress
   * @param {number} width - Width of the progress bar
   */
  static progressBar(current, total, width = 50) {
    const percentage = Math.round((current / total) * 100);
    const completed = Math.round((current / total) * width);
    const remaining = width - completed;

    const bar = 
      chalk.green('█'.repeat(completed)) + 
      chalk.gray('░'.repeat(remaining));

    console.log(`${bar} ${percentage}% (${current}/${total})`);
  }

  /**
   * Create a formatted table
   * @param {string[]} headers - Table headers
   * @param {Array<string[]>} data - Table data
   */
  static table(headers, data) {
    const table = new Table({
      head: headers.map(h => chalk.cyan(h)),
      colWidths: headers.map(() => 20)
    });

    data.forEach(row => table.push(row));
    console.log(table.toString());
  }
}

module.exports = ConsoleFormatter;
