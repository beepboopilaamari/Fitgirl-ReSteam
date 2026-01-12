import React, { useState } from 'react';
import { Typography, Card, Form, Switch, InputNumber, Button, List, message } from 'antd';
import { FolderAddOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSettings } from '../contexts/SettingsContext';

const { Title } = Typography;

const SettingsView: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const [loading, setLoading] = useState(false);

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

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      await updateSettings({
        seed_by_default: values.seedByDefault,
        download_speed_limit_mbps: values.downloadLimit,
        upload_speed_limit_mbps: values.uploadLimit,
        check_updates_on_startup: values.checkUpdates
      });
      message.success('Settings saved');
    } catch (error) {
      message.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell settings-view">
      <div className="settings-hero">
        <div>
          <Title level={1} className="settings-title">Settings</Title>
          <div className="settings-subtitle">Control installs, paths, and speeds.</div>
        </div>
      </div>

      <div className="settings-grid">
        <Card title={
          <div className="settings-card-title">
            <FolderAddOutlined style={{ marginRight: '8px' }} />
            Install Directories
          </div>
        } className="glass-card glass-settings-card" bordered={false}>
          <Button 
            type="primary" 
            icon={<FolderAddOutlined />}
            onClick={handleAddDirectory}
            className="settings-action-btn"
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

        <Card title={
          <div className="settings-card-title">
            Download Settings
          </div>
        } className="glass-card glass-settings-card" bordered={false}>
        <Form
          layout="vertical"
          className="settings-form"
          initialValues={{
            seedByDefault: settings.seed_by_default,
            downloadLimit: settings.download_speed_limit_mbps,
            uploadLimit: settings.upload_speed_limit_mbps,
            checkUpdates: settings.check_updates_on_startup
          }}
          onFinish={handleSave}
        >
          <Form.Item 
            name="seedByDefault" 
            label={<span className="settings-label">Seed After Download</span>}
            valuePropName="checked"
          >
            <Switch />
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
            name="checkUpdates" 
            label={<span className="settings-label">Check for Updates on Startup</span>}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} className="settings-save-btn">
              Save Settings
            </Button>
          </Form.Item>
        </Form>
      </Card>
      </div>
    </div>
  );
};

export default SettingsView;
