/**
 * Gemeinsame Typen und Interfaces für Main & Renderer Prozesse
 */

export interface TabData {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isLoading: boolean;
}

export interface TabTransferData {
  tabId: string;
  title: string;
  url: string;
  favicon?: string;
  sourceWindowId?: number;
  transferType: 'internal' | 'external';
}

export interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  savePath: string;
  totalBytes: number;
  receivedBytes: number;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  startTime: number;
  paused: boolean;
  canResume: boolean;
}

export interface BrowserSession {
  id: string;
  name: string;
  tabs: Array<{ url: string; title: string }>;
  createdAt: number;
  lastModified: number;
}

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  category: 'navigation' | 'tabs' | 'settings' | 'tools' | 'view';
  action: () => void;
}

export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

export interface IpcChannels {
  // Browser-Navigation
  NAVIGATE_URL: 'navigate:url';
  NAVIGATE_BACK: 'navigate:back';
  NAVIGATE_FORWARD: 'navigate:forward';
  RELOAD_PAGE: 'navigate:reload';

  // Tab-Management
  CREATE_TAB: 'tab:create';
  CLOSE_TAB: 'tab:close';
  SWITCH_TAB: 'tab:switch';
  UPDATE_TAB: 'tab:update';
  GET_TAB_INFO: 'tab:get-info';
  TAB_TITLE_CHANGED: 'tab:title-changed';
  TAB_URL_CHANGED: 'tab:url-changed';
  TAB_LOADING_CHANGED: 'tab:loading-changed';
  TAB_FAVICON_CHANGED: 'tab:favicon-changed';
  DETACH_TAB: 'tab:detach';
  ATTACH_TAB: 'tab:attach';
  TRANSFER_TAB: 'tab:transfer';

  // Window-Management
  MINIMIZE_WINDOW: 'window:minimize';
  MAXIMIZE_WINDOW: 'window:maximize';
  CLOSE_WINDOW: 'window:close';

  // Bookmarks
  ADD_BOOKMARK: 'bookmark:add';
  REMOVE_BOOKMARK: 'bookmark:remove';
  GET_BOOKMARKS: 'bookmark:get-all';
  IS_BOOKMARKED: 'bookmark:is-bookmarked';

  // History
  GET_HISTORY: 'history:get-all';
  SEARCH_HISTORY: 'history:search';
  CLEAR_HISTORY: 'history:clear';

  // Settings
  GET_SETTINGS: 'settings:get';
  SAVE_SETTINGS: 'settings:save';
  SETTINGS_UPDATED: 'settings:updated';
  RESET_SETTINGS_DEFAULTS: 'settings:reset-defaults';
  EXPORT_USER_DATA: 'settings:export-user-data';
  IMPORT_USER_DATA: 'settings:import-user-data';

  // Custom CSS
  GET_CUSTOM_CSS: 'custom-css:get';
  GET_CUSTOM_CSS_PATH: 'custom-css:get-path';
  OPEN_CUSTOM_CSS: 'custom-css:open';

  // Storage  
  GET_STORED_TABS: 'storage:get-tabs';

  // Updates
  CHECK_FOR_UPDATES: 'updates:check';

  // Zoom
  ZOOM_IN: 'zoom:in';
  ZOOM_OUT: 'zoom:out';
  ZOOM_RESET: 'zoom:reset';
  GET_ZOOM_LEVEL: 'zoom:get-level';

  // Themes
  GET_THEMES: 'theme:get-all';
  LOAD_THEME: 'theme:load';
  SAVE_THEME_PREFERENCE: 'theme:save-preference';
  GET_THEME_PREFERENCE: 'theme:get-preference';
  OPEN_THEMES_FOLDER: 'theme:open-folder';

  // Adblock
  SHOULD_BLOCK_URL: 'adblock:should-block';
  GET_ADBLOCK_STATS: 'adblock:get-stats';
  ADD_ADBLOCK_RULE: 'adblock:add-rule';
  RELOAD_ADBLOCK_RULES: 'adblock:reload-rules';
  GET_ADBLOCK_RULES_PATH: 'adblock:get-rules-path';

  // Downloads
  GET_DOWNLOADS: 'downloads:get-all';
  PAUSE_DOWNLOAD: 'downloads:pause';
  RESUME_DOWNLOAD: 'downloads:resume';
  CANCEL_DOWNLOAD: 'downloads:cancel';
  OPEN_DOWNLOAD: 'downloads:open';
  SHOW_IN_FOLDER: 'downloads:show-in-folder';
  CLEAR_COMPLETED_DOWNLOADS: 'downloads:clear-completed';
  DOWNLOAD_STARTED: 'downloads:started';
  DOWNLOAD_PROGRESS: 'downloads:progress';
  DOWNLOAD_COMPLETED: 'downloads:completed';

  // Sessions
  SAVE_SESSION: 'session:save';
  LOAD_SESSION: 'session:load';
  GET_SESSIONS: 'session:get-all';
  DELETE_SESSION: 'session:delete';
  RESTORE_SESSION: 'session:restore';

  // View Modes
  TOGGLE_SPLIT_VIEW: 'view:toggle-split';
  SET_SPLIT_ORIENTATION: 'view:set-split-orientation';
  TOGGLE_PRIVATE_MODE: 'view:toggle-private';
  IS_PRIVATE_MODE: 'view:is-private';

  // Search Suggestions
  GET_SEARCH_SUGGESTIONS: 'search:get-suggestions';
  GET_POPULAR_SEARCHES: 'search:get-popular';

  // Find In Page
  FIND_IN_PAGE: 'find:in-page';
  STOP_FIND_IN_PAGE: 'find:stop';

  // App Info
  GET_APP_INFO: 'app:get-app-info';

  // Data Saver
  GET_DATA_SAVER_STATS: 'data-saver:get-stats';
}

export const ipcChannels: IpcChannels = {
  NAVIGATE_URL: 'navigate:url',
  NAVIGATE_BACK: 'navigate:back',
  NAVIGATE_FORWARD: 'navigate:forward',
  RELOAD_PAGE: 'navigate:reload',
  CREATE_TAB: 'tab:create',
  CLOSE_TAB: 'tab:close',
  SWITCH_TAB: 'tab:switch',
  UPDATE_TAB: 'tab:update',
  GET_TAB_INFO: 'tab:get-info',
  TAB_TITLE_CHANGED: 'tab:title-changed',
  TAB_URL_CHANGED: 'tab:url-changed',
  TAB_LOADING_CHANGED: 'tab:loading-changed',
  TAB_FAVICON_CHANGED: 'tab:favicon-changed',
  DETACH_TAB: 'tab:detach',
  ATTACH_TAB: 'tab:attach',
  TRANSFER_TAB: 'tab:transfer',
  MINIMIZE_WINDOW: 'window:minimize',
  MAXIMIZE_WINDOW: 'window:maximize',
  CLOSE_WINDOW: 'window:close',
  ADD_BOOKMARK: 'bookmark:add',
  REMOVE_BOOKMARK: 'bookmark:remove',
  GET_BOOKMARKS: 'bookmark:get-all',
  IS_BOOKMARKED: 'bookmark:is-bookmarked',
  GET_HISTORY: 'history:get-all',
  SEARCH_HISTORY: 'history:search',
  CLEAR_HISTORY: 'history:clear',
  GET_SETTINGS: 'settings:get',
  SAVE_SETTINGS: 'settings:save',
  SETTINGS_UPDATED: 'settings:updated',
  RESET_SETTINGS_DEFAULTS: 'settings:reset-defaults',
  EXPORT_USER_DATA: 'settings:export-user-data',
  IMPORT_USER_DATA: 'settings:import-user-data',
  GET_CUSTOM_CSS: 'custom-css:get',
  GET_CUSTOM_CSS_PATH: 'custom-css:get-path',
  OPEN_CUSTOM_CSS: 'custom-css:open',
  GET_STORED_TABS: 'storage:get-tabs',
  CHECK_FOR_UPDATES: 'updates:check',
  ZOOM_IN: 'zoom:in',
  ZOOM_OUT: 'zoom:out',
  ZOOM_RESET: 'zoom:reset',
  GET_ZOOM_LEVEL: 'zoom:get-level',
  GET_THEMES: 'theme:get-all',
  LOAD_THEME: 'theme:load',
  SAVE_THEME_PREFERENCE: 'theme:save-preference',
  GET_THEME_PREFERENCE: 'theme:get-preference',
  OPEN_THEMES_FOLDER: 'theme:open-folder',
  SHOULD_BLOCK_URL: 'adblock:should-block',
  GET_ADBLOCK_STATS: 'adblock:get-stats',
  ADD_ADBLOCK_RULE: 'adblock:add-rule',
  RELOAD_ADBLOCK_RULES: 'adblock:reload-rules',
  GET_ADBLOCK_RULES_PATH: 'adblock:get-rules-path',
  GET_DOWNLOADS: 'downloads:get-all',
  PAUSE_DOWNLOAD: 'downloads:pause',
  RESUME_DOWNLOAD: 'downloads:resume',
  CANCEL_DOWNLOAD: 'downloads:cancel',
  OPEN_DOWNLOAD: 'downloads:open',
  SHOW_IN_FOLDER: 'downloads:show-in-folder',
  CLEAR_COMPLETED_DOWNLOADS: 'downloads:clear-completed',
  DOWNLOAD_STARTED: 'downloads:started',
  DOWNLOAD_PROGRESS: 'downloads:progress',
  DOWNLOAD_COMPLETED: 'downloads:completed',
  SAVE_SESSION: 'session:save',
  LOAD_SESSION: 'session:load',
  GET_SESSIONS: 'session:get-all',
  DELETE_SESSION: 'session:delete',
  RESTORE_SESSION: 'session:restore',
  TOGGLE_SPLIT_VIEW: 'view:toggle-split',
  SET_SPLIT_ORIENTATION: 'view:set-split-orientation',
  TOGGLE_PRIVATE_MODE: 'view:toggle-private',
  IS_PRIVATE_MODE: 'view:is-private',
  GET_SEARCH_SUGGESTIONS: 'search:get-suggestions',
  GET_POPULAR_SEARCHES: 'search:get-popular',
  FIND_IN_PAGE: 'find:in-page',
  STOP_FIND_IN_PAGE: 'find:stop',
  GET_APP_INFO: 'app:get-app-info',
  GET_DATA_SAVER_STATS: 'data-saver:get-stats',
};

export interface AppInfo {
  version: string;
  githubRepo: string;
}
