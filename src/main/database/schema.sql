-- Games catalog
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  version TEXT,
  original_size_mb INTEGER,
  repack_size_mb INTEGER,
  repack_size_text TEXT,
  repack_size_min_mb INTEGER,
  repack_size_max_mb INTEGER,
  magnet_link TEXT,
  page_url TEXT UNIQUE NOT NULL,
  cover_image_url TEXT,
  description TEXT,
  genres TEXT, -- JSON array
  companies TEXT,
  languages TEXT,
  repack_date TEXT,
  date_added TEXT DEFAULT CURRENT_TIMESTAMP,
  last_scraped TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);
CREATE INDEX IF NOT EXISTS idx_games_slug ON games(slug);
CREATE INDEX IF NOT EXISTS idx_games_date_added ON games(date_added);
CREATE INDEX IF NOT EXISTS idx_games_repack_date ON games(repack_date);
CREATE INDEX IF NOT EXISTS idx_games_repack_size_min ON games(repack_size_min_mb);

-- Anker Games catalog (direct downloads)
CREATE TABLE IF NOT EXISTS anker_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  version TEXT,
  size_mb INTEGER,
  size_text TEXT,
  download_id INTEGER NOT NULL,
  page_url TEXT UNIQUE NOT NULL,
  cover_image_url TEXT,
  description TEXT,
  genres TEXT, -- JSON array
  release_year TEXT,
  date_added TEXT DEFAULT CURRENT_TIMESTAMP,
  last_scraped TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_anker_games_title ON anker_games(title);
CREATE INDEX IF NOT EXISTS idx_anker_games_slug ON anker_games(slug);
CREATE INDEX IF NOT EXISTS idx_anker_games_date_added ON anker_games(date_added);

-- Installed games
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

-- Launch options for games (multiple executables)
CREATE TABLE IF NOT EXISTS launch_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  installation_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  exe_path TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  FOREIGN KEY(installation_id) REFERENCES installations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_launch_options_installation_id ON launch_options(installation_id);

-- Active and historical downloads
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

-- Application settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Image cache
CREATE TABLE IF NOT EXISTS image_cache (
  game_slug TEXT PRIMARY KEY,
  local_path TEXT NOT NULL,
  source_url TEXT NOT NULL,
  cached_date TEXT DEFAULT CURRENT_TIMESTAMP
);
