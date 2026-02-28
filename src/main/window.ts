/**
 * Window-Manager für das Haupt-Fenster mit Custom Titlebar
 */

import { BrowserWindow, app } from 'electron';
import path from 'path';
import { IpcHandlerManager } from './ipc/handlers';
import { BrowserViewLifecycleManager } from './browser-view';
import { StorageManager } from './storage';
import { KeyboardShortcutManager } from './shortcuts';
import { AutoUpdateManager } from './auto-updater';
import { ThemeManager } from './theme-manager';
import { AdblockManager } from './adblock-manager';
import { SearchSuggestionsManager } from './search-suggestions';
import { DownloadManager } from './download-manager';
import { SessionManager } from './session-manager';
import { CrashRecoveryManager } from './crash-recovery';

export class AppWindow {
  private mainWindow: BrowserWindow | null = null;
  private browserViewManager: BrowserViewLifecycleManager | null = null;
  private ipcManager: IpcHandlerManager | null = null;
  private storageManager: StorageManager;
  private shortcutManager: KeyboardShortcutManager | null = null;
  private autoUpdateManager: AutoUpdateManager | null = null;
  private themeManager: ThemeManager | null = null;
  private adblockManager: AdblockManager | null = null;
  private searchSuggestionsManager: SearchSuggestionsManager | null = null;
  private downloadManager: DownloadManager | null = null;
  private sessionManager: SessionManager | null = null;
  private crashRecoveryManager: CrashRecoveryManager | null = null;

  constructor() {
    this.storageManager = new StorageManager();
    this.themeManager = new ThemeManager();
    this.adblockManager = new AdblockManager();
    this.searchSuggestionsManager = new SearchSuggestionsManager(this.storageManager);
    this.sessionManager = new SessionManager();
    this.crashRecoveryManager = new CrashRecoveryManager(this.storageManager, this.sessionManager);
  }

  create(): BrowserWindow {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#1e1e2e',
        symbolColor: '#cdd6f4',
        height: 40,
      },
    });

    // HTML-Datei laden (aus dem ./renderer Unterverzeichnis relativ zu __dirname)
    this.mainWindow.loadFile(
      path.join(__dirname, './renderer/index.html')
    );

    // F12 für DevTools aktivieren
    this.mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12') {
        this.mainWindow?.webContents.toggleDevTools();
      }
    });

    // Download Manager initialisieren
    this.downloadManager = new DownloadManager(this.mainWindow);

    // IPC-Handler registrieren
    this.browserViewManager = new BrowserViewLifecycleManager(
      this.mainWindow,
      this.storageManager,
      this.adblockManager!
    );
    const settings = this.storageManager.loadSettings();
    this.browserViewManager.setAdblockEnabled(settings.adblockEnabled ?? true);
    this.browserViewManager.setDataSaverEnabled(settings.dataSaverEnabled ?? false);
    this.ipcManager = new IpcHandlerManager(
      this.mainWindow,
      this.browserViewManager,
      this.storageManager,
      this.themeManager!,
      this.adblockManager!,
      this.searchSuggestionsManager!,
      this.downloadManager,
      this.sessionManager!,
      () => this.checkForUpdates()
    );

    // Keyboard shortcuts registrieren
    this.shortcutManager = new KeyboardShortcutManager(this.mainWindow, this.browserViewManager);
    this.shortcutManager.registerShortcuts();

    // Auto-Update Manager initialisieren
    this.autoUpdateManager = new AutoUpdateManager(this.mainWindow);

    // Crash Recovery starten (Auto-Save alle 30 Sekunden)
    if (this.crashRecoveryManager) {
      this.crashRecoveryManager.startAutoSave(30000);
    }

    // Bei Window Resize die BrowserView-Bounds anpassen
    this.mainWindow.on('resize', () => {
      if (this.browserViewManager) {
        const { height } = this.mainWindow!.getContentBounds();
        this.browserViewManager.updateContainerHeight(height);
      }
    });

    // Fenster-Ereignisse
    this.mainWindow.on('close', () => {
      // Unregister shortcuts
      if (this.shortcutManager) {
        this.shortcutManager.unregisterAll();
      }
      // Cleanup auto-updater
      if (this.autoUpdateManager) {
        this.autoUpdateManager.cleanup();
      }
      // Stop crash recovery auto-save
      if (this.crashRecoveryManager) {
        this.crashRecoveryManager.stopAutoSave();
      }
      // Save tabs before closing
      if (this.browserViewManager) {
        const tabs = this.browserViewManager.getAllTabsForStorage();
        this.storageManager.saveTabs(tabs);
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }

  getWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  getBrowserViewManager(): BrowserViewLifecycleManager | null {
    return this.browserViewManager;
  }

  getStorageManager(): StorageManager {
    return this.storageManager;
  }

  /**
   * Get stored tabs for restoration
   */
  getStoredTabs() {
    return this.storageManager.loadTabs();
  }

  /**
   * Trigger update check
   */
  checkForUpdates() {
    if (this.autoUpdateManager) {
      this.autoUpdateManager.checkForUpdates(true);
    }
  }
}
