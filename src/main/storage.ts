/**
 * Storage Manager - Handles data persistence
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface StoredTab {
  id: string;
  url: string;
  title: string;
}

export interface HistoryItem {
  url: string;
  title: string;
  timestamp: number;
  favicon?: string;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  createdAt: number;
}

export interface AppSettings {
  language?: 'en' | 'de';
  dataSaverEnabled?: boolean;
  homepage: string;
  searchEngine: string;
  theme: string;
  adblockEnabled: boolean;
  customCssEnabled: boolean;
  customBackgroundEnabled?: boolean;
  customBackgroundImage?: string;
  editorModeCss?: string;
  trustRadarEnabled?: boolean;
  lastSeenVersion?: string;
  privateMode: boolean;
  splitViewEnabled: boolean;
  splitOrientation: 'horizontal' | 'vertical';
  downloadPath?: string;
}

export class StorageManager {
  private userDataPath: string;
  private tabsFilePath: string;
  private historyFilePath: string;
  private bookmarksFilePath: string;
  private settingsFilePath: string;

  constructor() {
    this.userDataPath = app.getPath('userData');
    this.tabsFilePath = path.join(this.userDataPath, 'tabs.json');
    this.historyFilePath = path.join(this.userDataPath, 'history.json');
    this.bookmarksFilePath = path.join(this.userDataPath, 'bookmarks.json');
    this.settingsFilePath = path.join(this.userDataPath, 'settings.json');
    
    this.ensureFiles();
  }

  private createDefaultSettings(): AppSettings {
    return {
      language: 'en',
      dataSaverEnabled: false,
      homepage: 'https://www.google.com',
      searchEngine: 'https://www.google.com/search?q=',
      theme: 'catppuccin-mocha',
      adblockEnabled: true,
      customCssEnabled: false,
      customBackgroundEnabled: false,
      customBackgroundImage: '',
      editorModeCss: '',
      trustRadarEnabled: true,
      lastSeenVersion: '1.2.1',
      privateMode: false,
      splitViewEnabled: false,
      splitOrientation: 'vertical',
      downloadPath: app.getPath('downloads'),
    };
  }

  /**
   * Ensure all storage files exist
   */
  private ensureFiles(): void {
    if (!fs.existsSync(this.tabsFilePath)) {
      fs.writeFileSync(this.tabsFilePath, '[]', 'utf-8');
    }
    if (!fs.existsSync(this.historyFilePath)) {
      fs.writeFileSync(this.historyFilePath, '[]', 'utf-8');
    }
    if (!fs.existsSync(this.bookmarksFilePath)) {
      fs.writeFileSync(this.bookmarksFilePath, '[]', 'utf-8');
    }
    if (!fs.existsSync(this.settingsFilePath)) {
      const defaultSettings: AppSettings = this.createDefaultSettings();
      fs.writeFileSync(
        this.settingsFilePath,
        JSON.stringify(defaultSettings, null, 2),
        'utf-8'
      );
    }
  }

  /**
   * Normalize legacy search engine values
   */
  private normalizeSearchEngine(value?: string): string | undefined {
    if (!value) return undefined;

    if (value === 'google') return 'https://www.google.com/search?q=';
    if (value === 'duckduckgo') return 'https://duckduckgo.com/?q=';
    if (value === 'bing') return 'https://www.bing.com/search?q=';

    return value;
  }

  // ==================== TABS ====================

  /**
   * Save current tabs to disk
   */
  saveTabs(tabs: StoredTab[]): void {
    try {
      fs.writeFileSync(this.tabsFilePath, JSON.stringify(tabs, null, 2), 'utf-8');
      console.log('[StorageManager] Tabs saved:', tabs.length);
    } catch (error) {
      console.error('[StorageManager] Error saving tabs:', error);
    }
  }

  /**
   * Load tabs from disk
   */
  loadTabs(): StoredTab[] {
    try {
      const data = fs.readFileSync(this.tabsFilePath, 'utf-8');
      const tabs = JSON.parse(data) as StoredTab[];
      console.log('[StorageManager] Tabs loaded:', tabs.length);
      return tabs;
    } catch (error) {
      console.error('[StorageManager] Error loading tabs:', error);
      return [];
    }
  }

  // ==================== HISTORY ====================

  /**
   * Add item to history
   */
  addHistoryItem(item: HistoryItem): void {
    try {
      const history = this.loadHistory();
      // Avoid duplicates - remove if URL already exists
      const filtered = history.filter((h) => h.url !== item.url);
      // Add to front and limit to 1000 items
      filtered.unshift(item);
      const limitedHistory = filtered.slice(0, 1000);
      fs.writeFileSync(
        this.historyFilePath,
        JSON.stringify(limitedHistory, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('[StorageManager] Error adding history item:', error);
    }
  }

  /**
   * Load history from disk
   */
  loadHistory(): HistoryItem[] {
    try {
      const data = fs.readFileSync(this.historyFilePath, 'utf-8');
      return JSON.parse(data) as HistoryItem[];
    } catch (error) {
      console.error('[StorageManager] Error loading history:', error);
      return [];
    }
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    try {
      fs.writeFileSync(this.historyFilePath, '[]', 'utf-8');
      console.log('[StorageManager] History cleared');
    } catch (error) {
      console.error('[StorageManager] Error clearing history:', error);
    }
  }

  /**
   * Search history
   */
  searchHistory(query: string): HistoryItem[] {
    const history = this.loadHistory();
    const lowerQuery = query.toLowerCase();
    return history.filter(
      (item) =>
        item.url.toLowerCase().includes(lowerQuery) ||
        item.title.toLowerCase().includes(lowerQuery)
    );
  }

  // ==================== BOOKMARKS ====================

  /**
   * Add bookmark
   */
  addBookmark(bookmark: Bookmark): void {
    try {
      const bookmarks = this.loadBookmarks();
      // Check if already bookmarked
      if (bookmarks.some((b) => b.url === bookmark.url)) {
        console.log('[StorageManager] URL already bookmarked');
        return;
      }
      bookmarks.unshift(bookmark);
      fs.writeFileSync(
        this.bookmarksFilePath,
        JSON.stringify(bookmarks, null, 2),
        'utf-8'
      );
      console.log('[StorageManager] Bookmark added');
    } catch (error) {
      console.error('[StorageManager] Error adding bookmark:', error);
    }
  }

  /**
   * Remove bookmark by ID
   */
  removeBookmark(id: string): void {
    try {
      const bookmarks = this.loadBookmarks();
      const filtered = bookmarks.filter((b) => b.id !== id);
      fs.writeFileSync(
        this.bookmarksFilePath,
        JSON.stringify(filtered, null, 2),
        'utf-8'
      );
      console.log('[StorageManager] Bookmark removed');
    } catch (error) {
      console.error('[StorageManager] Error removing bookmark:', error);
    }
  }

  /**
   * Load bookmarks from disk
   */
  loadBookmarks(): Bookmark[] {
    try {
      const data = fs.readFileSync(this.bookmarksFilePath, 'utf-8');
      return JSON.parse(data) as Bookmark[];
    } catch (error) {
      console.error('[StorageManager] Error loading bookmarks:', error);
      return [];
    }
  }

  /**
   * Check if URL is bookmarked
   */
  isBookmarked(url: string): boolean {
    const bookmarks = this.loadBookmarks();
    return bookmarks.some((b) => b.url === url);
  }

  // ==================== SETTINGS ====================

  /**
   * Save settings
   */
  saveSettings(settings: AppSettings): void {
    try {
      fs.writeFileSync(
        this.settingsFilePath,
        JSON.stringify(settings, null, 2),
        'utf-8'
      );
      console.log('[StorageManager] Settings saved');
    } catch (error) {
      console.error('[StorageManager] Error saving settings:', error);
    }
  }

  /**
   * Load settings
   */
  loadSettings(): AppSettings {
    try {
      const data = fs.readFileSync(this.settingsFilePath, 'utf-8');
      const parsed = JSON.parse(data) as Partial<AppSettings>;
      const normalizedSearch = this.normalizeSearchEngine(parsed.searchEngine);
      return {
        language: parsed.language === 'de' ? 'de' : 'en',
        homepage: parsed.homepage || 'https://www.google.com',
        searchEngine: normalizedSearch || 'https://www.google.com/search?q=',
        theme: parsed.theme || 'catppuccin-mocha',
        adblockEnabled: parsed.adblockEnabled ?? true,
        customCssEnabled: parsed.customCssEnabled ?? false,
        customBackgroundEnabled: parsed.customBackgroundEnabled ?? false,
        customBackgroundImage: parsed.customBackgroundImage || '',
        editorModeCss: parsed.editorModeCss || '',
        trustRadarEnabled: parsed.trustRadarEnabled ?? true,
        lastSeenVersion: parsed.lastSeenVersion,
        privateMode: parsed.privateMode ?? false,
        splitViewEnabled: parsed.splitViewEnabled ?? false,
        splitOrientation: parsed.splitOrientation || 'vertical',
        downloadPath: parsed.downloadPath || app.getPath('downloads'),
      };
    } catch (error) {
      console.error('[StorageManager] Error loading settings:', error);
      return {
        ...this.createDefaultSettings(),
      };
    }
  }

  resetSettingsToDefaults(): AppSettings {
    const defaults = this.createDefaultSettings();
    this.saveSettings(defaults);
    return defaults;
  }

  exportUserData(): { settings: AppSettings; bookmarks: Bookmark[]; history: HistoryItem[] } {
    return {
      settings: this.loadSettings(),
      bookmarks: this.loadBookmarks(),
      history: this.loadHistory(),
    };
  }

  importUserData(data: {
    settings?: Partial<AppSettings>;
    bookmarks?: Bookmark[];
    history?: HistoryItem[];
  }): void {
    if (Array.isArray(data.bookmarks)) {
      fs.writeFileSync(this.bookmarksFilePath, JSON.stringify(data.bookmarks, null, 2), 'utf-8');
    }

    if (Array.isArray(data.history)) {
      fs.writeFileSync(this.historyFilePath, JSON.stringify(data.history, null, 2), 'utf-8');
    }

    if (data.settings) {
      const merged = {
        ...this.createDefaultSettings(),
        ...data.settings,
      } as AppSettings;
      this.saveSettings(merged);
    }
  }
}
