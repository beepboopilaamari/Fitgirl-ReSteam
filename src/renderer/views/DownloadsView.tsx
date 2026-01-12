import React, { useState } from 'react';
import { Typography, Card, Button, Progress, Space, Empty, message, Modal, Tooltip } from 'antd';
import { PauseOutlined, PlayCircleOutlined, DeleteOutlined, FolderOutlined, ArrowUpOutlined, ArrowDownOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useDownloads } from '../contexts/DownloadContext';
import { DownloadStatus } from '../../shared/types';

const { Title, Paragraph } = Typography;

const DownloadsView: React.FC = () => {
  const { downloads, activeDownloads, refreshDownloads } = useDownloads();
  const [installingDownload, setInstallingDownload] = useState<number | null>(null);
  const [cancellingDownload, setCancellingDownload] = useState<number | null>(null);
  const [showInstallComplete, setShowInstallComplete] = useState(false);
  const [currentInstallData, setCurrentInstallData] = useState<any>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSecond: number) => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  const formatETA = (seconds: number) => {
    if (seconds === 0) return 'Calculating...';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const handleClearAll = async () => {
    Modal.confirm({
      title: <span style={{ fontSize: '16px', fontWeight: 600 }}>Clear All Downloads?</span>,
      content: (
        <div style={{ fontSize: '14px', lineHeight: '1.8', marginTop: '12px' }}>
          <p style={{ margin: '0 0 8px 0' }}>
            This will remove all downloads from the list and cancel any active downloads.
          </p>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
            Your cached games will not be affected.
          </p>
        </div>
      ),
      okText: 'Clear All',
      okType: 'danger',
      cancelText: 'Cancel',
      centered: true,
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: '24px', marginTop: '4px' }} />,
      width: 500,
      okButtonProps: { size: 'large' },
      cancelButtonProps: { size: 'large' },
      onOk: async () => {
        try {
          await window.electronAPI.clearAllDownloads();
          message.success('All downloads cleared');
          await refreshDownloads();
        } catch (error) {
          message.error('Failed to clear downloads');
        }
      }
    });
  };

  const handleIncreasePriority = async (downloadId: number, currentPriority: number) => {
    try {
      await window.electronAPI.updateDownloadPriority(downloadId, currentPriority + 1);
      message.success('Priority increased');
      await refreshDownloads();
    } catch (error) {
      message.error('Failed to update priority');
    }
  };

  const handleDecreasePriority = async (downloadId: number, currentPriority: number) => {
    try {
      await window.electronAPI.updateDownloadPriority(downloadId, Math.max(0, currentPriority - 1));
      message.success('Priority decreased');
      await refreshDownloads();
    } catch (error) {
      message.error('Failed to update priority');
    }
  };

  const handlePause = async (downloadId: number) => {
    try {
      console.log('[DownloadsView] Pausing download:', downloadId);
      const result = await window.electronAPI.pauseDownload(downloadId);
      console.log('[DownloadsView] Pause result:', result);
      await refreshDownloads();
      message.success('Download paused');
    } catch (error) {
      console.error('[DownloadsView] Pause error:', error);
      message.error('Failed to pause download');
    }
  };

  const handleResume = async (downloadId: number) => {
    try {
      console.log('[DownloadsView] Resuming download:', downloadId);
      const result = await window.electronAPI.resumeDownload(downloadId);
      console.log('[DownloadsView] Resume result:', result);
      await refreshDownloads();
      message.success('Download resumed');
    } catch (error) {
      console.error('[DownloadsView] Resume error:', error);
      message.error('Failed to resume download');
    }
  };

  const handleCancel = async (downloadId: number) => {
    if (cancellingDownload === downloadId) {
      console.log('[DownloadsView] Already cancelling this download');
      return;
    }
    
    setCancellingDownload(downloadId);
    console.log('[DownloadsView] Cancelling download:', downloadId);
    console.log('[DownloadsView] Current downloads:', downloads.map(d => ({ id: d.id, status: d.status, game: d.game?.title })));
    
    try {
      const result = await window.electronAPI.cancelDownload(downloadId);
      console.log('[DownloadsView] Cancel result:', result);
      
      if (!result) {
        // If cancel failed (download might not be in torrent manager), try force delete
        console.log('[DownloadsView] Cancel failed, trying force delete');
        await window.electronAPI.deleteDownloadRecord(downloadId);
      }
      
      // Force refresh immediately
      await refreshDownloads();
    } finally {
      setCancellingDownload(null);
    }
  };

  const handleDeleteCompleted = async (downloadId: number) => {
    console.log('[DownloadsView] Deleting completed download:', downloadId);
    console.log('[DownloadsView] Downloads before delete:', downloads.length);
    try {
      await window.electronAPI.deleteDownloadRecord(downloadId);
      console.log('[DownloadsView] Delete API call succeeded');
      message.success('Download deleted');
      // Force refresh
      await refreshDownloads();
      console.log('[DownloadsView] Downloads after refresh:', downloads.length);
    } catch (error) {
      console.error('[DownloadsView] Delete failed:', error);
      message.error('Failed to delete download');
    }
  };

  const handleInstall = async (download: any) => {
    setInstallingDownload(download.id);
    try {
      // Find and run setup.exe in the download folder
      const setupPath = `${download.download_path}\\setup.exe`;
      console.log('[DownloadsView] Attempting to install from:', setupPath);
      console.log('[DownloadsView] Download path:', download.download_path);
      
      message.loading({ content: 'Launching installer as administrator...', key: 'installer', duration: 0 });
      
      // Run installer as admin and wait for it to close
      const result = await window.electronAPI.runInstaller(setupPath);
      
      message.destroy('installer');
      
      if (result.success) {
        setCurrentInstallData(download);
        setShowInstallComplete(true);
      } else {
        message.error('Installer failed or was cancelled');
      }
    } catch (error) {
      console.error('[DownloadsView] Install error:', error);
      message.destroy('installer');
      message.error(`Failed to run installer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setInstallingDownload(null);
    }
  };

  const handleInstallComplete = async () => {
    try {
      // Select game executable
      message.info('Select the game executable');
      const exePath = await window.electronAPI.selectFile([{ name: 'Executables', extensions: ['exe'] }]);
      
      if (!exePath || !currentInstallData) {
        return;
      }
      
      // Create installation record
      const installationId = await window.electronAPI.addInstallation({
        game_id: currentInstallData.game_id,
        install_path: exePath,
        date_installed: new Date().toISOString(),
        total_playtime_seconds: 0,
        last_played: null
      });

      // Add launch option
      await window.electronAPI.addLaunchOption({
        installation_id: installationId,
        name: 'Default',
        exe_path: exePath,
        is_default: true,
        run_as_admin: true
      });

      // Delete download folder
      await window.electronAPI.deleteFolder(currentInstallData.download_path);

      message.success('Game installed successfully!');
      setShowInstallComplete(false);
      setCurrentInstallData(null);
      refreshDownloads();
    } catch (error) {
      console.error('[DownloadsView] Install complete error:', error);
      message.error('Failed to complete installation');
    }
  };

  const activeList = activeDownloads;

  const completedList = downloads.filter(d => d.status === DownloadStatus.COMPLETED);

  console.log('[DownloadsView] activeDownloads:', activeDownloads.map(d => `ID:${d.id} Status:${d.status}`));
  console.log('[DownloadsView] activeList:', activeList.map(d => `ID:${d.id} Status:${d.status}`));

  return (
    <div className="page-shell">
      <div className="page-header">
        <Title level={2} className="page-title" style={{ margin: 0 }}>Downloads</Title>
        {(activeList.length > 0 || completedList.length > 0) && (
          <Button type="primary" onClick={handleClearAll} className="downloads-clear-btn">
            Clear All
          </Button>
        )}
      </div>

      {activeList.length > 0 && (
        <>
          <div className="section-label" style={{ marginBottom: '20px' }}>Active Downloads</div>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {activeList.map(download => (
              <Card key={download.id} className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', gap: 16 }}>
                  <div>
                    <Title level={5} style={{ margin: 0 }}>{download.game?.title}</Title>
                    <Paragraph style={{ margin: '4px 0', color: '#94a3b8' }}>
                      {formatBytes(download.downloaded_bytes)} / {formatBytes(download.total_bytes)}
                      {download.priority && download.priority > 0 && (
                        <span style={{ 
                          marginLeft: 12, 
                          padding: '2px 8px', 
                          background: '#6ddcff22', 
                          color: '#6ddcff',
                          borderRadius: 4, 
                          fontSize: 12 
                        }}>
                          Priority: {download.priority}
                        </span>
                      )}
                    </Paragraph>
                  </div>
                  <Space style={{ gap: 8 }}>
                    {download.status === DownloadStatus.PAUSED ? (
                      <Button icon={<PlayCircleOutlined />} onClick={() => handleResume(download.id)}>
                        Resume
                      </Button>
                    ) : (
                      <Button icon={<PauseOutlined />} onClick={() => handlePause(download.id)}>
                        Pause
                      </Button>
                    )}
                    <Space.Compact>
                      <Tooltip title="Increase Priority">
                        <Button 
                          size="small" 
                          icon={<ArrowUpOutlined />} 
                          onClick={() => handleIncreasePriority(download.id, download.priority || 0)}
                        />
                      </Tooltip>
                      <Tooltip title="Decrease Priority">
                        <Button 
                          size="small" 
                          icon={<ArrowDownOutlined />} 
                          onClick={() => handleDecreasePriority(download.id, download.priority || 0)}
                          disabled={!download.priority || download.priority <= 0}
                        />
                      </Tooltip>
                    </Space.Compact>
                    <Button icon={<DeleteOutlined />} 
                      onClick={() => handleCancel(download.id)}
                      loading={cancellingDownload === download.id}
                      disabled={cancellingDownload === download.id}
                      className="downloads-cancel-btn">
                      Cancel
                    </Button>
                  </Space>
                </div>

                <Progress percent={Math.round(download.progress)} status="active" showInfo={false} strokeWidth={8} style={{ marginBottom: 8 }} />

                <div className="stat-row">
                  <span className="pill">{Math.round(download.progress)}%</span>
                  <span>↓ {formatSpeed(download.download_speed)}</span>
                  <span>↑ {formatSpeed(download.upload_speed)}</span>
                  <span>Peers: {download.peers}</span>
                  <span>ETA: {formatETA(download.eta_seconds)}</span>
                </div>
              </Card>
            ))}
          </Space>
        </>
      )}

      {completedList.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 24 }}>Completed Downloads</div>
          <Space direction="vertical" style={{ width: '100%' }}>
            {completedList.map(download => (
              <Card key={download.id} className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Title level={5} style={{ margin: 0 }}>{download.game?.title}</Title>
                    <Paragraph style={{ margin: 0, color: '#94a3b8' }}>
                      Download complete
                    </Paragraph>
                  </div>
                  <Space>
                    <Button
                      type="primary"
                      loading={installingDownload === download.id}
                      onClick={() => handleInstall(download)}
                    >
                      Install
                    </Button>
                    <Button icon={<FolderOutlined />} onClick={() => window.electronAPI.openFolder(download.download_path)}>
                      Open Folder
                    </Button>
                    <Button danger icon={<DeleteOutlined />} onClick={() => handleDeleteCompleted(download.id)}>
                      Delete
                    </Button>
                  </Space>
                </div>
              </Card>
            ))}
          </Space>
        </>
      )}

      {activeList.length === 0 && completedList.length === 0 && (
        <Empty description="No downloads yet" style={{ marginTop: '40px' }} />
      )}

      <Modal
        title="Installation Complete?"
        open={showInstallComplete}
        onOk={handleInstallComplete}
        onCancel={() => setShowInstallComplete(false)}
        okText="Browse for Game Executable"
      >
        <Paragraph>
          The installer has finished. Please browse for the game's executable file (.exe) 
          to complete the installation.
        </Paragraph>
      </Modal>
    </div>
  );
};

export default DownloadsView;
