#!/usr/bin/env node
import console from '../src/utils/console.js';

async function demoConsoleUtilities() {
    // Demonstrate logging
    console.logger.info('Starting Basic Memory console utilities demo');
    console.printSuccess('Successfully initialized demo');
    console.printWarning('This is a sample warning message');
    
    try {
        // Demonstrate progress bar
        const progressBar = console.createProgressBar();
        progressBar.start(100, 0);

        for (let i = 0; i <= 100; i++) {
            await new Promise(resolve => setTimeout(resolve, 20));
            progressBar.update(i);
        }
        progressBar.stop();

        // Demonstrate table
        const table = console.createTable(['Name', 'Value', 'Description']);
        table.push(
            ['Entities', 42, 'Total number of entities'],
            ['Relations', 87, 'Total number of relations'],
            ['Projects', 5, 'Active projects']
        );
        console.highlight('\nProject Statistics:');
        console.log(table.toString());

        // Demonstrate colored output
        console.highlight('\nColor Demonstration:');
        console.log(console.colors.info('Information in blue'));
        console.log(console.colors.success('Success in green'));
        console.log(console.colors.warning('Warning in yellow'));
        console.log(console.colors.error('Error in red'));
        console.log(console.colors.muted('Muted text in gray'));

    } catch (error) {
        console.printError('Demo encountered an error', error);
    }

    console.logger.info('Console utilities demo completed');
}

demoConsoleUtilities();
