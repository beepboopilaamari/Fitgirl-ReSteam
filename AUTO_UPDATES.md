# Auto-Updates Setup Guide

This guide explains how to set up automatic updates for FitGirl Resteam using GitHub Releases.

## Overview

FitGirl Resteam now includes automatic update functionality powered by **electron-updater**. The app will:
- Check for updates automatically (every hour)
- Notify users when an update is available
- Download the update in the background
- Prompt to install when ready

## Prerequisites

- GitHub account with a repository for your app
- GitHub Personal Access Token (PAT) for uploading releases
- Updated package.json with your GitHub repository details

## Step 1: Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Create a new repository named `fitgirl-resteam` (or your desired name)
3. Note your GitHub username for later

## Step 2: Update package.json

Edit `package.json` and update the publish configuration with your GitHub details:

```json
"publish": [
  {
    "provider": "github",
    "owner": "YOUR-GITHUB-USERNAME",
    "repo": "fitgirl-resteam"
  }
]
```

Example:
```json
"publish": [
  {
    "provider": "github",
    "owner": "john-doe",
    "repo": "fitgirl-resteam"
  }
]
```

## Step 3: Generate GitHub Personal Access Token

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Name it: `fitgirl-resteam-releases`
4. Select scopes: `public_repo` (or `repo` for private repos)
5. Click "Generate token"
6. **Copy the token** - you won't be able to see it again!

## Step 4: Build and Publish Release

### On your development machine:

1. **Clear the release folder:**
   ```powershell
   Remove-Item "d:\fitgirlresteam\release" -Recurse -Force -ErrorAction SilentlyContinue
   ```

2. **Build and package:**
   ```powershell
   $env:GH_TOKEN='your-personal-access-token-here'
   npm run package
   ```

   This will:
   - Build the app
   - Create installers (NSIS + portable)
   - Automatically publish to GitHub Releases

### First Release Setup

1. Ensure the version in `package.json` matches your first release (e.g., `1.0.0`)
2. Run the build command above
3. This creates a GitHub Release with the tag `v1.0.0`
4. Installers are automatically uploaded

## Step 5: Creating New Releases

To release version 1.1.0:

1. **Update version in package.json:**
   ```json
   "version": "1.1.0"
   ```

2. **Commit and push changes:**
   ```powershell
   git add .
   git commit -m "Release v1.1.0: Add feature XYZ"
   git push origin main
   ```

3. **Create tag:**
   ```powershell
   git tag v1.1.0
   git push origin v1.1.0
   ```

4. **Build and publish:**
   ```powershell
   $env:GH_TOKEN='your-personal-access-token-here'
   npm run package
   ```

## Alternative: Manual Release Upload

If you prefer to manage releases manually:

1. Build the package:
   ```powershell
   npm run package
   ```

2. Go to your GitHub repository
3. Click "Create a new release"
4. Tag: `v1.1.0` (matches package.json version)
5. Title: `Version 1.1.0`
6. Description: Details of what changed
7. Upload files from `d:\fitgirlresteam\release\`:
   - `FitGirl Resteam Setup 1.1.0.exe`
   - `FitGirl Resteam 1.1.0.exe`
   - `FitGirl Resteam Setup 1.1.0.exe.blockmap`

## How Users Get Updates

Users running the app will:

1. **See notification** when update is available
2. **Click to download** (downloads in background)
3. **Install on restart** - app will quit, install, and relaunch

## Troubleshooting

### "Cannot find GitHub releases"
- Verify `owner` and `repo` in package.json match your GitHub
- Ensure GH_TOKEN is valid
- Check that Release tag matches version in package.json

### "Update check fails silently"
- Check browser DevTools Console for errors
- Verify internet connection
- Check if releases exist on GitHub

### "Very slow update check"
- This is normal for initial check (downloading release metadata)
- Subsequent checks are cached

## Environment Variables

**For Secure Token Handling:**

Instead of putting token in commands, set it persistently:

```powershell
[Environment]::SetEnvironmentVariable("GH_TOKEN", "your-token-here", "User")
```

Then simply run:
```powershell
npm run package
```

## Advanced: Multiple Providers

You can publish to multiple platforms:

```json
"publish": [
  {
    "provider": "github",
    "owner": "your-username",
    "repo": "fitgirl-resteam"
  },
  {
    "provider": "s3",
    "bucket": "your-bucket"
  }
]
```

## Security Notes

⚠️ **Never commit your GH_TOKEN to git!**

- Use environment variables
- Add `.env` files to `.gitignore`
- Regenerate token if accidentally exposed
- Use minimal required scopes (public_repo for public repos)

## User Notification Flow

### First Check (On App Start)
1. App checks GitHub for new releases
2. If update available → notifies user via modal

### Periodic Checks (Every Hour)
1. Runs in background
2. If update available → shows subtle notification
3. If update downloaded → prompts to install

### Manual Check
1. Users can check for updates in Settings
2. Shows current version and available update info

## Disabling Auto-Updates

To disable auto-updates, comment out in `src/main/index.ts`:

```typescript
// setupAutoUpdate(); // Disabled
```

Then rebuild with `npm run build:main`.

## See Also

- [electron-updater Documentation](https://www.electron.build/auto-update)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)
- [electron-builder Publish Options](https://www.electron.build/configuration/publish)
