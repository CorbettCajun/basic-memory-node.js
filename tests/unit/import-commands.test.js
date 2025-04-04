import fs from 'fs/promises';
import path from 'path';
import { importChatGPT } from '../../src/commands/import_chatgpt.js';
import { importClaudeConversations } from '../../src/commands/import_claude_conversations.js';
import { importClaudeProjects } from '../../src/commands/import_claude_projects.js';
import { importMemoryJson } from '../../src/commands/import_memory_json.js';
import testUtils from '../test-utils.js';

describe('Import Commands', () => {
    let tempOutputDir;

    beforeEach(async () => {
        // Create a temporary directory for test outputs
        tempOutputDir = await fs.mkdtemp(path.join(process.cwd(), 'test-'));
    });

    afterEach(async () => {
        // Clean up temporary directory
        await fs.rm(tempOutputDir, { recursive: true, force: true });
    });

    describe('ChatGPT Import', () => {
        it('should import ChatGPT conversations successfully', async () => {
            const mockChatGPTData = {
                conversations: [
                    { 
                        title: 'Test Conversation',
                        messages: [
                            { role: 'user', content: 'Hello' },
                            { role: 'assistant', content: 'Hi there!' }
                        ]
                    }
                ]
            };

            const result = await importChatGPT({
                inputFile: path.join(tempOutputDir, 'chatgpt-mock.json'),
                outputDir: tempOutputDir
            });

            expect(result.totalImported).toBe(1);
            const importedFiles = await fs.readdir(tempOutputDir);
            expect(importedFiles.length).toBeGreaterThan(0);
        });

        it('should handle empty ChatGPT import', async () => {
            const result = await importChatGPT({
                inputFile: path.join(tempOutputDir, 'empty-chatgpt.json'),
                outputDir: tempOutputDir
            });

            expect(result.totalImported).toBe(0);
        });
    });

    describe('Claude Conversations Import', () => {
        it('should import Claude conversations successfully', async () => {
            const mockClaudeData = {
                conversations: [
                    { 
                        id: 'test-conv-1',
                        messages: [
                            { role: 'human', content: 'Test query' },
                            { role: 'assistant', content: 'Test response' }
                        ]
                    }
                ]
            };

            const result = await importClaudeConversations({
                inputFile: path.join(tempOutputDir, 'claude-mock.json'),
                outputDir: tempOutputDir
            });

            expect(result.totalImported).toBe(1);
            const importedFiles = await fs.readdir(tempOutputDir);
            expect(importedFiles.length).toBeGreaterThan(0);
        });
    });

    describe('Claude Projects Import', () => {
        it('should import Claude projects successfully', async () => {
            const mockProjectsData = {
                projects: [
                    { 
                        name: 'Test Project',
                        conversations: [
                            { 
                                id: 'proj-conv-1', 
                                messages: [
                                    { role: 'human', content: 'Project query' },
                                    { role: 'assistant', content: 'Project response' }
                                ]
                            }
                        ]
                    }
                ]
            };

            const result = await importClaudeProjects({
                inputFile: path.join(tempOutputDir, 'claude-projects-mock.json'),
                outputDir: tempOutputDir
            });

            expect(result.totalImported).toBe(1);
            const projectDirs = await fs.readdir(tempOutputDir);
            expect(projectDirs.length).toBeGreaterThan(0);
        });
    });

    describe('Memory JSON Import', () => {
        it('should import memory JSON successfully', async () => {
            const mockMemoryData = {
                entities: [
                    { 
                        id: 'test-entity-1',
                        name: 'Test Entity',
                        content: 'Test content',
                        metadata: { source: 'test' }
                    }
                ],
                relations: [
                    {
                        source: 'test-entity-1',
                        target: 'test-entity-2',
                        type: 'test_relation'
                    }
                ]
            };

            const result = await importMemoryJson({
                inputFile: path.join(tempOutputDir, 'memory-mock.json'),
                outputDir: tempOutputDir
            });

            expect(result.totalImported).toBe(1);
            const importedFiles = await fs.readdir(tempOutputDir);
            expect(importedFiles.length).toBeGreaterThan(0);
        });
    });
});
