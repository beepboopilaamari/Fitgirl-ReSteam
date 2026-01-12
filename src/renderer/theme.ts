import { ThemeConfig } from 'antd';

export const steamTheme: ThemeConfig = {
  token: {
    colorPrimary: '#6ddcff',
    colorBgContainer: '#0f141e',
    colorBgElevated: '#151a26',
    colorBgLayout: '#0a0e1a',
    colorText: '#ffffff',
    colorTextSecondary: 'rgba(255, 255, 255, 0.65)',
    colorBorder: 'rgba(109, 220, 255, 0.15)',
    colorLink: '#6ddcff',
    colorLinkHover: '#9ae6ff',
    colorSuccess: '#22c55e',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    borderRadius: 12,
    fontSize: 14,
    fontWeightStrong: 700
  },
  components: {
    Layout: {
      bodyBg: '#0a0e1a',
      headerBg: 'transparent',
      siderBg: 'transparent',
      triggerBg: '#151a26'
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(109, 220, 255, 0.18)',
      darkItemHoverBg: 'rgba(109, 220, 255, 0.1)',
      darkItemColor: 'rgba(255, 255, 255, 0.85)',
      itemSelectedColor: '#ffffff'
    },
    Card: {
      colorBgContainer: 'rgba(15, 20, 30, 0.6)',
      colorBorderSecondary: 'rgba(109, 220, 255, 0.15)'
    },
    Button: {
      primaryColor: '#0a0e1a',
      defaultBg: 'rgba(109, 220, 255, 0.1)',
      defaultColor: '#ffffff',
      defaultBorderColor: 'rgba(109, 220, 255, 0.25)'
    },
    Input: {
      colorBgContainer: 'rgba(15, 20, 30, 0.8)',
      colorBorder: 'rgba(109, 220, 255, 0.2)',
      colorText: '#ffffff'
    },
    Progress: {
      defaultColor: '#6ddcff'
    },
    Modal: {
      contentBg: 'rgba(15, 20, 30, 0.95)',
      headerBg: 'rgba(10, 14, 26, 0.8)'
    }
  }
};
