import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings } from '../../shared/types';

interface SettingsContextType {
  settings: AppSettings | null;
  loading: boolean;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const data = await window.electronAPI.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSettings = async (updates: Partial<AppSettings>) => {
    try {
      const updated = await window.electronAPI.updateSettings(updates);
      setSettings(updated);
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  };

  const refreshSettings = async () => {
    await loadSettings();
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};
