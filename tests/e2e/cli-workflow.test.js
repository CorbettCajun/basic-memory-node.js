import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

describe('Basic Memory CLI E2E Workflow', () => {
    let tempWorkspace;

    beforeEach(async () => {
        // Create a temporary workspace for each test
        tempWorkspace = await fs.mkdtemp(path.join(process.cwd(), 'bm-test-'));
    });

    afterEach(async () => {
        // Clean up temporary workspace
        await fs.rm(tempWorkspace, { recursive: true, force: true });
    });

    it('should initialize a new project', () => {
        const initCommand = `npx basic-memory init --path ${tempWorkspace}`;
        
        try {
            const output = execSync(initCommand, { encoding: 'utf-8' });
            
            // Check for successful initialization
            expect(output).toContain('Project initialized');
            
            // Verify project structure
            const projectFiles = fs.readdirSync(tempWorkspace);
            expect(projectFiles).toContain('basic-memory.json');
            expect(projectFiles).toContain('data');
            expect(projectFiles).toContain('entities');
        } catch (error) {
            fail(`Project initialization failed: ${error.message}`);
        }
    });

    it('should import ChatGPT conversations', async () => {
        // Prepare mock ChatGPT export file
        const mockChatGPTFile = path.join(tempWorkspace, 'chatgpt-export.json');
        await fs.writeFile(mockChatGPTFile, JSON.stringify({
            conversations: [
                { 
                    title: 'Test Conversation',
                    messages: [
                        { role: 'user', content: 'Hello' },
                        { role: 'assistant', content: 'Hi there!' }
                    ]
                }
            ]
        }));

        const importCommand = `npx basic-memory import:chatgpt ${mockChatGPTFile} --output ${tempWorkspace}`;
        
        try {
            const output = execSync(importCommand, { encoding: 'utf-8' });
            
            // Check for successful import
            expect(output).toContain('Import completed');
            
            // Verify imported files
            const importedFiles = await fs.readdir(tempWorkspace);
            const conversationFiles = importedFiles.filter(
                file => file.startsWith('conversation_') && file.endsWith('.md')
            );
            expect(conversationFiles.length).toBeGreaterThan(0);
        } catch (error) {
            fail(`ChatGPT import failed: ${error.message}`);
        }
    });

    it('should generate project info report', () => {
        // First initialize the project
        execSync(`npx basic-memory init --path ${tempWorkspace}`);

        const projectInfoCommand = `npx basic-memory project:info --path ${tempWorkspace}`;
        
        try {
            const output = execSync(projectInfoCommand, { encoding: 'utf-8' });
            
            // Check for project info details
            expect(output).toContain('Project Statistics');
            expect(output).toContain('Total Entities');
            expect(output).toContain('Total Relations');
        } catch (error) {
            fail(`Project info generation failed: ${error.message}`);
        }
    });

    it('should list available tools', () => {
        const toolListCommand = 'npx basic-memory tool:list';
        
        try {
            const output = execSync(toolListCommand, { encoding: 'utf-8' });
            
            // Check for expected tools
            const expectedTools = [
                'project:info',
                'import:chatgpt',
                'import:claude',
                'tool:list'
            ];

            expectedTools.forEach(tool => {
                expect(output).toContain(tool);
            });
        } catch (error) {
            fail(`Tool listing failed: ${error.message}`);
        }
    });
});
