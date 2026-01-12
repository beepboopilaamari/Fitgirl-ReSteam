# First Release Checklist

Complete this checklist to publish your first version (v1.0.0) with auto-updates enabled.

## ✅ Pre-Release Setup

### Step 1: Create GitHub Repository
- [ ] Go to https://github.com/new
- [ ] Repository name: `fitgirl-resteam` (or your choice)
- [ ] Description: "Steam-like game library manager for FitGirl Repacks"
- [ ] Public or Private (your choice)
- [ ] Click "Create repository"
- [ ] **Note your username** for next step

### Step 2: Create GitHub Token
- [ ] Go to https://github.com/settings/tokens/new
- [ ] Token name: `fitgirl-resteam-releases`
- [ ] Expiration: No expiration (or your preference)
- [ ] Select scopes: Check `public_repo` (or `repo` if private)
- [ ] Click "Generate token"
- [ ] **Copy the token** (you won't see it again!)

### Step 3: Configure package.json
- [ ] Open `package.json`
- [ ] Find the `"publish"` section
- [ ] Replace `YOUR-GITHUB-USERNAME` with your actual GitHub username
- [ ] Verify `repo` is set to `fitgirl-resteam` (or your repo name)
- [ ] Save file

**Example:**
```json
"publish": [
  {
    "provider": "github",
    "owner": "john-doe",      ← Your GitHub username
    "repo": "fitgirl-resteam"
  }
]
```

## 🏗️ Build & Test

### Step 4: Test Production Build
- [ ] Run: `npm run build`
- [ ] Check for any errors (should be 0 errors)
- [ ] Run: `npm start`
- [ ] Test app functionality:
  - [ ] Browse games
  - [ ] Search works
  - [ ] Settings accessible
  - [ ] Can navigate around

### Step 5: Clean Release Folder
```powershell
Remove-Item d:\fitgirlresteam\release -Recurse -Force -ErrorAction SilentlyContinue
```
- [ ] Confirm release folder is deleted

## 🚀 First Release

### Step 6: Set GitHub Token
```powershell
$env:GH_TOKEN='ghp_your_token_here'
```
Replace `ghp_your_token_here` with the token you generated earlier.

**Options:**
- **Session only** (what's above - set each time)
- **Persistent** (set once):
  ```powershell
  [Environment]::SetEnvironmentVariable("GH_TOKEN", "ghp_...", "User")
  ```

### Step 7: Build and Publish
- [ ] Run: `npm run package`
- [ ] Wait for build to complete (2-3 minutes)
- [ ] Should see output: "Building target=nsis file=release\FitGirl Resteam Setup 1.0.0.exe"
- [ ] No errors reported

### Step 8: Verify Release Created
- [ ] Go to: `https://github.com/YOUR-USERNAME/fitgirl-resteam/releases`
- [ ] Should see release `v1.0.0` created
- [ ] Should see 3 files uploaded:
  - [ ] `FitGirl Resteam Setup 1.0.0.exe`
  - [ ] `FitGirl Resteam 1.0.0.exe`
  - [ ] `FitGirl Resteam Setup 1.0.0.exe.blockmap`

## ✨ Post-Release

### Step 9: Test the Installer
- [ ] Download `FitGirl Resteam Setup 1.0.0.exe` from GitHub
- [ ] Install it (run installer)
- [ ] Launch the app
- [ ] App should check for updates automatically
- [ ] Should show "You're up to date!"

### Step 10: Test Portable Version
- [ ] Download `FitGirl Resteam 1.0.0.exe` from GitHub
- [ ] Run it directly (no install needed)
- [ ] Verify app works

### Step 11: Git Setup (Optional but Recommended)
```powershell
cd d:\fitgirlresteam
git init
git add .
git commit -m "Initial release v1.0.0"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/fitgirl-resteam.git
git push -u origin main
git tag v1.0.0
git push origin v1.0.0
```
- [ ] All git commands executed successfully

## 🎯 Future Releases (v1.1.0 and beyond)

### To Release v1.1.0:

1. **Update version:**
   ```powershell
   # Edit package.json
   "version": "1.1.0"
   ```

2. **Test locally:**
   ```powershell
   npm run build
   npm start
   # Test app thoroughly
   ```

3. **Commit and tag (if using git):**
   ```powershell
   git add .
   git commit -m "Release v1.1.0: Add new feature"
   git tag v1.1.0
   git push origin main
   git push origin v1.1.0
   ```

4. **Publish:**
   ```powershell
   $env:GH_TOKEN='your-token'
   npm run package
   ```

5. **Verify:** Check GitHub Releases page for v1.1.0

## 📋 Troubleshooting

### Build fails with "Cannot find token"
- [ ] Token not set: `$env:GH_TOKEN='...'`
- [ ] Token invalid: Regenerate at https://github.com/settings/tokens
- [ ] Token missing scope: Regenerate with `public_repo` scope

### Build succeeds but no GitHub release created
- [ ] Check `owner` in package.json matches your username exactly
- [ ] Check `repo` matches your repository name exactly
- [ ] Try running again with a fresh token

### Already created release but need to update it
- GitHub doesn't allow overwriting releases
- Delete the release and re-run `npm run package`
- Or manually upload files to existing release

### App not checking for updates
- Make sure app is restarted (not just closed, actually quit)
- Check GitHub Releases page exists with your release
- Check version in GitHub matches package.json

## 📞 Quick Reference

**Passwords/Tokens Needed:**
- GitHub Token: `ghp_...` from https://github.com/settings/tokens

**Important URLs:**
- Your Releases: `https://github.com/YOUR-USERNAME/fitgirl-resteam/releases`
- Settings: https://github.com/settings/tokens
- Your Repos: https://github.com/new

**Common Commands:**
```powershell
npm run build              # Build locally
npm start                  # Test in Electron
$env:GH_TOKEN='...'       # Set token
npm run package            # Build + publish
```

## ✅ Final Checklist

- [ ] GitHub repo created
- [ ] GitHub token generated and copied
- [ ] package.json updated with username
- [ ] Local build tests pass
- [ ] First release published to GitHub
- [ ] Files uploaded successfully
- [ ] Installer tested and works
- [ ] Portable .exe tested and works

🎉 **You're ready to ship!**

See [AUTO_UPDATES.md](AUTO_UPDATES.md) for more details and [RELEASE_WORKFLOW.md](RELEASE_WORKFLOW.md) for quick commands.
