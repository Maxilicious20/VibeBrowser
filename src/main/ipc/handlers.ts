/**
 * IPC Handler-Funktionen (Main Process)
 * Diese Datei verwaltet die Kommunikation zwischen Renderer und Main Process
 */

import { ipcMain, BrowserWindow } from 'electron';
import { ipcChannels } from '../../common/types';
import * as fs from 'fs';
import * as path from 'path';

import { BrowserViewLifecycleManager } from '../browser-view';
import { StorageManager } from '../storage';
import { ThemeManager } from '../theme-manager';
import { AdblockManager } from '../adblock-manager';
import { SearchSuggestionsManager } from '../search-suggestions';
import { DownloadManager } from '../download-manager';
import { SessionManager } from '../session-manager';

export class IpcHandlerManager {
  private mainWindow: BrowserWindow;
  private browserViewManager: BrowserViewLifecycleManager;
  private storageManager: StorageManager;
  private themeManager: ThemeManager;
  private adblockManager: AdblockManager;
  private searchSuggestionsManager: SearchSuggestionsManager;
  private downloadManager: DownloadManager;
  private sessionManager: SessionManager;
  private onCheckForUpdates: (() => void) | null = null;

  constructor(
    mainWindow: BrowserWindow,
    browserViewManager: BrowserViewLifecycleManager,
    storageManager: StorageManager,
    themeManager: ThemeManager,
    adblockManager: AdblockManager,
    searchSuggestionsManager: SearchSuggestionsManager,
    downloadManager: DownloadManager,
    sessionManager: SessionManager,
    onCheckForUpdates?: () => void
  ) {
    this.mainWindow = mainWindow;
    this.browserViewManager = browserViewManager;
    this.storageManager = storageManager;
    this.themeManager = themeManager;
    this.adblockManager = adblockManager;
    this.searchSuggestionsManager = searchSuggestionsManager;
    this.downloadManager = downloadManager;
    this.sessionManager = sessionManager;
    this.onCheckForUpdates = onCheckForUpdates || null;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Window-Controls
    ipcMain.on(ipcChannels.MINIMIZE_WINDOW, () => {
      this.mainWindow.minimize();
    });

    ipcMain.on(ipcChannels.MAXIMIZE_WINDOW, () => {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.maximize();
      }
    });

    ipcMain.on(ipcChannels.CLOSE_WINDOW, () => {
      this.mainWindow.close();
    });

    // Navigation
    ipcMain.on(
      ipcChannels.NAVIGATE_URL,
      (_event, tabId: string, url: string) => {
        this.browserViewManager.navigate(tabId, url);
      }
    );

    ipcMain.on(ipcChannels.NAVIGATE_BACK, (_event, tabId: string) => {
      this.browserViewManager.goBack(tabId);
    });

    ipcMain.on(ipcChannels.NAVIGATE_FORWARD, (_event, tabId: string) => {
      this.browserViewManager.goForward(tabId);
    });

    ipcMain.on(ipcChannels.RELOAD_PAGE, (_event, tabId: string) => {
      this.browserViewManager.reload(tabId);
    });

    // Tab-Management
    ipcMain.handle(ipcChannels.CREATE_TAB, (_event, url?: string) => {
      const tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const defaultUrl = url || 'https://www.google.com';
      this.browserViewManager.createBrowserView(tabId, defaultUrl);
      return { tabId, url: defaultUrl };
    });

    ipcMain.on(ipcChannels.CLOSE_TAB, (_event, tabId: string) => {
      this.browserViewManager.removeBrowserView(tabId);
    });

    ipcMain.on(ipcChannels.SWITCH_TAB, (_event, tabId: string) => {
      this.browserViewManager.activateTab(tabId);
    });

    ipcMain.handle(ipcChannels.GET_TAB_INFO, (_event, tabId: string) => {
      return {
        url: this.browserViewManager.getUrl(tabId),
        title: this.browserViewManager.getTitle(tabId),
      };
    });

    // Bookmarks
    ipcMain.handle(ipcChannels.ADD_BOOKMARK, (_event, bookmark) => {
      this.storageManager.addBookmark(bookmark);
      return { success: true };
    });

    ipcMain.handle(ipcChannels.REMOVE_BOOKMARK, (_event, id: string) => {
      this.storageManager.removeBookmark(id);
      return { success: true };
    });

    ipcMain.handle(ipcChannels.GET_BOOKMARKS, () => {
      return this.storageManager.loadBookmarks();
    });

    ipcMain.handle(ipcChannels.IS_BOOKMARKED, (_event, url: string) => {
      return this.storageManager.isBookmarked(url);
    });

    // History
    ipcMain.handle(ipcChannels.GET_HISTORY, () => {
      return this.storageManager.loadHistory();
    });

    ipcMain.handle(ipcChannels.SEARCH_HISTORY, (_event, query: string) => {
      return this.storageManager.searchHistory(query);
    });

    ipcMain.handle(ipcChannels.CLEAR_HISTORY, () => {
      this.storageManager.clearHistory();
      return { success: true };
    });

    // Settings
    ipcMain.handle(ipcChannels.GET_SETTINGS, () => {
      return this.storageManager.loadSettings();
    });

    ipcMain.handle(ipcChannels.SAVE_SETTINGS, (_event, settings) => {
      this.storageManager.saveSettings(settings);
      this.browserViewManager.setAdblockEnabled(settings.adblockEnabled ?? true);
      this.browserViewManager.setDataSaverEnabled(settings.dataSaverEnabled ?? false);
      this.mainWindow.webContents.send(ipcChannels.SETTINGS_UPDATED);
      return { success: true };
    });

    ipcMain.handle(ipcChannels.RESET_SETTINGS_DEFAULTS, () => {
      this.storageManager.resetSettingsToDefaults();
      this.browserViewManager.setAdblockEnabled(true);
      this.browserViewManager.setDataSaverEnabled(false);
      this.mainWindow.webContents.send(ipcChannels.SETTINGS_UPDATED);
      return { success: true };
    });

    ipcMain.handle(ipcChannels.EXPORT_USER_DATA, async () => {
      const { dialog } = require('electron');
      const suggestedName = `vibebrowser-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const { canceled, filePath } = await dialog.showSaveDialog(this.mainWindow, {
        title: 'Export VibeBrowser data',
        defaultPath: path.join(process.cwd(), suggestedName),
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
      });

      if (canceled || !filePath) {
        return { success: false, cancelled: true };
      }

      try {
        const payload = this.storageManager.exportUserData();
        fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
        return { success: true, path: filePath };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle(ipcChannels.IMPORT_USER_DATA, async () => {
      const { dialog } = require('electron');
      const { canceled, filePaths } = await dialog.showOpenDialog(this.mainWindow, {
        title: 'Import VibeBrowser data',
        properties: ['openFile'],
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
      });

      if (canceled || filePaths.length === 0) {
        return { success: false, cancelled: true };
      }

      try {
        const fileContent = fs.readFileSync(filePaths[0], 'utf-8');
        const parsed = JSON.parse(fileContent);
        this.storageManager.importUserData(parsed);

        const newSettings = this.storageManager.loadSettings();
        this.browserViewManager.setAdblockEnabled(newSettings.adblockEnabled ?? true);
        this.browserViewManager.setDataSaverEnabled(newSettings.dataSaverEnabled ?? false);
        this.mainWindow.webContents.send(ipcChannels.SETTINGS_UPDATED);

        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.on(ipcChannels.SETTINGS_UPDATED, () => {
      this.mainWindow.webContents.send(ipcChannels.SETTINGS_UPDATED);
    });

    // Storage
    ipcMain.handle(ipcChannels.GET_STORED_TABS, () => {
      return this.storageManager.loadTabs();
    });

    // Zoom
    ipcMain.on(ipcChannels.ZOOM_IN, (_event, tabId: string) => {
      this.browserViewManager.zoomIn(tabId);
    });

    ipcMain.on(ipcChannels.ZOOM_OUT, (_event, tabId: string) => {
      this.browserViewManager.zoomOut(tabId);
    });

    ipcMain.on(ipcChannels.ZOOM_RESET, (_event, tabId: string) => {
      this.browserViewManager.zoomReset(tabId);
    });

    ipcMain.handle(ipcChannels.GET_ZOOM_LEVEL, (_event, tabId: string) => {
      return this.browserViewManager.getZoomLevel(tabId);
    });

    // Find in Page
    ipcMain.on(ipcChannels.FIND_IN_PAGE, (_event, tabId: string, text: string) => {
      this.browserViewManager.findInPage(tabId, text);
    });

    ipcMain.on(ipcChannels.STOP_FIND_IN_PAGE, (_event, tabId: string) => {
      this.browserViewManager.stopFindInPage(tabId);
    });

    // Updates
    ipcMain.on(ipcChannels.CHECK_FOR_UPDATES, () => {
      if (this.onCheckForUpdates) {
        this.onCheckForUpdates();
      }
    });

    // Themes
    ipcMain.handle(ipcChannels.GET_THEMES, () => {
      const themes = this.themeManager.getAvailableThemes();
      return themes.map((t) => ({ name: t.name, isDefault: t.isDefault }));
    });

    ipcMain.handle(ipcChannels.LOAD_THEME, (_event, themeName: string) => {
      const css = this.themeManager.loadTheme(themeName);
      return css || '';
    });

    ipcMain.handle(ipcChannels.SAVE_THEME_PREFERENCE, (_event, themeName: string) => {
      const settings = this.storageManager.loadSettings();
      settings.theme = themeName;
      this.storageManager.saveSettings(settings);
      return { success: true };
    });

    ipcMain.handle(ipcChannels.GET_THEME_PREFERENCE, () => {
      const settings = this.storageManager.loadSettings();
      return settings.theme || 'catppuccin-mocha';
    });

    ipcMain.on(ipcChannels.OPEN_THEMES_FOLDER, () => {
      this.themeManager.openThemesFolder();
    });

    // Custom CSS
    ipcMain.handle(ipcChannels.GET_CUSTOM_CSS, () => {
      return this.themeManager.loadCustomCss();
    });

    ipcMain.handle(ipcChannels.GET_CUSTOM_CSS_PATH, () => {
      return this.themeManager.getCustomCssPath();
    });

    ipcMain.on(ipcChannels.OPEN_CUSTOM_CSS, () => {
      this.themeManager.openCustomCss();
    });

    // Adblock
    ipcMain.handle(ipcChannels.SHOULD_BLOCK_URL, (_event, url: string) => {
      return this.adblockManager.shouldBlockURL(url);
    });

    ipcMain.handle(ipcChannels.GET_ADBLOCK_STATS, () => {
      return this.adblockManager.getStats();
    });

    ipcMain.handle(ipcChannels.ADD_ADBLOCK_RULE, (_event, rule: string) => {
      this.adblockManager.addCustomRule(rule);
      return { success: true };
    });

    ipcMain.on(ipcChannels.RELOAD_ADBLOCK_RULES, () => {
      this.adblockManager.reloadRules();
    });

    ipcMain.handle(ipcChannels.GET_ADBLOCK_RULES_PATH, () => {
      return this.adblockManager.getBlocklistPath();
    });

    // Search Suggestions
    ipcMain.handle(ipcChannels.GET_SEARCH_SUGGESTIONS, async (_event, query: string) => {
      return await this.searchSuggestionsManager.getSuggestions(query);
    });

    ipcMain.handle(ipcChannels.GET_POPULAR_SEARCHES, async () => {
      return await this.searchSuggestionsManager.getPopularSearches();
    });

    // App Info
    ipcMain.handle(ipcChannels.GET_APP_INFO, () => {
      try {
        // Try to read package.json from app root
        const fs = require('fs');
        const path = require('path');
        
        let packageDataPath: string;
        
        // In production: dist/package.json
        // In development: package.json in project root
        if (require.main?.filename?.includes('dist')) {
          packageDataPath = path.join(require.main.filename, '..', '..', '..', 'package.json');
        } else {
          packageDataPath = path.join(__dirname, '..', '..', 'package.json');
        }
        
        if (fs.existsSync(packageDataPath)) {
          const packageData = JSON.parse(fs.readFileSync(packageDataPath, 'utf-8'));
          return {
            version: packageData.version || '1.3.0',
            githubRepo: 'https://github.com/Maxilicious20/VibeBrowser/blob/main/CHANGELOG.md',
          };
        }
        
        // Fallback
        return {
          version: '1.3.0',
          githubRepo: 'https://github.com/Maxilicious20/VibeBrowser/blob/main/CHANGELOG.md',
        };
      } catch (error) {
        console.error('Error reading app info:', error);
        return {
          version: '1.3.0',
          githubRepo: 'https://github.com/Maxilicious20/VibeBrowser/blob/main/CHANGELOG.md',
        };
      }
    });

    ipcMain.handle(ipcChannels.GET_DATA_SAVER_STATS, () => {
      return this.browserViewManager.getDataSaverStats();
    });

    // Downloads
    ipcMain.handle(ipcChannels.GET_DOWNLOADS, () => {
      return this.downloadManager.getAllDownloads();
    });

    ipcMain.handle(ipcChannels.PAUSE_DOWNLOAD, (_event, downloadId: string) => {
      return this.downloadManager.pauseDownload(downloadId);
    });

    ipcMain.handle(ipcChannels.RESUME_DOWNLOAD, (_event, downloadId: string) => {
      return this.downloadManager.resumeDownload(downloadId);
    });

    ipcMain.handle(ipcChannels.CANCEL_DOWNLOAD, (_event, downloadId: string) => {
      return this.downloadManager.cancelDownload(downloadId);
    });

    ipcMain.handle(ipcChannels.OPEN_DOWNLOAD, async (_event, downloadId: string) => {
      return await this.downloadManager.openDownload(downloadId);
    });

    ipcMain.handle(ipcChannels.SHOW_IN_FOLDER, (_event, downloadId: string) => {
      return this.downloadManager.showInFolder(downloadId);
    });

    ipcMain.handle(ipcChannels.CLEAR_COMPLETED_DOWNLOADS, () => {
      this.downloadManager.clearCompletedDownloads();
      return { success: true };
    });

    // Sessions
    ipcMain.handle(ipcChannels.SAVE_SESSION, (_event, name: string, tabs: Array<{ url: string; title: string }>) => {
      return this.sessionManager.saveSession(name, tabs);
    });

    ipcMain.handle(ipcChannels.LOAD_SESSION, (_event, sessionId: string) => {
      return this.sessionManager.loadSession(sessionId);
    });

    ipcMain.handle(ipcChannels.GET_SESSIONS, () => {
      return this.sessionManager.getAllSessions();
    });

    ipcMain.handle(ipcChannels.DELETE_SESSION, (_event, sessionId: string) => {
      return this.sessionManager.deleteSession(sessionId);
    });

    ipcMain.handle(ipcChannels.RESTORE_SESSION, (_event, sessionId: string) => {
      const session = this.sessionManager.loadSession(sessionId);
      if (session) {
        return session;
      }
      return null;
    });
  }
}
