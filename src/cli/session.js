import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './app.js';

const SESSION_FILE = path.join(process.cwd(), '.mcp-session');

class Session {
  constructor() {
    this.sessionId = uuidv4();
    this.startTime = new Date();
    this.lastActivity = this.startTime;
    this.commandHistory = [];
    this.activeTools = new Set();
  }

  async save() {
    try {
      const sessionData = {
        sessionId: this.sessionId,
        startTime: this.startTime.toISOString(),
        lastActivity: this.lastActivity.toISOString(),
        commandHistory: this.commandHistory,
        activeTools: Array.from(this.activeTools)
      };

      await fs.writeFile(SESSION_FILE, JSON.stringify(sessionData, null, 2));
    } catch (error) {
      logger.error(`Failed to save session: ${error.message}`);
    }
  }

  async load() {
    try {
      const data = await fs.readFile(SESSION_FILE, 'utf8');
      const sessionData = JSON.parse(data);

      this.sessionId = sessionData.sessionId;
      this.startTime = new Date(sessionData.startTime);
      this.lastActivity = new Date(sessionData.lastActivity);
      this.commandHistory = sessionData.commandHistory;
      this.activeTools = new Set(sessionData.activeTools);
    } catch (error) {
      logger.error(`Failed to load session: ${error.message}`);
    }
  }

  recordCommand(command) {
    this.commandHistory.push({
      command,
      timestamp: new Date().toISOString()
    });
    this.lastActivity = new Date();
  }

  addTool(toolName) {
    this.activeTools.add(toolName);
    this.lastActivity = new Date();
  }

  removeTool(toolName) {
    this.activeTools.delete(toolName);
    this.lastActivity = new Date();
  }

  get status() {
    return {
      sessionId: this.sessionId,
      duration: new Date() - this.startTime,
      lastActivity: this.lastActivity,
      commandCount: this.commandHistory.length,
      activeTools: Array.from(this.activeTools)
    };
  }
}

// Singleton session instance
export const session = new Session();

// Initialize session on import
session.save();
