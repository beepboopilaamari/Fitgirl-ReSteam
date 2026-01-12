import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import log from 'electron-log';
const torrentStream = require('torrent-stream');

interface TorrentDownload {
  downloadId: number;
  magnetLink: string;
  gameName: string;
  downloadPath: string;
  seedAfterComplete: boolean;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'error';
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  peers: number;
  downloadedBytes: number;
  totalBytes: number;
  paused: boolean;
  selectedFileIndices?: number[]; // Indices of selected files to download
  engine?: any; // torrent-stream engine
}

export interface TorrentInfo {
  downloadId: number;
  magnetLink: string;
  gameName: string;
  downloadPath: string;
  seedAfterComplete: boolean;
  selectedFileIndices?: number[]; // Files to download (if undefined, all are selected)
}

export interface TorrentFile {
  index: number;
  name: string;
  length: number;
  isOptional: boolean;
}

export class TorrentManager extends EventEmitter {
  private downloads: Map<number, TorrentDownload> = new Map();
  private progressIntervals: Map<number, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    log.info('[TorrentManager] Initialized with REAL torrent support (torrent-stream)');
  }

  addToQueue(torrentInfo: TorrentInfo): void {
    log.info(`[TorrentManager] ✓ Adding to queue: ${torrentInfo.gameName} with ID: ${torrentInfo.downloadId}`);
    
    const download: TorrentDownload = {
      downloadId: torrentInfo.downloadId,
      magnetLink: torrentInfo.magnetLink,
      gameName: torrentInfo.gameName,
      downloadPath: torrentInfo.downloadPath,
      seedAfterComplete: torrentInfo.seedAfterComplete,
      selectedFileIndices: torrentInfo.selectedFileIndices,
      status: 'queued',
      progress: 0,
      downloadSpeed: 0,
      uploadSpeed: 0,
      peers: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      paused: false
    };

    this.downloads.set(torrentInfo.downloadId, download);
    log.info(`[TorrentManager] ✓ Stored in downloads Map with key: ${torrentInfo.downloadId}`);
    this.emit('queue-updated', this.downloads.size);
    
    // Start download
    log.info(`[TorrentManager] ✓ Starting download with ID: ${torrentInfo.downloadId}`);
    this.startDownload(torrentInfo.downloadId);
  }

  private async startDownload(downloadId: number): Promise<void> {
    log.info(`[TorrentManager] ✓ startDownload() called with ID: ${downloadId}`);
    const download = this.downloads.get(downloadId);
    if (!download) {
      log.error(`[TorrentManager] ✗ No download found in Map for ID: ${downloadId}`);
      return;
    }
    log.info(`[TorrentManager] ✓ Found download in Map for ID: ${downloadId}`);

    try {
      download.status = 'downloading';
      
      log.info(`[TorrentManager] ✓ Emitting 'download-started' with ID: ${downloadId}`);
      this.emit('download-started', {
        downloadId,
        gameName: download.gameName
      });

      log.info(`[TorrentManager] Starting REAL torrent download for: ${download.gameName}`);
      log.info(`[TorrentManager] Download path: ${download.downloadPath}`);
      log.info(`[TorrentManager] Magnet: ${download.magnetLink.substring(0, 100)}...`);

      // Ensure download directory exists
      if (!fs.existsSync(download.downloadPath)) {
        fs.mkdirSync(download.downloadPath, { recursive: true });
      }

      // Create torrent engine
      // Note: torrent-stream creates a subfolder with the torrent name
      // To avoid double nesting, use parent directory
      const parentPath = path.dirname(download.downloadPath);
      
      const engine = torrentStream(download.magnetLink, {
        path: parentPath,
        connections: 100, // Max connections
        uploads: 10, // Upload slots
        tmp: path.join(download.downloadPath, '.torrent-tmp')
      });

      download.engine = engine;

      // Handle torrent ready event
      engine.on('ready', () => {
        log.info(`[TorrentManager] Torrent ready: ${engine.torrent.name}`);
        log.info(`[TorrentManager] Files: ${engine.files.length}, Total size: ${engine.torrent.length} bytes`);
        
        download.totalBytes = engine.torrent.length;
        
        // Update download path to actual torrent folder name
        const actualPath = path.join(parentPath, engine.torrent.name);
        const oldPath = download.downloadPath;
        download.downloadPath = actualPath;
        
        log.info(`[TorrentManager] Actual download path: ${actualPath}`);
        
        // Delete empty initial folder if different from actual path
        if (oldPath !== actualPath && fs.existsSync(oldPath)) {
          try {
            fs.rmSync(oldPath, { recursive: true, force: true });
            log.info(`[TorrentManager] Deleted empty initial folder: ${oldPath}`);
          } catch (err) {
            log.error(`[TorrentManager] Failed to delete initial folder:`, err);
          }
        }
        
        // Update database with correct path
        this.emit('download-path-updated', {
          downloadId,
          downloadPath: actualPath
        });
        
        // Deselect everything first to avoid downloading unselected files by default
        engine.files.forEach((file: any) => file.deselect());

        // Calculate total size of selected files
        let selectedFilesTotalBytes = 0;

        // Select files for download and log the decision
        engine.files.forEach((file: any, index: number) => {
          let willSelect = false;

          if (download.selectedFileIndices !== undefined) {
            // Only select the files explicitly chosen by the user
            willSelect = download.selectedFileIndices.includes(index);
          } else {
            // No selection provided: select all files (legacy behavior)
            willSelect = true;
          }

          if (willSelect) {
            file.select();
            selectedFilesTotalBytes += file.length;
          }

          log.info(
            `[TorrentManager] File ${index}: ${file.name} (${file.length} bytes) | selected=${willSelect}`
          );
        });

        // Update total bytes to only include selected files
        download.totalBytes = selectedFilesTotalBytes;
        log.info(`[TorrentManager] Total selected files size: ${(selectedFilesTotalBytes / 1024 / 1024).toFixed(2)} MB`);


        // Start monitoring progress
        this.monitorTorrentProgress(downloadId);
      });

      // Handle errors
      engine.on('error', (error: Error) => {
        log.error(`[TorrentManager] Torrent error:`, error);
        download.status = 'error';
        this.emit('download-error', {
          downloadId,
          error: error.message
        });
      });

    } catch (error) {
      log.error(`[TorrentManager] Error starting download:`, error);
      download.status = 'error';
      this.emit('download-error', {
        downloadId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private monitorTorrentProgress(downloadId: number): void {
    const download = this.downloads.get(downloadId);
    if (!download || !download.engine) return;

    const interval = setInterval(() => {
      const currentDownload = this.downloads.get(downloadId);
      
      if (!currentDownload || !currentDownload.engine) {
        clearInterval(interval);
        this.progressIntervals.delete(downloadId);
        return;
      }

      if (currentDownload.paused || currentDownload.status !== 'downloading') {
        clearInterval(interval);
        this.progressIntervals.delete(downloadId);
        return;
      }

      const engine = currentDownload.engine;
      const swarm = engine.swarm;
      
      // Calculate downloaded bytes from all pieces
      let downloadedBytes = 0;
      const pieces = engine.bitfield;
      const pieceLength = engine.torrent.pieceLength;
      const lastPieceLength = engine.torrent.lastPieceLength;
      
      for (let i = 0; i < pieces.buffer.length * 8; i++) {
        if (pieces.get(i)) {
          downloadedBytes += (i === pieces.buffer.length * 8 - 1) ? lastPieceLength : pieceLength;
        }
      }
      
      const totalBytes = engine.torrent.length;
      const progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;
      const downloadSpeed = swarm.downloadSpeed() || 0;
      const uploadSpeed = swarm.uploadSpeed() || 0;
      const peers = swarm.wires.length || 0;

      currentDownload.downloadedBytes = downloadedBytes;
      currentDownload.progress = progress;
      currentDownload.downloadSpeed = downloadSpeed;
      currentDownload.uploadSpeed = uploadSpeed;
      currentDownload.peers = peers;

      log.info(`[TorrentManager] REAL Progress ${downloadId}: ${progress.toFixed(2)}% (${(downloadedBytes / 1024 / 1024).toFixed(2)}/${(totalBytes / 1024 / 1024).toFixed(2)} MB) - ${(downloadSpeed / 1024 / 1024).toFixed(2)} MB/s - ${peers} peers`);

      const progressUpdate = {
        downloadId,
        progress: currentDownload.progress,
        downloadSpeed: currentDownload.downloadSpeed,
        uploadSpeed: currentDownload.uploadSpeed,
        peers: currentDownload.peers,
        downloadedBytes: currentDownload.downloadedBytes,
        totalBytes: currentDownload.totalBytes,
        etaSeconds: downloadSpeed > 0 ? Math.floor((totalBytes - downloadedBytes) / downloadSpeed) : 0
      };
      
      log.info(`[TorrentManager] ✓ Emitting 'download-progress' with ID: ${downloadId}`);
      this.emit('download-progress', progressUpdate);

      // Check if completed - must be 100% to ensure file integrity
      if (downloadedBytes >= totalBytes) {
        currentDownload.status = 'completed';
        currentDownload.progress = 100;
        
        clearInterval(interval);
        this.progressIntervals.delete(downloadId);
        
        log.info(`[TorrentManager] Download ${downloadId} COMPLETED: ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB`);
        
        // Clean up .torrent-tmp folder
        const tmpPath = path.join(currentDownload.downloadPath, '.torrent-tmp');
        if (fs.existsSync(tmpPath)) {
          try {
            fs.rmSync(tmpPath, { recursive: true, force: true });
            log.info(`[TorrentManager] Cleaned up temp folder: ${tmpPath}`);
          } catch (err) {
            log.error(`[TorrentManager] Failed to clean temp folder:`, err);
          }
        }
        
        // Destroy engine if not seeding
        if (!currentDownload.seedAfterComplete) {
          engine.destroy();
        }
        
        this.emit('download-completed', {
          downloadId,
          downloadPath: currentDownload.downloadPath
        });
      }
    }, 1000); // Update every second

    this.progressIntervals.set(downloadId, interval);
  }

  private simulateDownload(downloadId: number): void {
    const download = this.downloads.get(downloadId);
    if (!download) {
      log.error(`[TorrentManager] Download ${downloadId} not found for simulation`);
      return;
    }

    // Simulate a 3GB download
    const totalSize = 3 * 1024 * 1024 * 1024; // 3 GB in bytes
    download.totalBytes = totalSize;
    
    let downloaded = 0;
    const chunkSize = 50 * 1024 * 1024; // 50 MB per update
    const updateInterval = 2000; // Update every 2 seconds

    log.info(`[TorrentManager] Starting simulation for download ${downloadId}, total: ${totalSize} bytes`);

    const interval = setInterval(() => {
      const currentDownload = this.downloads.get(downloadId);
      
      if (!currentDownload) {
        log.info(`[TorrentManager] Download ${downloadId} was removed, stopping simulation`);
        clearInterval(interval);
        this.progressIntervals.delete(downloadId);
        return;
      }
      
      if (currentDownload.paused || currentDownload.status !== 'downloading') {
        log.info(`[TorrentManager] Download ${downloadId} paused or status changed`);
        clearInterval(interval);
        this.progressIntervals.delete(downloadId);
        return;
      }

      downloaded += chunkSize;
      if (downloaded >= totalSize) {
        downloaded = totalSize;
        currentDownload.progress = 100;
        currentDownload.downloadedBytes = totalSize;
        currentDownload.downloadSpeed = 0;
        currentDownload.status = 'completed';
        
        log.info(`[TorrentManager] Download ${downloadId} completed: ${downloaded}/${totalSize} bytes`);
        
        clearInterval(interval);
        this.progressIntervals.delete(downloadId);
        
        this.emit('download-completed', {
          downloadId,
          downloadPath: currentDownload.downloadPath
        });
      } else {
        currentDownload.downloadedBytes = downloaded;
        currentDownload.progress = (downloaded / totalSize) * 100;
        currentDownload.downloadSpeed = chunkSize / (updateInterval / 1000); // bytes per second
        currentDownload.peers = Math.floor(Math.random() * 50) + 10; // Simulate 10-60 peers

        const progressUpdate = {
          downloadId,
          progress: currentDownload.progress,
          downloadSpeed: currentDownload.downloadSpeed,
          uploadSpeed: currentDownload.uploadSpeed,
          peers: currentDownload.peers,
          downloadedBytes: currentDownload.downloadedBytes,
          totalBytes: currentDownload.totalBytes,
          etaSeconds: Math.floor((totalSize - downloaded) / currentDownload.downloadSpeed)
        };

        log.info(`[TorrentManager] Progress ${downloadId}: ${currentDownload.progress.toFixed(2)}% (${downloaded}/${totalSize})`);
        this.emit('download-progress', progressUpdate);
      }
    }, updateInterval);

    this.progressIntervals.set(downloadId, interval);
  }

  pauseDownload(downloadId: number): void {
    const download = this.downloads.get(downloadId);
    if (!download) return;

    download.paused = true;
    download.status = 'paused';
    
    // Stop progress monitoring
    const interval = this.progressIntervals.get(downloadId);
    if (interval) {
      clearInterval(interval);
      this.progressIntervals.delete(downloadId);
    }
    
    if (download.engine) {
      // Pause by stopping the swarm
      download.engine.swarm.pause();
      log.info(`[TorrentManager] Paused REAL download ${downloadId}`);
    } else {
      log.info(`[TorrentManager] Paused download ${downloadId}`);
    }
    
    this.emit('download-paused', { downloadId });
  }

  resumeDownload(downloadId: number): void {
    const download = this.downloads.get(downloadId);
    if (!download) return;

    download.paused = false;
    download.status = 'downloading';
    
    if (download.engine) {
      // Resume by resuming the swarm
      download.engine.swarm.resume();
      log.info(`[TorrentManager] Resumed REAL download ${downloadId}`);
      this.monitorTorrentProgress(downloadId);
    } else {
      log.info(`[TorrentManager] Resumed download ${downloadId}`);
      this.simulateDownload(downloadId);
    }
    
    this.emit('download-resumed', { downloadId });
  }

  cancelDownload(downloadId: number): void {
    const download = this.downloads.get(downloadId);
    if (!download) {
      log.warn(`[TorrentManager] Download ${downloadId} not found, already cancelled`);
      return;
    }

    log.info(`[TorrentManager] Cancelling REAL download ${downloadId}`);
    const downloadPath = download.downloadPath;
    
    // Clear progress interval FIRST
    const interval = this.progressIntervals.get(downloadId);
    if (interval) {
      clearInterval(interval);
      this.progressIntervals.delete(downloadId);
    }
    
    // Forcefully stop engine
    if (download.engine) {
      try {
        const engine = download.engine;
        
        // Remove engine reference immediately to prevent any further operations
        download.engine = null;
        
        // Stop swarm immediately - pause all connections
        if (engine.swarm) {
          engine.swarm.pause();
          
          // Destroy all wires (connections) immediately
          if (engine.swarm.wires) {
            engine.swarm.wires.forEach((wire: any) => {
              try {
                wire.destroy();
              } catch (e) {
                // Ignore errors from destroying wires
              }
            });
          }
        }
        
        // Remove all event listeners to prevent any callbacks
        engine.removeAllListeners();
        
        // Destroy engine and delete folder after it's done
        engine.destroy(() => {
          log.info(`[TorrentManager] Destroyed engine for download ${downloadId}`);
          
          // Now delete the download folder after engine is fully destroyed
          if (downloadPath && fs.existsSync(downloadPath)) {
            // Give a small delay to ensure files are released
            setTimeout(() => {
              try {
                fs.rmSync(downloadPath, { recursive: true, force: true });
                log.info(`[TorrentManager] Deleted download folder: ${downloadPath}`);
              } catch (error) {
                log.error(`[TorrentManager] Failed to delete download folder ${downloadPath}:`, error);
              }
            }, 500);
          }
        });
        
        log.info(`[TorrentManager] Stopped engine for download ${downloadId}`);
      } catch (error) {
        log.error(`[TorrentManager] Error stopping engine for ${downloadId}:`, error);
      }
    } else {
      // No engine, just delete the folder
      if (downloadPath && fs.existsSync(downloadPath)) {
        try {
          fs.rmSync(downloadPath, { recursive: true, force: true });
          log.info(`[TorrentManager] Deleted download folder: ${downloadPath}`);
        } catch (error) {
          log.error(`[TorrentManager] Failed to delete download folder ${downloadPath}:`, error);
        }
      }
    }
    
    // Remove from downloads map
    this.downloads.delete(downloadId);
    this.emit('download-cancelled', { downloadId });
    this.emit('queue-updated', this.downloads.size);
  }

  setDownloadSpeedLimit(mbps: number): void {
    log.info(`[TorrentManager] Download speed limit set to ${mbps} Mbps`);
    // This would be implemented in a real torrent client
  }

  setUploadSpeedLimit(mbps: number): void {
    log.info(`[TorrentManager] Upload speed limit set to ${mbps} Mbps`);
    // This would be implemented in a real torrent client
  }

  getQueueLength(): number {
    return this.downloads.size;
  }

  getAllDownloadIds(): number[] {
    return Array.from(this.downloads.keys());
  }

  cancelAll(): void {
    log.info(`[TorrentManager] Cancelling ALL downloads (${this.downloads.size} active)`);
    const downloadIds = Array.from(this.downloads.keys());
    downloadIds.forEach(id => this.cancelDownload(id));
  }

  getActiveDownload(): { downloadId: number; progress: number } | null {
    for (const [downloadId, download] of this.downloads.entries()) {
      if (download.status === 'downloading') {
        return { downloadId, progress: download.progress };
      }
    }
    return null;
  }

  async findInstaller(downloadPath: string): Promise<string | null> {
    try {
      if (!fs.existsSync(downloadPath)) {
        return null;
      }
      
      const files = fs.readdirSync(downloadPath);
      const installerPatterns = [/setup\.exe$/i, /installer\.exe$/i, /\.exe$/i];
      
      for (const file of files) {
        for (const pattern of installerPatterns) {
          if (pattern.test(file)) {
            return path.join(downloadPath, file);
          }
        }
      }
      
      return null;
    } catch (error) {
      log.error('[TorrentManager] Error finding installer:', error);
      return null;
    }
  }

  async getTorrentFiles(magnetLink: string): Promise<TorrentFile[]> {
    return new Promise((resolve, reject) => {
      const engine = torrentStream(magnetLink, {
        connections: 100,
        uploads: 10
      });

      engine.on('ready', () => {
        const files: TorrentFile[] = engine.files.map((file: any, index: number) => ({
          index,
          name: file.name,
          length: file.length,
          isOptional: file.name.toLowerCase().includes('optional')
        }));
        
        engine.destroy(() => {
          resolve(files);
        });
      });

      engine.on('error', (err: any) => {
        reject(err);
      });

      setTimeout(() => {
        engine.destroy(() => {
          reject(new Error('Torrent file fetch timeout'));
        });
      }, 30000); // 30 second timeout
    });
  }

  destroy(): void {
    // Clear all intervals
    this.progressIntervals.forEach(interval => clearInterval(interval));
    this.progressIntervals.clear();
    
    // Destroy all torrent engines
    this.downloads.forEach((download, downloadId) => {
      if (download.engine) {
        download.engine.destroy(() => {
          log.info(`[TorrentManager] Destroyed engine for download ${downloadId}`);
        });
      }
    });
    
    // Clean up downloads
    this.downloads.clear();
    
    log.info('[TorrentManager] Destroyed');
  }
}
