import { Command } from 'commander';
import { logger } from '../app.js';
import { getDatabase } from '../database.js';

/**
 * Register the tag command
 * @returns {Command} Configured tag command
 */
export function registerTagCommand() {
    const tagCommand = new Command('tag');

    tagCommand
        .description('Manage tags in the knowledge base')
        .option('-l, --list', 'List all tags')
        .option('-a, --add <tag>', 'Add a new tag')
        .option('-r, --remove <tag>', 'Remove a tag')
        .option('-e, --entities <tag>', 'List entities with a specific tag')
        .action(async (options) => {
            try {
                const db = await getDatabase();

                if (options.list) {
                    const tags = await db.getAllTags();
                    logger.info('Tags in the knowledge base:');
                    tags.forEach(tag => console.log(tag));
                }

                if (options.add) {
                    await db.createTag(options.add);
                    logger.info(`Tag "${options.add}" added successfully`);
                }

                if (options.remove) {
                    await db.removeTag(options.remove);
                    logger.info(`Tag "${options.remove}" removed successfully`);
                }

                if (options.entities) {
                    const entitiesWithTag = await db.getEntitiesByTag(options.entities);
                    logger.info(`Entities with tag "${options.entities}":`);
                    entitiesWithTag.forEach(entity => console.log(entity.name));
                }
            } catch (error) {
                logger.error(`Tag command error: ${error.message}`);
                process.exit(1);
            }
        });

    return tagCommand;
}

export default registerTagCommand;
