import chalk from 'chalk';
import { session } from './session.js';

class ConsoleOutput {
  constructor() {
    this.theme = {
      success: chalk.green.bold,
      error: chalk.red.bold,
      warning: chalk.yellow.bold,
      info: chalk.blue.bold,
      highlight: chalk.cyan.bold,
      muted: chalk.gray
    };
  }

  printHeader(text) {
    console.log(this.theme.highlight(`\n${'='.repeat(80)}`));
    console.log(this.theme.highlight(` ${text} `));
    console.log(this.theme.highlight(`${'='.repeat(80)}\n`));
  }

  printSuccess(message) {
    console.log(this.theme.success(`✓ ${message}`));
  }

  printError(message) {
    console.log(this.theme.error(`✗ ${message}`));
  }

  printWarning(message) {
    console.log(this.theme.warning(`⚠ ${message}`));
  }

  printInfo(message) {
    console.log(this.theme.info(`ℹ ${message}`));
  }

  printTable(headers, rows) {
    // Calculate column widths
    const columnWidths = headers.map((header, i) =>
      Math.max(header.length, ...rows.map(row => row[i].toString().length))
    );

    // Print header
    const headerRow = headers
      .map((header, i) => this.theme.highlight(header.padEnd(columnWidths[i])))
      .join(' | ');
    console.log(headerRow);
    console.log(this.theme.muted('-'.repeat(headerRow.length)));

    // Print rows
    rows.forEach(row => {
      const formattedRow = row
        .map((cell, i) => cell.toString().padEnd(columnWidths[i]))
        .join(' | ');
      console.log(formattedRow);
    });
  }

  printProgress(current, total) {
    const percentage = Math.round((current / total) * 100);
    process.stdout.write(`\r${this.theme.info(`Processing: ${percentage}%`)}`);
    if (current === total) process.stdout.write('\n');
  }
}

// Singleton output instance
export const output = new ConsoleOutput();
