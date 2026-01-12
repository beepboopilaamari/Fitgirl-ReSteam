import React, { useState } from 'react';
import { Typography, Card, Form, Switch, InputNumber, Button, List, message, Tabs, Select } from 'antd';
import { FolderAddOutlined, DeleteOutlined, BgColorsOutlined, DownloadOutlined, AppstoreOutlined, BellOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useSettings } from '../contexts/SettingsContext';

const { Title } = Typography;
const { Option } = Select;

const SettingsViewEnhanced: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('directories');

  if (!settings) return null;

  const handleAddDirectory = async () => {
    const dir = await window.electronAPI.selectDirectory();
    if (dir && !settings.install_directories.includes(dir)) {
      await updateSettings({
        install_directories: [...settings.install_directories, dir]
      });
    }
  };

  const handleRemoveDirectory = async (dir: string) => {
    const newDirs = settings.install_directories.filter(d => d !== dir);
    await updateSettings({
      install_directories: newDirs,
      default_install_directory: settings.default_install_directory === dir 
        ? (newDirs[0] || null) 
        : settings.default_install_directory
    });
  };

  const handleSetDefault = async (dir: string) => {
    await updateSettings({
      default_install_directory: dir
    });
  };

  const handleSaveTheme = async (values: any) => {
    setLoading(true);
    try {
      console.log('[SettingsView] Saving theme:', values);
      await updateSettings({
        accent_color: values.accentColor
      });
      console.log('[SettingsView] Theme settings saved successfully');
      message.success('Theme settings updated');
    } catch (error) {
      console.error('[SettingsView] Failed to save theme:', error);
      message.error('Failed to save theme settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDownloads = async (values: any) => {
    setLoading(true);
    try {
      await updateSettings({
        seed_by_default: values.seedByDefault,
        download_speed_limit_mbps: values.downloadLimit,
        upload_speed_limit_mbps: values.uploadLimit,
        max_concurrent_downloads: values.maxConcurrent,
        auto_seed_after_download: values.autoSeed
      });
      message.success('Download settings saved');
    } catch (error) {
      message.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLibrary = async (values: any) => {
    setLoading(true);
    try {
      await updateSettings({
        library_view_mode: values.viewMode,
        library_sort_by: values.sortBy,
        library_sort_order: values.sortOrder,
        library_card_size: values.cardSize
      });
      message.success('Library settings saved');
    } catch (error) {
      message.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async (values: any) => {
    setLoading(true);
    try {
      await updateSettings({
        notifications_enabled: values.enabled,
        notify_on_download_complete: values.onDownloadComplete,
        notify_on_update_available: values.onUpdateAvailable,
        check_updates_on_startup: values.checkUpdates
      });
      message.success('Notification settings saved');
    } catch (error) {
      message.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStorage = async (values: any) => {
    setLoading(true);
    try {
      await updateSettings({
        auto_cleanup_temp_files: values.autoCleanup
      });
      message.success('Storage settings saved');
    } catch (error) {
      message.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const tabItems = [
    {
      key: 'directories',
      label: 'Install Paths',
      icon: <FolderAddOutlined />,
      children: (
        <Card className="glass-card glass-settings-card" bordered={false}>
          <Button 
            type="primary" 
            icon={<FolderAddOutlined />}
            onClick={handleAddDirectory}
            className="settings-action-btn"
            style={{ marginBottom: 16 }}
          >
            Add Directory
          </Button>

          <List
            className="settings-list"
            dataSource={settings.install_directories}
            renderItem={dir => (
              <List.Item
                className="settings-list-item"
                actions={[
                  settings.default_install_directory !== dir && (
                    <Button size="small" onClick={() => handleSetDefault(dir)} className="btn-ghost">
                      Set Default
                    </Button>
                  ),
                  <Button 
                    size="small" 
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveDirectory(dir)}
                    className="settings-remove-btn"
                  >
                    Remove
                  </Button>
                ]}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="settings-path">{dir}</span>
                  {settings.default_install_directory === dir && (
                    <span className="settings-default-badge">Default</span>
                  )}
                </div>
              </List.Item>
            )}
          />
        </Card>
      )
    },
    {
      key: 'theme',
      label: 'Theme',
      icon: <BgColorsOutlined />,
      children: (
        <Card className="glass-card glass-settings-card" bordered={false}>
          <Form
            layout="vertical"
            className="settings-form"
            initialValues={{
              accentColor: settings.accent_color || '#6ddcff'
            }}
            onFinish={handleSaveTheme}
          >
            <Form.Item 
              name="accentColor" 
              label={<span className="settings-label">Accent Color</span>}
            >
              <input type="color" style={{ width: 100, height: 40, border: '1px solid #1e293b', borderRadius: 8, cursor: 'pointer' }} />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} className="settings-save-btn">
                Save Theme Settings
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )
    },
    {
      key: 'downloads',
      label: 'Downloads',
      icon: <DownloadOutlined />,
      children: (
        <Card className="glass-card glass-settings-card" bordered={false}>
          <Form
            layout="vertical"
            className="settings-form"
            initialValues={{
              seedByDefault: settings.seed_by_default,
              downloadLimit: settings.download_speed_limit_mbps,
              uploadLimit: settings.upload_speed_limit_mbps,
              maxConcurrent: settings.max_concurrent_downloads || 3,
              autoSeed: settings.auto_seed_after_download !== false
            }}
            onFinish={handleSaveDownloads}
          >
            <Form.Item 
              name="maxConcurrent" 
              label={<span className="settings-label">Max Concurrent Downloads</span>}
            >
              <InputNumber min={1} max={10} className="settings-input" />
            </Form.Item>

            <Form.Item 
              name="downloadLimit" 
              label={<span className="settings-label">Download Speed Limit (MB/s)</span>}
              help="0 = unlimited"
            >
              <InputNumber min={0} max={100} className="settings-input" />
            </Form.Item>

            <Form.Item 
              name="uploadLimit" 
              label={<span className="settings-label">Upload Speed Limit (MB/s)</span>}
              help="0 = unlimited"
            >
              <InputNumber min={0} max={100} className="settings-input" />
            </Form.Item>

            <Form.Item 
              name="autoSeed" 
              label={<span className="settings-label">Auto-Seed After Download</span>}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item 
              name="seedByDefault" 
              label={<span className="settings-label">Seed by Default</span>}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} className="settings-save-btn">
                Save Download Settings
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )
    },
    {
      key: 'library',
      label: 'Library',
      icon: <AppstoreOutlined />,
      children: (
        <Card className="glass-card glass-settings-card" bordered={false}>
          <Form
            layout="vertical"
            className="settings-form"
            initialValues={{
              viewMode: settings.library_view_mode || 'grid',
              sortBy: settings.library_sort_by || 'name',
              sortOrder: settings.library_sort_order || 'asc',
              cardSize: settings.library_card_size || 'medium'
            }}
            onFinish={handleSaveLibrary}
          >
            <Form.Item 
              name="viewMode" 
              label={<span className="settings-label">Default View Mode</span>}
            >
              <Select className="settings-select">
                <Option value="grid">Grid View</Option>
                <Option value="list">List View</Option>
              </Select>
            </Form.Item>

            <Form.Item 
              name="sortBy" 
              label={<span className="settings-label">Sort By</span>}
            >
              <Select className="settings-select">
                <Option value="name">Name</Option>
                <Option value="date_installed">Install Date</Option>
                <Option value="playtime">Playtime</Option>
                <Option value="last_played">Last Played</Option>
                <Option value="size">Size</Option>
              </Select>
            </Form.Item>

            <Form.Item 
              name="sortOrder" 
              label={<span className="settings-label">Sort Order</span>}
            >
              <Select className="settings-select">
                <Option value="asc">Ascending</Option>
                <Option value="desc">Descending</Option>
              </Select>
            </Form.Item>

            <Form.Item 
              name="cardSize" 
              label={<span className="settings-label">Card Size</span>}
            >
              <Select className="settings-select">
                <Option value="small">Small</Option>
                <Option value="medium">Medium</Option>
                <Option value="large">Large</Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} className="settings-save-btn">
                Save Library Settings
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )
    },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: <BellOutlined />,
      children: (
        <Card className="glass-card glass-settings-card" bordered={false}>
          <Form
            layout="vertical"
            className="settings-form"
            initialValues={{
              enabled: settings.notifications_enabled !== false,
              onDownloadComplete: settings.notify_on_download_complete !== false,
              onUpdateAvailable: settings.notify_on_update_available !== false,
              checkUpdates: settings.check_updates_on_startup
            }}
            onFinish={handleSaveNotifications}
          >
            <Form.Item 
              name="enabled" 
              label={<span className="settings-label">Enable Notifications</span>}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item 
              name="onDownloadComplete" 
              label={<span className="settings-label">Notify on Download Complete</span>}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item 
              name="onUpdateAvailable" 
              label={<span className="settings-label">Notify on Game Update Available</span>}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item 
              name="checkUpdates" 
              label={<span className="settings-label">Check for Updates on Startup</span>}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} className="settings-save-btn">
                Save Notification Settings
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )
    },
    {
      key: 'storage',
      label: 'Storage',
      icon: <DatabaseOutlined />,
      children: (
        <Card className="glass-card glass-settings-card" bordered={false}>
          <Form
            layout="vertical"
            className="settings-form"
            initialValues={{
              autoCleanup: settings.auto_cleanup_temp_files || false
            }}
            onFinish={handleSaveStorage}
          >
            <Form.Item 
              name="autoCleanup" 
              label={<span className="settings-label">Auto-Cleanup Temporary Files</span>}
              valuePropName="checked"
              help="Automatically delete temporary download files after installation"
            >
              <Switch />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} className="settings-save-btn">
                Save Storage Settings
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )
    }
  ];

  return (
    <div className="page-shell settings-view">
      <div className="settings-hero">
        <div>
          <Title level={1} className="settings-title">Settings</Title>
          <div className="settings-subtitle">Customize your experience</div>
        </div>
      </div>

      <Tabs 
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        className="settings-tabs"
        tabPosition="left"
      />
    </div>
  );
};

export default SettingsViewEnhanced;
