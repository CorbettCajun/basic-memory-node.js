/**
 * Project info tool for Basic Memory MCP server.
 * @module project_info
 */

const logger = require('loguru');
const { client } = require('../async_client');
const { mcp } = require('../server');
const { callGet } = require('./utils');
const { ProjectInfoResponse } = require('../../schemas');

/**
 * Get comprehensive information about the current Basic Memory project.
 * 
 * This tool provides detailed statistics and status information about your
 * Basic Memory project, including:
 * 
 * - Project configuration
 * - Entity, observation, and relation counts
 * - Graph metrics (most connected entities, isolated entities)
 * - Recent activity and growth over time
 * - System status (database, watch service, version)
 * 
 * Use this tool to:
 * - Verify your Basic Memory installation is working correctly
 * - Get insights into your knowledge base structure
 * - Monitor growth and activity over time
 * - Identify potential issues like unresolved relations
 * 
 * @returns {Promise<ProjectInfoResponse>} Detailed project information and statistics
 * 
 * @example
 * // Get information about the current project
 * const info = await projectInfo();
 * 
 * // Check entity counts
 * console.log(`Total entities: ${info.statistics.totalEntities}`);
 * 
 * // Check system status
 * console.log(`Basic Memory version: ${info.system.version}`);
 */
async function projectInfo() {
    logger.info('Getting project info');

    try {
        // Call the API endpoint
        const response = await callGet(client, '/stats/project-info');

        // Convert response to ProjectInfoResponse
        return ProjectInfoResponse.fromJSON(response.json());
    } catch (error) {
        logger.error('Failed to retrieve project info', error);
        throw error;
    }
}

// Register the tool with the MCP server
mcp.tool({
    name: 'project_info',
    description: 'Get information and statistics about the current Basic Memory project.',
    handler: projectInfo
});

module.exports = { projectInfo };
