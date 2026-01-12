import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, message } from 'antd';
import { generateTheme } from './theme';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { DownloadProvider } from './contexts/DownloadContext';
import { LibraryProvider } from './contexts/LibraryContext';
import MainLayout from './components/MainLayout';
import FirstRunWizard from './views/FirstRunWizard';
import DashboardView from './views/DashboardView';
import LibraryView from './views/LibraryView';
import BrowseView from './views/BrowseView';
import DownloadsView from './views/DownloadsView';
import SettingsView from './views/SettingsViewEnhanced';
import './App.css';

const AppContent: React.FC<{ onThemeChange?: (theme: any) => void }> = ({ onThemeChange }) => {
  const { settings, loading } = useSettings();
  const [showFirstRun, setShowFirstRun] = useState(false);

  useEffect(() => {
    if (!loading && settings) {
      setShowFirstRun(!settings.first_run_complete);
      // Update theme whenever settings change
      const newTheme = generateTheme(settings.accent_color, settings.glassmorphism_intensity);
      console.log('[App] Theme updated:', { accent: settings.accent_color, intensity: settings.glassmorphism_intensity });
      onThemeChange?.(newTheme);
    }
  }, [settings, loading, onThemeChange]);

  useEffect(() => {
    // Listen for catalog updates
    window.electronAPI.onCatalogUpdated((data) => {
      if (data.newGames > 0) {
        message.success(`${data.newGames} new games added to catalog!`, 5);
      }
    });
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: '#1b2838',
        color: '#c7d5e0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>FitGirl Resteam</div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  if (showFirstRun) {
    return <FirstRunWizard onComplete={() => setShowFirstRun(false)} />;
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardView />} />
        <Route path="/library" element={<LibraryView />} />
        <Route path="/browse" element={<BrowseView />} />
        <Route path="/downloads" element={<DownloadsView />} />
        <Route path="/settings" element={<SettingsView />} />
      </Routes>
    </MainLayout>
  );
};

const App: React.FC = () => {
  const [outerTheme, setOuterTheme] = useState(generateTheme());

  return (
    <ConfigProvider theme={outerTheme}>
      <Router>
        <SettingsProvider>
          <DownloadProvider>
            <LibraryProvider>
              <AppContent onThemeChange={setOuterTheme} />
            </LibraryProvider>
          </DownloadProvider>
        </SettingsProvider>
      </Router>
    </ConfigProvider>
  );
};

export default App;
