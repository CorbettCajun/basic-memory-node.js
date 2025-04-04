#!/usr/bin/env node
import { runMigrations, undoLastMigration, getMigrationStatus } from '../src/db/migration-config.js';

async function main() {
    const args = process.argv.slice(2);

    try {
        switch (args[0]) {
            case '--undo':
                await undoLastMigration();
                break;
            case '--status':
                await getMigrationStatus();
                break;
            default:
                await runMigrations();
                break;
        }
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

main();
