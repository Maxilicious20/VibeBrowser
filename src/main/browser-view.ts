/**
 * BrowserView Manager: Verwaltet Electron BrowserView Instanzen pro Tab
 * Jeder Tab bekommt seine eigenen Browser-Prozess mit vollständiger Rendering-Engine
 */

import { BrowserView, BrowserWindow, net } from 'electron';
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

export interface DataSaverStats {
  enabled: boolean;
  allowedRequests: number;
  blockedRequests: number;
  estimatedSavedBytes: number;
  estimatedTransferredBytes: number;
  blockedByType: Record<string, number>;
}

export class BrowserViewLifecycleManager {
  private views: Map<string, BrowserViewInstance> = new Map();
  private lastFailedUrls: Map<string, string> = new Map();
  private mainWindow: BrowserWindow;
  private containerHeight: number = 0;
  private storageManager: StorageManager;
  private adblockManager: AdblockManager;
  private adblockEnabled: boolean = true;
  private dataSaverEnabled: boolean = false;
  private dataSaverStats: DataSaverStats = {
    enabled: false,
    allowedRequests: 0,
    blockedRequests: 0,
    estimatedSavedBytes: 0,
    estimatedTransferredBytes: 0,
    blockedByType: {},
  };
  private networkInterceptionInitialized: boolean = false;

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

  setDataSaverEnabled(enabled: boolean): void {
    this.dataSaverEnabled = enabled;
    this.dataSaverStats.enabled = enabled;
  }

  getDataSaverStats(): DataSaverStats {
    return {
      ...this.dataSaverStats,
      blockedByType: { ...this.dataSaverStats.blockedByType },
    };
  }

  private estimateSavingsByType(resourceType?: string): number {
    switch (resourceType) {
      case 'image':
        return 250 * 1024;
      case 'media':
        return 2 * 1024 * 1024;
      case 'font':
        return 100 * 1024;
      case 'script':
        return 120 * 1024;
      case 'xhr':
      case 'fetch':
        return 80 * 1024;
      default:
        return 40 * 1024;
    }
  }

  private setupNetworkInterception(session: Electron.Session): void {
    if (this.networkInterceptionInitialized) {
      return;
    }

    this.networkInterceptionInitialized = true;

    session.webRequest.onBeforeRequest((details, callback) => {
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

      const shouldBlockByAdblock = this.adblockEnabled && this.adblockManager.shouldBlockURL(url);

      const resourceType = details.resourceType || 'unknown';
      const heavyType = resourceType === 'image' || resourceType === 'media' || resourceType === 'font';
      const shouldBlockByDataSaver = this.dataSaverEnabled && (heavyType || this.adblockManager.shouldBlockURL(url));

      const cancel = shouldBlockByAdblock || shouldBlockByDataSaver;

      if (cancel) {
        this.dataSaverStats.blockedRequests += 1;
        this.dataSaverStats.estimatedSavedBytes += this.estimateSavingsByType(resourceType);
        this.dataSaverStats.blockedByType[resourceType] =
          (this.dataSaverStats.blockedByType[resourceType] || 0) + 1;
      } else {
        this.dataSaverStats.allowedRequests += 1;
      }

      return callback({ cancel });
    });

    session.webRequest.onHeadersReceived((details, callback) => {
      const headers = details.responseHeaders || {};
      let contentLength = 0;

      Object.keys(headers).forEach((key) => {
        if (key.toLowerCase() === 'content-length') {
          const raw = headers[key];
          const firstValue = Array.isArray(raw) ? raw[0] : raw;
          const parsed = Number(firstValue);
          if (!Number.isNaN(parsed) && parsed > 0) {
            contentLength = parsed;
          }
        }
      });

      if (contentLength > 0) {
        this.dataSaverStats.estimatedTransferredBytes += contentLength;
      }

      callback({ cancel: false, responseHeaders: details.responseHeaders });
    });
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

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private shouldShowOfflineFallback(failedUrl: string): boolean {
    if (
      !failedUrl ||
      failedUrl.startsWith('data:') ||
      failedUrl.startsWith('about:') ||
      failedUrl.startsWith('vibebrowser://')
    ) {
      return false;
    }

    return net.isOnline() === false;
  }

  /**
   * Event-Listener für den BrowserView
   */
  private setupViewEventHandlers(tabId: string, view: BrowserView): void {
    this.setupNetworkInterception(view.webContents.session);

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

      this.lastFailedUrls.delete(tabId);

      const isOfflineDataPage =
        url.startsWith('data:text/html') && title === '📴 VibeBrowser Offline';
      const logicalUrl = isOfflineDataPage ? 'vibebrowser://offline' : url;
      
      this.updateInstanceUrl(tabId, logicalUrl);
      
      // Update title in instance
      const instance = this.views.get(tabId);
      if (instance) {
        instance.title = title;
      }
      
      // Add to history (skip data URLs and error pages)
      if (!logicalUrl.startsWith('data:') && !logicalUrl.startsWith('vibebrowser://')) {
        this.storageManager.addHistoryItem({
          url: logicalUrl,
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
        logicalUrl
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
        const retryUrl = this.lastFailedUrls.get(tabId) || this.getUrl(tabId);
        if (retryUrl) {
          this.navigate(tabId, retryUrl);
        }
        return;
      }

      if (url === 'vibebrowser://offline') {
        event.preventDefault();
        const failedUrl = this.lastFailedUrls.get(tabId) || this.getUrl(tabId);
        this.loadOfflinePage(tabId, failedUrl || 'about:blank', 'Manuell geöffnet');
      }
    });

    // Fehler beim Laden
    view.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame || errorCode === -3) {
        return;
      }

      const failedUrl = validatedURL || this.getUrl(tabId);
      console.error(
        `Tab ${tabId} failed to load: ${errorCode} - ${errorDescription}`
      );

      if (failedUrl) {
        this.lastFailedUrls.set(tabId, failedUrl);
      }

      if (this.shouldShowOfflineFallback(failedUrl)) {
        this.loadOfflinePage(tabId, failedUrl, errorDescription);
        return;
      }

      this.loadErrorPage(tabId, errorDescription, failedUrl);
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
  private loadErrorPage(tabId: string, error: string, failedUrl: string): void {
    const instance = this.views.get(tabId);
    if (instance && instance.view.webContents) {
      const escapedError = this.escapeHtml(error);
      const escapedUrl = this.escapeHtml(failedUrl || this.getUrl(tabId) || 'Unbekannte URL');
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
            <p><code>${escapedUrl}</code></p>
            <p><code>${escapedError}</code></p>
            <button class="retry-btn" onclick="location.href='vibebrowser://retry'">Erneut versuchen</button>
            <button class="retry-btn" style="margin-left: 8px; background: #74c7ec;" onclick="location.href='vibebrowser://offline'">Offline-Seite öffnen</button>
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

  private loadOfflinePage(tabId: string, failedUrl: string, errorDescription: string): void {
    const instance = this.views.get(tabId);
    if (!instance || !instance.view.webContents) {
      return;
    }

    const escapedUrl = this.escapeHtml(failedUrl || 'Unbekannte URL');
    const escapedError = this.escapeHtml(errorDescription || 'Offline');

    const offlineHtml = `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>📴 VibeBrowser Offline</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #1e1e2e;
            color: #cdd6f4;
            min-height: 100vh;
            padding: 32px;
          }
          .container { max-width: 900px; margin: 0 auto; display: grid; gap: 18px; }
          .card {
            background: #11111b;
            border: 1px solid #313244;
            border-radius: 12px;
            padding: 20px;
          }
          h1 { color: #89b4fa; font-size: 30px; margin-bottom: 8px; }
          h2 { margin-bottom: 6px; }
          .muted { color: #a6adc8; font-size: 14px; }
          code {
            display: inline-block;
            margin-top: 8px;
            background: #313244;
            border-radius: 6px;
            padding: 4px 8px;
            word-break: break-all;
          }
          .row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
          button {
            border: 0;
            border-radius: 8px;
            padding: 10px 14px;
            cursor: pointer;
            font-weight: 600;
            background: #89b4fa;
            color: #1e1e2e;
          }
          button.secondary { background: #313244; color: #cdd6f4; }
          textarea, input {
            width: 100%;
            margin-top: 10px;
            border: 1px solid #585b70;
            border-radius: 8px;
            padding: 10px;
            background: #313244;
            color: #cdd6f4;
          }
          textarea { min-height: 120px; resize: vertical; }
          ul { margin-top: 10px; list-style: none; display: grid; gap: 8px; }
          li {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            background: #313244;
            border-radius: 8px;
            padding: 8px 10px;
          }
          .status { margin-top: 6px; font-weight: 600; color: #94e2d5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h1>📴 VibeBrowser Offline</h1>
            <p class="muted">Die Seite konnte aktuell nicht geladen werden. Du kannst hier offline weitermachen.</p>
            <code>${escapedUrl}</code>
            <code>${escapedError}</code>
            <p class="status" id="connection-status">Verbindungsstatus wird geprüft…</p>
            <div class="row">
              <button onclick="location.href='vibebrowser://retry'">Erneut versuchen</button>
              <button class="secondary" onclick="location.reload()">Offline-Seite neu laden</button>
            </div>
          </div>

          <div class="card">
            <h2>📝 Offline Notizen</h2>
            <p class="muted">Wird lokal im Browser gespeichert.</p>
            <textarea id="offline-notes" placeholder="Schreibe hier deine Notizen für später..."></textarea>
          </div>

          <div class="card">
            <h2>✅ Offline TODO</h2>
            <p class="muted">Mini-Liste für Aufgaben ohne Internet.</p>
            <input id="todo-input" placeholder="Neue Aufgabe hinzufügen..." />
            <div class="row">
              <button id="todo-add-btn">Aufgabe hinzufügen</button>
            </div>
            <ul id="todo-list"></ul>
          </div>

          <div class="card">
            <h2>🎮 Offline Minigames</h2>
            <p class="muted">Kleine Spiele ohne Internet.</p>
            <div class="row" style="margin-top: 10px;">
              <input id="guess-input" type="number" min="1" max="100" placeholder="Zahl von 1 bis 100" style="max-width: 220px; margin: 0;" />
              <button id="guess-btn">Raten</button>
              <button class="secondary" id="guess-reset-btn">Neu starten</button>
            </div>
            <p class="muted" id="guess-status" style="margin-top: 8px;">Errate die geheime Zahl.</p>
            <div class="row" style="margin-top: 12px;">
              <button class="secondary rps-btn" data-rps="rock">✊ Stein</button>
              <button class="secondary rps-btn" data-rps="paper">✋ Papier</button>
              <button class="secondary rps-btn" data-rps="scissors">✌ Schere</button>
            </div>
            <p class="muted" id="rps-status" style="margin-top: 8px;">Stein, Papier, Schere gegen den Browser.</p>
          </div>
        </div>

        <script>
          (function () {
            const NOTES_KEY = 'vibebrowser-offline-notes';
            const TODO_KEY = 'vibebrowser-offline-todos';
            const notesEl = document.getElementById('offline-notes');
            const todoInput = document.getElementById('todo-input');
            const todoList = document.getElementById('todo-list');
            const todoAddBtn = document.getElementById('todo-add-btn');
            const connectionStatus = document.getElementById('connection-status');
            const guessInput = document.getElementById('guess-input');
            const guessBtn = document.getElementById('guess-btn');
            const guessResetBtn = document.getElementById('guess-reset-btn');
            const guessStatus = document.getElementById('guess-status');
            const rpsStatus = document.getElementById('rps-status');
            const rpsButtons = document.querySelectorAll('.rps-btn');
            let secretNumber = Math.floor(Math.random() * 100) + 1;
            let attempts = 0;

            const updateConnection = () => {
              const online = navigator.onLine;
              connectionStatus.textContent = online
                ? '✅ Verbindung erkannt. Du kannst oben auf „Erneut versuchen“ klicken.'
                : '⚠️ Keine Internetverbindung erkannt.';
              connectionStatus.style.color = online ? '#94e2d5' : '#f9e2af';
            };

            const loadTodos = () => {
              try {
                const raw = localStorage.getItem(TODO_KEY);
                const items = raw ? JSON.parse(raw) : [];
                return Array.isArray(items) ? items : [];
              } catch {
                return [];
              }
            };

            const saveTodos = (items) => {
              localStorage.setItem(TODO_KEY, JSON.stringify(items));
            };

            const renderTodos = () => {
              const items = loadTodos();
              todoList.innerHTML = '';

              items.forEach((item, index) => {
                const li = document.createElement('li');
                const text = document.createElement('span');
                text.textContent = item;

                const removeBtn = document.createElement('button');
                removeBtn.textContent = 'Entfernen';
                removeBtn.className = 'secondary';
                removeBtn.addEventListener('click', () => {
                  const next = loadTodos();
                  next.splice(index, 1);
                  saveTodos(next);
                  renderTodos();
                });

                li.appendChild(text);
                li.appendChild(removeBtn);
                todoList.appendChild(li);
              });
            };

            const addTodo = () => {
              const value = todoInput.value.trim();
              if (!value) return;
              const items = loadTodos();
              items.push(value);
              saveTodos(items);
              todoInput.value = '';
              renderTodos();
            };

            const handleGuess = () => {
              const value = Number(guessInput.value);
              if (!Number.isFinite(value) || value < 1 || value > 100) {
                guessStatus.textContent = 'Bitte eine Zahl zwischen 1 und 100 eingeben.';
                return;
              }

              attempts += 1;
              if (value === secretNumber) {
                guessStatus.textContent = '🎉 Treffer! Versuche: ' + attempts;
                return;
              }

              guessStatus.textContent = value < secretNumber ? 'Zu niedrig ⬇' : 'Zu hoch ⬆';
            };

            const resetGuess = () => {
              secretNumber = Math.floor(Math.random() * 100) + 1;
              attempts = 0;
              guessInput.value = '';
              guessStatus.textContent = 'Neues Spiel gestartet. Rate wieder von 1 bis 100.';
            };

            const pickRps = (choice) => {
              const variants = ['rock', 'paper', 'scissors'];
              const cpu = variants[Math.floor(Math.random() * variants.length)];
              if (choice === cpu) {
                rpsStatus.textContent = '🤝 Unentschieden (' + choice + ' vs ' + cpu + ')';
                return;
              }

              const win =
                (choice === 'rock' && cpu === 'scissors') ||
                (choice === 'paper' && cpu === 'rock') ||
                (choice === 'scissors' && cpu === 'paper');

              rpsStatus.textContent = win
                ? '✅ Gewonnen (' + choice + ' schlägt ' + cpu + ')'
                : '❌ Verloren (' + cpu + ' schlägt ' + choice + ')';
            };

            notesEl.value = localStorage.getItem(NOTES_KEY) || '';
            notesEl.addEventListener('input', () => {
              localStorage.setItem(NOTES_KEY, notesEl.value);
            });

            todoAddBtn.addEventListener('click', addTodo);
            guessBtn.addEventListener('click', handleGuess);
            guessResetBtn.addEventListener('click', resetGuess);
            rpsButtons.forEach((btn) => {
              btn.addEventListener('click', () => pickRps(btn.getAttribute('data-rps')));
            });
            todoInput.addEventListener('keydown', (event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addTodo();
              }
            });
            guessInput.addEventListener('keydown', (event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleGuess();
              }
            });

            window.addEventListener('online', updateConnection);
            window.addEventListener('offline', updateConnection);

            updateConnection();
            renderTodos();
          })();
        </script>
      </body>
      </html>
    `;

    instance.view.webContents.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(offlineHtml)}`
    );
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
