import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Badge, Typography } from 'antd';
import {
  DashboardOutlined,
  HomeOutlined,
  ShopOutlined,
  DownloadOutlined,
  SettingOutlined,
  MinusOutlined,
  BorderOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useDownloads } from '../contexts/DownloadContext';

const { Sider, Header, Content } = Layout;
const { Title } = Typography;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeDownloads } = useDownloads();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard'
    },
    {
      key: '/library',
      icon: <HomeOutlined />,
      label: 'Library'
    },
    {
      key: '/browse',
      icon: <ShopOutlined />,
      label: 'Browse'
    },
    {
      key: '/downloads',
      icon: (
        <Badge count={activeDownloads.length} size="small" offset={[10, 0]}>
          <DownloadOutlined />
        </Badge>
      ),
      label: 'Downloads'
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings'
    }
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleMinimize = () => {
    window.electronAPI.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electronAPI.maximizeWindow();
  };

  const handleClose = () => {
    window.electronAPI.closeWindow();
  };

  return (
    <Layout className="app-container" style={{ height: '100vh' }}>
      <Header className="app-header">
        <div className="titlebar-drag" style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <Title level={3} style={{ margin: 0, color: '#ffffff', fontWeight: 800, letterSpacing: '1px' }}>
            FitGirl:ReSteam
          </Title>
        </div>
        <div className="window-controls">
          <button className="window-control-btn" onClick={handleMinimize}>
            <MinusOutlined />
          </button>
          <button className="window-control-btn" onClick={handleMaximize}>
            <BorderOutlined />
          </button>
          <button className="window-control-btn window-control-close" onClick={handleClose}>
            <CloseOutlined />
          </button>
        </div>
      </Header>
      
      <Layout>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={200}
          className="app-sider"
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{
              height: '100%',
              borderRight: 0,
              padding: '12px'
            }}
            theme="dark"
          />
        </Sider>
        
        <Content className="app-content">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
