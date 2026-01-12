# FitGirl Resteam

A Steam-like game library manager for FitGirl Repacks with built-in torrent client, game library management, and automatic installation tracking.

## Features

- 🎮 **Steam-like Interface** - Modern, dark-themed UI inspired by Steam
- 📚 **Game Library** - Browse 7,000+ FitGirl Repack games
- 🌐 **Live Catalog Updates** - Automatically checks for new games on startup
- ⬇️ **Built-in Torrent Client** - Download games directly through the app
- 📊 **Download Management** - Queue system, pause/resume, speed limits
- 🎯 **Installation Tracking** - Track installed games and playtime
- 🚀 **Game Launcher** - Launch games directly from your library
- ⚙️ **Multiple Launch Options** - Support for different game executables (x86/x64, etc.)
- 📈 **Playtime Tracking** - Automatically track how long you play each game
- 🔍 **Search & Filter** - Find games by name, genre, size

## Technology Stack

- **Electron** - Desktop app framework
- **React + TypeScript** - UI framework
- **Ant Design** - UI component library (Steam-themed)
- **WebTorrent** - Built-in torrent client
- **SQLite (better-sqlite3)** - Local database
- **Cheerio + Axios** - Web scraping

## Prerequisites

- Node.js 18+ and npm
- Windows 10/11 (primary target platform)
- ~2GB free disk space for app data and cache

## Installation

### 1. Clone and Install Dependencies

\`\`\`powershell
cd d:\\fitgirlresteam
npm install
\`\`\`

### 2. Generate Pre-scraped Database (Optional)

**Note:** The app will work without a pre-scraped database, but will start with an empty catalog and update on first run.

To generate a full database with all ~7,000 games:

\`\`\`powershell
# This will take 3-4 hours!
npm run scrape:initial
\`\`\`

This creates `resources/games.db` which will be bundled with the app.

### 3. Development

\`\`\`powershell
# Start development mode (hot reload)
npm run dev

# In another terminal, start Electron
npm start
\`\`\`

### 4. Build for Production

\`\`\`powershell
# Build the app
npm run build

# Package as Windows installer
npm run package
\`\`\`

The installer will be in the `release/` directory.

## Auto-Updates

FitGirl Resteam includes automatic update support. Users will receive notifications when new versions are available.

### Publishing Updates

1. **Setup GitHub (First Time Only)**
   - Create repository: https://github.com/new
   - Create token: https://github.com/settings/tokens/new
   - Update `package.json` with your GitHub username

2. **Release New Version**
   ```powershell
   # Update version in package.json
   $env:GH_TOKEN='your-github-token'
   npm run package
   ```

3. **Done!** Users get automatic notifications

**See [AUTO_UPDATES.md](AUTO_UPDATES.md) for complete setup guide and [RELEASE_WORKFLOW.md](RELEASE_WORKFLOW.md) for quick commands.**

## Project Structure

\`\`\`
d:\\fitgirlresteam\\
├── src/
│   ├── main/                  # Electron main process
│   │   ├── database/          # SQLite database service
│   │   ├── scraper/           # Web scraper for fitgirl-repacks.site
│   │   ├── torrent/           # WebTorrent manager
│   │   ├── launcher/          # Game launcher & process tracking
│   │   └── index.ts           # Main process entry & IPC handlers
│   ├── renderer/              # React UI
│   │   ├── views/             # Main views (Library, Browse, Downloads, Settings)
│   │   ├── components/        # Reusable React components
│   │   ├── contexts/          # React context providers
│   │   ├── theme.ts           # Ant Design theme configuration
│   │   └── App.tsx            # Main React app component
│   ├── preload/               # Electron preload script (IPC bridge)
│   └── shared/                # Shared types between main/renderer
├── resources/                 # App resources
│   └── games.db               # Pre-scraped game database (optional)
├── webpack.*.config.js        # Webpack configurations
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
\`\`\`

## Usage

### First Run

On first launch, the app will guide you through:

1. **Choose Install Directories** - Select one or more folders where games will be installed
2. **Seeding Preference** - Choose whether to seed torrents after downloads complete
3. **Catalog Update** - App checks for new games (checks last 5 pages)

### Browsing Games

- Navigate to **Browse** to see all available games
- Use the search bar to find specific games
- Click **Download** to add a game to the download queue

### Downloads

- **Downloads** view shows active and completed downloads
- Only 1 download active at a time (queue system)
- Pause/resume/cancel downloads
- Set speed limits in Settings

### Installation

After a download completes:

1. Click **Install** button
2. The app launches the FitGirl installer
3. Complete the installation through the installer
4. Click "Installation Complete?" when done
5. Browse for the game's .exe file
6. The download folder is automatically deleted

### Playing Games

- **Library** view shows all installed games
- Click **Play** to launch a game
- Playtime is automatically tracked
- Add multiple launch options (x86/x64, DirectX/Vulkan, etc.)

## Configuration

### Settings

- **Install Directories** - Manage where games are installed
- **Seeding** - Toggle automatic seeding after downloads
- **Speed Limits** - Set download/upload speed limits (MB/s)
- **Updates** - Enable/disable automatic catalog updates on startup

### File Locations

- **App Data:** `C:\\Users\\[Username]\\AppData\\Roaming\\FitGirlResteam\\`
- **Database:** `AppData\\Roaming\\FitGirlResteam\\games.db`
- **Downloads:** `C:\\FitGirlRepacks\\Downloads\\[GameName]\\`
- **Image Cache:** `AppData\\Roaming\\FitGirlResteam\\images\\`

## Development Notes

### Adding Features

The codebase is organized for extensibility:

- **IPC Handlers:** Add new handlers in `src/main/index.ts`
- **Database Schema:** Modify `src/main/database/schema.sql`
- **UI Components:** Add views in `src/renderer/views/`
- **Shared Types:** Update `src/shared/types.ts`

### Scraper Customization

Edit `src/main/scraper/GameScraper.ts` to:
- Adjust rate limiting (default 1.5s between requests)
- Modify HTML selectors if site structure changes
- Add new metadata fields

### Torrent Configuration

Edit `src/main/torrent/TorrentManager.ts` to:
- Change max connections (`maxConns: 55`)
- Adjust default speed limits
- Modify seeding behavior

## Troubleshooting

### "No games found" on Browse

- The app starts with an empty database
- Wait for initial catalog update to complete
- Or run `npm run scrape:initial` to pre-populate

### Downloads not starting

- Check that the magnet link is valid
- Ensure no firewall is blocking torrent traffic
- Check torrent tracker status

### Game won't launch

- Verify the .exe path is correct
- Check that game is properly installed
- Add multiple launch options and try different ones

### Installer not detected

- Manually open the download folder (button in Downloads view)
- Look for `setup.exe` or `installer.exe`
- Run it manually if auto-detection fails

## Building from Source

\`\`\`powershell
# Install dependencies
npm install

# Build TypeScript
npm run build

# Package for Windows
npm run package
\`\`\`

Installer will be in: `release/FitGirl Resteam Setup X.X.X.exe`

## Contributing

This is a personal project for managing FitGirl Repacks. Feel free to fork and modify for your own use.

For contributing guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

### Known Limitations

- Windows-only (primary target)
- Depends on fitgirl-repacks.site structure (scraper may break if site changes)
- Single download at a time (by design)

## Documentation

- **[FIRST_RELEASE_GUIDE.md](FIRST_RELEASE_GUIDE.md)** - Setup for first GitHub release
- **[PRODUCTION_BUILD.md](PRODUCTION_BUILD.md)** - Building production installers
- **[AUTO_UPDATES.md](AUTO_UPDATES.md)** - Auto-update configuration
- **[RELEASE_WORKFLOW.md](RELEASE_WORKFLOW.md)** - Quick release commands
- **[FEATURE_COMPLETE.md](FEATURE_COMPLETE.md)** - Feature inventory

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This tool is designed to help manage FitGirl Repack installations. Always respect copyright and distribution rights of game content. This project is not affiliated with FitGirl or any game publishers.
- No built-in game updates (manual re-download required)

## License

MIT License - See LICENSE file for details

## Disclaimer

This application is a tool for managing game repacks from fitgirl-repacks.site. It does not host, distribute, or provide any game files. Users are responsible for ensuring they have the legal right to download and use any content.

## Credits

- **FitGirl Repacks** - For the game repacks (https://fitgirl-repacks.site/)
- **Electron** - Application framework
- **WebTorrent** - Torrent client
- **Ant Design** - UI components

---

Made with ❤️ for the FitGirl Repacks community
\`\`\`
