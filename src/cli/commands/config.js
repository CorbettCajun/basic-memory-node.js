import { Command } from 'commander';
import { logger } from '../app.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Register the config command
 * @returns {Command} Configured config command
 */
export function registerConfigCommand() {
    const configCommand = new Command('config');

    configCommand
        .description('Manage Basic Memory configuration')
        .option('-l, --list', 'List current configuration')
        .option('-s, --set <key>=<value>', 'Set a configuration value')
        .option('-g, --get <key>', 'Get a specific configuration value')
        .option('-r, --reset', 'Reset configuration to default')
        .action(async (options) => {
            try {
                const configPath = path.join(process.cwd(), '.basic-memory-config.json');

                // Ensure config file exists
                try {
                    await fs.access(configPath);
                } catch {
                    await fs.writeFile(configPath, JSON.stringify({
                        dataDirectory: './memory',
                        syncInterval: 300,
                        logLevel: 'info'
                    }, null, 2));
                }

                const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

                if (options.list) {
                    logger.info('Current Configuration:');
                    console.log(JSON.stringify(config, null, 2));
                }

                if (options.set) {
                    const [key, value] = options.set.split('=');
                    if (!key || !value) {
                        throw new Error('Invalid configuration format. Use key=value');
                    }

                    // Basic type conversion
                    config[key] = 
                        value === 'true' ? true :
                        value === 'false' ? false :
                        !isNaN(Number(value)) ? Number(value) :
                        value;

                    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
                    logger.info(`Configuration updated: ${key} = ${value}`);
                }

                if (options.get) {
                    if (config[options.get] !== undefined) {
                        console.log(`${options.get}: ${config[options.get]}`);
                    } else {
                        logger.warn(`Configuration key "${options.get}" not found`);
                    }
                }

                if (options.reset) {
                    const defaultConfig = {
                        dataDirectory: './memory',
                        syncInterval: 300,
                        logLevel: 'info'
                    };
                    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
                    logger.info('Configuration reset to default');
                }
            } catch (error) {
                logger.error(`Config command error: ${error.message}`);
                process.exit(1);
            }
        });

    return configCommand;
}

export default registerConfigCommand;
