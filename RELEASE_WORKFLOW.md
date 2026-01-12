# FitGirl Resteam - Quick Release Workflow

## ⚡ Quick Start

### First Time Setup
```powershell
# 1. Create GitHub repo: https://github.com/new
# 2. Create GitHub token: https://github.com/settings/tokens/new
# 3. Set token (one-time per session):
$env:GH_TOKEN='ghp_xxxxxxxxxxxxx'

# 4. Update package.json with your GitHub username:
# "owner": "your-username"

# 5. Build and publish:
npm run package
```

### Release New Version

**Quick Command:**
```powershell
$env:GH_TOKEN='your-token'
npm run package
```

**Full Workflow (Recommended):**

```powershell
# 1. Update version
# Edit package.json: "version": "1.1.0"

# 2. Rebuild
npm run build

# 3. Test the build
npm start

# 4. Commit version bump
git add package.json
git commit -m "Bump version to 1.1.0"

# 5. Create tag
git tag v1.1.0
git push origin main
git push origin v1.1.0

# 6. Build and publish
$env:GH_TOKEN='your-token'
npm run package
```

## 📦 What Gets Published

The `npm run package` command creates:

- **FitGirl Resteam Setup 1.1.0.exe** - Windows installer (NSIS)
- **FitGirl Resteam 1.1.0.exe** - Portable standalone
- **FitGirl Resteam Setup 1.1.0.exe.blockmap** - Update metadata

All automatically uploaded to GitHub Releases.

## 🔍 Check Release Status

### Verify on GitHub
1. Go to your repo: `https://github.com/your-username/fitgirl-resteam`
2. Click "Releases" tab
3. Should see `v1.1.0` with uploaded files

### Verify in App
1. Run the app
2. It will check for updates automatically
3. Check: Settings → About → Check for Updates

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot find release" | Check `owner` in package.json matches username |
| Build fails | Run `npm run build` separately to debug |
| Token invalid | Regenerate at https://github.com/settings/tokens |
| Very old version shown | Clear cache: `Remove-Item "$env:APPDATA\Local\electron-builder\Cache" -Recurse` |

## 📝 Version Numbering

Use [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH
  1  .  0  .  0

1.0.0 → Initial release
1.1.0 → New features (backward compatible)
1.1.1 → Bug fix
2.0.0 → Breaking changes
```

## 🔐 Secure Token Setup (Recommended)

**Set token once in your system:**

```powershell
# PowerShell (Admin):
[Environment]::SetEnvironmentVariable("GH_TOKEN", "ghp_...", "User")
```

Then just run:
```powershell
npm run package
```

No need to set token every session!

## 📤 Manual Publish (If Auto-Publish Fails)

```powershell
# Build first
npm run package

# Then manually upload to: https://github.com/your-username/fitgirl-resteam/releases/new
# Tag: v1.1.0
# Title: Version 1.1.0
# Files to upload from release/ folder:
#   - FitGirl Resteam Setup 1.1.0.exe
#   - FitGirl Resteam 1.1.0.exe
#   - FitGirl Resteam Setup 1.1.0.exe.blockmap
```

## 🎯 Common Commands

```powershell
# Development
npm run dev          # Start dev server with hot reload
npm start            # Run dev build in Electron

# Production
npm run build        # Build all 3 stages (main/preload/renderer)
npm run build:main   # Build main process only
npm run package      # Full build + create installers + publish

# Utilities
npm run scrape:initial    # Update game database from web

# Testing Updates
$env:NODE_ENV="production"
electron ./dist/main/index.js
```

## 📋 Checklist Before Release

- [ ] All tests passing
- [ ] Updated package.json version
- [ ] Updated CHANGELOG or release notes
- [ ] Committed all changes
- [ ] Created git tag
- [ ] GH_TOKEN environment variable set
- [ ] `npm run package` completed successfully
- [ ] Verified on GitHub Releases page

## 📚 Related Files

- **Setup Guide:** [AUTO_UPDATES.md](AUTO_UPDATES.md)
- **Build Info:** [PRODUCTION_BUILD.md](PRODUCTION_BUILD.md)
- **Features:** [FEATURE_COMPLETE.md](FEATURE_COMPLETE.md)
- **Configuration:** [package.json](package.json)

## 💡 Pro Tips

1. **Always test locally before release:**
   ```powershell
   npm run build
   npm start
   # Test the app thoroughly
   ```

2. **Keep releases organized:**
   - Use descriptive release notes
   - Include what's new, what's fixed, what changed

3. **Monitor user feedback:**
   - Check GitHub Issues for bug reports
   - GitHub Discussions for feature requests

4. **Update frequently:**
   - Small, frequent releases are better than rare big ones
   - Users get fixes faster

---

**Need more help?** See [AUTO_UPDATES.md](AUTO_UPDATES.md) for detailed setup instructions.
