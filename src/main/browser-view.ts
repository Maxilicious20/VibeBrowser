/**
 * BrowserView Manager: Verwaltet Electron BrowserView Instanzen pro Tab
 * Jeder Tab bekommt seine eigenen Browser-Prozess mit vollständiger Rendering-Engine
 */

import { BrowserView, BrowserWindow } from 'electron';
import { ipcChannels } from '../common/types';
import { StorageManager } from './storage';
import { AdblockManager } from './adblock-manager';
import path from 'path';

export interface BrowserViewInstance {
  id: string;
  view: BrowserView;
  url: string;
  isActive: boolean;
  title?: string;
}

export class BrowserViewLifecycleManager {
  private views: Map<string, BrowserViewInstance> = new Map();
  private mainWindow: BrowserWindow;
  private containerHeight: number = 0;
  private storageManager: StorageManager;
  private adblockManager: AdblockManager;
  private adblockEnabled: boolean = true;

  constructor(
    mainWindow: BrowserWindow,
    storageManager: StorageManager,
    adblockManager: AdblockManager
  ) {
    this.mainWindow = mainWindow;
    this.storageManager = storageManager;
    this.adblockManager = adblockManager;
  }

  /**
   * Erstellt einen neuen BrowserView für einen Tab
   */
  createBrowserView(tabId: string, url: string): BrowserViewInstance {
    const bounds = this.calculateViewBounds();
    const normalizedUrl = this.normalizeUrl(url);

    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    // BrowserView zur Main Window attachen
    this.mainWindow.addBrowserView(view);
    view.setBounds(bounds);
    view.setAutoResize({ width: true, height: true });

    // URL laden
    view.webContents.loadURL(normalizedUrl).catch((err) => {
      console.error(`Failed to load URL in BrowserView ${tabId}:`, err);
    });

    const instance: BrowserViewInstance = {
      id: tabId,
      view,
      url: normalizedUrl,
      isActive: false,
    };

    this.views.set(tabId, instance);

    // Event-Listener für Fehlerbehandlung
    this.setupViewEventHandlers(tabId, view);

    return instance;
  }

  /**
   * Enable or disable adblock
   */
  setAdblockEnabled(enabled: boolean): void {
    this.adblockEnabled = enabled;
  }

  /**
   * Aktiviert einen Tab (macht seinen BrowserView sichtbar)
   */
  activateTab(tabId: string): void {
    const currentViews = this.mainWindow.getBrowserViews();
    this.views.forEach((instance, id) => {
      if (id === tabId) {
        if (!currentViews.includes(instance.view)) {
          this.mainWindow.addBrowserView(instance.view);
        }
        instance.view.setBounds(this.calculateViewBounds());
        instance.view.setAutoResize({ width: true, height: true });
        instance.view.webContents.focus();
        instance.isActive = true;
      } else {
        if (currentViews.includes(instance.view)) {
          this.mainWindow.removeBrowserView(instance.view);
        }
        instance.isActive = false;
      }
    });
  }

  /**
   * Entfernt einen BrowserView und schließt den Browser-Prozess
   */
  removeBrowserView(tabId: string): void {
    const instance = this.views.get(tabId);
    if (instance) {
      this.mainWindow.removeBrowserView(instance.view);
      instance.view.webContents.close();
      this.views.delete(tabId);
    }
  }

  /**
   * Navigiert zu einer neuen URL im aktiven Tab
   */
  navigate(tabId: string, url: string): void {
    const instance = this.views.get(tabId);
    if (instance && instance.view.webContents) {
      const validUrl = this.normalizeUrl(url);
      instance.url = validUrl;
      instance.view.webContents.loadURL(validUrl).catch((err) => {
        console.error(`Navigation error in tab ${tabId}:`, err);
        // Fehlerseite laden
        this.loadErrorPage(tabId, err.message);
      });
    }
  }

  /**
   * Navigiert zurück
   */
  goBack(tabId: string): void {
    const instance = this.views.get(tabId);
    if (instance && instance.view.webContents.canGoBack()) {
      instance.view.webContents.goBack();
    }
  }

  /**
   * Navigiert vorwärts
   */
  goForward(tabId: string): void {
    const instance = this.views.get(tabId);
    if (instance && instance.view.webContents.canGoForward()) {
      instance.view.webContents.goForward();
    }
  }

  /**
   * Lädt die aktuelle Seite neu
   */
  reload(tabId: string): void {
    const instance = this.views.get(tabId);
    if (instance && instance.view.webContents) {
      instance.view.webContents.reload();
    }
  }

  /**
   * Zoom In
   */
  zoomIn(tabId: string): void {
    const instance = this.views.get(tabId);
    if (instance && instance.view.webContents) {
      const currentZoom = instance.view.webContents.getZoomLevel();
      instance.view.webContents.setZoomLevel(currentZoom + 0.5);
    }
  }

  /**
   * Zoom Out
   */
  zoomOut(tabId: string): void {
    const instance = this.views.get(tabId);
    if (instance && instance.view.webContents) {
      const currentZoom = instance.view.webContents.getZoomLevel();
      instance.view.webContents.setZoomLevel(currentZoom - 0.5);
    }
  }

  /**
   * Reset Zoom
   */
  zoomReset(tabId: string): void {
    const instance = this.views.get(tabId);
    if (instance && instance.view.webContents) {
      instance.view.webContents.setZoomLevel(0);
    }
  }

  /**
   * Get current zoom level
   */
  getZoomLevel(tabId: string): number {
    const instance = this.views.get(tabId);
    if (instance && instance.view.webContents) {
      return instance.view.webContents.getZoomLevel();
    }
    return 0;
  }

  /**
   * Find text in page
   */
  findInPage(tabId: string, text: string): void {
    const instance = this.views.get(tabId);
    if (!instance || !instance.view.webContents || !text.trim()) {
      return;
    }

    instance.view.webContents.findInPage(text, {
      forward: true,
      findNext: false,
      matchCase: false,
    });
  }

  /**
   * Stop find in page mode
   */
  stopFindInPage(tabId: string): void {
    const instance = this.views.get(tabId);
    if (!instance || !instance.view.webContents) {
      return;
    }

    instance.view.webContents.stopFindInPage('clearSelection');
  }

  /**
   * Gibt die aktuelle URL eines Tabs zurück
   */
  getUrl(tabId: string): string {
    const instance = this.views.get(tabId);
    return instance?.url || '';
  }

  /**
   * Gibt den aktuellen Titel eines Tabs zurück
   */
  getTitle(tabId: string): string {
    const instance = this.views.get(tabId);
    return instance?.view.webContents.getTitle() || '';
  }

  /**
   * Passt die Größe des Container-Bereichs an
   * (wird nach Window-Resize oder Layout-Änderungen aufgerufen)
   */
  updateContainerHeight(height: number): void {
    this.containerHeight = height;
    this.views.forEach((instance) => {
      instance.view.setBounds(this.calculateViewBounds());
    });
  }

  /**
   * Berechnet die Bounds für BrowserView basierend auf Window-Größe
   * Muss Titlebar (40px) und Tab-Bar Platz lassen
   */
  private calculateViewBounds() {
    const { width, height } = this.mainWindow.getContentBounds();
    const titlebarHeight = 40; // Custom Titlebar
    const tabbarHeight = 45; // Tab-Bar
    const topOffset = titlebarHeight + tabbarHeight;

    return {
      x: 0,
      y: topOffset,
      width,
      height: height - topOffset,
    };
  }

  private normalizeUrl(url: string): string {
    let validUrl = url.trim();
    if (
      validUrl.startsWith('data:') ||
      validUrl.startsWith('vibebrowser://') ||
      validUrl.startsWith('about:') ||
      validUrl.startsWith('file:') ||
      validUrl.startsWith('blob:')
    ) {
      return validUrl;
    }
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }
    return validUrl;
  }

  private updateInstanceUrl(tabId: string, url: string): void {
    const instance = this.views.get(tabId);
    if (instance) {
      instance.url = url;
    }
  }

  /**
   * Event-Listener für den BrowserView
   */
  private setupViewEventHandlers(tabId: string, view: BrowserView): void {
    // Adblock - block requests before they load
    view.webContents.session.webRequest.onBeforeRequest((details, callback) => {
      if (!this.adblockEnabled) {
        return callback({ cancel: false });
      }

      const url = details.url;
      if (
        url.startsWith('data:') ||
        url.startsWith('vibebrowser://') ||
        url.startsWith('about:') ||
        url.startsWith('file:') ||
        url.startsWith('blob:')
      ) {
        return callback({ cancel: false });
      }

      const shouldBlock = this.adblockManager.shouldBlockURL(url);
      return callback({ cancel: shouldBlock });
    });

    // Seite startet zu laden
    view.webContents.on('did-start-loading', () => {
      console.log(`Tab ${tabId} started loading`);
      this.mainWindow.webContents.send(
        ipcChannels.TAB_LOADING_CHANGED,
        tabId,
        true
      );
    });

    view.webContents.on('did-stop-loading', () => {
      this.mainWindow.webContents.send(
        ipcChannels.TAB_LOADING_CHANGED,
        tabId,
        false
      );
    });

    // Seite fertig geladen
    view.webContents.on('did-finish-load', () => {
      console.log(`Tab ${tabId} finished loading:`, view.webContents.getURL());
      const url = view.webContents.getURL();
      const title = view.webContents.getTitle();
      
      this.updateInstanceUrl(tabId, url);
      
      // Update title in instance
      const instance = this.views.get(tabId);
      if (instance) {
        instance.title = title;
      }
      
      // Add to history (skip data URLs and error pages)
      if (!url.startsWith('data:') && !url.startsWith('vibebrowser://')) {
        this.storageManager.addHistoryItem({
          url,
          title,
          timestamp: Date.now(),
        });
      }
      
      this.mainWindow.webContents.send(
        ipcChannels.TAB_TITLE_CHANGED,
        tabId,
        title
      );
      this.mainWindow.webContents.send(
        ipcChannels.TAB_URL_CHANGED,
        tabId,
        url
      );
    });

    view.webContents.on('page-favicon-updated', (_event, favicons) => {
      if (favicons && favicons.length > 0) {
        this.mainWindow.webContents.send(
          ipcChannels.TAB_FAVICON_CHANGED,
          tabId,
          favicons[0]
        );
      }
    });

    view.webContents.on('page-title-updated', (_event, title) => {
      this.mainWindow.webContents.send(
        ipcChannels.TAB_TITLE_CHANGED,
        tabId,
        title
      );
    });

    view.webContents.on('did-navigate', (_event, url) => {
      this.updateInstanceUrl(tabId, url);
      this.mainWindow.webContents.send(
        ipcChannels.TAB_URL_CHANGED,
        tabId,
        url
      );
    });

    view.webContents.on('did-navigate-in-page', (_event, url) => {
      this.updateInstanceUrl(tabId, url);
      this.mainWindow.webContents.send(
        ipcChannels.TAB_URL_CHANGED,
        tabId,
        url
      );
    });

    view.webContents.on('will-navigate', (event, url) => {
      if (url === 'vibebrowser://retry') {
        event.preventDefault();
        const currentUrl = this.getUrl(tabId);
        if (currentUrl) {
          this.navigate(tabId, currentUrl);
        }
      }
    });

    // Fehler beim Laden
    view.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error(
        `Tab ${tabId} failed to load: ${errorCode} - ${errorDescription}`
      );
      this.loadErrorPage(tabId, errorDescription);
    });

    // Neue Fenster/Tabs verhindern (Popup-Blocker)
    view.webContents.setWindowOpenHandler(({ url }) => {
      console.log(`Popup blocked: ${url}`);
      return { action: 'deny' };
    });
  }

  /**
   * Lädt eine Fehlerseite
   */
  private loadErrorPage(tabId: string, error: string): void {
    const instance = this.views.get(tabId);
    if (instance && instance.view.webContents) {
      const errorHtml = `
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8">
          <title>Fehler beim Laden</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #1e1e2e;
              color: #cdd6f4;
            }
            .error-container {
              text-align: center;
              max-width: 600px;
              padding: 40px;
              background: #11111b;
              border-radius: 8px;
            }
            h1 { color: #f38ba8; margin-top: 0; }
            code { 
              background: #313244;
              padding: 2px 6px;
              border-radius: 3px;
              font-family: monospace;
            }
            .retry-btn {
              margin-top: 16px;
              padding: 8px 16px;
              background: #89b4fa;
              color: #11111b;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>🚫 Fehler beim Laden</h1>
            <p>Die Seite konnte nicht geladen werden.</p>
            <p><code>${error}</code></p>
            <button class="retry-btn" onclick="location.href='vibebrowser://retry'">Erneut versuchen</button>
            <p style="margin-top: 20px; font-size: 12px; color: #a6adc8;">
              Stelle sicher, dass du mit dem Internet verbunden bist und versuche es erneut.
            </p>
          </div>
        </body>
        </html>
      `;
      instance.view.webContents.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`
      );
    }
  }

  /**
   * Get all tabs for storage (save on close)
   */
  getAllTabsForStorage() {
    const tabs: Array<{ id: string; url: string; title: string }> = [];
    this.views.forEach((instance) => {
      // Don't save error pages or data URLs
      if (!instance.url.startsWith('data:') && !instance.url.startsWith('vibebrowser://')) {
        tabs.push({
          id: instance.id,
          url: instance.url,
          title: instance.title || 'Untitled',
        });
      }
    });
    return tabs;
  }

  /**
   * Get all view instances
   */
  getAllViews(): Map<string, BrowserViewInstance> {
    return this.views;
  }
}
