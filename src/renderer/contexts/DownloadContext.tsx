import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Download, ProgressUpdate } from '../../shared/types';
import { message } from 'antd';

interface DownloadContextType {
  downloads: Download[];
  activeDownloads: Download[];
  loading: boolean;
  refreshDownloads: () => Promise<void>;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export const DownloadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [activeDownloads, setActiveDownloads] = useState<Download[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDownloads = async () => {
    const stackTrace = new Error().stack;
    console.log('[DownloadContext] ⚠️ loadDownloads() CALLED FROM:', stackTrace?.split('\n')[2]?.trim());
    try {
      const [allDownloads, active] = await Promise.all([
        window.electronAPI.getDownloads(),
        window.electronAPI.getActiveDownloads()
      ]);
      console.log('[DownloadContext] Loaded downloads:', allDownloads.length, 'downloads, IDs:', allDownloads.map(d => d.id));
      console.log('[DownloadContext] Active downloads:', active.length, 'active, IDs:', active.map(d => d.id));
      setDownloads(allDownloads);
      setActiveDownloads(active);
    } catch (error) {
      console.error('Failed to load downloads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDownloads();

    // Listen for download events
    window.electronAPI.onDownloadStarted(async (data) => {
      console.log('[DownloadContext] ✓ Download started event received:', data);
      message.success(`Download started: ${data.gameName}`);
      
      // FORCE clear all state first to prevent stale ID caching
      setDownloads([]);
      setActiveDownloads([]);
      
      // Then reload fresh from database
      console.log('[DownloadContext] ✓ Reloading downloads from database...');
      await loadDownloads();
      console.log('[DownloadContext] ✓ Downloads reloaded');
    });

    window.electronAPI.onDownloadProgress((progress: ProgressUpdate) => {
      console.log('[DownloadContext] Progress update received for ID:', progress.downloadId);
      // Update state with progress data
      setDownloads(prev => {
        const ids = prev.map(d => d.id);
        console.log('[DownloadContext] Current downloads array length:', prev.length, '| IDs:', JSON.stringify(ids));
        const updated = prev.map(d => {
          if (d.id === progress.downloadId) {
            console.log('[DownloadContext] ✓ MATCH FOUND - Updating download', d.id);
            return { 
              ...d, 
              progress: progress.progress,
              download_speed: progress.downloadSpeed,
              upload_speed: progress.uploadSpeed,
              peers: progress.peers,
              downloaded_bytes: progress.downloadedBytes,
              total_bytes: progress.totalBytes,
              eta_seconds: progress.etaSeconds
            };
          }
          return d;
        });
        return updated;
      });
      setActiveDownloads(prev => prev.map(d => 
        d.id === progress.downloadId 
          ? { 
              ...d, 
              progress: progress.progress,
              download_speed: progress.downloadSpeed,
              upload_speed: progress.uploadSpeed,
              peers: progress.peers,
              downloaded_bytes: progress.downloadedBytes,
              total_bytes: progress.totalBytes,
              eta_seconds: progress.etaSeconds
            } 
          : d
      ));
    });

    window.electronAPI.onDownloadCompleted((_data) => {
      message.success('Download completed!');
      loadDownloads();
    });

    window.electronAPI.onDownloadError((data) => {
      message.error(`Download error: ${data.error}`);
      loadDownloads();
    });

    window.electronAPI.onDownloadPaused(() => {
      loadDownloads();
    });

    window.electronAPI.onDownloadResumed(() => {
      loadDownloads();
    });

    window.electronAPI.onDownloadCancelled((data) => {
      console.log('[DownloadContext] Download cancelled event received:', data);
      message.info('Download cancelled');
      
      // Immediately remove from state for instant UI update
      setDownloads(prev => {
        console.log('[DownloadContext] Filtering downloads, removing:', data.downloadId);
        return prev.filter(d => d.id !== data.downloadId);
      });
      setActiveDownloads(prev => {
        console.log('[DownloadContext] Filtering active downloads, removing:', data.downloadId);
        return prev.filter(d => d.id !== data.downloadId);
      });
      
      // Also refresh from database to ensure consistency
      setTimeout(() => {
        console.log('[DownloadContext] Refreshing downloads from database');
        loadDownloads();
      }, 100);
    });

    window.electronAPI.onDownloadsCleared(() => {
      console.log('[DownloadContext] All downloads cleared');
      // Immediately clear state
      setDownloads([]);
      setActiveDownloads([]);
      // Refresh from database to confirm
      setTimeout(() => loadDownloads(), 100);
    });
  }, []);

  const refreshDownloads = async () => {
    await loadDownloads();
  };

  return (
    <DownloadContext.Provider value={{ downloads, activeDownloads, loading, refreshDownloads }}>
      {children}
    </DownloadContext.Provider>
  );
};

export const useDownloads = (): DownloadContextType => {
  const context = useContext(DownloadContext);
  if (!context) {
    throw new Error('useDownloads must be used within DownloadProvider');
  }
  return context;
};
