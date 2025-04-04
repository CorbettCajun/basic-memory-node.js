import { 
  buildContext, 
  readNote, 
  writeNote 
} from '../../src/mcp/tools/index.js';
import { createTempDirectory, cleanupTempDirectory } from '../test_utils.js';
import path from 'path';
import fs from 'fs/promises';

describe('MCP Tools Integration', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await createTempDirectory('mcp-test');
  });

  afterEach(async () => {
    await cleanupTempDirectory(tempDir);
  });

  describe('writeNote', () => {
    it('should write a note to the specified folder', async () => {
      const title = 'Test Note';
      const content = 'This is a test note content';
      const folder = path.join(tempDir, 'notes');

      const note = await writeNote(title, content, folder);

      expect(note).toBeDefined();
      expect(note.title).toBe(title);
      expect(note.permalink).toBeDefined();

      // Verify file was created
      const notePath = path.join(folder, `${note.permalink}.md`);
      const fileContent = await fs.readFile(notePath, 'utf8');
      
      expect(fileContent).toContain(title);
      expect(fileContent).toContain(content);
    });
  });

  describe('readNote', () => {
    it('should read an existing note', async () => {
      const title = 'Read Test Note';
      const content = 'Content for reading test';
      const folder = path.join(tempDir, 'notes');

      // First write a note
      const writtenNote = await writeNote(title, content, folder);

      // Then read the note
      const readNote = await readNote(writtenNote.permalink);

      expect(readNote).toBeDefined();
      expect(readNote.title).toBe(title);
      expect(readNote.content).toContain(content);
    });
  });

  describe('buildContext', () => {
    it('should build context for a given URL', async () => {
      const url = 'https://example.com';
      const context = await buildContext({ url });

      expect(context).toBeDefined();
      expect(context.url).toBe(url);
      expect(context.depth).toBe(1);
      expect(context.timeframe).toBe('7d');
    });

    it('should respect custom context options', async () => {
      const url = 'https://test.com';
      const context = await buildContext({
        url,
        depth: 2,
        timeframe: '30d',
        maxRelated: 5
      });

      expect(context).toBeDefined();
      expect(context.url).toBe(url);
      expect(context.depth).toBe(2);
      expect(context.timeframe).toBe('30d');
      expect(context.maxRelated).toBe(5);
    });
  });
});
