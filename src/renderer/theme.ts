import { ThemeConfig } from 'antd';

// Helper function to add opacity to hex color
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Adjust color brightness based on intensity
function adjustBrightness(hex: string, intensity: number): string {
  // intensity: 50 (subtle) to 150 (strong)
  // 100 = normal
  const factor = intensity / 100;
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) * factor);
  
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

export function generateTheme(accentColor: string = '#6ddcff', glassIntensity: number = 100): ThemeConfig {
  // Clamp values
  const validAccent = /^#[0-9A-F]{6}$/i.test(accentColor) ? accentColor : '#6ddcff';
  const validIntensity = Math.max(50, Math.min(150, glassIntensity));
  
  // Calculate opacity based on intensity
  const glassOpacity = 0.6 * (validIntensity / 100);
  const borderOpacity = 0.15 * (validIntensity / 100);
  const hoverOpacity = 0.1 * (validIntensity / 100);
  
  return {
    token: {
      colorPrimary: validAccent,
      colorBgContainer: '#0f141e',
      colorBgElevated: '#151a26',
      colorBgLayout: '#0a0e1a',
      colorText: '#ffffff',
      colorTextSecondary: 'rgba(255, 255, 255, 0.65)',
      colorBorder: hexToRgba(validAccent, borderOpacity),
      colorLink: validAccent,
      colorLinkHover: adjustBrightness(validAccent, 130),
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
        darkItemSelectedBg: hexToRgba(validAccent, glassOpacity * 0.3),
        darkItemHoverBg: hexToRgba(validAccent, hoverOpacity),
        darkItemColor: 'rgba(255, 255, 255, 0.85)',
        itemSelectedColor: '#ffffff'
      },
      Card: {
        colorBgContainer: `rgba(15, 20, 30, ${glassOpacity})`,
        colorBorderSecondary: hexToRgba(validAccent, borderOpacity)
      },
      Button: {
        primaryColor: '#0a0e1a',
        defaultBg: hexToRgba(validAccent, hoverOpacity * 1.5),
        defaultColor: '#ffffff',
        defaultBorderColor: hexToRgba(validAccent, borderOpacity * 1.2)
      },
      Input: {
        colorBgContainer: `rgba(15, 20, 30, ${glassOpacity + 0.2})`,
        colorBorder: hexToRgba(validAccent, borderOpacity * 1.2),
        colorText: '#ffffff'
      },
      Progress: {
        defaultColor: validAccent
      },
      Modal: {
        contentBg: `rgba(15, 20, 30, ${glassOpacity + 0.35})`,
        headerBg: `rgba(10, 14, 26, ${glassOpacity + 0.2})`
      }
    }
  };
}

export const steamTheme: ThemeConfig = generateTheme();
