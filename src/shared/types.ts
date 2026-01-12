// Shared types between main and renderer processes

export interface Game {
  id: number;
  title: string;
  slug: string;
  version: string;
  original_size_mb: number;
  repack_size_mb: number;
  repack_size_text: string;
  repack_size_min_mb: number;
  repack_size_max_mb: number | null;
  magnet_link: string;
  page_url: string;
  cover_image_url: string | null;
  description: string;
  genres: string[];
  companies: string;
  languages: string;
  repack_date: string;
  date_added: string;
  last_scraped: string;
}

export interface Installation {
  id: number;
  game_id: number;
  install_path: string;
  date_installed: string;
  total_playtime_seconds: number;
  last_played: string | null;
  uninstall_exe_path?: string | null;
  is_favorite?: boolean;
  user_rating?: number | null;
  user_notes?: string | null;
  completion_status?: 'not_started' | 'playing' | 'completed' | 'abandoned';
  install_size_bytes?: number;
  game?: Game;
}

export interface LaunchOption {
  id: number;
  installation_id: number;
  name: string;
  exe_path: string;
  is_default: boolean;
  run_as_admin: boolean;
  launch_arguments?: string;
  pre_launch_script?: string;
  post_launch_script?: string;
}

export enum DownloadStatus {
  QUEUED = 'queued',
  DOWNLOADING = 'downloading',
  PAUSED = 'paused',
  SEEDING = 'seeding',
  COMPLETED = 'completed',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

export interface Download {
  id: number;
  game_id: number;
  magnet_link: string;
  status: DownloadStatus;
  progress: number;
  download_speed: number;
  upload_speed: number;
  peers: number;
  downloaded_bytes: number;
  total_bytes: number;
  eta_seconds: number;
  download_path: string;
  date_started: string;
  date_completed?: string | null;
  priority?: number;
  game?: Game;
}

export interface AppSettings {
  install_directories: string[];
  default_install_directory: string | null;
  seed_by_default: boolean;
  download_speed_limit_mbps: number;
  upload_speed_limit_mbps: number;
  check_updates_on_startup: boolean;
  first_run_complete: boolean;
  last_catalog_update: string | null;
  // Theme settings
  accent_color?: string;
  glassmorphism_intensity?: number;
  // Download behavior
  max_concurrent_downloads?: number;
  auto_seed_after_download?: boolean;
  bandwidth_schedule_enabled?: boolean;
  // Library organization
  library_view_mode?: 'grid' | 'list';
  library_sort_by?: 'name' | 'date_installed' | 'playtime' | 'last_played' | 'size';
  library_sort_order?: 'asc' | 'desc';
  library_card_size?: 'small' | 'medium' | 'large';
  // Notifications
  notifications_enabled?: boolean;
  notify_on_download_complete?: boolean;
  notify_on_update_available?: boolean;
  // Storage
  auto_cleanup_temp_files?: boolean;
}

export interface ProgressUpdate {
  downloadId: number;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  peers: number;
  downloadedBytes: number;
  totalBytes: number;
  etaSeconds: number;
}

export interface GameUpdate {
  game_id: number;
  title: string;
  installed_version: string;
  available_version: string;
  magnet_link: string;
}

export interface Collection {
  id: number;
  name: string;
  description?: string;
  color?: string;
  date_created: string;
}

export interface CollectionGame {
  collection_id: number;
  installation_id: number;
}

export interface PlaytimeSession {
  id: number;
  installation_id: number;
  start_time: string;
  end_time: string;
  duration_seconds: number;
}

export interface DownloadHistory {
  id: number;
  game_id: number;
  download_id: number;
  status: DownloadStatus;
  date_started: string;
  date_completed: string | null;
  total_bytes: number;
  avg_download_speed: number;
  total_time_seconds: number;
}

export interface DiskSpaceInfo {
  installation_id: number;
  game_title: string;
  install_path: string;
  size_bytes: number;
  size_formatted: string;
}
