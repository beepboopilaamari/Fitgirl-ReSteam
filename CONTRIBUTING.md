# Contributing to FitGirl Resteam

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

Please be respectful and inclusive in all interactions.

## Getting Started

### 1. Fork and Clone
```bash
git clone https://github.com/YOUR-USERNAME/fitgirl-resteam.git
cd fitgirl-resteam
```

### 2. Install Dependencies
```powershell
npm install
```

### 3. Start Development
```powershell
npm run dev
# In another terminal:
npm start
```

## Making Changes

### Branch Naming
- `feature/` - New features (e.g., `feature/playtime-tracking`)
- `fix/` - Bug fixes (e.g., `fix/download-crash`)
- `docs/` - Documentation updates

### Commit Messages
Use clear, descriptive commit messages:
- ✅ `"Add playtime tracking feature"`
- ✅ `"Fix download progress calculation"`
- ❌ `"Fix stuff"` or `"Update"`

### Code Style
- Use TypeScript for type safety
- Follow existing code patterns
- Format with Prettier: `npm run format` (if available)
- No console.log in production code (use electron-log instead)

## Testing

### Before Submitting a PR

1. **Build successfully:**
   ```powershell
   npm run build
   ```

2. **Test in dev:**
   ```powershell
   npm start
   ```

3. **Test key features:**
   - Browse games
   - Search functionality
   - Download a game
   - Launch a game
   - Check settings

### Database Changes
If modifying the database schema:
1. Update `src/main/database/schema.sql`
2. Add migration in `DatabaseService.ts`
3. Test with: `npm run scrape:initial` (to rebuild)

## Project Structure

```
src/
├── main/                    # Electron main process
│   ├── database/           # SQLite & data management
│   ├── scraper/            # FitGirl site scraping
│   ├── torrent/            # Download management
│   └── launcher/           # Game execution
├── renderer/               # React UI components
│   ├── views/             # Page-level components
│   ├── components/        # Reusable components
│   └── contexts/          # State management
├── preload/               # IPC bridge
└── shared/                # Shared types
```

## Feature Development

### Adding a New Feature

1. **Create issue** - Describe what you want to add
2. **Create branch** - `feature/your-feature-name`
3. **Make changes** - Update code, tests, docs
4. **Build & test** - `npm run build && npm start`
5. **Commit & push** - Push to your fork
6. **Create PR** - Link to issue, describe changes

### Database Feature Example
```typescript
// 1. Update schema (src/main/database/schema.sql)
ALTER TABLE games ADD COLUMN new_field TEXT;

// 2. Add migration (src/main/database/DatabaseService.ts)
private initializeDatabase() {
  // ... add migration code
}

// 3. Add IPC handler (src/main/index.ts)
ipcMain.handle('get-new-field', async () => {
  // Handle request
});

// 4. Expose in preload (src/preload/preload.ts)
getNewField: () => ipcRenderer.invoke('get-new-field'),

// 5. Use in UI (src/renderer/views/*.tsx)
const data = await window.electronAPI?.getNewField?.();
```

## Pull Request Process

1. **Update documentation** - README, guides, code comments
2. **Test thoroughly** - Verify no regressions
3. **Describe changes** - Clear PR description with issue link
4. **Link issues** - "Closes #123"
5. **Wait for review** - Address feedback if any

### PR Title Format
- ✅ `"Add feature: playtime tracking"`
- ✅ `"Fix: prevent downloads crash"`
- ✅ `"Docs: update README with examples"`

## Reporting Issues

### Bug Report
Include:
- **What happened:** Clear description
- **Steps to reproduce:** How to trigger the bug
- **Expected behavior:** What should happen
- **Actual behavior:** What actually happened
- **Environment:** Windows version, app version
- **Screenshots/logs:** If applicable

### Feature Request
Include:
- **What you want:** Clear description
- **Why:** Motivation/use case
- **Suggested implementation:** If you have ideas

## Development Tools

### Building
```powershell
npm run build              # Full build
npm run build:main         # Main process only
npm run build:renderer     # UI only
npm run build:preload      # Preload bridge only
```

### Testing & Debugging
```powershell
npm start                  # Run in dev
npm run dev                # Dev with hot reload
npm run package            # Create production installer
```

### Database
```powershell
# Query database directly
sqlite3 "$env:APPDATA\fitgirl-resteam\games.db"
```

## Documentation

- **Setup:** [FIRST_RELEASE_GUIDE.md](FIRST_RELEASE_GUIDE.md)
- **Building:** [PRODUCTION_BUILD.md](PRODUCTION_BUILD.md)
- **Updates:** [AUTO_UPDATES.md](AUTO_UPDATES.md)
- **Features:** [FEATURE_COMPLETE.md](FEATURE_COMPLETE.md)

## Release Process

1. Update version in `package.json`
2. Update [CHANGELOG.md](CHANGELOG.md) (if it exists)
3. Create PR with release notes
4. Merge to main
5. Tag release: `git tag vX.Y.Z`
6. Publish: See [RELEASE_WORKFLOW.md](RELEASE_WORKFLOW.md)

## Getting Help

- **Documentation:** Check the .md files in root directory
- **GitHub Issues:** Search existing issues
- **Code Examples:** Look at similar features

## Code of Conduct

This project is inclusive and welcomes contributors of all backgrounds. 

- Be respectful and constructive
- Assume good intent
- Provide helpful feedback
- No harassment, discrimination, or hate speech

Violations may result in removal from the project.

---

Thank you for contributing! 🎉
