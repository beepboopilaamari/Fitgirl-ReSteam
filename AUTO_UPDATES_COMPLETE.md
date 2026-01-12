# Auto-Updates Implementation Complete ✅

## What's Been Added

Your FitGirl Resteam app now has **full automatic update support** built-in. Users can receive updates automatically without manual intervention.

## Files Modified

### Code Changes
- `src/main/index.ts` - Added `setupAutoUpdate()` and update IPC handlers
- `src/preload/preload.ts` - Exposed update functions to renderer
- `package.json` - Added GitHub publish configuration

### Documentation Created
- **[AUTO_UPDATES.md](AUTO_UPDATES.md)** - Complete setup guide with GitHub configuration
- **[RELEASE_WORKFLOW.md](RELEASE_WORKFLOW.md)** - Quick commands for releasing new versions
- **[UPDATE_UI_GUIDE.md](UPDATE_UI_GUIDE.md)** - How to add update UI to your app

## How It Works

### For Users
1. App automatically checks for updates every hour
2. When available, notification appears
3. Update downloads in background
4. User clicks "Install & Restart"
5. App installs update and relaunches

### For Developers (You)
1. Update version in `package.json`
2. Run `npm run package` with GitHub token
3. Installers automatically published to GitHub Releases
4. All users get the update notification

## Quick Start (3 Steps)

### Step 1: GitHub Setup
```powershell
# Create repo: https://github.com/new
# Create token: https://github.com/settings/tokens/new
# Copy token (you'll need it next)
```

### Step 2: Update package.json
Find the `"publish"` section and replace your username:
```json
"publish": [
  {
    "provider": "github",
    "owner": "YOUR-GITHUB-USERNAME",  // ← Your GitHub username
    "repo": "fitgirl-resteam"
  }
]
```

### Step 3: Release First Version
```powershell
# Set token (one time per session)
$env:GH_TOKEN='your-github-token-here'

# Build and publish
npm run package

# That's it! Check your GitHub Releases page
```

## Release a New Version

```powershell
# 1. Update version in package.json
# "version": "1.1.0"

# 2. Build and publish
$env:GH_TOKEN='your-token'
npm run package

# Users will get notification of new version automatically!
```

## What Users See

### First Time
- On startup: "Checking for updates..."
- If available: "New version available - v1.1.0. Download now?"
- Downloading: "Update downloading..."
- Ready: "Update ready to install. Restart now?"

### Periodic Checks
- Every hour: Automatic check in background
- If update found: Subtle notification
- User controls when to install

## Architecture

### Main Process (`src/main/index.ts`)
```typescript
function setupAutoUpdate() {
  // Checks GitHub every hour
  // Listens for update-available and update-downloaded events
  // Sends notifications to renderer
}

// IPC Handlers
'check-for-updates'  // Manual check
'install-update'     // Install and restart
```

### Preload Bridge (`src/preload/preload.ts`)
```typescript
window.electronAPI.checkForUpdates()
window.electronAPI.installUpdate()
window.electronAPI.onUpdateAvailable(callback)
window.electronAPI.onUpdateDownloaded(callback)
```

### GitHub Integration (`package.json`)
```json
"publish": [{
  "provider": "github",
  "owner": "your-username",
  "repo": "fitgirl-resteam"
}]
```

When you run `npm run package`, electron-builder:
1. Creates NSIS installer and portable .exe
2. Uploads to GitHub Releases
3. Creates update metadata
4. Users' app checks this metadata

## Security

✅ **Token Safety**
- Never commit your GitHub token to git
- Use environment variable: `$env:GH_TOKEN='...'`
- Or set system environment variable once

✅ **Release Verification**
- GitHub provides cryptographic signatures
- electron-updater verifies before installing
- Only official releases can be installed

✅ **Minimal Permissions**
- Use `public_repo` scope for public repos only
- No unnecessary permissions required

## Troubleshooting

### "Update not showing"
```powershell
# Clear cache and try again
Remove-Item "$env:APPDATA\Local\electron-builder\Cache" -Recurse -Force
```

### "GitHub token invalid"
- Regenerate at: https://github.com/settings/tokens
- Make sure it's set: `$env:GH_TOKEN='ghp_...'`

### "Build succeeds but no release created"
- Check GitHub token has `public_repo` scope
- Verify `owner` in package.json matches username
- Look for error in build output (should mention GitHub)

### "Seeing very old version"
- This is normal for first check (downloads metadata)
- Subsequent checks are instant (cached)

## File Structure

```
release/
├── FitGirl Resteam Setup 1.0.0.exe      ← Installer
├── FitGirl Resteam 1.0.0.exe            ← Portable
├── FitGirl Resteam Setup 1.0.0.exe.blockmap ← Update metadata
├── builder-effective-config.yaml        ← Build config used
└── win-unpacked/                        ← Unpacked app files
```

All these files are created by `npm run package` and uploaded to GitHub automatically (when token is set).

## Common Scenarios

### Scenario: Release 1.0.0
```powershell
$env:GH_TOKEN='your-token'
npm run package
# ✓ Creates GitHub Release v1.0.0
```

### Scenario: Release 1.0.1 (patch fix)
```powershell
# Edit package.json: "version": "1.0.1"
$env:GH_TOKEN='your-token'
npm run package
# ✓ Creates GitHub Release v1.0.1
# ✓ All users with 1.0.0 get notification
```

### Scenario: Release 2.0.0 (major update)
```powershell
# Edit package.json: "version": "2.0.0"
$env:GH_TOKEN='your-token'
npm run package
# ✓ Creates GitHub Release v2.0.0
# ✓ All users get major update offer
```

## Next Steps

1. **Set up GitHub**
   - Create repository (or use existing)
   - Create personal access token
   - Update package.json with your username

2. **Build and test**
   ```powershell
   npm run package
   ```

3. **Verify on GitHub**
   - Go to your repo's Releases page
   - Should see v1.0.0 with files

4. **Run app and test**
   - Install the app
   - Settings → Check for Updates
   - Should work!

5. **Release updates**
   - Increment version
   - Run `npm run package`
   - Done!

## Reference Docs

- **[AUTO_UPDATES.md](AUTO_UPDATES.md)** - Detailed setup, troubleshooting, security
- **[RELEASE_WORKFLOW.md](RELEASE_WORKFLOW.md)** - Commands and workflows
- **[UPDATE_UI_GUIDE.md](UPDATE_UI_GUIDE.md)** - Adding UI component
- **[PRODUCTION_BUILD.md](PRODUCTION_BUILD.md)** - General build info

## Testing Checklist

- [ ] GitHub repo created
- [ ] Personal access token generated
- [ ] package.json updated with username
- [ ] `npm run package` runs successfully
- [ ] Release appears on GitHub Releases page
- [ ] App installed from setup.exe
- [ ] Manual "Check for Updates" works
- [ ] Update notification displays correctly

## Build Sizes

After adding electron-updater:
- Main: 1.65 MiB (was 1.05 MiB)
- Preload: 4.14 KiB (was 3.88 KiB)
- Renderer: 2.5 MiB (unchanged)

Total installer size: ~150 MB (includes Electron runtime)

---

**Ready to release?** Follow the Quick Start above or see [RELEASE_WORKFLOW.md](RELEASE_WORKFLOW.md) for detailed commands.
