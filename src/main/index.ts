import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import { DatabaseService } from './database/DatabaseService';
import { GameScraper } from './scraper/GameScraper';
import { TorrentManager } from './torrent/TorrentManager';
import { GameLauncher } from './launcher/GameLauncher';
import { 
  Installation, 
  LaunchOption, 
  Download, 
  AppSettings,
  DownloadStatus 
} from '../shared/types';

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'info';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let db: DatabaseService;
let scraper: GameScraper;
let torrentManager: TorrentManager;
let gameLauncher: GameLauncher;

function createSplashWindow(): BrowserWindow {
  const splash = new BrowserWindow({
    width: 400,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    center: true,
    icon: path.join(__dirname, '../../resources/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Simple splash HTML
  splash.loadURL(`data:text/html;charset=utf-8,
    <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: linear-gradient(135deg, #1b2838 0%, #2a475e 100%);
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #66c0f4;
          }
          .container {
            text-align: center;
          }
          h1 {
            font-size: 32px;
            margin: 0 0 20px 0;
            color: #fff;
          }
          .spinner {
            border: 4px solid rgba(255,255,255,0.1);
            border-radius: 50%;
            border-top: 4px solid #66c0f4;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          p {
            margin-top: 20px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>FitGirl Resteam</h1>
          <div class="spinner"></div>
          <p>Updating game catalog...</p>
        </div>
      </body>
    </html>
  `);

  return splash;
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: '#0a0e1a',
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, '../../resources/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('closed', () => {
    mainWindow = null;
  });

  return win;
}

async function initializeServices(): Promise<void> {
  log.info('[Main] Initializing services...');

  // Initialize database
  db = new DatabaseService();
  
  // Initialize scraper
  scraper = new GameScraper();
  
  // Initialize torrent manager
  torrentManager = new TorrentManager();
  
  // Initialize game launcher
  gameLauncher = new GameLauncher();

  // Setup event listeners
  setupTorrentEvents();
  setupLauncherEvents();

  log.info('[Main] Services initialized');
  
  // Resume incomplete downloads from previous session
  try {
    const incompleteDownloads = db.getActiveDownloads();
    log.info(`[Main] Database check: Found ${incompleteDownloads.length} incomplete downloads`);
    
    if (incompleteDownloads.length > 0) {
      log.info(`[Main] Resuming ${incompleteDownloads.length} incomplete downloads from previous session`);
      const settings = db.getSettings();
      
      for (const download of incompleteDownloads) {
        log.info(`[Main] Resuming download ID ${download.id}: ${download.game?.title}`);
        
        // Add back to torrent queue to resume
        torrentManager.addToQueue({
          downloadId: download.id,
          magnetLink: download.magnet_link,
          gameName: download.game?.title || 'Unknown Game',
          downloadPath: download.download_path,
          seedAfterComplete: settings.seed_by_default
        });
      }
      
      log.info('[Main] All incomplete downloads resumed');
    } else {
      log.info('[Main] No incomplete downloads to resume');
    }
  } catch (error) {
    log.error('[Main] Failed to resume incomplete downloads:', error);
  }
}

function setupTorrentEvents(): void {
  torrentManager.on('download-started', (data) => {
    log.info('[Main] Download started:', data);
    mainWindow?.webContents.send('download-started', data);
  });

  torrentManager.on('download-path-updated', (data: { downloadId: number; downloadPath: string }) => {
    log.info(`[Main] Updating download path for ${data.downloadId}: ${data.downloadPath}`);
    db.updateDownloadPath(data.downloadId, data.downloadPath);
  });

  torrentManager.on('download-progress', (progress) => {
    // Log every 10th progress update to avoid spam
    if (progress.progress % 10 < 2) {
      log.info(`[Main] Progress update: ${progress.downloadId} - ${progress.progress.toFixed(2)}%`);
    }
    
    log.info(`[Main] ✓ Received 'download-progress' event with ID: ${progress.downloadId}`);
    
    // Update database
    db.updateDownload(progress.downloadId, {
      progress: progress.progress,
      download_speed: progress.downloadSpeed,
      upload_speed: progress.uploadSpeed,
      peers: progress.peers,
      downloaded_bytes: progress.downloadedBytes,
      total_bytes: progress.totalBytes,
      eta_seconds: progress.etaSeconds,
      status: DownloadStatus.DOWNLOADING
    } as Partial<Download>);

    log.info(`[Main] ✓ Sending to renderer with ID: ${progress.downloadId}`);
    // Send to renderer
    mainWindow?.webContents.send('download-progress', progress);
  });

  torrentManager.on('download-completed', async (data) => {
    log.info('[Main] Download completed:', data);
    
    // Update database
    db.updateDownload(data.downloadId, {
      status: data.seeding ? DownloadStatus.SEEDING : DownloadStatus.COMPLETED,
      progress: 1
    } as Partial<Download>);

    // Find installer
    const installerPath = await torrentManager.findInstaller(data.downloadPath);

    mainWindow?.webContents.send('download-completed', {
      downloadId: data.downloadId,
      installerPath,
      seeding: data.seeding
    });
  });

  torrentManager.on('download-error', (data) => {
    log.error('[Main] Download error:', data);
    db.updateDownload(data.downloadId, {
      status: DownloadStatus.ERROR
    } as Partial<Download>);
    mainWindow?.webContents.send('download-error', data);
  });

  torrentManager.on('download-paused', (data) => {
    db.updateDownload(data.downloadId, {
      status: DownloadStatus.PAUSED
    } as Partial<Download>);
    mainWindow?.webContents.send('download-paused', data);
  });

  torrentManager.on('download-resumed', (data) => {
    db.updateDownload(data.downloadId, {
      status: DownloadStatus.DOWNLOADING
    } as Partial<Download>);
    mainWindow?.webContents.send('download-resumed', data);
  });

  torrentManager.on('download-cancelled', (data) => {
    db.updateDownload(data.downloadId, {
      status: DownloadStatus.CANCELLED
    } as Partial<Download>);
    mainWindow?.webContents.send('download-cancelled', data);
  });
}

function setupLauncherEvents(): void {
  gameLauncher.on('game-launched', (data) => {
    log.info('[Main] Game launched:', data);
    mainWindow?.webContents.send('game-launched', data);
  });

  gameLauncher.on('game-closed', (data) => {
    log.info('[Main] Game closed:', data);
    
    // Update playtime in database
    const installation = db.getInstallationById(data.installationId);
    if (installation) {
      db.updateInstallation(data.installationId, {
        total_playtime_seconds: installation.total_playtime_seconds + data.playTimeSeconds,
        last_played: new Date().toISOString()
      } as Partial<Installation>);
    }

    mainWindow?.webContents.send('game-closed', data);
  });

  gameLauncher.on('launch-error', (data) => {
    log.error('[Main] Launch error:', data);
    mainWindow?.webContents.send('launch-error', data);
  });
}

async function updateCatalog(): Promise<number> {
  try {
    const settings = db.getSettings();
    const lastUpdate = settings.last_catalog_update;
    
    // Get existing slugs to avoid duplicates
    const existingGames = db.getAllGames();
    const existingSlugs = existingGames.map(g => g.slug);
    
    // Get scraper progress (last page scraped)
    const progress = db.getScraperProgress();
    const lastPage = progress?.last_page || 0;
    
    log.info(`[Main] Starting catalog update from page ${lastPage + 1}`);

    // Check for new games with progress tracking
    let currentMaxPage = lastPage;
    const newGames = await scraper.updateCatalog(
      lastUpdate, 
      existingSlugs, 
      lastPage,
      (page: number, newGamesCount: number) => {
        // Update progress after each page
        currentMaxPage = Math.max(currentMaxPage, page);
        db.setScraperProgress(currentMaxPage);
        log.info(`[Main] Progress: page ${page} complete (${newGamesCount} new games), saved progress`);
        
        // Send progress to renderer
        if (mainWindow) {
          mainWindow.webContents.send('scraper-progress', { 
            page, 
            newGamesCount,
            totalNewGames: newGames.length 
          });
        }
      }
    );
    
    // Insert new games into database
    for (const game of newGames) {
      try {
        db.insertGame({
          ...game,
          last_scraped: new Date().toISOString()
        });
      } catch (error) {
        log.error('[Main] Error inserting game:', error);
      }
    }

    // Update last catalog update time
    db.updateSettings({
      last_catalog_update: new Date().toISOString()
    });

    log.info(`[Main] Catalog updated: ${newGames.length} new games`);
    return newGames.length;
  } catch (error) {
    log.error('[Main] Error updating catalog:', error);
    return 0;
  }
}

function setupAutoUpdate(): void {
  // Configure auto-updater
  autoUpdater.logger = log;
  autoUpdater.checkForUpdatesAndNotify();

  // Check for updates periodically (every hour)
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 60 * 60 * 1000);

  // Listen for update available
  autoUpdater.on('update-available', (info) => {
    log.info(`[Main] Update available: ${info.version}`);
    mainWindow?.webContents.send('update-available', info);
  });

  // Listen for update downloaded
  autoUpdater.on('update-downloaded', (info) => {
    log.info(`[Main] Update downloaded: ${info.version}`);
    mainWindow?.webContents.send('update-downloaded', info);
  });

  // Handle update error
  autoUpdater.on('error', (error) => {
    log.error('[Main] Update error:', error);
  });
}

function setupIpcHandlers(): void {
  // ==================== SETTINGS ====================
  
  ipcMain.handle('get-settings', async () => {
    return db.getSettings();
  });

  ipcMain.handle('update-settings', async (_, settings: Partial<AppSettings>) => {
    db.updateSettings(settings);
    
    // Apply speed limits
    if (settings.download_speed_limit_mbps !== undefined) {
      torrentManager.setDownloadSpeedLimit(settings.download_speed_limit_mbps);
    }
    if (settings.upload_speed_limit_mbps !== undefined) {
      torrentManager.setUploadSpeedLimit(settings.upload_speed_limit_mbps);
    }
    
    return db.getSettings();
  });

  // ==================== GAMES ====================
  
  ipcMain.handle('get-games', async (_, limit?: number, offset?: number) => {
    return db.getAllGames(limit, offset);
  });

  ipcMain.handle('get-game', async (_, id: number) => {
    return db.getGameById(id);
  });

  ipcMain.handle('search-games', async (_, searchTerm: string, filters?: any) => {
    return db.searchGames(searchTerm, filters);
  });

  ipcMain.handle('get-games-count', async () => {
    return db.getGamesCount();
  });

  // ==================== INSTALLATIONS ====================
  
  ipcMain.handle('get-installations', async () => {
    return db.getAllInstallations();
  });

  ipcMain.handle('get-installation', async (_, id: number) => {
    return db.getInstallationById(id);
  });

  ipcMain.handle('add-installation', async (_, installation: Omit<Installation, 'id'>) => {
    return db.insertInstallation(installation);
  });

  ipcMain.handle('update-installation', async (_, id: number, updates: Partial<Installation>) => {
    db.updateInstallation(id, updates);
    return true;
  });

  ipcMain.handle('delete-installation', async (_, id: number) => {
    db.deleteInstallation(id);
    return true;
  });

  // ==================== COLLECTIONS ====================

  ipcMain.handle('get-all-collections', async () => {
    return db.getAllCollections();
  });

  ipcMain.handle('create-collection', async (_, name: string, description?: string, color?: string) => {
    return db.insertCollection(name, description, color);
  });

  ipcMain.handle('delete-collection', async (_, id: number) => {
    db.deleteCollection(id);
    return true;
  });

  ipcMain.handle('add-game-to-collection', async (_, collectionId: number, installationId: number) => {
    db.addGameToCollection(collectionId, installationId);
    return true;
  });

  ipcMain.handle('remove-game-from-collection', async (_, collectionId: number, installationId: number) => {
    db.removeGameFromCollection(collectionId, installationId);
    return true;
  });

  ipcMain.handle('get-collection-games', async (_, collectionId: number) => {
    return db.getCollectionGames(collectionId);
  });

  // ==================== PLAYTIME ====================

  ipcMain.handle('get-playtime-sessions', async (_, installationId: number) => {
    return db.getPlaytimeSessions(installationId);
  });

  ipcMain.handle('get-playtime-stats', async (_, installationId: number, period?: 'day' | 'week' | 'month') => {
    return db.getPlaytimeStats(installationId, period);
  });

  // ==================== DIRECTORY SCANNING ====================

  ipcMain.handle('scan-directory-for-games', async (_, directoryPath: string) => {
    try {
      const fs = require('fs');
      const path = require('path');
      
      if (!fs.existsSync(directoryPath)) {
        return { success: false, error: 'Directory does not exist' };
      }

      const executables: string[] = [];
      
      // Recursively scan directory for .exe files
      const scanDir = (dir: string, depth: number = 0) => {
        if (depth > 3) return; // Limit recursion depth to 3 levels
        
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            // Skip common non-game directories
            const dirName = entry.name.toLowerCase();
            if (!['node_modules', 'cache', 'temp', 'logs', '__pycache__'].includes(dirName)) {
              scanDir(fullPath, depth + 1);
            }
          } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.exe')) {
            // Filter out likely non-game executables
            const fileName = entry.name.toLowerCase();
            if (!fileName.includes('unins') && 
                !fileName.includes('setup') && 
                !fileName.includes('install') && 
                !fileName.includes('update') &&
                !fileName.includes('crash') &&
                !fileName.includes('launcher')) {
              
              // Check file size (games are usually > 1MB)
              const stats = fs.statSync(fullPath);
              if (stats.size > 1024 * 1024) {
                executables.push(fullPath);
              }
            }
          }
        }
      };
      
      scanDir(directoryPath);
      
      return { success: true, executables };
    } catch (error: any) {
      console.error('Error scanning directory:', error);
      return { success: false, error: error.message };
    }
  });

  // ==================== LAUNCH OPTIONS ====================
  
  ipcMain.handle('get-launch-options', async (_, installationId: number) => {
    return db.getLaunchOptionsByInstallation(installationId);
  });

  ipcMain.handle('add-launch-option', async (_, option: Omit<LaunchOption, 'id'>) => {
    return db.insertLaunchOption(option);
  });

  ipcMain.handle('set-default-launch-option', async (_, installationId: number, optionId: number) => {
    db.setDefaultLaunchOption(installationId, optionId);
    return true;
  });

  ipcMain.handle('delete-launch-option', async (_, id: number) => {
    db.deleteLaunchOption(id);
    return true;
  });

  // ==================== DOWNLOADS ====================
  
  ipcMain.handle('get-torrent-files', async (_, magnetLink: string) => {
    try {
      return await torrentManager.getTorrentFiles(magnetLink);
    } catch (error) {
      log.error('[Main] Error getting torrent files:', error);
      throw error;
    }
  });

  ipcMain.handle('start-download', async (_, gameId: number, selectedFileIndices?: number[]) => {
    log.info('[Main] start-download called', {
      gameId,
      selectedFileIndices: selectedFileIndices ?? null,
      indicesCount: selectedFileIndices ? selectedFileIndices.length : 0
    });
    const game = db.getGameById(gameId);
    if (!game || !game.magnet_link) {
      throw new Error('Game or magnet link not found');
    }

    const settings = db.getSettings();
    const baseDownloadPath = settings.default_install_directory || 'C:\\FitGirlRepacks\\Downloads';
    const downloadPath = path.join(baseDownloadPath, game.slug);
    
    // Create download directory if it doesn't exist
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }

    // Create download record
    const downloadId = db.insertDownload({
      game_id: gameId,
      magnet_link: game.magnet_link,
      status: DownloadStatus.QUEUED,
      progress: 0,
      download_speed: 0,
      upload_speed: 0,
      peers: 0,
      downloaded_bytes: 0,
      total_bytes: 0,
      eta_seconds: 0,
      download_path: downloadPath,
      date_started: new Date().toISOString()
    });
    
    log.info(`[Main] ✓ Database inserted download with ID: ${downloadId}`);

    // Add to torrent queue
    torrentManager.addToQueue({
      downloadId,
      magnetLink: game.magnet_link,
      gameName: game.title,
      downloadPath,
      seedAfterComplete: settings.seed_by_default,
      selectedFileIndices
    });
    
    log.info(`[Main] ✓ Added to torrent queue with ID: ${downloadId}`);

    return downloadId;
  });

  ipcMain.handle('pause-download', async (_, downloadId: number) => {
    log.info(`[Main] Pause download requested for ID: ${downloadId}`);
    
    // Check if the download exists, otherwise use active download
    const active = torrentManager.getActiveDownload();
    if (active && active.downloadId !== downloadId) {
      log.warn(`[Main] MISMATCH: requested ID ${downloadId}, active ID ${active.downloadId}. Pausing active.`);
      torrentManager.pauseDownload(active.downloadId);
    } else {
      torrentManager.pauseDownload(downloadId);
    }
    
    log.info(`[Main] Pause download completed`);
    return true;
  });

  ipcMain.handle('resume-download', async (_, downloadId: number) => {
    log.info(`[Main] Resume download requested for ID: ${downloadId}`);
    
    // For resume, we need to find ANY download (including paused ones)
    // First try to get paused/queued downloads, fall back to active
    const allIds = (torrentManager as any).getAllDownloadIds ? (torrentManager as any).getAllDownloadIds() : [];
    const soleActiveId = allIds.length === 1 ? allIds[0] : null;
    
    if (soleActiveId && soleActiveId !== downloadId) {
      log.warn(`[Main] MISMATCH: requested ID ${downloadId}, only active ID ${soleActiveId}. Resuming sole active.`);
      torrentManager.resumeDownload(soleActiveId);
    } else {
      torrentManager.resumeDownload(downloadId);
    }
    
    log.info(`[Main] Resume download completed`);
    return true;
  });

  ipcMain.handle('cancel-download', async (_, downloadId: number) => {
    try {
      log.info(`[Main] Cancel download requested for ID: ${downloadId}`);
      log.info(`[Main] TorrentManager queue length: ${torrentManager.getQueueLength()}`);
      
      // Try to cancel the requested ID; if not found, fall back to active
      const active = torrentManager.getActiveDownload();
      const allIds = (torrentManager as any).getAllDownloadIds ? (torrentManager as any).getAllDownloadIds() : [];
      const soleActiveId = allIds.length === 1 ? allIds[0] : null;

      if (active && active.downloadId !== downloadId) {
        log.warn(`[Main] MISMATCH: requested ID ${downloadId}, active ID ${active.downloadId}. Cancelling active.`);
        torrentManager.cancelDownload(active.downloadId);
        // Delete active record from DB if present
        try {
          db.deleteDownload(active.downloadId);
          log.info(`[Main] Deleted active download record ${active.downloadId} from DB`);
        } catch (e) {
          log.error('[Main] Failed to delete active download from DB:', e);
        }
        // Also try deleting the requested stale ID if it exists
        try {
          db.deleteDownload(downloadId);
          log.info(`[Main] Deleted stale download record ${downloadId} from DB (if existed)`);
        } catch (e) {
          log.error('[Main] Failed to delete stale download from DB:', e);
        }
      } else if (soleActiveId !== null && soleActiveId !== downloadId) {
        log.warn(`[Main] MISMATCH: requested ID ${downloadId}, only active ID ${soleActiveId}. Cancelling sole active.`);
        torrentManager.cancelDownload(soleActiveId);
        try {
          db.deleteDownload(soleActiveId);
          log.info(`[Main] Deleted sole active download record ${soleActiveId} from DB`);
        } catch (e) {
          log.error('[Main] Failed to delete sole active download from DB:', e);
        }
        try {
          db.deleteDownload(downloadId);
          log.info(`[Main] Deleted stale download record ${downloadId} from DB (if existed)`);
        } catch (e) {
          log.error('[Main] Failed to delete stale download from DB:', e);
        }
      } else {
        // Cancel in torrent manager (may not exist if old/completed)
        torrentManager.cancelDownload(downloadId);
        // Delete the download record from database
        db.deleteDownload(downloadId);
        log.info(`[Main] Cancelled and deleted download ${downloadId}`);
      }
      
      // Notify renderer that download was cancelled
      if (mainWindow) {
        mainWindow.webContents.send('download-cancelled', { downloadId });
      }
      
      return true;
    } catch (error) {
      log.error('[Main] Error cancelling download:', error);
      
      // Still try to delete from database even if torrent manager fails
      try {
        // Attempt to clean up both requested and active records
        const active = torrentManager.getActiveDownload();
        try { db.deleteDownload(downloadId); } catch {}
        if (active) { try { db.deleteDownload(active.downloadId); } catch {} }
        if (mainWindow) {
          mainWindow.webContents.send('download-cancelled', { downloadId });
        }
        return true;
      } catch (dbError) {
        log.error('[Main] Failed to delete from database:', dbError);
        return false;
      }
    }
  });

  ipcMain.handle('get-downloads', async () => {
    return db.getAllDownloads();
  });

  ipcMain.handle('get-active-downloads', async () => {
    return db.getActiveDownloads();
  });

  ipcMain.handle('update-download-priority', async (_, downloadId: number, priority: number) => {
    try {
      db.updateDownload(downloadId, { priority });
      log.info(`[Main] Updated download ${downloadId} priority to ${priority}`);
      return true;
    } catch (error) {
      log.error('[Main] Error updating download priority:', error);
      return false;
    }
  });

  ipcMain.handle('delete-download-record', async (_, downloadId: number) => {
    try {
      // Force delete from database only (for cleanup)
      db.deleteDownload(downloadId);
      log.info(`[Main] Force deleted download record ${downloadId}`);
      
      if (mainWindow) {
        mainWindow.webContents.send('download-cancelled', { downloadId });
      }
      
      return true;
    } catch (error) {
      log.error('[Main] Error force deleting download:', error);
      return false;
    }
  });

  ipcMain.handle('clear-all-downloads', async () => {
    try {
      // Get all downloads first
      const downloads = db.getAllDownloads();
      
      log.info(`[Main] Clearing ${downloads.length} downloads from DB...`);
      log.info(`[Main] Download IDs in DB: ${downloads.map(d => d.id).join(', ')}`);
      log.info(`[Main] TorrentManager active downloads: ${torrentManager.getQueueLength()}`);
      
      // Cancel ALL active torrents in TorrentManager (regardless of DB state)
      torrentManager.cancelAll();
      
      // Give engines time to actually stop before clearing DB
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear all downloads from database (only downloads table, not games)
      db.clearAllDownloads();
      log.info(`[Main] Cleared all downloads from database (${downloads.length} records)`);
      
      // Notify renderer
      if (mainWindow) {
        mainWindow.webContents.send('downloads-cleared');
      }
      
      return true;
    } catch (error) {
      log.error('[Main] Error clearing all downloads:', error);
      return false;
    }
  });

  // ==================== GAME LAUNCHING ====================
  
  ipcMain.handle('launch-game', async (_, installationId: number, launchOptionId?: number) => {
    log.info(`[Main] Launch game requested: installationId=${installationId}, launchOptionId=${launchOptionId}`);
    let exePath: string;
    let runAsAdmin: boolean = true;

    if (launchOptionId) {
      const options = db.getLaunchOptionsByInstallation(installationId);
      log.info(`[Main] Found ${options.length} launch options for installation ${installationId}`);
      const option = options.find(o => o.id === launchOptionId);
      if (!option) {
        log.error(`[Main] Launch option ${launchOptionId} not found`);
        throw new Error('Launch option not found');
      }
      exePath = option.exe_path;
      runAsAdmin = option.run_as_admin;
    } else {
      const defaultOption = db.getDefaultLaunchOption(installationId);
      log.info(`[Main] Default launch option for installation ${installationId}:`, defaultOption);
      if (!defaultOption) {
        log.error(`[Main] No default launch option found for installation ${installationId}`);
        throw new Error('No default launch option');
      }
      exePath = defaultOption.exe_path;
      runAsAdmin = defaultOption.run_as_admin;
    }

    log.info(`[Main] Launching game with exe: ${exePath}, admin: ${runAsAdmin}`);
    return await gameLauncher.launchGame(installationId, exePath, runAsAdmin);
  });

  ipcMain.handle('launch-installer', async (_, installerPath: string) => {
    return await gameLauncher.launchInstaller(installerPath);
  });

  ipcMain.handle('is-game-running', async (_, installationId: number) => {
    return gameLauncher.isGameRunning(installationId);
  });

  // ==================== FILE SYSTEM ====================
  
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory', 'createDirectory']
    });
    
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('select-file', async (_, filters?: any[]) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: filters || [{ name: 'Executables', extensions: ['exe'] }]
    });
    
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('delete-folder', async (_, folderPath: string) => {
    try {
      await fs.promises.rm(folderPath, { recursive: true, force: true });
      return true;
    } catch (error) {
      log.error('[Main] Error deleting folder:', error);
      return false;
    }
  });

  ipcMain.handle('open-folder', async (_, folderPath: string) => {
    shell.openPath(folderPath);
  });

  ipcMain.handle('run-installer', async (_, installerPath: string) => {
    try {
      const { spawn } = require('child_process');
      log.info(`[Main] Attempting to run installer: ${installerPath}`);
      
      // Check if file exists
      if (!fs.existsSync(installerPath)) {
        log.error(`[Main] Installer file not found: ${installerPath}`);
        
        // Try to find setup.exe in the directory
        const dir = path.dirname(installerPath);
        log.info(`[Main] Searching for setup.exe in directory: ${dir}`);
        
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          log.info(`[Main] Files in directory: ${files.join(', ')}`);
          
          const setupFile = files.find(f => f.toLowerCase() === 'setup.exe');
          if (setupFile) {
            installerPath = path.join(dir, setupFile);
            log.info(`[Main] Found setup.exe at: ${installerPath}`);
          } else {
            throw new Error(`setup.exe not found in ${dir}`);
          }
        } else {
          throw new Error(`Directory not found: ${dir}`);
        }
      }
      
      log.info(`[Main] Running installer as admin: ${installerPath}`);
      
      // Run the installer as admin and wait for it to close
      return new Promise((resolve, reject) => {
        // Use PowerShell to run as admin with error capture
        const child = spawn('powershell.exe', [
          '-NoProfile',
          '-ExecutionPolicy', 'Bypass',
          '-Command',
          `try { Start-Process -FilePath "${installerPath}" -Verb RunAs -Wait; Write-Output "SUCCESS"; exit 0 } catch { Write-Error $_.Exception.Message; exit 1 }`
        ]);

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data: Buffer) => {
          stdout += data.toString();
          log.info(`[Main] Installer stdout: ${data.toString().trim()}`);
        });

        child.stderr?.on('data', (data: Buffer) => {
          stderr += data.toString();
          log.error(`[Main] Installer stderr: ${data.toString().trim()}`);
        });

        child.on('close', (code: number | null) => {
          log.info(`[Main] PowerShell process exited with code: ${code}`);
          log.info(`[Main] stdout: ${stdout.trim()}`);
          log.info(`[Main] stderr: ${stderr.trim()}`);
          
          if (code === 0 && stdout.includes('SUCCESS')) {
            resolve({ success: true, exitCode: 0 });
          } else {
            reject(new Error(`Installer failed: ${stderr || 'Unknown error'}`));
          }
        });

        child.on('error', (error: Error) => {
          log.error(`[Main] Spawn error:`, error);
          reject(error);
        });
      });
    } catch (error) {
      log.error('[Main] Failed to run installer:', error);
      throw error;
    }
  });

  // ==================== CATALOG UPDATE ====================
  
  ipcMain.handle('update-catalog', async () => {
    return await updateCatalog();
  });

  // ==================== APP UPDATES ====================
  
  ipcMain.handle('check-for-updates', async () => {
    return await autoUpdater.checkForUpdates();
  });

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
  });

  // ==================== WINDOW CONTROLS ====================
  
  ipcMain.handle('minimize-window', () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.handle('maximize-window', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.handle('close-window', () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });
}

app.whenReady().then(async () => {
  log.info('[Main] App ready');

  // Initialize services
  await initializeServices();

  // Setup auto-update
  setupAutoUpdate();

  // Setup IPC handlers
  setupIpcHandlers();

  // Check first run
  const settings = db.getSettings();

  if (!settings.first_run_complete) {
    // First run - show main window directly
    mainWindow = createMainWindow();
  } else {
    // Show splash screen while updating catalog
    splashWindow = createSplashWindow();
    
    // Update catalog in background
    const newGamesCount = await updateCatalog();
    
    // Create main window
    mainWindow = createMainWindow();

    // Close splash when main window is ready
    mainWindow.once('ready-to-show', () => {
      splashWindow?.close();
      splashWindow = null;
      mainWindow?.show();

      // Notify about new games
      if (newGamesCount > 0) {
        mainWindow?.webContents.send('catalog-updated', { newGames: newGamesCount });
      }
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Pause all active downloads before quitting
    if (db && torrentManager) {
      try {
        const activeDownloads = db.getActiveDownloads();
        log.info(`[Main] App closing - pausing ${activeDownloads.length} active downloads`);
        
        for (const download of activeDownloads) {
          if (download.status === 'downloading') {
            // Update status to paused in database
            db.updateDownload(download.id, { status: DownloadStatus.PAUSED } as Partial<Download>);
            log.info(`[Main] Paused download ID ${download.id}`);
          }
        }
      } catch (error) {
        log.error('[Main] Failed to pause downloads on quit:', error);
      }
    }
    
    // Cleanup
    if (torrentManager) {
      torrentManager.destroy();
    }
    if (db) {
      db.close();
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
  }
});
