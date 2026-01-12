import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { Game, Installation, LaunchOption, Download, AppSettings } from '../../shared/types';

export class DatabaseService {
  private db: Database.Database;
  private userDataPath: string;

  constructor(dbPath?: string) {
    this.userDataPath = app.getPath('userData');
    const finalDbPath = dbPath || path.join(this.userDataPath, 'games.db');
    
    // Ensure directory exists
    const dir = path.dirname(finalDbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Log database file path for debugging
    console.log(`[DatabaseService] Using database at: ${finalDbPath}`);
    this.db = new Database(finalDbPath);
    this.db.pragma('journal_mode = WAL');
    this.initialize();
  }

  private initialize(): void {
    const schemaPath = path.join(__dirname, 'schema.sql');
    let schema: string;

    try {
      schema = fs.readFileSync(schemaPath, 'utf-8');
    } catch (error) {
      // Fallback: inline schema if file doesn't exist
      schema = this.getInlineSchema();
    }

    this.db.exec(schema);
    
    // Migration: Add run_as_admin column if it doesn't exist
    try {
      this.db.exec(`
        ALTER TABLE launch_options ADD COLUMN run_as_admin INTEGER DEFAULT 1;
      `);
      console.log('[DatabaseService] Added run_as_admin column to launch_options table');
    } catch (error: any) {
      // Column already exists, ignore
      if (!error.message?.includes('duplicate column name')) {
        console.error('[DatabaseService] Migration error:', error);
      }
    }
    
    // Migration: Add uninstall_exe_path column if it doesn't exist
    try {
      this.db.exec(`
        ALTER TABLE installations ADD COLUMN uninstall_exe_path TEXT;
      `);
      console.log('[DatabaseService] Added uninstall_exe_path column to installations table');
    } catch (error: any) {
      // Column already exists, ignore
      if (!error.message?.includes('duplicate column name')) {
        console.error('[DatabaseService] Migration error:', error);
      }
    }
    
    // Add new columns for enhanced features
    this.runMigrations();
    
    // Create new tables for enhanced features
    this.createEnhancedTables();
  }
  
  private runMigrations(): void {
    const migrations = [
      // Installation enhancements
      `ALTER TABLE installations ADD COLUMN is_favorite INTEGER DEFAULT 0`,
      `ALTER TABLE installations ADD COLUMN user_rating INTEGER`,
      `ALTER TABLE installations ADD COLUMN user_notes TEXT`,
      `ALTER TABLE installations ADD COLUMN completion_status TEXT DEFAULT 'not_started'`,
      `ALTER TABLE installations ADD COLUMN install_size_bytes INTEGER`,
      
      // Launch option enhancements  
      `ALTER TABLE launch_options ADD COLUMN launch_arguments TEXT`,
      `ALTER TABLE launch_options ADD COLUMN pre_launch_script TEXT`,
      `ALTER TABLE launch_options ADD COLUMN post_launch_script TEXT`,
      
      // Download enhancements
      `ALTER TABLE downloads ADD COLUMN date_completed TEXT`,
      `ALTER TABLE downloads ADD COLUMN priority INTEGER DEFAULT 0`
    ];
    
    for (const migration of migrations) {
      try {
        this.db.exec(migration);
      } catch (error: any) {
        if (!error.message?.includes('duplicate column name')) {
          console.error('[DatabaseService] Migration error:', error.message);
        }
      }
    }
  }
  
  private createEnhancedTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        color TEXT,
        date_created TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS collection_games (
        collection_id INTEGER NOT NULL,
        installation_id INTEGER NOT NULL,
        PRIMARY KEY (collection_id, installation_id),
        FOREIGN KEY(collection_id) REFERENCES collections(id) ON DELETE CASCADE,
        FOREIGN KEY(installation_id) REFERENCES installations(id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS playtime_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        installation_id INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        FOREIGN KEY(installation_id) REFERENCES installations(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_playtime_sessions_installation ON playtime_sessions(installation_id);
      CREATE INDEX IF NOT EXISTS idx_playtime_sessions_start_time ON playtime_sessions(start_time);
      
      CREATE TABLE IF NOT EXISTS download_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        download_id INTEGER,
        status TEXT NOT NULL,
        date_started TEXT NOT NULL,
        date_completed TEXT,
        total_bytes INTEGER DEFAULT 0,
        avg_download_speed REAL DEFAULT 0,
        total_time_seconds INTEGER DEFAULT 0,
        FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_download_history_game_id ON download_history(game_id);
    `);
  }

  private getInlineSchema(): string {
    return `
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        version TEXT,
        original_size_mb INTEGER,
        repack_size_mb INTEGER,
        magnet_link TEXT,
        page_url TEXT UNIQUE NOT NULL,
        cover_image_url TEXT,
        description TEXT,
        genres TEXT,
        companies TEXT,
        languages TEXT,
        date_added TEXT DEFAULT CURRENT_TIMESTAMP,
        last_scraped TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);
      CREATE INDEX IF NOT EXISTS idx_games_slug ON games(slug);
      CREATE INDEX IF NOT EXISTS idx_games_date_added ON games(date_added);
      
      CREATE TABLE IF NOT EXISTS installations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        install_path TEXT NOT NULL,
        date_installed TEXT DEFAULT CURRENT_TIMESTAMP,
        total_playtime_seconds INTEGER DEFAULT 0,
        last_played TEXT,
        FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_installations_game_id ON installations(game_id);
      
      CREATE TABLE IF NOT EXISTS launch_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        installation_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        exe_path TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        run_as_admin INTEGER DEFAULT 1,
        FOREIGN KEY(installation_id) REFERENCES installations(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_launch_options_installation_id ON launch_options(installation_id);
      
      -- Add run_as_admin column if it doesn't exist (migration)
      PRAGMA table_info(launch_options);
      
      CREATE TABLE IF NOT EXISTS downloads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        magnet_link TEXT NOT NULL,
        status TEXT NOT NULL,
        progress REAL DEFAULT 0,
        download_speed REAL DEFAULT 0,
        upload_speed REAL DEFAULT 0,
        peers INTEGER DEFAULT 0,
        downloaded_bytes INTEGER DEFAULT 0,
        total_bytes INTEGER DEFAULT 0,
        eta_seconds INTEGER DEFAULT 0,
        download_path TEXT NOT NULL,
        date_started TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_downloads_game_id ON downloads(game_id);
      CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
      
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS image_cache (
        game_slug TEXT PRIMARY KEY,
        local_path TEXT NOT NULL,
        source_url TEXT NOT NULL,
        cached_date TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;
  }

  // ==================== GAMES ====================
  
  insertGame(game: Omit<Game, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO games (title, slug, version, original_size_mb, repack_size_mb, magnet_link, page_url, cover_image_url, description, genres, companies, languages, date_added, last_scraped)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      game.title,
      game.slug,
      game.version,
      game.original_size_mb,
      game.repack_size_mb,
      game.magnet_link,
      game.page_url,
      game.cover_image_url,
      game.description,
      JSON.stringify(game.genres),
      game.companies,
      game.languages,
      game.date_added,
      game.last_scraped
    );
    
    return result.lastInsertRowid as number;
  }

  // ==================== SCRAPER PROGRESS ====================
  
  getScraperProgress(): { last_page: number; last_scrape_date: string } | null {
    const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
    const result = stmt.get('scraper_progress') as { value: string } | undefined;
    
    if (result) {
      return JSON.parse(result.value);
    }
    return null;
  }
  
  setScraperProgress(lastPage: number): void {
    const progress = {
      last_page: lastPage,
      last_scrape_date: new Date().toISOString()
    };
    
    const stmt = this.db.prepare(`
      INSERT INTO settings (key, value)
      VALUES ('scraper_progress', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    
    stmt.run(JSON.stringify(progress));
  }
  
  resetScraperProgress(): void {
    const stmt = this.db.prepare('DELETE FROM settings WHERE key = ?');
    stmt.run('scraper_progress');
  }

  getGameById(id: number): Game | null {
    const stmt = this.db.prepare('SELECT * FROM games WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.parseGame(row) : null;
  }

  getGameBySlug(slug: string): Game | null {
    const stmt = this.db.prepare('SELECT * FROM games WHERE slug = ?');
    const row = stmt.get(slug) as any;
    return row ? this.parseGame(row) : null;
  }

  getAllGames(limit?: number, offset?: number): Game[] {
    let query = 'SELECT * FROM games ORDER BY date_added ASC';
    if (limit) {
      query += ` LIMIT ${limit}`;
      if (offset) {
        query += ` OFFSET ${offset}`;
      }
    }
    const stmt = this.db.prepare(query);
    const rows = stmt.all() as any[];
    return rows.map(row => this.parseGame(row));
  }

  searchGames(searchTerm: string, filters?: { genres?: string[]; minSize?: number; maxSize?: number }): Game[] {
    let query = 'SELECT * FROM games WHERE title LIKE ?';
    const params: any[] = [`%${searchTerm}%`];

    if (filters?.minSize) {
      query += ' AND repack_size_mb >= ?';
      params.push(filters.minSize);
    }

    if (filters?.maxSize) {
      query += ' AND repack_size_mb <= ?';
      params.push(filters.maxSize);
    }

    query += ' ORDER BY date_added DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    let games = rows.map(row => this.parseGame(row));

    // Filter by genres if provided
    if (filters?.genres && filters.genres.length > 0) {
      games = games.filter(game => 
        filters.genres!.some(genre => game.genres.includes(genre))
      );
    }

    return games;
  }

  updateGame(id: number, updates: Partial<Game>): void {
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) return;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => {
      const val = (updates as any)[f];
      return f === 'genres' && Array.isArray(val) ? JSON.stringify(val) : val;
    });

    const stmt = this.db.prepare(`UPDATE games SET ${setClause} WHERE id = ?`);
    stmt.run(...values, id);
  }

  getGamesCount(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM games');
    const result = stmt.get() as { count: number };
    return result.count;
  }

  private parseGame(row: any): Game {
    return {
      ...row,
      genres: row.genres ? JSON.parse(row.genres) : []
    };
  }

  // ==================== INSTALLATIONS ====================

  insertInstallation(installation: Omit<Installation, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO installations (game_id, install_path, date_installed, total_playtime_seconds, last_played)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      installation.game_id,
      installation.install_path,
      installation.date_installed,
      installation.total_playtime_seconds,
      installation.last_played
    );
    
    return result.lastInsertRowid as number;
  }

  getInstallationById(id: number): Installation | null {
    const stmt = this.db.prepare(`
      SELECT i.*, g.* FROM installations i
      LEFT JOIN games g ON i.game_id = g.id
      WHERE i.id = ?
    `);
    const row = stmt.get(id) as any;
    return row ? this.parseInstallation(row) : null;
  }

  getInstallationByGameId(gameId: number): Installation | null {
    const stmt = this.db.prepare(`
      SELECT i.*, g.* FROM installations i
      LEFT JOIN games g ON i.game_id = g.id
      WHERE i.game_id = ?
    `);
    const row = stmt.get(gameId) as any;
    return row ? this.parseInstallation(row) : null;
  }

  getAllInstallations(): Installation[] {
    const stmt = this.db.prepare(`
      SELECT 
        i.id as installation_id,
        i.game_id,
        i.install_path,
        i.date_installed,
        i.total_playtime_seconds,
        i.last_played,
        g.*
      FROM installations i
      LEFT JOIN games g ON i.game_id = g.id
      ORDER BY i.last_played DESC NULLS LAST, i.date_installed DESC
    `);
    const rows = stmt.all() as any[];
    return rows.map(row => {
      const installation = this.parseInstallation(row);
      installation.id = row.installation_id; // Ensure we use the installation ID, not game ID
      return installation;
    });
  }

  updateInstallation(id: number, updates: Partial<Installation>): void {
    const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'game');
    if (fields.length === 0) return;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => (updates as any)[f]);

    const stmt = this.db.prepare(`UPDATE installations SET ${setClause} WHERE id = ?`);
    stmt.run(...values, id);
  }

  deleteInstallation(id: number): void {
    const stmt = this.db.prepare('DELETE FROM installations WHERE id = ?');
    stmt.run(id);
  }

  private parseInstallation(row: any): Installation {
    const installation: Installation = {
      id: row.id,
      game_id: row.game_id,
      install_path: row.install_path,
      date_installed: row.date_installed,
      total_playtime_seconds: row.total_playtime_seconds,
      last_played: row.last_played
    };

    // Include game data if joined
    if (row.title) {
      installation.game = this.parseGame({
        id: row.game_id,
        title: row.title,
        slug: row.slug,
        version: row.version,
        original_size_mb: row.original_size_mb,
        repack_size_mb: row.repack_size_mb,
        magnet_link: row.magnet_link,
        page_url: row.page_url,
        cover_image_url: row.cover_image_url,
        description: row.description,
        genres: row.genres,
        companies: row.companies,
        languages: row.languages,
        date_added: row.date_added,
        last_scraped: row.last_scraped
      });
    }

    return installation;
  }

  // ==================== LAUNCH OPTIONS ====================

  insertLaunchOption(option: Omit<LaunchOption, 'id'>): number {
    // If this is set as default, unset other defaults for this installation
    if (option.is_default) {
      this.db.prepare('UPDATE launch_options SET is_default = 0 WHERE installation_id = ?')
        .run(option.installation_id);
    }

    const stmt = this.db.prepare(`
      INSERT INTO launch_options (installation_id, name, exe_path, is_default, run_as_admin)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      option.installation_id,
      option.name,
      option.exe_path,
      option.is_default ? 1 : 0,
      option.run_as_admin !== undefined ? (option.run_as_admin ? 1 : 0) : 1
    );
    
    return result.lastInsertRowid as number;
  }

  getLaunchOptionsByInstallation(installationId: number): LaunchOption[] {
    const stmt = this.db.prepare(`
      SELECT * FROM launch_options WHERE installation_id = ? ORDER BY is_default DESC, name ASC
    `);
    const rows = stmt.all(installationId) as any[];
    return rows.map(row => ({
      ...row,
      is_default: row.is_default === 1,
      run_as_admin: row.run_as_admin !== 0
    }));
  }

  getDefaultLaunchOption(installationId: number): LaunchOption | null {
    const stmt = this.db.prepare(`
      SELECT * FROM launch_options WHERE installation_id = ? AND is_default = 1 LIMIT 1
    `);
    const row = stmt.get(installationId) as any;
    return row ? { ...row, is_default: true, run_as_admin: row.run_as_admin !== 0 } : null;
  }

  setDefaultLaunchOption(installationId: number, optionId: number): void {
    this.db.prepare('UPDATE launch_options SET is_default = 0 WHERE installation_id = ?')
      .run(installationId);
    this.db.prepare('UPDATE launch_options SET is_default = 1 WHERE id = ?')
      .run(optionId);
  }

  deleteLaunchOption(id: number): void {
    const stmt = this.db.prepare('DELETE FROM launch_options WHERE id = ?');
    stmt.run(id);
  }

  // ==================== DOWNLOADS ====================

  insertDownload(download: Omit<Download, 'id'>): number {
    // Check current sequence before inserting
    const seqCheck = this.db.prepare('SELECT seq FROM sqlite_sequence WHERE name = ?');
    const currentSeq = seqCheck.get('downloads') as any;
    console.log(`[DatabaseService] About to insert download. Current sequence: ${currentSeq ? currentSeq.seq : 'none (will be 1)'}`);
    
    const stmt = this.db.prepare(`
      INSERT INTO downloads (game_id, magnet_link, status, progress, download_speed, upload_speed, peers, downloaded_bytes, total_bytes, eta_seconds, download_path, date_started)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      download.game_id,
      download.magnet_link,
      download.status,
      download.progress,
      download.download_speed,
      download.upload_speed,
      download.peers,
      download.downloaded_bytes,
      download.total_bytes,
      download.eta_seconds,
      download.download_path,
      download.date_started
    );
    
    const newId = result.lastInsertRowid as number;
    console.log(`[DatabaseService] Inserted download with ID: ${newId}`);
    
    return newId;
  }

  getDownloadById(id: number): Download | null {
    const stmt = this.db.prepare(`
      SELECT 
        d.id as id,
        d.game_id, d.magnet_link, d.status, d.progress,
        d.download_speed, d.upload_speed, d.peers,
        d.downloaded_bytes, d.total_bytes, d.eta_seconds,
        d.download_path, d.date_started,
        g.id as game_table_id,
        g.title, g.slug, g.version, g.original_size_mb, g.repack_size_mb,
        g.page_url, g.cover_image_url, g.description,
        g.genres, g.companies, g.languages, g.date_added, g.last_scraped
      FROM downloads d
      LEFT JOIN games g ON d.game_id = g.id
      WHERE d.id = ?
    `);
    const row = stmt.get(id) as any;
    return row ? this.parseDownload(row) : null;
  }

  getAllDownloads(): Download[] {
    const stmt = this.db.prepare(`
      SELECT 
        d.id as id,
        d.game_id, d.magnet_link, d.status, d.progress,
        d.download_speed, d.upload_speed, d.peers,
        d.downloaded_bytes, d.total_bytes, d.eta_seconds,
        d.download_path, d.date_started,
        g.id as game_table_id,
        g.title, g.slug, g.version, g.original_size_mb, g.repack_size_mb,
        g.page_url, g.cover_image_url, g.description,
        g.genres, g.companies, g.languages, g.date_added, g.last_scraped
      FROM downloads d
      LEFT JOIN games g ON d.game_id = g.id
      ORDER BY d.date_started DESC
    `);
    const rows = stmt.all() as any[];
    return rows.map(row => this.parseDownload(row));
  }

  getActiveDownloads(): Download[] {
    const stmt = this.db.prepare(`
      SELECT 
        d.id as id,
        d.game_id, d.magnet_link, d.status, d.progress,
        d.download_speed, d.upload_speed, d.peers,
        d.downloaded_bytes, d.total_bytes, d.eta_seconds,
        d.download_path, d.date_started,
        g.id as game_table_id,
        g.title, g.slug, g.version, g.original_size_mb, g.repack_size_mb,
        g.page_url, g.cover_image_url, g.description,
        g.genres, g.companies, g.languages, g.date_added, g.last_scraped
      FROM downloads d
      LEFT JOIN games g ON d.game_id = g.id
      WHERE d.status IN ('queued', 'downloading', 'paused', 'seeding')
      ORDER BY d.date_started ASC
    `);
    const rows = stmt.all() as any[];
    return rows.map(row => this.parseDownload(row));
  }

  updateDownload(id: number, updates: Partial<Download>): void {
    const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'game');
    if (fields.length === 0) return;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => (updates as any)[f]);

    const stmt = this.db.prepare(`UPDATE downloads SET ${setClause} WHERE id = ?`);
    stmt.run(...values, id);
  }

  deleteDownload(id: number): void {
    const stmt = this.db.prepare('DELETE FROM downloads WHERE id = ?');
    stmt.run(id);
  }

  clearAllDownloads(): void {
    const stmt = this.db.prepare('DELETE FROM downloads');
    const deleteResult = stmt.run();
    console.log(`[DatabaseService] Deleted ${deleteResult.changes} downloads from database`);
    
    // Reset auto-increment counter so next download starts at ID 1
    const resetStmt = this.db.prepare('DELETE FROM sqlite_sequence WHERE name = ?');
    const resetResult = resetStmt.run('downloads');
    console.log(`[DatabaseService] Reset sqlite_sequence (affected rows: ${resetResult.changes})`);
    
    // Verify it worked
    const checkStmt = this.db.prepare('SELECT seq FROM sqlite_sequence WHERE name = ?');
    const seq = checkStmt.get('downloads') as any;
    console.log(`[DatabaseService] Current sequence for downloads: ${seq ? seq.seq : 'none (will start at 1)'}`);
  }

  updateDownloadPath(id: number, downloadPath: string): void {
    const stmt = this.db.prepare('UPDATE downloads SET download_path = ? WHERE id = ?');
    stmt.run(downloadPath, id);
  }

  private parseDownload(row: any): Download {
    const download: Download = {
      id: row.id,
      game_id: row.game_id,
      magnet_link: row.magnet_link,
      status: row.status,
      progress: row.progress,
      download_speed: row.download_speed,
      upload_speed: row.upload_speed,
      peers: row.peers,
      downloaded_bytes: row.downloaded_bytes,
      total_bytes: row.total_bytes,
      eta_seconds: row.eta_seconds,
      download_path: row.download_path,
      date_started: row.date_started
    };

    // Include game data if joined
    if (row.title) {
      download.game = this.parseGame({
        id: row.game_id,
        title: row.title,
        slug: row.slug,
        version: row.version,
        original_size_mb: row.original_size_mb,
        repack_size_mb: row.repack_size_mb,
        magnet_link: row.magnet_link,
        page_url: row.page_url,
        cover_image_url: row.cover_image_url,
        description: row.description,
        genres: row.genres,
        companies: row.companies,
        languages: row.languages,
        date_added: row.date_added,
        last_scraped: row.last_scraped
      });
    }

    return download;
  }

  // ==================== SETTINGS ====================

  getSetting(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;
    return row?.value || null;
  }

  setSetting(key: string, value: string): void {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    stmt.run(key, value);
  }

  getSettings(): AppSettings {
    const installDirs = this.getSetting('install_directories');
    const defaultDir = this.getSetting('default_install_directory');
    const seedDefault = this.getSetting('seed_by_default');
    const downloadLimit = this.getSetting('download_speed_limit_mbps');
    const uploadLimit = this.getSetting('upload_speed_limit_mbps');
    const checkUpdates = this.getSetting('check_updates_on_startup');
    const firstRun = this.getSetting('first_run_complete');
    const lastUpdate = this.getSetting('last_catalog_update');

    return {
      install_directories: installDirs ? JSON.parse(installDirs) : [],
      default_install_directory: defaultDir,
      seed_by_default: seedDefault === 'true',
      download_speed_limit_mbps: downloadLimit ? parseInt(downloadLimit) : 0,
      upload_speed_limit_mbps: uploadLimit ? parseInt(uploadLimit) : 0,
      check_updates_on_startup: checkUpdates !== 'false',
      first_run_complete: firstRun === 'true',
      last_catalog_update: lastUpdate,
      // Theme
      accent_color: this.getSetting('accent_color') || '#6ddcff',
      glassmorphism_intensity: parseInt(this.getSetting('glassmorphism_intensity') || '100'),
      // Download behavior
      max_concurrent_downloads: parseInt(this.getSetting('max_concurrent_downloads') || '3'),
      auto_seed_after_download: this.getSetting('auto_seed_after_download') !== 'false',
      bandwidth_schedule_enabled: this.getSetting('bandwidth_schedule_enabled') === 'true',
      // Library
      library_view_mode: (this.getSetting('library_view_mode') || 'grid') as any,
      library_sort_by: (this.getSetting('library_sort_by') || 'name') as any,
      library_sort_order: (this.getSetting('library_sort_order') || 'asc') as any,
      library_card_size: (this.getSetting('library_card_size') || 'medium') as any,
      // Notifications
      notifications_enabled: this.getSetting('notifications_enabled') !== 'false',
      notify_on_download_complete: this.getSetting('notify_on_download_complete') !== 'false',
      notify_on_update_available: this.getSetting('notify_on_update_available') !== 'false',
      // Storage
      auto_cleanup_temp_files: this.getSetting('auto_cleanup_temp_files') === 'true'
    };
  }

  updateSettings(settings: Partial<AppSettings>): void {
    const settingsMap: Array<[string, any]> = [
      ['install_directories', settings.install_directories !== undefined ? JSON.stringify(settings.install_directories) : undefined],
      ['default_install_directory', settings.default_install_directory],
      ['seed_by_default', settings.seed_by_default !== undefined ? String(settings.seed_by_default) : undefined],
      ['download_speed_limit_mbps', settings.download_speed_limit_mbps !== undefined ? String(settings.download_speed_limit_mbps) : undefined],
      ['upload_speed_limit_mbps', settings.upload_speed_limit_mbps !== undefined ? String(settings.upload_speed_limit_mbps) : undefined],
      ['check_updates_on_startup', settings.check_updates_on_startup !== undefined ? String(settings.check_updates_on_startup) : undefined],
      ['first_run_complete', settings.first_run_complete !== undefined ? String(settings.first_run_complete) : undefined],
      ['last_catalog_update', settings.last_catalog_update],
      ['accent_color', settings.accent_color],
      ['glassmorphism_intensity', settings.glassmorphism_intensity !== undefined ? String(settings.glassmorphism_intensity) : undefined],
      ['max_concurrent_downloads', settings.max_concurrent_downloads !== undefined ? String(settings.max_concurrent_downloads) : undefined],
      ['auto_seed_after_download', settings.auto_seed_after_download !== undefined ? String(settings.auto_seed_after_download) : undefined],
      ['bandwidth_schedule_enabled', settings.bandwidth_schedule_enabled !== undefined ? String(settings.bandwidth_schedule_enabled) : undefined],
      ['library_view_mode', settings.library_view_mode],
      ['library_sort_by', settings.library_sort_by],
      ['library_sort_order', settings.library_sort_order],
      ['library_card_size', settings.library_card_size],
      ['notifications_enabled', settings.notifications_enabled !== undefined ? String(settings.notifications_enabled) : undefined],
      ['notify_on_download_complete', settings.notify_on_download_complete !== undefined ? String(settings.notify_on_download_complete) : undefined],
      ['notify_on_update_available', settings.notify_on_update_available !== undefined ? String(settings.notify_on_update_available) : undefined],
      ['auto_cleanup_temp_files', settings.auto_cleanup_temp_files !== undefined ? String(settings.auto_cleanup_temp_files) : undefined]
    ];

    for (const [key, value] of settingsMap) {
      if (value !== undefined) {
        this.setSetting(key, value);
      }
    }
  }

  // ==================== IMAGE CACHE ====================

  getCachedImage(gameSlug: string): { local_path: string; source_url: string } | null {
    const stmt = this.db.prepare('SELECT local_path, source_url FROM image_cache WHERE game_slug = ?');
    const row = stmt.get(gameSlug) as any;
    return row || null;
  }

  setCachedImage(gameSlug: string, localPath: string, sourceUrl: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO image_cache (game_slug, local_path, source_url, cached_date)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(gameSlug, localPath, sourceUrl);
  }

  clearImageCache(): void {
    this.db.prepare('DELETE FROM image_cache').run();
  }

  // ==================== COLLECTIONS ====================

  getAllCollections() {
    const stmt = this.db.prepare('SELECT * FROM collections ORDER BY name');
    return stmt.all();
  }

  insertCollection(name: string, description?: string, color?: string): number {
    const stmt = this.db.prepare(`
      INSERT INTO collections (name, description, color) VALUES (?, ?, ?)
    `);
    const result = stmt.run(name, description || null, color || null);
    return result.lastInsertRowid as number;
  }

  deleteCollection(id: number): void {
    this.db.prepare('DELETE FROM collections WHERE id = ?').run(id);
  }

  addGameToCollection(collectionId: number, installationId: number): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO collection_games (collection_id, installation_id) VALUES (?, ?)
    `);
    stmt.run(collectionId, installationId);
  }

  removeGameFromCollection(collectionId: number, installationId: number): void {
    const stmt = this.db.prepare(`
      DELETE FROM collection_games WHERE collection_id = ? AND installation_id = ?
    `);
    stmt.run(collectionId, installationId);
  }

  getCollectionGames(collectionId: number) {
    const stmt = this.db.prepare(`
      SELECT i.*, g.* 
      FROM collection_games cg
      JOIN installations i ON cg.installation_id = i.id
      JOIN games g ON i.game_id = g.id
      WHERE cg.collection_id = ?
    `);
    return stmt.all(collectionId);
  }

  // ==================== PLAYTIME SESSIONS ====================

  insertPlaytimeSession(installationId: number, startTime: string, endTime: string, durationSeconds: number): number {
    const stmt = this.db.prepare(`
      INSERT INTO playtime_sessions (installation_id, start_time, end_time, duration_seconds)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(installationId, startTime, endTime, durationSeconds);
    return result.lastInsertRowid as number;
  }

  getPlaytimeSessions(installationId: number) {
    const stmt = this.db.prepare(`
      SELECT * FROM playtime_sessions 
      WHERE installation_id = ?
      ORDER BY start_time DESC
    `);
    return stmt.all(installationId);
  }

  getPlaytimeStats(installationId: number, period?: 'day' | 'week' | 'month') {
    let dateFilter = '';
    if (period === 'day') {
      dateFilter = "AND start_time >= datetime('now', '-1 day')";
    } else if (period === 'week') {
      dateFilter = "AND start_time >= datetime('now', '-7 days')";
    } else if (period === 'month') {
      dateFilter = "AND start_time >= datetime('now', '-30 days')";
    }

    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as session_count,
        SUM(duration_seconds) as total_seconds,
        AVG(duration_seconds) as avg_seconds,
        MAX(duration_seconds) as longest_session
      FROM playtime_sessions
      WHERE installation_id = ? ${dateFilter}
    `);
    return stmt.get(installationId);
  }

  // ==================== DOWNLOAD HISTORY ====================

  insertDownloadHistory(gameId: number, downloadId: number, status: string, dateStarted: string) {
    const stmt = this.db.prepare(`
      INSERT INTO download_history (game_id, download_id, status, date_started)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(gameId, downloadId, status, dateStarted);
    return result.lastInsertRowid as number;
  }

  updateDownloadHistory(id: number, status: string, dateCompleted: string, totalBytes: number, avgSpeed: number, totalTime: number) {
    const stmt = this.db.prepare(`
      UPDATE download_history 
      SET status = ?, date_completed = ?, total_bytes = ?, avg_download_speed = ?, total_time_seconds = ?
      WHERE id = ?
    `);
    stmt.run(status, dateCompleted, totalBytes, avgSpeed, totalTime, id);
  }

  getDownloadHistory(gameId?: number) {
    if (gameId) {
      const stmt = this.db.prepare(`
        SELECT dh.*, g.title, g.cover_image_url
        FROM download_history dh
        JOIN games g ON dh.game_id = g.id
        WHERE dh.game_id = ?
        ORDER BY dh.date_started DESC
      `);
      return stmt.all(gameId);
    } else {
      const stmt = this.db.prepare(`
        SELECT dh.*, g.title, g.cover_image_url
        FROM download_history dh
        JOIN games g ON dh.game_id = g.id
        ORDER BY dh.date_started DESC
      `);
      return stmt.all();
    }
  }

  // ==================== DISK SPACE ANALYZER ====================

  getDiskSpaceInfo() {
    const stmt = this.db.prepare(`
      SELECT 
        i.id as installation_id,
        g.title as game_title,
        i.install_path,
        i.install_size_bytes as size_bytes
      FROM installations i
      JOIN games g ON i.game_id = g.id
      ORDER BY i.install_size_bytes DESC
    `);
    return stmt.all();
  }

  close(): void {
    this.db.close();
  }
}
