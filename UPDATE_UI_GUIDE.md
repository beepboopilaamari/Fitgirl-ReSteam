# Update Handler Component

If you want to add a UI component to show update status, add this to your Settings view:

## Example Update Status Component

```typescript
import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Tag, Empty } from 'antd';
import { DownloadOutlined, ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons';

interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseName?: string;
  releaseNotes?: string;
}

export const UpdatePanel: React.FC = () => {
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.0');
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Get current app version
    const version = require('electron').app?.getVersion?.() || '1.0.0';
    setCurrentVersion(version);

    // Listen for update events
    window.electronAPI?.onUpdateAvailable?.((info) => {
      console.log('Update available:', info);
      setUpdateAvailable(info);
    });

    window.electronAPI?.onUpdateDownloaded?.((info) => {
      console.log('Update downloaded:', info);
      setUpdateDownloaded(true);
    });

    // Check for updates on component mount
    handleCheckUpdates();
  }, []);

  const handleCheckUpdates = async () => {
    try {
      setChecking(true);
      const result = await window.electronAPI?.checkForUpdates?.();
      console.log('Update check result:', result);
    } catch (error) {
      console.error('Error checking for updates:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleInstallUpdate = () => {
    window.electronAPI?.installUpdate?.();
  };

  return (
    <Card title="App Updates" size="small">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Current Version */}
        <div>
          <strong>Current Version:</strong>
          <Tag style={{ marginLeft: 12 }}>v{currentVersion}</Tag>
        </div>

        {/* Update Status */}
        {updateDownloaded ? (
          <>
            <div style={{ color: '#52c41a' }}>
              <CheckCircleOutlined /> Update downloaded and ready to install
            </div>
            <Button
              type="primary"
              onClick={handleInstallUpdate}
              block
            >
              Install Update & Restart
            </Button>
          </>
        ) : updateAvailable ? (
          <>
            <div>
              <strong>New Version Available:</strong>
              <Tag color="blue" style={{ marginLeft: 12 }}>
                v{updateAvailable.version}
              </Tag>
            </div>
            {updateAvailable.releaseNotes && (
              <div>
                <strong>Release Notes:</strong>
                <p>{updateAvailable.releaseNotes}</p>
              </div>
            )}
            <div style={{ color: '#faad14' }}>
              Download in progress...
            </div>
          </>
        ) : (
          <>
            <div style={{ color: '#52c41a' }}>
              <CheckCircleOutlined /> You're up to date!
            </div>
          </>
        )}

        {/* Check Button */}
        <Button
          icon={<ReloadOutlined spin={checking} />}
          onClick={handleCheckUpdates}
          disabled={checking || !!updateAvailable}
          block
        >
          {checking ? 'Checking...' : 'Check for Updates'}
        </Button>

        {/* Info */}
        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
          Updates are checked automatically every hour.
          {' '}
          <a href="https://github.com/your-username/fitgirl-resteam/releases" target="_blank" rel="noopener noreferrer">
            View Release History
          </a>
        </div>
      </Space>
    </Card>
  );
};

export default UpdatePanel;
```

## Integration with Settings

Add to your `SettingsViewEnhanced.tsx`:

```typescript
import UpdatePanel from './UpdatePanel';

// In the settings tabs:
<TabPane tab="Updates" key="updates">
  <UpdatePanel />
</TabPane>
```

## Auto-Update Flow Diagram

```
User launches app
    ↓
App checks GitHub for releases (cached)
    ↓
    ├─ No update → Show "Up to date"
    ├─ Update available → Show "New version available"
    │    ↓
    │    Download starts in background
    │    ↓
    │    Download completes → Show "Ready to install"
    │    ↓
    │    User clicks "Install & Restart"
    │    ↓
    │    App quits, installer runs, app relaunches
    │
    └─ (Check again in 1 hour)
```

## Event Listeners

The app will emit these events:

```typescript
// Update is available
window.electronAPI.onUpdateAvailable((info) => {
  // info = { version, releaseDate, releaseName, releaseNotes }
  console.log('New version available:', info.version);
});

// Update has been downloaded
window.electronAPI.onUpdateDownloaded((info) => {
  console.log('Update ready to install:', info.version);
});
```

## Manual Update Check

Users can manually trigger an update check:

```typescript
// Trigger check
const result = await window.electronAPI.checkForUpdates();
console.log('Update available:', result?.updateInfo?.version);

// Install when ready
window.electronAPI.installUpdate();
```

## Disable Auto-Updates

To disable automatic checks (e.g., for testing):

Edit `src/main/index.ts`, in `setupAutoUpdate()`:

```typescript
function setupAutoUpdate(): void {
  // Disable auto-checks for now
  // autoUpdater.checkForUpdatesAndNotify();
  
  // Only allow manual checks via UI
  // setInterval(...) // Disabled
  
  // Keep event listeners so manual checks still work
  autoUpdater.on('update-available', (info) => {
    log.info(`[Main] Update available: ${info.version}`);
    mainWindow?.webContents.send('update-available', info);
  });
}
```

Then rebuild: `npm run build:main`

## Testing Updates Locally

1. Package current version as 1.0.0
2. Create release on GitHub with tag `v1.0.0`
3. Increment version to 1.0.1 in package.json
4. Package new version
5. Create GitHub release with tag `v1.0.1`
6. Run 1.0.0 app - it should detect 1.0.1 as available

## See Also

- [AUTO_UPDATES.md](AUTO_UPDATES.md) - Full setup guide
- [RELEASE_WORKFLOW.md](RELEASE_WORKFLOW.md) - Quick release commands
- [electron-updater Docs](https://www.electron.build/auto-update)
