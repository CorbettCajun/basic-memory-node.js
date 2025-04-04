import chalk from 'chalk';
import cliProgress from 'cli-progress';
import Table from 'cli-table3';
import winston from 'winston';

// Enhanced color scheme for console output
export const colors = {
    info: chalk.blue,
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red,
    highlight: chalk.magenta,
    muted: chalk.gray
};

// Centralized logging configuration
export const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...metadata }) => {
            let msg = `${timestamp} [${level}]: ${message} `;
            const metaStr = Object.keys(metadata).length 
                ? JSON.stringify(metadata) 
                : '';
            return msg + metaStr;
        })
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({ 
            filename: 'logs/basic-memory.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ]
});

// Progress bar creator
export function createProgressBar(options = {}) {
    const defaultOptions = {
        format: '{bar} {percentage}% | {value}/{total} | ETA: {eta}s',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    };

    return new cliProgress.SingleBar(
        { ...defaultOptions, ...options }, 
        cliProgress.Presets.shades_classic
    );
}

// Formatted table creator
export function createTable(headers, options = {}) {
    const defaultOptions = {
        head: headers,
        colWidths: headers.map(() => 20),
        style: {
            head: ['cyan'],
            border: ['gray']
        }
    };

    return new Table({ ...defaultOptions, ...options });
}

// Utility functions for consistent output
export function printSuccess(message) {
    logger.info(colors.success(message));
}

export function printError(message, error = null) {
    logger.error(colors.error(message));
    if (error) {
        logger.error(colors.muted(error.stack || error.toString()));
    }
}

export function printWarning(message) {
    logger.warn(colors.warning(message));
}

export function highlight(message) {
    console.log(colors.highlight(message));
}

// Export all utilities
export default {
    colors,
    logger,
    createProgressBar,
    createTable,
    printSuccess,
    printError,
    printWarning,
    highlight
};
