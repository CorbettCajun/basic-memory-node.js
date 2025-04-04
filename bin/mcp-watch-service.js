#!/usr/bin/env node
import chokidar from 'chokidar';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class MCPWatchService {
  constructor(config = {}) {
    this.config = {
      watchPaths: config.watchPaths || [
        path.resolve(__dirname, '../src'),
        path.resolve(__dirname, '../db')
      ],
      serverScript: config.serverScript || path.resolve(__dirname, 'basic-memory.js'),
      debounceDelay: config.debounceDelay || 500,
      logFile: config.logFile || path.resolve(__dirname, '../logs/mcp-watch.log')
    };

    this.serverProcess = null;
    this.restartTimeout = null;
  }

  async initLogging() {
    try {
      await fs.mkdir(path.dirname(this.config.logFile), { recursive: true });
      this.logStream = await fs.open(this.config.logFile, 'a');
    } catch (error) {
      console.error('Failed to initialize log file:', error);
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    console.log(logMessage.trim());
    if (this.logStream) {
      this.logStream.write(logMessage);
    }
  }

  startServer() {
    this.log('Starting MCP Server...');
    this.serverProcess = spawn('node', [this.config.serverScript], {
      stdio: 'inherit',
      env: {
        ...process.env,
        MCP_WATCH_MODE: 'true'
      }
    });

    this.serverProcess.on('error', (err) => {
      this.log(`Server start error: ${err.message}`);
    });

    this.serverProcess.on('exit', (code, signal) => {
      this.log(`Server exited with code ${code} and signal ${signal}`);
      if (code !== 0) {
        this.log('Restarting server due to unexpected exit...');
        this.startServer();
      }
    });
  }

  stopServer() {
    if (this.serverProcess) {
      this.log('Stopping MCP Server...');
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
    }
  }

  restartServer() {
    clearTimeout(this.restartTimeout);
    this.restartTimeout = setTimeout(() => {
      this.stopServer();
      this.startServer();
    }, this.config.debounceDelay);
  }

  async start() {
    await this.initLogging();
    this.startServer();

    const watcher = chokidar.watch(this.config.watchPaths, {
      ignored: [
        /(^|[\/\\])\../, // ignore dotfiles
        /node_modules/,
        /\.log$/,
        /\.tmp$/
      ],
      persistent: true,
      ignoreInitial: true
    });

    watcher
      .on('ready', () => this.log('Watching for file changes...'))
      .on('change', (path) => {
        this.log(`File changed: ${path}`);
        this.restartServer();
      })
      .on('unlink', (path) => {
        this.log(`File deleted: ${path}`);
        this.restartServer();
      });

    process.on('SIGINT', () => {
      this.log('Shutting down watch service...');
      watcher.close();
      this.stopServer();
      process.exit(0);
    });
  }
}

// Allow configuration via environment or CLI
const watchService = new MCPWatchService();
watchService.start().catch(console.error);
