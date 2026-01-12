import React, { useState } from 'react';
import { Steps, Button, Typography, Switch, Space, Spin, message } from 'antd';
import { FolderAddOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useSettings } from '../contexts/SettingsContext';

const { Title, Paragraph } = Typography;
const { Step } = Steps;

interface FirstRunWizardProps {
  onComplete: () => void;
}

const FirstRunWizard: React.FC<FirstRunWizardProps> = ({ onComplete }) => {
  const { updateSettings } = useSettings();
  const [current, setCurrent] = useState(0);
  const [installDirs, setInstallDirs] = useState<string[]>([]);
  const [defaultDir, setDefaultDir] = useState<string | null>(null);
  const [seedByDefault, setSeedByDefault] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleAddDirectory = async () => {
    const dir = await window.electronAPI.selectDirectory();
    if (dir && !installDirs.includes(dir)) {
      const newDirs = [...installDirs, dir];
      setInstallDirs(newDirs);
      if (!defaultDir) {
        setDefaultDir(dir);
      }
    }
  };

  const handleSetDefault = (dir: string) => {
    setDefaultDir(dir);
  };

  const handleRemoveDir = (dir: string) => {
    setInstallDirs(installDirs.filter(d => d !== dir));
    if (defaultDir === dir) {
      setDefaultDir(installDirs[0] || null);
    }
  };

  const handleFinish = async () => {
    if (installDirs.length === 0) {
      message.error('Please add at least one install directory');
      return;
    }

    setUpdating(true);

    try {
      // Update settings
      await updateSettings({
        install_directories: installDirs,
        default_install_directory: defaultDir,
        seed_by_default: seedByDefault,
        first_run_complete: true
      });

      // Check for new games
      await window.electronAPI.updateCatalog();

      message.success('Setup complete!');
      onComplete();
    } catch (error) {
      message.error('Failed to complete setup');
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const steps = [
    {
      title: 'Welcome',
      content: (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Title level={2}>Welcome to FitGirl Resteam</Title>
          <Paragraph style={{ fontSize: '16px', maxWidth: '600px', margin: '20px auto' }}>
            A Steam-like game library manager for FitGirl Repacks with built-in torrent client.
            Let's get you set up!
          </Paragraph>
        </div>
      )
    },
    {
      title: 'Install Directory',
      content: (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
          <Title level={3}>Choose Install Directories</Title>
          <Paragraph>
            Select one or more directories where games will be installed.
            You must choose at least one directory.
          </Paragraph>
          
          <Button 
            type="primary" 
            icon={<FolderAddOutlined />}
            onClick={handleAddDirectory}
            style={{ marginBottom: '20px' }}
          >
            Add Directory
          </Button>

          {installDirs.length > 0 && (
            <Space direction="vertical" style={{ width: '100%' }}>
              {installDirs.map(dir => (
                <div key={dir} style={{ 
                  padding: '10px', 
                  background: '#2a475e',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div>{dir}</div>
                    {defaultDir === dir && (
                      <span style={{ color: '#66c0f4', fontSize: '12px' }}>Default</span>
                    )}
                  </div>
                  <Space>
                    {defaultDir !== dir && (
                      <Button size="small" onClick={() => handleSetDefault(dir)}>
                        Set Default
                      </Button>
                    )}
                    <Button size="small" danger onClick={() => handleRemoveDir(dir)}>
                      Remove
                    </Button>
                  </Space>
                </div>
              ))}
            </Space>
          )}
        </div>
      )
    },
    {
      title: 'Preferences',
      content: (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
          <Title level={3}>Seeding Preference</Title>
          <Paragraph>
            Choose whether to automatically seed torrents after downloads complete.
            You can change this later in settings.
          </Paragraph>
          
          <div style={{ padding: '20px', background: '#2a475e', borderRadius: '4px' }}>
            <Space align="center">
              <Switch checked={seedByDefault} onChange={setSeedByDefault} />
              <span>Seed torrents after download completes</span>
            </Space>
          </div>
        </div>
      )
    },
    {
      title: 'Complete',
      content: updating ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <Title level={3} style={{ marginTop: '20px' }}>Updating game catalog...</Title>
          <Paragraph>This may take a moment</Paragraph>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <CheckCircleOutlined style={{ fontSize: '64px', color: '#5cb85c' }} />
          <Title level={2} style={{ marginTop: '20px' }}>Setup Complete!</Title>
          <Paragraph style={{ fontSize: '16px' }}>
            You're all set. Click Finish to start browsing games.
          </Paragraph>
        </div>
      )
    }
  ];

  return (
    <div style={{ 
      height: '100vh', 
      background: '#1b2838',
      padding: '40px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Steps current={current} style={{ marginBottom: '40px' }}>
        {steps.map(item => (
          <Step key={item.title} title={item.title} />
        ))}
      </Steps>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {steps[current].content}
      </div>

      <div style={{ marginTop: '20px', textAlign: 'right' }}>
        {current > 0 && current < steps.length - 1 && (
          <Button style={{ marginRight: '8px' }} onClick={() => setCurrent(current - 1)}>
            Previous
          </Button>
        )}
        
        {current < steps.length - 2 && (
          <Button 
            type="primary" 
            onClick={() => setCurrent(current + 1)}
            disabled={current === 1 && installDirs.length === 0}
          >
            Next
          </Button>
        )}
        
        {current === steps.length - 2 && (
          <Button 
            type="primary" 
            onClick={() => setCurrent(current + 1)}
            disabled={installDirs.length === 0}
          >
            Finish Setup
          </Button>
        )}

        {current === steps.length - 1 && !updating && (
          <Button type="primary" onClick={handleFinish}>
            Finish
          </Button>
        )}
      </div>
    </div>
  );
};

export default FirstRunWizard;
