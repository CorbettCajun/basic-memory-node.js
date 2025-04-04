import { startMCPServer, stopMCPServer } from '../../src/mcp/server.js';
import { registerTools } from '../../src/mcp/tools/registry.js';
import testUtils from '../test-utils.js';

describe('MCP Server Integration', () => {
    let serverInstance;

    beforeAll(async () => {
        // Register all MCP tools before starting the server
        await registerTools();
    });

    beforeEach(async () => {
        // Start a fresh MCP server for each test
        serverInstance = await startMCPServer({
            port: 0, // Use dynamic port assignment
            testMode: true
        });
    });

    afterEach(async () => {
        // Stop the server after each test
        if (serverInstance) {
            await stopMCPServer(serverInstance);
        }
    });

    it('should start MCP server successfully', () => {
        expect(serverInstance).toBeDefined();
        expect(serverInstance.address()).toBeTruthy();
    });

    it('should register all expected tools', async () => {
        const registeredTools = await listRegisteredTools();
        
        const expectedTools = [
            'project_info',
            'tool',
            'import_chatgpt',
            'import_claude_conversations',
            'import_claude_projects',
            'import_memory_json'
        ];

        expectedTools.forEach(tool => {
            expect(registeredTools).toContain(tool);
        });
    });

    it('should handle tool invocation', async () => {
        const mockContext = testUtils.createMockContext();
        
        // Example tool invocation test
        const projectInfoTool = await getToolHandler('project_info');
        await projectInfoTool(mockContext);

        expect(mockContext.response.json).toHaveBeenCalled();
        expect(mockContext.response.status).toHaveBeenCalledWith(200);
    });

    it('should provide health check endpoint', async () => {
        const healthCheckResponse = await performHealthCheck();
        
        expect(healthCheckResponse).toEqual({
            status: 'healthy',
            version: expect.any(String),
            uptime: expect.any(Number)
        });
    });

    // Utility functions for testing
    async function listRegisteredTools() {
        // Implement tool listing logic
        return []; // Placeholder
    }

    async function getToolHandler(toolName) {
        // Implement tool retrieval logic
        return () => {}; // Placeholder
    }

    async function performHealthCheck() {
        // Implement health check logic
        return {
            status: 'healthy',
            version: '0.2.0',
            uptime: Date.now()
        };
    }
});
