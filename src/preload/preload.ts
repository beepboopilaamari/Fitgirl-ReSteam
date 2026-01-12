import { contextBridge, ipcRenderer } from 'electron';
import { Game, Installation, LaunchOption, Download, AppSettings } from '../shared/types';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke('update-settings', settings),

  // Games
  getGames: (limit?: number, offset?: number) => ipcRenderer.invoke('get-games', limit, offset),
  getGame: (id: number) => ipcRenderer.invoke('get-game', id),
  searchGames: (searchTerm: string, filters?: any) => ipcRenderer.invoke('search-games', searchTerm, filters),
  getGamesCount: () => ipcRenderer.invoke('get-games-count'),

  // Installations
  getInstallations: () => ipcRenderer.invoke('get-installations'),
  getInstallation: (id: number) => ipcRenderer.invoke('get-installation', id),
  addInstallation: (installation: Omit<Installation, 'id'>) => ipcRenderer.invoke('add-installation', installation),
  updateInstallation: (id: number, updates: Partial<Installation>) => ipcRenderer.invoke('update-installation', id, updates),
  deleteInstallation: (id: number) => ipcRenderer.invoke('delete-installation', id),
  scanDirectoryForGames: (directoryPath: string) => ipcRenderer.invoke('scan-directory-for-games', directoryPath),

  // Launch Options
  getLaunchOptions: (installationId: number) => ipcRenderer.invoke('get-launch-options', installationId),
  addLaunchOption: (option: Omit<LaunchOption, 'id'>) => ipcRenderer.invoke('add-launch-option', option),
  setDefaultLaunchOption: (installationId: number, optionId: number) => 
    ipcRenderer.invoke('set-default-launch-option', installationId, optionId),
  deleteLaunchOption: (id: number) => ipcRenderer.invoke('delete-launch-option', id),

  // Collections
  getAllCollections: () => ipcRenderer.invoke('get-all-collections'),
  createCollection: (name: string, description?: string, color?: string) => ipcRenderer.invoke('create-collection', name, description, color),
  deleteCollection: (id: number) => ipcRenderer.invoke('delete-collection', id),
  addGameToCollection: (collectionId: number, installationId: number) => ipcRenderer.invoke('add-game-to-collection', collectionId, installationId),
  removeGameFromCollection: (collectionId: number, installationId: number) => ipcRenderer.invoke('remove-game-from-collection', collectionId, installationId),
  getCollectionGames: (collectionId: number) => ipcRenderer.invoke('get-collection-games', collectionId),

  // Playtime
  getPlaytimeSessions: (installationId: number) => ipcRenderer.invoke('get-playtime-sessions', installationId),
  getPlaytimeStats: (installationId: number, period?: 'day' | 'week' | 'month') => ipcRenderer.invoke('get-playtime-stats', installationId, period),

  // Downloads
  // Downloads
  startDownload: (gameId: number, selectedFileIndices?: number[]) => ipcRenderer.invoke('start-download', gameId, selectedFileIndices),
  getTorrentFiles: (magnetLink: string) => ipcRenderer.invoke('get-torrent-files', magnetLink),
  pauseDownload: (downloadId: number) => ipcRenderer.invoke('pause-download', downloadId),
  resumeDownload: (downloadId: number) => ipcRenderer.invoke('resume-download', downloadId),
  cancelDownload: (downloadId: number) => ipcRenderer.invoke('cancel-download', downloadId),
  deleteDownloadRecord: (downloadId: number) => ipcRenderer.invoke('delete-download-record', downloadId),
  clearAllDownloads: () => ipcRenderer.invoke('clear-all-downloads'),
  getDownloads: () => ipcRenderer.invoke('get-downloads'),
  getActiveDownloads: () => ipcRenderer.invoke('get-active-downloads'),  updateDownloadPriority: (downloadId: number, priority: number) => ipcRenderer.invoke('update-download-priority', downloadId, priority),
  // Game Launching
  launchGame: (installationId: number, launchOptionId?: number) => 
    ipcRenderer.invoke('launch-game', installationId, launchOptionId),
  launchInstaller: (installerPath: string) => ipcRenderer.invoke('launch-installer', installerPath),
  isGameRunning: (installationId: number) => ipcRenderer.invoke('is-game-running', installationId),

  // File System
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectFile: (filters?: any[]) => ipcRenderer.invoke('select-file', filters),
  deleteFolder: (folderPath: string) => ipcRenderer.invoke('delete-folder', folderPath),
  openFolder: (folderPath: string) => ipcRenderer.invoke('open-folder', folderPath),
  runInstaller: (installerPath: string) => ipcRenderer.invoke('run-installer', installerPath),

  // Catalog
  updateCatalog: () => ipcRenderer.invoke('update-catalog'),

  // App Updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateAvailable: (callback: (data: any) => void) => {
    ipcRenderer.on('update-available', (_, data) => callback(data));
  },
  onUpdateDownloaded: (callback: (data: any) => void) => {
    ipcRenderer.on('update-downloaded', (_, data) => callback(data));
  },

  // Window Controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // Event listeners
  onDownloadStarted: (callback: (data: any) => void) => {
    ipcRenderer.on('download-started', (_, data) => callback(data));
  },
  onDownloadProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('download-progress', (_, data) => callback(data));
  },
  onDownloadCompleted: (callback: (data: any) => void) => {
    ipcRenderer.on('download-completed', (_, data) => callback(data));
  },
  onDownloadError: (callback: (data: any) => void) => {
    ipcRenderer.on('download-error', (_, data) => callback(data));
  },
  onDownloadPaused: (callback: (data: any) => void) => {
    ipcRenderer.on('download-paused', (_, data) => callback(data));
  },
  onDownloadResumed: (callback: (data: any) => void) => {
    ipcRenderer.on('download-resumed', (_, data) => callback(data));
  },
  onDownloadCancelled: (callback: (data: any) => void) => {
    ipcRenderer.on('download-cancelled', (_, data) => callback(data));
  },
  onDownloadsCleared: (callback: () => void) => {
    ipcRenderer.on('downloads-cleared', () => callback());
  },
  onGameLaunched: (callback: (data: any) => void) => {
    ipcRenderer.on('game-launched', (_, data) => callback(data));
  },
  onGameClosed: (callback: (data: any) => void) => {
    ipcRenderer.on('game-closed', (_, data) => callback(data));
  },
  onLaunchError: (callback: (data: any) => void) => {
    ipcRenderer.on('launch-error', (_, data) => callback(data));
  },
  onCatalogUpdated: (callback: (data: any) => void) => {
    ipcRenderer.on('catalog-updated', (_, data) => callback(data));
  }
});

// Type declarations for TypeScript
declare global {
  interface Window {
    electronAPI: {
      getSettings: () => Promise<AppSettings>;
      updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
      getGames: (limit?: number, offset?: number) => Promise<Game[]>;
      getGame: (id: number) => Promise<Game | null>;
      searchGames: (searchTerm: string, filters?: any) => Promise<Game[]>;
      getGamesCount: () => Promise<number>;
      getInstallations: () => Promise<Installation[]>;
      getInstallation: (id: number) => Promise<Installation | null>;
      addInstallation: (installation: Omit<Installation, 'id'>) => Promise<number>;
      updateInstallation: (id: number, updates: Partial<Installation>) => Promise<void>;
      deleteInstallation: (id: number) => Promise<boolean>;
      scanDirectoryForGames: (directoryPath: string) => Promise<{ exe: string; name: string }[]>;
      getLaunchOptions: (installationId: number) => Promise<LaunchOption[]>;
      addLaunchOption: (option: Omit<LaunchOption, 'id'>) => Promise<number>;
      setDefaultLaunchOption: (installationId: number, optionId: number) => Promise<boolean>;
      deleteLaunchOption: (id: number) => Promise<boolean>;
      getTorrentFiles: (magnetLink: string) => Promise<any[]>;
      startDownload: (gameId: number, selectedFileIndices?: number[]) => Promise<number>;
      pauseDownload: (downloadId: number) => Promise<boolean>;
      resumeDownload: (downloadId: number) => Promise<boolean>;
      cancelDownload: (downloadId: number) => Promise<boolean>;
      deleteDownloadRecord: (downloadId: number) => Promise<boolean>;
      clearAllDownloads: () => Promise<boolean>;
      getDownloads: () => Promise<Download[]>;
      getActiveDownloads: () => Promise<Download[]>;
      updateDownloadPriority: (downloadId: number, priority: number) => Promise<boolean>;
      launchGame: (installationId: number, launchOptionId?: number) => Promise<boolean>;
      launchInstaller: (installerPath: string) => Promise<boolean>;
      isGameRunning: (installationId: number) => Promise<boolean>;
      selectDirectory: () => Promise<string | null>;
      selectFile: (filters?: any[]) => Promise<string | null>;
      deleteFolder: (folderPath: string) => Promise<boolean>;
      openFolder: (folderPath: string) => Promise<void>;
      runInstaller: (installerPath: string) => Promise<{ success: boolean; exitCode: number }>;
      updateCatalog: () => Promise<number>;
      checkForUpdates: () => Promise<any>;
      installUpdate: () => void;
      onUpdateAvailable: (callback: (data: any) => void) => void;
      onUpdateDownloaded: (callback: (data: any) => void) => void;
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      getAllCollections: () => Promise<any[]>;
      createCollection: (name: string, description?: string, color?: string) => Promise<number>;
      deleteCollection: (id: number) => Promise<boolean>;
      addGameToCollection: (collectionId: number, installationId: number) => Promise<boolean>;
      removeGameFromCollection: (collectionId: number, installationId: number) => Promise<boolean>;
      getCollectionGames: (collectionId: number) => Promise<any[]>;
      getPlaytimeSessions: (installationId: number) => Promise<any[]>;
      getPlaytimeStats: (installationId: number, period?: 'day' | 'week' | 'month') => Promise<any>;
      onDownloadStarted: (callback: (data: any) => void) => void;
      onDownloadProgress: (callback: (data: any) => void) => void;
      onDownloadCompleted: (callback: (data: any) => void) => void;
      onDownloadError: (callback: (data: any) => void) => void;
      onDownloadPaused: (callback: (data: any) => void) => void;
      onDownloadResumed: (callback: (data: any) => void) => void;
      onDownloadCancelled: (callback: (data: any) => void) => void;
      onDownloadsCleared: (callback: () => void) => void;
      onGameLaunched: (callback: (data: any) => void) => void;
      onGameClosed: (callback: (data: any) => void) => void;
      onLaunchError: (callback: (data: any) => void) => void;
      onCatalogUpdated: (callback: (data: any) => void) => void;
    };
  }
}
