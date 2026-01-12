import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Installation } from '../../shared/types';
import { message } from 'antd';

interface LibraryContextType {
  installations: Installation[];
  loading: boolean;
  refreshInstallations: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const LibraryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInstallations = async () => {
    try {
      const data = await window.electronAPI.getInstallations();
      setInstallations(data);
    } catch (error) {
      console.error('Failed to load installations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstallations();

    // Listen for game events
    window.electronAPI.onGameLaunched((_data) => {
      message.success('Game launched');
    });

    window.electronAPI.onGameClosed((data) => {
      const hours = Math.floor(data.playTimeSeconds / 3600);
      const minutes = Math.floor((data.playTimeSeconds % 3600) / 60);
      message.info(`Session ended. Played for ${hours}h ${minutes}m`);
      loadInstallations();
    });

    window.electronAPI.onLaunchError((data) => {
      message.error(`Failed to launch game: ${data.error}`);
    });
  }, []);

  const refreshInstallations = async () => {
    await loadInstallations();
  };

  return (
    <LibraryContext.Provider value={{ installations, loading, refreshInstallations }}>
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = (): LibraryContextType => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within LibraryProvider');
  }
  return context;
};
