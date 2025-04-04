import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import chokidar from 'chokidar';
import { logger } from '../app.js';

class SyncService extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      baseDir: config.baseDir || path.resolve(process.env.HOME, 'basic-memory'),
      syncInterval: config.syncInterval || 5000, // 5 seconds
      watchPaths: config.watchPaths || ['notes', 'projects', 'memories'],
      debounceDelay: config.debounceDelay || 300,
      maxSyncRetries: config.maxSyncRetries || 3
    };

    this.state = {
      isSyncing: false,
      lastSyncTime: null,
      syncQueue: new Set()
    };
  }

  async initialize() {
    // Ensure base directories exist
    await Promise.all(
      this.config.watchPaths.map(async (subDir) => {
        const fullPath = path.join(this.config.baseDir, subDir);
        await fs.mkdir(fullPath, { recursive: true });
      })
    );

    this._setupWatchers();
    this._startPeriodicSync();
  }

  _setupWatchers() {
    const watchPaths = this.config.watchPaths.map(
      subDir => path.join(this.config.baseDir, subDir)
    );

    this.watcher = chokidar.watch(watchPaths, {
      persistent: true,
      ignoreInitial: true,
      depth: 2,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    this.watcher
      .on('add', path => this._queueSync(path, 'add'))
      .on('change', path => this._queueSync(path, 'change'))
      .on('unlink', path => this._queueSync(path, 'delete'));

    logger.info('Sync watchers initialized');
  }

  _queueSync(filePath, eventType) {
    this.state.syncQueue.add({ filePath, eventType });
    this._debouncedSync();
  }

  _debouncedSync() {
    clearTimeout(this._syncTimeout);
    this._syncTimeout = setTimeout(() => this.sync(), this.config.debounceDelay);
  }

  async sync() {
    if (this.state.isSyncing) return;

    try {
      this.state.isSyncing = true;
      const syncItems = Array.from(this.state.syncQueue);
      this.state.syncQueue.clear();

      for (const item of syncItems) {
        await this._processSyncItemWithRetry(item);
      }

      this.state.lastSyncTime = new Date();
      this.emit('syncComplete', { items: syncItems });
      logger.info(`Sync completed: ${syncItems.length} items processed`);
    } catch (error) {
      logger.error('Sync failed', { error });
      this.emit('syncError', error);
    } finally {
      this.state.isSyncing = false;
    }
  }

  async _processSyncItemWithRetry(syncItem, retriesLeft = null) {
    retriesLeft = retriesLeft ?? this.config.maxSyncRetries;

    try {
      switch (syncItem.eventType) {
        case 'add':
          return await this._handleFileAdd(syncItem.filePath);
        case 'change':
          return await this._handleFileChange(syncItem.filePath);
        case 'delete':
          return await this._handleFileDelete(syncItem.filePath);
        default:
          throw new Error(`Unknown sync event type: ${syncItem.eventType}`);
      }
    } catch (error) {
      if (retriesLeft > 0) {
        logger.warn(`Sync retry for ${syncItem.filePath}`, { 
          retriesLeft, 
          error: error.message 
        });
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
        return this._processSyncItemWithRetry(syncItem, retriesLeft - 1);
      }
      throw error;
    }
  }

  async _handleFileAdd(filePath) {
    // Implement file addition logic
    logger.info(`File added: ${filePath}`);
  }

  async _handleFileChange(filePath) {
    // Implement file modification logic
    logger.info(`File changed: ${filePath}`);
  }

  async _handleFileDelete(filePath) {
    // Implement file deletion logic
    logger.info(`File deleted: ${filePath}`);
  }

  _startPeriodicSync() {
    this._periodicSyncInterval = setInterval(
      () => this.sync(),
      this.config.syncInterval
    );
  }

  async close() {
    if (this.watcher) {
      await this.watcher.close();
    }
    clearInterval(this._periodicSyncInterval);
    logger.info('Sync service closed');
  }
}

export default SyncService;
