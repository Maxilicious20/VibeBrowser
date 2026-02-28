/**
 * Haupt-Renderer-Applikation
 * Orchestriert Tab-UI mit Main Process BrowserView Management
 */

import { TabManager } from './components/tab-manager';
import { ToolbarManager } from './components/toolbar';
import { TabData, TabTransferData } from '../common/types';

class VibeBrowserApp {
  private tabManager: TabManager;
  private toolbarManager: ToolbarManager;
  private tabsContainerElement: HTMLElement;
  private newTabBtn: HTMLButtonElement;
  private draggedTabId: string | null = null;
  private dragPlaceholder: HTMLElement | null = null;
  private downloadDropdown: HTMLElement | null = null;
  private downloadDropdownOpen: boolean = false;
  private downloads: Map<string, any> = new Map();
  private downloadListElement: HTMLElement | null = null;
  private downloadHandlersRegistered: boolean = false;
  private downloadListDelegationSetup: boolean = false;

  // Bound handlers to prevent memory leaks
  private handleDownloadButtonClickBound: ((event: Event) => void) | null = null;
  private handleClickOutsideBound: ((event: MouseEvent) => void) | null = null;

  // Debounce timers for performance
  private downloadListUpdateTimer: NodeJS.Timeout | null = null;
  private lastFindQuery: string = '';
  private recentlyClosedTabs: Array<{ url: string; title: string }> = [];
  private trustRadarEnabled: boolean = true;
  private currentLanguage: 'en' | 'de' = 'en';

  // UI Elements
  private bookmarksSidebar: HTMLElement;
  private historySidebar: HTMLElement;
  private settingsPanel: HTMLElement;
  
  // Setup flags to prevent multiple listener registration
  private settingsTabsSetup: boolean = false;
  private featureHandlersSetup: boolean = false;
  private uiEventListenersSetup: boolean = false;
  private searchSuggestionsSetup: boolean = false;
  private electronAPIListenersSetup: boolean = false;
  private keyboardShortcutsSetup: boolean = false;
  private windowDropZoneSetup: boolean = false;
  private eventListenersSetup: boolean = false;
  private isCreatingNewTab: boolean = false;
  private isOpeningOfflineTab: boolean = false;
  private tabGroupAssignments: Record<string, string> = {};
  private readonly tabGroupStorageKey = 'vibebrowser-tab-groups-v1';
  private readonly tabGroupPalette: Record<string, { color: string; label: string }> = {
    work: { color: '#f38ba8', label: 'Work' },
    study: { color: '#89b4fa', label: 'Study' },
    fun: { color: '#a6e3a1', label: 'Fun' },
    media: { color: '#f9e2af', label: 'Media' },
  };

  constructor() {
    this.tabManager = new TabManager();
    this.toolbarManager = new ToolbarManager();

    this.tabsContainerElement = document.getElementById(
      'tabs-container'
    ) as HTMLElement;
    this.newTabBtn = document.getElementById(
      'new-tab-btn'
    ) as HTMLButtonElement;

    // Sidebar & Panel elements
    this.bookmarksSidebar = document.getElementById('bookmarks-sidebar') as HTMLElement;
    this.historySidebar = document.getElementById('history-sidebar') as HTMLElement;
    this.settingsPanel = document.getElementById('settings-panel') as HTMLElement;
    this.downloadDropdown = document.getElementById('download-dropdown');
    this.loadTabGroupAssignments();

    this.setupCallbacks();
    this.setupEventListeners();
    this.setupSearchSuggestionsHandler();
    this.setupUIEventListeners();
    this.setupDownloadHandler();
    this.setupElectronAPIListeners();
    this.setupKeyboardShortcuts();
    this.setupWindowDropZone();

    // Check for updates and show notification
    this.checkForUpdates();

    // Restore tabs or create initial tab
    this.initializeTabs();

    // Apply theme and custom CSS on startup
    this.applyAppearanceSettings();
  }

  private loadTabGroupAssignments(): void {
    try {
      const raw = localStorage.getItem(this.tabGroupStorageKey);
      if (!raw) {
        this.tabGroupAssignments = {};
        return;
      }

      const parsed = JSON.parse(raw);
      this.tabGroupAssignments = typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      this.tabGroupAssignments = {};
    }
  }

  private saveTabGroupAssignments(): void {
    localStorage.setItem(this.tabGroupStorageKey, JSON.stringify(this.tabGroupAssignments));
  }

  private getHostFromUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.hostname.toLowerCase();
      }
      return null;
    } catch {
      return null;
    }
  }

  private getTabGroupForUrl(url: string): string | null {
    const host = this.getHostFromUrl(url);
    if (!host) return null;
    return this.tabGroupAssignments[host] || null;
  }

  private applyTabGroupStyle(tab: TabData): void {
    const tabElement = document.getElementById(`ui-${tab.id}`);
    if (!tabElement) return;

    const groupId = this.getTabGroupForUrl(tab.url);
    if (!groupId || !this.tabGroupPalette[groupId]) {
      tabElement.style.borderTop = '';
      return;
    }

    const group = this.tabGroupPalette[groupId];
    tabElement.style.borderTop = `3px solid ${group.color}`;
    tabElement.title = `${tab.title || tab.url} • Group: ${group.label}`;
  }

  /**
   * Check if app was updated and show notification
   */
  private async checkForUpdates(): Promise<void> {
    try {
      const settings = await window.electronAPI!.settings.get();
      const appInfo = await window.electronAPI!.app.getInfo();
      const appVersion = appInfo.version;
      const lastSeenVersion = settings.lastSeenVersion || '0.0.0';

      if (lastSeenVersion !== appVersion) {
        // App was updated, show notification
        this.showUpdateNotification(appVersion, appInfo.githubRepo);
        
        // Update last seen version
        settings.lastSeenVersion = appVersion;
        await window.electronAPI!.settings.save(settings);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }

  /**
   * Show update notification for 10 seconds
   */
  private showUpdateNotification(version: string, changelogUrl: string): void {
    const notification = document.getElementById('update-notification');
    const notificationText = document.getElementById('notification-text');
    const changelogBtn = document.getElementById('changelog-btn');
    const changelogVersionSpan = document.getElementById('changelog-version');

    if (!notification || !notificationText || !changelogBtn) return;

    // Set notification text and version
    notificationText.textContent = this.t(
      `🎉 VibeBrowser was updated to v${version}!`,
      `🎉 VibeBrowser wurde auf v${version} aktualisiert!`
    );
    if (changelogVersionSpan) {
      changelogVersionSpan.textContent = `v${version}`;
    }
    
    // Show notification
    notification.classList.remove('hidden');

    // Auto-hide after 10 seconds
    setTimeout(() => {
      notification.classList.add('hidden');
    }, 10000);
  }

  /**
   * Show changelog modal
   */
  private showChangelogModal(): void {
    const modal = document.getElementById('changelog-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  /**
   * Hide changelog modal
   */
  private hideChangelogModal(): void {
    const modal = document.getElementById('changelog-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  /**
   * Initialize tabs (restore from storage or create new)
   */
  private async initializeTabs(): Promise<void> {
    try {
      const storedTabs = await window.electronAPI!.storage.getStoredTabs();
      
      if (storedTabs && storedTabs.length > 0) {
        console.log('Restoring tabs:', storedTabs.length);
        // Restore tabs
        for (const storedTab of storedTabs) {
          const tabData = await window.electronAPI!.tabs.create(storedTab.url);
          
          const tab = {
            id: tabData.tabId,
            title: storedTab.title || this.t('Loading...', 'Lädt...'),
            url: storedTab.url,
            favicon: '',
            isLoading: true,
          };

          this.tabManager.addTab(tab);
          this.createTabUI(tabData.tabId);
        }

        // Switch to first tab
        const firstTab = storedTabs[0];
        if (firstTab) {
          const allTabs = this.tabManager.getAllTabs();
          if (allTabs.length > 0) {
            this.tabManager.switchTab(allTabs[0].id);
            window.electronAPI!.tabs.switch(allTabs[0].id);
          }
        }
      } else {
        // No stored tabs, create initial tab
        await this.createInitialTab();
      }
    } catch (error) {
      console.error('Error initializing tabs:', error);
      // Fallback to creating initial tab
      await this.createInitialTab();
    }
  }

  /**
   * Erstmalige Tab-Erstellung beim App-Start
   */
  private async createInitialTab(): Promise<void> {
    const tabData = await window.electronAPI!.tabs.create();
    console.log('Initial tab created:', tabData);

    const tab = {
      id: tabData.tabId,
      title: this.t('Loading...', 'Lädt...'),
      url: tabData.url,
      favicon: '',
      isLoading: true,
    };

    this.tabManager.addTab(tab);
    this.createTabUI(tabData.tabId);
    this.tabManager.switchTab(tabData.tabId);
    window.electronAPI!.tabs.switch(tabData.tabId);

    // Nach kurzen Moment den Titel aktualisieren
    const info = await window.electronAPI!.tabs.getInfo(tabData.tabId);
    this.tabManager.updateTab(tabData.tabId, {
      title: info.title || this.t('New tab', 'Neue Tab'),
      isLoading: false,
    });
  }
  private setupCallbacks(): void {
    // Toolbar Navigation-Callbacks
    this.toolbarManager.setNavigateCallback(async (input) => {
      const activeTabId = this.tabManager.getActiveTabId();
      if (!activeTabId) return;

      const resolvedUrl = await this.resolveInputToUrl(input);

      if (resolvedUrl === 'vibebrowser://settings') {
        await this.openSettingsTab();
        return;
      }

      if (resolvedUrl === 'vibebrowser://bookmarks') {
        await this.openBookmarksTab();
        return;
      }

      if (resolvedUrl === 'vibebrowser://history') {
        await this.openHistoryTab();
        return;
      }

      if (resolvedUrl === 'vibebrowser://offline') {
        await this.openOfflineTab();
        return;
      }

      window.electronAPI!.navigate.to(activeTabId, resolvedUrl);
      this.tabManager.updateTab(activeTabId, {
        url: resolvedUrl,
        isLoading: true,
      });
    });

    this.toolbarManager.setBackCallback(() => {
      const activeTabId = this.tabManager.getActiveTabId();
      if (activeTabId) {
        window.electronAPI!.navigate.back(activeTabId);
      }
    });

    this.toolbarManager.setForwardCallback(() => {
      const activeTabId = this.tabManager.getActiveTabId();
      if (activeTabId) {
        window.electronAPI!.navigate.forward(activeTabId);
      }
    });

    this.toolbarManager.setReloadCallback(() => {
      const activeTabId = this.tabManager.getActiveTabId();
      if (activeTabId) {
        this.tabManager.updateTab(activeTabId, { isLoading: true });
        window.electronAPI!.navigate.reload(activeTabId);
      }
    });

    // Tab-Manager Update-Callback
    this.tabManager.setUpdateCallback((tab) => {
      this.updateTabUI(tab);
      if (tab.id === this.tabManager.getActiveTabId()) {
        this.toolbarManager.setUrl(this.formatUrlForAddressBar(tab.url));
        this.updateTrustRadar(tab.url);
      }
    });
  }

  private getInternalTabType(tabId: string): 'settings' | 'bookmarks' | 'history' | 'offline' | null {
    const tabElement = document.getElementById(`ui-${tabId}`);
    const tabType = tabElement?.getAttribute('data-tab-type');

    if (tabType === 'settings' || tabType === 'bookmarks' || tabType === 'history' || tabType === 'offline') {
      return tabType;
    }

    return null;
  }

  private formatUrlForAddressBar(url: string): string {
    if (url === 'vibebrowser://settings') return 'VibeBrowser/Settings';
    if (url === 'vibebrowser://bookmarks') return 'VibeBrowser/Bookmarks';
    if (url === 'vibebrowser://history') return 'VibeBrowser/History';
    if (url === 'vibebrowser://offline') return 'VibeBrowser/Offline';
    return url;
  }

  /**
   * Listener für IPC-Nachrichten vom Main Process
   */
  private setupElectronAPIListeners(): void {
    if (this.electronAPIListenersSetup) return;
    this.electronAPIListenersSetup = true;

    // Titel-Änderungen
    window.electronAPI!.tabs.onTitleChanged((tabId, title) => {
      if (title === '📴 VibeBrowser Offline') {
        const tabElement = document.getElementById(`ui-${tabId}`);
        if (tabElement) {
          tabElement.setAttribute('data-tab-type', 'offline');
        }
      }

      this.tabManager.updateTab(tabId, { title, isLoading: false });
    });

    // URL-Änderungen
    window.electronAPI!.tabs.onUrlChanged((tabId, url) => {
      const internalTabType = this.getInternalTabType(tabId);
      const isInternalRenderedPage =
        !!internalTabType && (url.startsWith('data:text/html') || url === 'about:blank');

      const nextUrl = isInternalRenderedPage
        ? `vibebrowser://${internalTabType}`
        : url;

      this.tabManager.updateTab(tabId, { url: nextUrl, isLoading: false });

      if (tabId === this.tabManager.getActiveTabId()) {
        this.toolbarManager.setUrl(this.formatUrlForAddressBar(nextUrl));
        this.updateTrustRadar(nextUrl);
      }
    });

    window.electronAPI!.tabs.onLoadingChanged((tabId, isLoading) => {
      this.tabManager.updateTab(tabId, { isLoading });
    });

    window.electronAPI!.tabs.onFaviconChanged((tabId, faviconUrl) => {
      this.tabManager.updateTab(tabId, { favicon: faviconUrl });
    });

    window.electronAPI!.settings.onUpdated(() => {
      this.applyAppearanceSettings();
    });
  }

  /**
   * Setup download handlers - listen for download events from main process
   */
  private setupDownloadHandler(): void {
    if (!window.electronAPI?.downloads) {
      console.warn('[App] electronAPI.downloads not available');
      return;
    }

    // Prevent double registration
    if (this.downloadHandlersRegistered) return;
    this.downloadHandlersRegistered = true;

    // Register event listeners for download updates
    if (window.electronAPI.downloads.onStarted) {
      window.electronAPI.downloads.onStarted((download: any) => {
        this.downloads.set(download.id, download);
        this.scheduleDownloadListUpdate();
        this.updateDownloadBadge();
      });
    }

    if (window.electronAPI.downloads.onProgress) {
      window.electronAPI.downloads.onProgress((download: any) => {
        this.downloads.set(download.id, download);
        // Debounce the update to prevent excessive rendering
        this.scheduleDownloadListUpdate();
      });
    }

    if (window.electronAPI.downloads.onCompleted) {
      window.electronAPI.downloads.onCompleted((download: any) => {
        this.downloads.set(download.id, download);
        this.scheduleDownloadListUpdate();
        this.updateDownloadBadge();
      });
    }

    // Add click-outside handler to close dropdown
    this.setupDropdownCloseHandler();
  }

  /**
   * Schedule download list update with debounce to prevent excessive rendering
   */
  private scheduleDownloadListUpdate(): void {
    if (!this.downloadDropdownOpen) {
      return;
    }

    // Clear previous timer if exists
    if (this.downloadListUpdateTimer) {
      clearTimeout(this.downloadListUpdateTimer);
    }

    // Schedule update after 300ms
    this.downloadListUpdateTimer = setTimeout(() => {
      this.updateDownloadsList();
      this.downloadListUpdateTimer = null;
    }, 300);
  }

  /**
   * Setup handler to close dropdown when clicking outside
   */
  private setupDropdownCloseHandler(): void {
    // Create bound handler if not exists
    if (!this.handleClickOutsideBound) {
      this.handleClickOutsideBound = (event: MouseEvent) => {
        if (!this.downloadDropdown || !this.downloadDropdownOpen) return;

        const downloadBtn = document.getElementById('download-btn');
        const target = event.target as HTMLElement;

        // Check if click is outside both dropdown and button
        const isOutsideDropdown = !this.downloadDropdown.contains(target);
        const isOutsideButton = !downloadBtn?.contains(target);

        if (isOutsideDropdown && isOutsideButton) {
          this.toggleDownloadDropdown();
        }
      };

      // Add listener once
      document.addEventListener('click', this.handleClickOutsideBound);
    }
  }

  /**
   * Toggle download dropdown visibility
   */
  toggleDownloadDropdown(): void {
    if (!this.downloadDropdown) {
      console.error('[Downloads] Download dropdown element not found');
      return;
    }

    this.downloadDropdownOpen = !this.downloadDropdownOpen;

    if (this.downloadDropdownOpen) {
      this.downloadDropdown.classList.remove('hidden');
      // Load downloads from main process
      this.loadDownloads();
    } else {
      this.downloadDropdown.classList.add('hidden');
    }
  }

  /**
   * Load downloads from main process
   */
  private async loadDownloads(): Promise<void> {
    try {
      const downloads = await window.electronAPI!.downloads.getAll();

      downloads.forEach((d: any) => this.downloads.set(d.id, d));
      this.updateDownloadsList();
      this.updateDownloadBadge();
    } catch (error) {
      console.error('[Downloads] Error loading downloads:', error);
    }
  }

  /**
   * Update downloads list UI
   */
  private updateDownloadsList(): void {
    const downloadList = document.getElementById('download-list');
    if (!downloadList) {
      console.error('[Downloads] download-list element not found');
      return;
    }

    this.downloadListElement = downloadList;
    const downloads = Array.from(this.downloads.values());

    if (downloads.length === 0) {
      downloadList.innerHTML = `<p class="download-empty-message">${this.t('No downloads', 'Keine Downloads')}</p>`;
      return;
    }

    downloadList.innerHTML = downloads
      .map((download: any) => this.createDownloadItemHTML(download))
      .join('');

    // Use event delegation instead of individual listeners to prevent memory leaks
    this.setupDownloadListEventDelegation();
  }

  /**
   * Setup event delegation for download list buttons (prevents memory leaks)
   */
  private setupDownloadListEventDelegation(): void {
    if (!this.downloadListElement) return;

    // Create bound handler once
    if (!this.handleDownloadButtonClickBound) {
      this.handleDownloadButtonClickBound = (event: Event) => {
        this.handleDownloadButtonClick(event);
      };
    }

    if (!this.downloadListDelegationSetup) {
      this.downloadListElement.addEventListener('click', this.handleDownloadButtonClickBound);
      this.downloadListDelegationSetup = true;
    }
  }

  /**
   * Handle download button clicks via event delegation
   */
  private handleDownloadButtonClick(event: Event): void {
    const target = event.target as HTMLElement;
    const button = target.closest('.download-item-btn') as HTMLButtonElement;
    if (!button) return;

    const downloadItem = button.closest('.download-item') as HTMLElement;
    const downloadId = downloadItem?.getAttribute('data-id');
    if (!downloadId) return;

    if (button.classList.contains('pause-btn')) {
      window.electronAPI!.downloads.pause(downloadId);
    } else if (button.classList.contains('resume-btn')) {
      window.electronAPI!.downloads.resume(downloadId);
    } else if (button.classList.contains('cancel-btn')) {
      window.electronAPI!.downloads.cancel(downloadId);
      this.downloads.delete(downloadId);
      this.updateDownloadsList();
      this.updateDownloadBadge();
    } else if (button.classList.contains('open-btn')) {
      window.electronAPI!.downloads.open(downloadId);
    } else if (button.classList.contains('folder-btn')) {
      window.electronAPI!.downloads.showInFolder(downloadId);
    }
  }

  /**
   * Create HTML for a download item
   */
  private createDownloadItemHTML(download: any): string {
    const percent =
      download.totalBytes > 0
        ? Math.round((download.receivedBytes / download.totalBytes) * 100)
        : 0;
    const sizeStr = this.formatBytes(download.totalBytes);
    const receivedStr = this.formatBytes(download.receivedBytes);

    return `
      <div class="download-item" data-id="${download.id}">
        <div class="download-item-header">
          <span class="download-item-name" title="${download.filename}">${download.filename}</span>
          <span class="download-item-status ${download.state}">${download.state}</span>
        </div>
        ${
          download.state === 'progressing'
            ? `
          <div class="download-item-progress">
            <div class="download-item-progress-bar" style="width: ${percent}%"></div>
          </div>
          <div class="download-item-info">
            <span class="download-item-size">${receivedStr} / ${sizeStr}</span>
            <span>${percent}%</span>
          </div>
        `
            : `
          <div class="download-item-info">
            <span class="download-item-size">${sizeStr}</span>
            <span>${new Date(download.startTime).toLocaleTimeString()}</span>
          </div>
        `
        }
        <div class="download-item-buttons">
          ${
            download.state === 'progressing'
              ? download.paused
                ? `<button class="download-item-btn resume-btn" data-id="${download.id}">▶ Fortsetzen</button>`
                : `<button class="download-item-btn pause-btn" data-id="${download.id}">⏸ Pausieren</button>`
              : ''
          }
          ${
            download.state === 'progressing'
              ? `<button class="download-item-btn cancel-btn danger" data-id="${download.id}">✕ Abbrechen</button>`
              : ''
          }
          ${
            download.state === 'completed'
              ? `<button class="download-item-btn open-btn" data-id="${download.id}">▶ ${this.t('Open', 'Öffnen')}</button>`
              : ''
          }
          ${
            download.state === 'completed'
              ? `<button class="download-item-btn folder-btn" data-id="${download.id}">📁 Ordner</button>`
              : ''
          }
        </div>
      </div>
    `;
  }



  /**
   * Update download badge count
   */
  private updateDownloadBadge(): void {
    const badge = document.getElementById('download-badge');
    if (!badge) return;

    const activeDownloads = Array.from(this.downloads.values()).filter(
      (d: any) => d.state === 'progressing'
    );

    if (activeDownloads.length > 0) {
      badge.textContent = activeDownloads.length.toString();
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  /**
   * Clear completed downloads
   */
  async clearCompletedDownloads(): Promise<void> {
    const toDelete: string[] = [];
    this.downloads.forEach((download: any, id: string) => {
      if (download.state === 'completed' || download.state === 'cancelled') {
        toDelete.push(id);
      }
    });

    try {
      await window.electronAPI!.downloads.clearCompleted();
    } catch (error) {
      console.error('[Downloads] Error clearing completed downloads in main process:', error);
    }

    toDelete.forEach(id => this.downloads.delete(id));
    this.updateDownloadsList();
    this.updateDownloadBadge();
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number, decimals: number = 1): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Setup keyboard shortcuts
   */
  private setupKeyboardShortcuts(): void {
    if (this.keyboardShortcutsSetup) return;
    this.keyboardShortcutsSetup = true;

    // New Tab (Ctrl+T)
    window.electronAPI!.shortcuts.onNewTab(() => {
      this.handleNewTab();
    });

    // Close Tab (Ctrl+W)
    window.electronAPI!.shortcuts.onCloseTab(() => {
      const activeTabId = this.tabManager.getActiveTabId();
      if (activeTabId) {
        const tabElement = document.getElementById(`ui-${activeTabId}`);
        if (tabElement) {
          this.handleCloseTab(activeTabId, tabElement as HTMLElement);
        }
      }
    });

    // Next Tab (Ctrl+Tab)
    window.electronAPI!.shortcuts.onNextTab(() => {
      const allTabs = this.tabManager.getAllTabs();
      const activeTabId = this.tabManager.getActiveTabId();
      if (!activeTabId || allTabs.length <= 1) return;

      const currentIndex = allTabs.findIndex((t) => t.id === activeTabId);
      const nextIndex = (currentIndex + 1) % allTabs.length;
      const nextTab = allTabs[nextIndex];

      this.tabManager.switchTab(nextTab.id);
      window.electronAPI!.tabs.switch(nextTab.id);
    });

    // Previous Tab (Ctrl+Shift+Tab)
    window.electronAPI!.shortcuts.onPrevTab(() => {
      const allTabs = this.tabManager.getAllTabs();
      const activeTabId = this.tabManager.getActiveTabId();
      if (!activeTabId || allTabs.length <= 1) return;

      const currentIndex = allTabs.findIndex((t) => t.id === activeTabId);
      const prevIndex = (currentIndex - 1 + allTabs.length) % allTabs.length;
      const prevTab = allTabs[prevIndex];

      this.tabManager.switchTab(prevTab.id);
      window.electronAPI!.tabs.switch(prevTab.id);
    });

    // Reload (Ctrl+R, F5)
    window.electronAPI!.shortcuts.onReload(() => {
      const activeTabId = this.tabManager.getActiveTabId();
      if (activeTabId) {
        window.electronAPI!.navigate.reload(activeTabId);
      }
    });

    // Hard Reload (Ctrl+Shift+R)
    window.electronAPI!.shortcuts.onHardReload(() => {
      const activeTabId = this.tabManager.getActiveTabId();
      if (activeTabId) {
        window.electronAPI!.navigate.reload(activeTabId);
      }
    });

    // Focus URL bar (Ctrl+L)
    window.electronAPI!.shortcuts.onFocusUrl(() => {
      this.toolbarManager.focusUrlBar();
    });

    // Find in page (Ctrl+F)
    window.electronAPI!.shortcuts.onFind(() => {
      const activeTabId = this.tabManager.getActiveTabId();
      if (!activeTabId) return;

      const query = window.prompt(this.t('Find in page:', 'Auf Seite suchen:'), this.lastFindQuery);

      if (query === null) {
        return;
      }

      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        window.electronAPI!.find.stop(activeTabId);
        return;
      }

      this.lastFindQuery = trimmedQuery;
      window.electronAPI!.find.inPage(activeTabId, trimmedQuery);
    });

    // Bookmark current page (Ctrl+D)
    window.electronAPI!.shortcuts.onBookmark(() => {
      this.handleBookmarkCurrentPage();
    });

    // Show history (Ctrl+H)
    window.electronAPI!.shortcuts.onHistory(() => {
      this.openHistoryTab();
    });

    // Show bookmarks (Ctrl+Shift+B)
    window.electronAPI!.shortcuts.onBookmarks(() => {
      this.openBookmarksTab();
    });

    // Reopen closed tab (Ctrl+Shift+T)
    window.electronAPI!.shortcuts.onReopenClosedTab(() => {
      this.reopenLastClosedTab();
    });

    // Back (Alt+Left)
    window.electronAPI!.shortcuts.onBack(() => {
      const activeTabId = this.tabManager.getActiveTabId();
      if (activeTabId) {
        window.electronAPI!.navigate.back(activeTabId);
      }
    });

    // Forward (Alt+Right)
    window.electronAPI!.shortcuts.onForward(() => {
      const activeTabId = this.tabManager.getActiveTabId();
      if (activeTabId) {
        window.electronAPI!.navigate.forward(activeTabId);
      }
    });

    // Zoom In (Ctrl++)
    window.electronAPI!.shortcuts.onZoomIn(() => {
      const activeTabId = this.tabManager.getActiveTabId();
      if (activeTabId) {
        window.electronAPI!.zoom.in(activeTabId);
      }
    });

    // Zoom Out (Ctrl+-)
    window.electronAPI!.shortcuts.onZoomOut(() => {
      const activeTabId = this.tabManager.getActiveTabId();
      if (activeTabId) {
        window.electronAPI!.zoom.out(activeTabId);
      }
    });

    // Reset Zoom (Ctrl+0)
    window.electronAPI!.shortcuts.onZoomReset(() => {
      const activeTabId = this.tabManager.getActiveTabId();
      if (activeTabId) {
        window.electronAPI!.zoom.reset(activeTabId);
      }
    });

    // Switch to tab by number (Ctrl+1...9)
    window.electronAPI!.shortcuts.onSwitchToTab((_event, index) => {
      const allTabs = this.tabManager.getAllTabs();
      if (index > 0 && index <= allTabs.length) {
        const targetTab = allTabs[index - 1];
        this.tabManager.switchTab(targetTab.id);
        window.electronAPI!.tabs.switch(targetTab.id);
      }
    });
  }

  /**
   * Setup drag & drop handlers for a tab element
   */
  private setupTabDragHandlers(tabElement: HTMLElement, tabId: string): void {
    // Drag start
    tabElement.addEventListener('dragstart', (e: DragEvent) => {
      const tab = this.tabManager.getTab(tabId);
      if (!tab || !e.dataTransfer) return;

      this.draggedTabId = tabId;
      tabElement.classList.add('dragging');

      // Set transfer data for VibeBrowser (internal)
      const transferData: TabTransferData = {
        tabId: tab.id,
        title: tab.title,
        url: tab.url,
        favicon: tab.favicon,
        transferType: 'internal',
      };
      e.dataTransfer.setData('application/x-vibebrowser-tab', JSON.stringify(transferData));

      // Set transfer data for external apps (Chrome, etc.)
      e.dataTransfer.setData('text/uri-list', tab.url);
      e.dataTransfer.setData('text/plain', tab.url);
      e.dataTransfer.setData('text/html', `<a href="${tab.url}">${tab.title}</a>`);

      // Set drag effect
      e.dataTransfer.effectAllowed = 'move';

      // Create custom drag image (optional)
      const dragImage = tabElement.cloneNode(true) as HTMLElement;
      dragImage.style.opacity = '0.8';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 0, 0);
      setTimeout(() => dragImage.remove(), 0);
    });

    // Drag end
    tabElement.addEventListener('dragend', (e: DragEvent) => {
      tabElement.classList.remove('dragging');
      
      // If drag was successful and tab was dropped outside window
      if (e.dataTransfer?.dropEffect === 'move') {
        // Tab might have been transferred to another window or app
        console.log('Tab drag completed:', tabId);
      }

      this.draggedTabId = null;
      this.removeDragPlaceholders();
    });

    // Drag over (for reordering within tab bar)
    tabElement.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault();
      if (!e.dataTransfer) return;

      const draggedOverTabId = tabElement.getAttribute('data-tab-id');
      if (draggedOverTabId === this.draggedTabId) return;

      // Show drop indicator
      const rect = tabElement.getBoundingClientRect();
      const midpoint = rect.left + rect.width / 2;
      const insertBefore = e.clientX < midpoint;

      this.showDragPlaceholder(tabElement, insertBefore);
      e.dataTransfer.dropEffect = 'move';
    });

    // Drop (for reordering)
    tabElement.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!e.dataTransfer) return;

      // Handle internal tab reorder
      const transferData = e.dataTransfer.getData('application/x-vibebrowser-tab');
      if (transferData && this.draggedTabId) {
        const targetTabId = tabElement.getAttribute('data-tab-id');
        if (targetTabId && targetTabId !== this.draggedTabId) {
          this.reorderTab(this.draggedTabId, targetTabId);
        }
      }

      this.removeDragPlaceholders();
    });
  }

  /**
   * Setup window-level drop zone for external tabs and URLs
   */
  private setupWindowDropZone(): void {
    if (this.windowDropZoneSetup) return;
    this.windowDropZoneSetup = true;

    // Prevent default drag behavior on document
    document.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault();
    });

    // Handle drops on window (outside tab bar)
    document.addEventListener('drop', async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!e.dataTransfer) return;

      // Try to get VibeBrowser tab data
      const vibeBrowserTab = e.dataTransfer.getData('application/x-vibebrowser-tab');
      if (vibeBrowserTab) {
        try {
          const transferData: TabTransferData = JSON.parse(vibeBrowserTab);
          console.log('Received tab transfer:', transferData);
          
          // If from same window, ignore (already handled by tab reorder)
          if (transferData.transferType === 'internal' && this.draggedTabId) {
            return;
          }

          // Create new tab with transferred data
          await this.createTabFromTransfer(transferData);
        } catch (error) {
          console.error('Error handling tab transfer:', error);
        }
        return;
      }

      // Try to get URL from external source (Chrome, etc.)
      const url = e.dataTransfer.getData('text/uri-list') || 
                  e.dataTransfer.getData('text/plain') ||
                  e.dataTransfer.getData('URL');

      if (url && this.isValidUrl(url)) {
        console.log('Received external URL drop:', url);
        const tabData = await window.electronAPI!.tabs.create(url);
        
        const tab = {
          id: tabData.tabId,
          title: this.t('Loading...', 'Lädt...'),
          url: url,
          favicon: '',
          isLoading: true,
        };

        this.tabManager.addTab(tab);
        this.createTabUI(tabData.tabId);
        this.tabManager.switchTab(tabData.tabId);
        window.electronAPI!.tabs.switch(tabData.tabId);
      }
    });

    // Handle drag leave
    document.addEventListener('dragleave', (e: DragEvent) => {
      // Only trigger if leaving the entire window
      if (e.target === document.documentElement) {
        this.removeDragPlaceholders();
      }
    });
  }

  /**
   * Create tab from transfer data
   */
  private async createTabFromTransfer(transferData: TabTransferData): Promise<void> {
    const tabData = await window.electronAPI!.tabs.create(transferData.url);
    
    const tab = {
      id: tabData.tabId,
      title: transferData.title || this.t('Loading...', 'Lädt...'),
      url: transferData.url,
      favicon: transferData.favicon,
      isLoading: true,
    };

    this.tabManager.addTab(tab);
    this.createTabUI(tabData.tabId);
    this.tabManager.switchTab(tabData.tabId);
    window.electronAPI!.tabs.switch(tabData.tabId);
  }

  /**
   * Reorder tab in tab bar
   */
  private reorderTab(draggedTabId: string, targetTabId: string): void {
    const draggedElement = document.getElementById(`ui-${draggedTabId}`);
    const targetElement = document.getElementById(`ui-${targetTabId}`);

    if (!draggedElement || !targetElement) return;

    const allTabElements = Array.from(this.tabsContainerElement.querySelectorAll('.tab'));
    const draggedIndex = allTabElements.indexOf(draggedElement);
    const targetIndex = allTabElements.indexOf(targetElement);

    if (draggedIndex < targetIndex) {
      targetElement.after(draggedElement);
    } else {
      targetElement.before(draggedElement);
    }
  }

  /**
   * Show drag placeholder
   */
  private showDragPlaceholder(targetElement: HTMLElement, insertBefore: boolean): void {
    this.removeDragPlaceholders();

    const placeholder = document.createElement('div');
    placeholder.className = 'tab-drag-placeholder';
    placeholder.style.cssText = 'width: 2px; height: 30px; background: var(--accent-color); margin: 0 4px;';
    
    if (insertBefore) {
      targetElement.before(placeholder);
    } else {
      targetElement.after(placeholder);
    }

    this.dragPlaceholder = placeholder;
  }

  /**
   * Remove drag placeholders
   */
  private removeDragPlaceholders(): void {
    if (this.dragPlaceholder) {
      this.dragPlaceholder.remove();
      this.dragPlaceholder = null;
    }
  }

  /**
   * Check if string is valid URL
   */
  private isValidUrl(str: string): boolean {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }

  private setupEventListeners(): void {
    if (this.eventListenersSetup) return;
    this.eventListenersSetup = true;
  }

  /**
   * Neue Tab öffnen
   */
  private async handleNewTab(): Promise<void> {
    if (this.isCreatingNewTab) {
      return;
    }

    this.isCreatingNewTab = true;

    try {
      const tabData = await window.electronAPI!.tabs.create();
      console.log('New tab created:', tabData);

      const tab = {
        id: tabData.tabId,
        title: this.t('New tab', 'Neue Tab'),
        url: tabData.url,
        favicon: '',
        isLoading: true,
      };

      this.tabManager.addTab(tab);
      this.createTabUI(tabData.tabId);
      this.tabManager.switchTab(tabData.tabId);
      window.electronAPI!.tabs.switch(tabData.tabId);
    } finally {
      this.isCreatingNewTab = false;
    }
  }

  /**
   * UI für einen Tab erstellen
   */
  private createTabUI(tabId: string): void {
    const tab = this.tabManager.getTab(tabId);
    if (!tab) return;

    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.id = `ui-${tabId}`;
    tabElement.setAttribute('data-tab-id', tabId);
    tabElement.draggable = true; // Make tab draggable
    tabElement.innerHTML = `
      <img class="tab-icon" src="" style="display: none;">
      <span class="tab-title">${this.t('Loading...', 'Lädt...')}</span>
      <span class="tab-spinner" aria-hidden="true"></span>
      <button class="close-tab-btn">✖</button>
    `;

    // Tab-Klick zum Wechsel
    tabElement.addEventListener('click', () => {
      this.tabManager.switchTab(tabId);
      window.electronAPI!.tabs.switch(tabId);
    });

    // Tab-Schließen
    tabElement.querySelector('.close-tab-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleCloseTab(tabId, tabElement);
    });

    // Drag & Drop Events
    this.setupTabDragHandlers(tabElement, tabId);

    this.tabsContainerElement.appendChild(tabElement);
  }

  /**
   * Tab schließen
   */
  private handleCloseTab(tabId: string, tabElement: HTMLElement): void {
    const closingTab = this.tabManager.getTab(tabId);
    if (closingTab && closingTab.url && !closingTab.url.startsWith('vibebrowser://')) {
      this.recentlyClosedTabs.push({
        url: closingTab.url,
        title: closingTab.title || 'Wiederhergestellter Tab',
      });

      if (this.recentlyClosedTabs.length > 20) {
        this.recentlyClosedTabs.shift();
      }
    }

    this.tabManager.closeTab(tabId);
    tabElement.remove();
    window.electronAPI!.tabs.close(tabId);

    // Wenn noch Tabs übrig, zum letzten Tab wechseln
    const remainingTabs = this.tabManager.getAllTabs();
    if (remainingTabs.length > 0) {
      const lastTab = remainingTabs[remainingTabs.length - 1];
      this.tabManager.switchTab(lastTab.id);
      window.electronAPI!.tabs.switch(lastTab.id);
    }
  }

  /**
   * Reopen last closed tab
   */
  private async reopenLastClosedTab(): Promise<void> {
    const lastClosedTab = this.recentlyClosedTabs.pop();
    if (!lastClosedTab) {
      return;
    }

    try {
      const tabData = await window.electronAPI!.tabs.create(lastClosedTab.url);

      const tab = {
        id: tabData.tabId,
        title: lastClosedTab.title || this.t('Loading...', 'Lädt...'),
        url: lastClosedTab.url,
        favicon: '',
        isLoading: true,
      };

      this.tabManager.addTab(tab);
      this.createTabUI(tabData.tabId);
      this.tabManager.switchTab(tabData.tabId);
      window.electronAPI!.tabs.switch(tabData.tabId);
    } catch (error) {
      console.error('Error reopening closed tab:', error);
    }
  }

  /**
   * Tab-UI aktualisieren
   */
  private updateTabUI(tab: TabData): void {
    const tabElement = document.getElementById(`ui-${tab.id}`);
    if (!tabElement) return;

    const titleElement = tabElement.querySelector('.tab-title') as HTMLElement;
    if (titleElement) {
      titleElement.innerText = tab.title || this.t('Loading...', 'Lädt...');
    }

    const iconElement = tabElement.querySelector('.tab-icon') as HTMLImageElement;
    if (iconElement && tab.favicon) {
      iconElement.src = tab.favicon;
      iconElement.style.display = 'block';
    }

    if (tab.isLoading) {
      tabElement.classList.add('loading');
    } else {
      tabElement.classList.remove('loading');
    }

    this.applyTabGroupStyle(tab);
  }

  /**
   * Setup UI event listeners for sidebars and panels
   */
  private setupUIEventListeners(): void {
    // Prevent multiple registration of event listeners
    if (this.uiEventListenersSetup) return;
    this.uiEventListenersSetup = true;

    // Bookmark current page button is now handled via onclick in HTML
    // bookmarksBtn, historyBtn, settingsBtn are now handled via onclick in HTML
    // They use: window.app?.openBookmarksTab(), window.app?.openHistoryTab(), window.app?.openSettingsTab()
    
    // Keep these for sidebar close buttons (old UI elements that still exist)
    const closeBookmarksBtn = document.getElementById('close-bookmarks-btn');
    closeBookmarksBtn?.addEventListener('click', () => {
      this.hideBookmarksSidebar();
    });

    const closeHistoryBtn = document.getElementById('close-history-btn');
    closeHistoryBtn?.addEventListener('click', () => {
      this.hideHistorySidebar();
    });

    // History search
    const historySearchInput = document.getElementById('history-search') as HTMLInputElement;
    historySearchInput?.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value;
      this.searchHistory(query);
    });

    // Clear history button
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    clearHistoryBtn?.addEventListener('click', () => {
      this.clearHistory();
    });

    // Settings panel close button (old UI element)
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    closeSettingsBtn?.addEventListener('click', () => {
      this.hideSettingsPanel();
    });

    // Save settings button (old UI element)
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    saveSettingsBtn?.addEventListener('click', () => {
      this.saveSettings();
    });

    // Changelog button in update notification
    const changelogBtn = document.getElementById('changelog-btn');
    changelogBtn?.addEventListener('click', () => {
      this.showChangelogModal();
    });

    // Close changelog modal
    const closeChangelogBtn = document.getElementById('close-changelog-btn');
    const changelogOverlay = document.getElementById('changelog-overlay');
    
    closeChangelogBtn?.addEventListener('click', () => {
      this.hideChangelogModal();
    });
    
    changelogOverlay?.addEventListener('click', () => {
      this.hideChangelogModal();
    });
    
  }

  /**
   * Toggle bookmarks sidebar
   */
  private async toggleBookmarksSidebar(): Promise<void> {
    if (!this.bookmarksSidebar) {
      console.error('[ERROR] Bookmarks sidebar element not found!');
      return;
    }
    
    const isHidden = this.bookmarksSidebar.classList.contains('sidebar-hidden');
    
    if (isHidden) {
      // Close other sidebars
      this.hideHistorySidebar();
      this.hideSettingsPanel();
      
      // Load and show bookmarks
      await this.loadBookmarks();
      this.bookmarksSidebar.classList.remove('sidebar-hidden');
    } else {
      this.hideBookmarksSidebar();
    }
  }

  private hideBookmarksSidebar(): void {
    if (this.bookmarksSidebar) {
      this.bookmarksSidebar.classList.add('sidebar-hidden');
    }
  }

  /**
   * Load and display bookmarks
   */
  private async loadBookmarks(): Promise<void> {
    try {
      const bookmarks = await window.electronAPI!.bookmarks.getAll();
      const bookmarksList = document.getElementById('bookmarks-list') as HTMLElement;
      
      if (!bookmarksList) return;
      
      if (!bookmarks || bookmarks.length === 0) {
        bookmarksList.innerHTML = `<p class="empty-message">${this.t('No bookmarks available.', 'Keine Lesezeichen vorhanden.')}</p>`;
        return;
      }

      bookmarksList.innerHTML = '';
      
      for (const bookmark of bookmarks) {
        const item = document.createElement('div');
        item.className = 'bookmark-item';
        item.innerHTML = `
          <img class="bookmark-item-icon" src="${bookmark.favicon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="%2389b4fa"/></svg>'}" />
          <div class="bookmark-item-content">
            <div class="bookmark-item-title">${this.escapeHtml(bookmark.title)}</div>
            <div class="bookmark-item-url">${this.escapeHtml(bookmark.url)}</div>
          </div>
          <button class="bookmark-item-remove" data-id="${bookmark.id}">✕</button>
        `;

        // Click to open
        item.addEventListener('click', (e) => {
          if (!(e.target as HTMLElement).classList.contains('bookmark-item-remove')) {
            const activeTabId = this.tabManager.getActiveTabId();
            if (activeTabId) {
              window.electronAPI!.navigate.to(activeTabId, bookmark.url);
              this.hideBookmarksSidebar();
            }
          }
        });

        // Remove button
        const removeBtn = item.querySelector('.bookmark-item-remove');
        removeBtn?.addEventListener('click', async (e) => {
          e.stopPropagation();
          await window.electronAPI!.bookmarks.remove(bookmark.id);
          await this.loadBookmarks();
        });

        bookmarksList.appendChild(item);
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  }

  /**
   * Toggle history sidebar
   */
  private async toggleHistorySidebar(): Promise<void> {
    if (!this.historySidebar) return;
    const isHidden = this.historySidebar.classList.contains('sidebar-hidden');
    
    if (isHidden) {
      // Close other sidebars
      this.hideBookmarksSidebar();
      this.hideSettingsPanel();
      
      // Load and show history
      await this.loadHistory();
      this.historySidebar.classList.remove('sidebar-hidden');
    } else {
      this.hideHistorySidebar();
    }
  }

  private hideHistorySidebar(): void {
    if (this.historySidebar) {
      this.historySidebar.classList.add('sidebar-hidden');
    }
  }

  /**
   * Load and display history
   */
  private async loadHistory(): Promise<void> {
    try {
      const history = await window.electronAPI!.history.getAll();
      this.displayHistory(history);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }

  /**
   * Display history items
   */
  private displayHistory(history: any[]): void {
    const historyList = document.getElementById('history-list') as HTMLElement;
    
    if (!historyList) return;
    
    if (!history || history.length === 0) {
      historyList.innerHTML = `<p class="empty-message">${this.t('No history available.', 'Kein Verlauf vorhanden.')}</p>`;
      return;
    }

    historyList.innerHTML = '';
    
    for (const item of history) {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      
      const timeAgo = this.formatTimeAgo(item.timestamp);
      
      historyItem.innerHTML = `
        <img class="history-item-icon" src="${item.favicon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="%2389b4fa"/></svg>'}" />
        <div class="history-item-content">
          <div class="history-item-title">${this.escapeHtml(item.title)}</div>
          <div class="history-item-url">${this.escapeHtml(item.url)}</div>
        </div>
        <div class="history-item-time">${timeAgo}</div>
      `;

      historyItem.addEventListener('click', () => {
        const activeTabId = this.tabManager.getActiveTabId();
        if (activeTabId) {
          window.electronAPI!.navigate.to(activeTabId, item.url);
          this.hideHistorySidebar();
        }
      });

      historyList.appendChild(historyItem);
    }
  }

  /**
   * Search history
   */
  private async searchHistory(query: string): Promise<void> {
    try {
      if (!query.trim()) {
        await this.loadHistory();
        return;
      }

      const results = await window.electronAPI!.history.search(query);
      this.displayHistory(results);
    } catch (error) {
      console.error('Error searching history:', error);
    }
  }

  /**
   * Clear history
   */
  private async clearHistory(): Promise<void> {
    if (confirm(this.t('Do you really want to clear all history?', 'Möchten Sie wirklich den gesamten Verlauf löschen?'))) {
      try {
        await window.electronAPI!.history.clear();
        await this.loadHistory();
      } catch (error) {
        console.error('Error clearing history:', error);
      }
    }
  }

  /**
   * Toggle settings panel
   */
  private async toggleSettingsPanel(): Promise<void> {
    if (!this.settingsPanel) {
      return;
    }
    
    const isHidden = this.settingsPanel.classList.contains('panel-hidden');
    
    if (isHidden) {
      // Close sidebars
      this.hideBookmarksSidebar();
      this.hideHistorySidebar();
      
      // Load and show settings
      await this.loadSettings();
      this.settingsPanel.classList.remove('panel-hidden');
    } else {
      this.hideSettingsPanel();
    }
  }

  private hideSettingsPanel(): void {
    if (this.settingsPanel) {
      this.settingsPanel.classList.add('panel-hidden');
    }
  }

  /**
   * Load settings
   */
  private async loadSettings(): Promise<void> {
    try {
      const settings = await window.electronAPI!.settings.get();
      
      const homepageInput = document.getElementById('homepage-input') as HTMLInputElement;
      const searchEngineSelect = document.getElementById('search-engine-select') as HTMLSelectElement;
      const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
      const languageSelect = document.getElementById('language-select') as HTMLSelectElement;

      if (homepageInput) homepageInput.value = settings.homepage || 'https://www.google.com';
      if (searchEngineSelect) searchEngineSelect.value = settings.searchEngine || 'https://www.google.com/search?q=';
      if (languageSelect) languageSelect.value = settings.language || 'en';
      
      // Load themes into dropdown
      await this.loadThemesList();
      
      // Get current theme preference and apply CSS
      const currentTheme = await window.electronAPI!.themes.getPreference();
      const themeToLoad = currentTheme || 'catppuccin-mocha';
      if (themeSelect) themeSelect.value = themeToLoad;
      
      // Load and apply current theme CSS
      try {
        const themeCss = await window.electronAPI!.themes.load(themeToLoad);
        if (themeCss) {
          this.applyThemeCss(themeCss);
        }
      } catch (error) {
        console.error('Error loading current theme CSS:', error);
      }
      
      // Load adblock stats
      await this.loadAdblockStats();
      
      // Setup settings tab switching (only once)
      if (!this.settingsTabsSetup) {
        this.setupSettingsTabs();
        this.settingsTabsSetup = true;
      }
      
      // Setup event listeners for new features (only once)
      if (!this.featureHandlersSetup) {
        this.setupThemeHandlers();
        this.setupAdblockHandlers();
        this.featureHandlersSetup = true;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  /**
   * Load available themes into dropdown
   */
  private async loadThemesList(): Promise<void> {
    try {
      const themes = await window.electronAPI!.themes.getAll();
      const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
      
      if (!themeSelect) return;
      
      themeSelect.innerHTML = '';
      themes.forEach(theme => {
        const option = document.createElement('option');
        option.value = theme.name;
        option.textContent = theme.name.charAt(0).toUpperCase() + theme.name.slice(1);
        themeSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading themes:', error);
    }
  }

  /**
   * Setup settings tab switching
   */
  private setupSettingsTabs(): void {
    const tabButtons = document.querySelectorAll('.settings-tab-btn');
    
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tabName = target.getAttribute('data-tab');
        if (!tabName) return;
        
        // Remove active class from all buttons
        tabButtons.forEach(b => b.classList.remove('active'));
        target.classList.add('active');
        
        // Hide all tab contents
        const contents = document.querySelectorAll('.settings-tab-content');
        contents.forEach(content => content.classList.remove('active'));
        
        // Show selected tab content
        const selectedContent = document.getElementById(`tab-${tabName}`);
        if (selectedContent) selectedContent.classList.add('active');
      });
    });
    
    // Activate first tab on load
    const firstBtn = tabButtons[0];
    if (firstBtn) {
      firstBtn.classList.add('active');
      const firstTabName = firstBtn.getAttribute('data-tab');
      if (firstTabName) {
        const firstContent = document.getElementById(`tab-${firstTabName}`);
        if (firstContent) firstContent.classList.add('active');
      }
    }
  }

  /**
   * Setup theme selection handlers
   */
  private setupThemeHandlers(): void {
    const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
    const openThemesFolderBtn = document.getElementById('open-themes-folder-btn');
    
    // Theme change handler
    themeSelect?.addEventListener('change', async (e) => {
      const themeName = (e.target as HTMLSelectElement).value;
      if (!themeName) return;
      
      try {
        // Save preference
        await window.electronAPI!.themes.savePreference(themeName);
        
        // Load and apply theme CSS
        const themeCss = await window.electronAPI!.themes.load(themeName);
        if (themeCss) {
          this.applyThemeCss(themeCss);
        }
        
        console.log(`Theme switched to: ${themeName}`);
      } catch (error) {
        console.error('Error switching theme:', error);
      }
    });
    
    // Open themes folder button
    openThemesFolderBtn?.addEventListener('click', async () => {
      try {
        await window.electronAPI!.themes.openFolder();
      } catch (error) {
        console.error('Error opening themes folder:', error);
      }
    });
  }

  /**
   * Apply theme CSS to document
   */
  private async applyAppearanceSettings(): Promise<void> {
    try {
      const settings = await window.electronAPI!.settings.get();
      this.currentLanguage = settings.language === 'de' ? 'de' : 'en';
      const themeName = settings.theme || 'catppuccin-mocha';

      const themeCss = await window.electronAPI!.themes.load(themeName);
      if (themeCss) {
        this.applyThemeCss(themeCss);
      }

      if (settings.customCssEnabled) {
        const customCss = await window.electronAPI!.customCss.get();
        this.applyUserCss(customCss);
      } else {
        this.clearUserCss();
      }

      if (settings.customBackgroundEnabled && settings.customBackgroundImage) {
        this.applyCustomBackground(settings.customBackgroundImage);
      } else {
        this.clearCustomBackground();
      }

      if (settings.editorModeCss) {
        this.applyEditorModeCss(settings.editorModeCss);
      } else {
        this.clearEditorModeCss();
      }

      this.trustRadarEnabled = settings.trustRadarEnabled !== false;
      this.applyLanguageToMainUI();

      const activeTabId = this.tabManager.getActiveTabId();
      if (activeTabId) {
        const activeTab = this.tabManager.getTab(activeTabId);
        this.updateTrustRadar(activeTab?.url || '');
      }
    } catch (error) {
      console.error('Error applying appearance settings:', error);
    }
  }

  private applyCustomBackground(imageDataUrl: string): void {
    const safeImageUrl = imageDataUrl.replace(/"/g, '%22');
    const body = document.body;
    body.style.backgroundImage = `linear-gradient(rgba(17,17,27,0.55), rgba(17,17,27,0.55)), url("${safeImageUrl}")`;
    body.style.backgroundSize = 'cover';
    body.style.backgroundPosition = 'center';
    body.style.backgroundRepeat = 'no-repeat';
    body.style.backgroundAttachment = 'fixed';
  }

  private clearCustomBackground(): void {
    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundPosition = '';
    document.body.style.backgroundRepeat = '';
    document.body.style.backgroundAttachment = '';
  }

  private applyEditorModeCss(css: string): void {
    let styleElement = document.getElementById('editor-mode-style') as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'editor-mode-style';
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = css || '';
  }

  private clearEditorModeCss(): void {
    const styleElement = document.getElementById('editor-mode-style');
    if (styleElement) {
      styleElement.remove();
    }
  }

  /**
   * Apply user custom CSS
   */
  private applyUserCss(css: string): void {
    let styleElement = document.getElementById('user-css-style') as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'user-css-style';
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = css || '';
  }

  /**
   * Remove user custom CSS
   */
  private clearUserCss(): void {
    const styleElement = document.getElementById('user-css-style');
    if (styleElement) {
      styleElement.remove();
    }
  }

  /**
   * Apply theme CSS to document
   */
  private applyThemeCss(themeCss: string): void {
    let styleElement = document.getElementById('theme-style') as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'theme-style';
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = themeCss;
  }

  /**
   * Load and display adblock stats
   */
  private async loadAdblockStats(): Promise<void> {
    try {
      const stats = await window.electronAPI!.adblock.getStats();
      const statsElement = document.getElementById('adblock-stats');
      
      if (statsElement) {
        statsElement.textContent = this.t(
          `Active rules: ${stats.rules} | Whitelist: ${stats.whitelist} | Blocked: ${stats.blocked}`,
          `Aktive Regeln: ${stats.rules} | Whitelist: ${stats.whitelist} | Geblockt: ${stats.blocked}`
        );
      }
    } catch (error) {
      console.error('Error loading adblock stats:', error);
    }
  }

  /**
   * Setup adblock handlers
   */
  private setupAdblockHandlers(): void {
    const addRuleBtn = document.getElementById('add-adblock-rule-btn');
    const ruleInput = document.getElementById('adblock-rule-input') as HTMLInputElement;
    const reloadRulesBtn = document.getElementById('reload-adblock-rules-btn');
    const openRulesBtn = document.getElementById('open-adblock-rules-btn');
    
    // Add custom rule button
    addRuleBtn?.addEventListener('click', async () => {
      const rule = ruleInput?.value.trim();
      if (!rule) {
        alert(this.t('Please enter a rule.', 'Bitte geben Sie eine Regel ein.'));
        return;
      }
      
      try {
        await window.electronAPI!.adblock.addRule(rule);
        if (ruleInput) ruleInput.value = '';
        await this.loadAdblockStats();
        console.log(`Adblock rule added: ${rule}`);
      } catch (error) {
        console.error('Error adding adblock rule:', error);
        alert(this.t('Error adding rule.', 'Fehler beim Hinzufügen der Regel.'));
      }
    });
    
    // Reload rules button
    reloadRulesBtn?.addEventListener('click', async () => {
      try {
        await window.electronAPI!.adblock.reloadRules();
        await this.loadAdblockStats();
        alert(this.t('Adblock rules reloaded.', 'Adblock-Regeln neu geladen.'));
      } catch (error) {
        console.error('Error reloading adblock rules:', error);
        alert(this.t('Error reloading rules.', 'Fehler beim Neuladen der Regeln.'));
      }
    });
    
    // Open rules file button
    openRulesBtn?.addEventListener('click', async () => {
      try {
        const rulesPath = await window.electronAPI!.adblock.getRulesPath();
        // Could open file manager here in future
        console.log(`Adblock rules path: ${rulesPath}`);
      } catch (error) {
        console.error('Error getting rules path:', error);
      }
    });
    
    // Enter key to add rule
    ruleInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        addRuleBtn?.click();
      }
    });
  }

  /**
   * Setup search suggestions handler for URL bar
   */
  private setupSearchSuggestionsHandler(): void {
    // Prevent multiple registration of event listeners
    if (this.searchSuggestionsSetup) return;
    this.searchSuggestionsSetup = true;

    const urlInput = document.getElementById('url-bar') as HTMLInputElement;
    const suggestionsBox = document.getElementById('search-suggestions');
    
    if (!urlInput || !suggestionsBox) return;
    
    let suggestionsTimeout: NodeJS.Timeout;
    let activeIndex = -1;
    
    const hideSuggestions = () => {
      suggestionsBox.classList.add('hidden');
      suggestionsBox.innerHTML = '';
      activeIndex = -1;
    };

    const selectSuggestion = async (text: string) => {
      urlInput.value = text;
      hideSuggestions();

      const activeTabId = this.tabManager.getActiveTabId();
      if (!activeTabId) return;

      const resolvedUrl = await this.resolveInputToUrl(text);
      window.electronAPI!.navigate.to(activeTabId, resolvedUrl);
      this.tabManager.updateTab(activeTabId, {
        url: resolvedUrl,
        isLoading: true,
      });
    };

    const renderSuggestions = (items: string[]) => {
      if (items.length === 0) {
        hideSuggestions();
        return;
      }

      suggestionsBox.innerHTML = '';
      items.forEach((text, index) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'suggestion-item';
        item.textContent = text;
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          selectSuggestion(text);
        });
        if (index === activeIndex) {
          item.classList.add('active');
        }
        suggestionsBox.appendChild(item);
      });

      suggestionsBox.classList.remove('hidden');
    };
    
    urlInput.addEventListener('input', async (e) => {
      const query = (e.target as HTMLInputElement).value.trim();
      
      clearTimeout(suggestionsTimeout);
      activeIndex = -1;
      
      if (!query || query.length < 2) {
        hideSuggestions();
        return;
      }
      
      suggestionsTimeout = setTimeout(async () => {
        try {
          const suggestions = await window.electronAPI!.search.getSuggestions(query);
          renderSuggestions(suggestions);
        } catch (error) {
          console.error('Error getting search suggestions:', error);
        }
      }, 250);
    });

    urlInput.addEventListener('keydown', (e) => {
      const items = Array.from(suggestionsBox.querySelectorAll('.suggestion-item')) as HTMLButtonElement[];
      if (items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % items.length;
        renderSuggestions(items.map((i) => i.textContent || ''));
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + items.length) % items.length;
        renderSuggestions(items.map((i) => i.textContent || ''));
      }

      if (e.key === 'Enter' && activeIndex >= 0 && items[activeIndex]) {
        e.preventDefault();
        selectSuggestion(items[activeIndex].textContent || '');
      }
    });

    urlInput.addEventListener('blur', () => {
      setTimeout(() => hideSuggestions(), 120);
    });
  }

  /**
   * Save settings
   */
  private async saveSettings(): Promise<void> {
    try {
      const homepageInput = document.getElementById('homepage-input') as HTMLInputElement;
      const searchEngineSelect = document.getElementById('search-engine-select') as HTMLSelectElement;
      const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
      const languageSelect = document.getElementById('language-select') as HTMLSelectElement;

      if (!homepageInput || !searchEngineSelect || !themeSelect || !languageSelect) {
        alert(this.t('Some settings elements could not be found.', 'Einige Einstellungs-Elemente konnten nicht gefunden werden.'));
        return;
      }

      const current = await window.electronAPI!.settings.get();
      const settings = {
        ...current,
        language: languageSelect.value === 'de' ? 'de' : 'en',
        homepage: homepageInput.value,
        searchEngine: searchEngineSelect.value,
        theme: themeSelect.value,
      };

      await window.electronAPI!.settings.save(settings);
      window.electronAPI!.settings.notifyUpdated();
      alert(this.t('Settings saved!', 'Einstellungen gespeichert!'));
      this.hideSettingsPanel();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(this.t('Error saving settings.', 'Fehler beim Speichern der Einstellungen.'));
    }
  }

  /**
   * Resolve input into a URL or search query
   */
  private async resolveInputToUrl(input: string): Promise<string> {
    const trimmed = input.trim();
    if (!trimmed) return 'about:blank';

    const normalizedInternalInput = trimmed.toLowerCase();
    if (normalizedInternalInput === 'vibebrowser/offline') return 'vibebrowser://offline';
    if (normalizedInternalInput === 'vibebrowser/settings') return 'vibebrowser://settings';
    if (normalizedInternalInput === 'vibebrowser/bookmarks') return 'vibebrowser://bookmarks';
    if (normalizedInternalInput === 'vibebrowser/history') return 'vibebrowser://history';

    if (this.isLikelyUrl(trimmed)) {
      if (
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('file:') ||
        trimmed.startsWith('about:') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('vibebrowser://') ||
        trimmed.startsWith('blob:')
      ) {
        return trimmed;
      }
      return `https://${trimmed}`;
    }

    const settings = await window.electronAPI!.settings.get();
    const searchBase = settings.searchEngine || 'https://www.google.com/search?q=';
    return `${searchBase}${encodeURIComponent(trimmed)}`;
  }

  /**
   * Heuristic to detect URLs vs search queries
   */
  private isLikelyUrl(input: string): boolean {
    if (input.includes(' ')) return false;
    if (input.includes('.')) return true;
    if (input.startsWith('http://') || input.startsWith('https://')) return true;
    if (input.startsWith('file:') || input.startsWith('about:')) return true;
    if (input.startsWith('data:') || input.startsWith('vibebrowser://')) return true;
    if (input.startsWith('blob:')) return true;
    return false;
  }

  /**
   * Utility: Format timestamp to relative time
   */
  private formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return this.t('just now', 'gerade');
  }

  /**
   * Utility: Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private t(en: string, de: string): string {
    return this.currentLanguage === 'de' ? de : en;
  }

  private applyLanguageToMainUI(): void {
    document.documentElement.lang = this.currentLanguage;

    const urlBar = document.getElementById('url-bar') as HTMLInputElement;
    if (urlBar) {
      urlBar.placeholder = this.t('Enter URL and press Enter...', 'URL eingeben und Enter drücken...');
    }

    const backBtn = document.getElementById('back-btn');
    const forwardBtn = document.getElementById('forward-btn');
    const reloadBtn = document.getElementById('reload-btn');
    const bookmarksBtn = document.getElementById('bookmarks-btn');
    const historyBtn = document.getElementById('history-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const bookmarkCurrentBtn = document.getElementById('bookmark-current-btn');
    const newTabBtn = document.getElementById('new-tab-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const clearDownloadsBtn = document.getElementById('clear-downloads-btn');
    const changelogBtn = document.getElementById('changelog-btn');

    backBtn?.setAttribute('title', this.t('Back', 'Zurück'));
    forwardBtn?.setAttribute('title', this.t('Forward', 'Vorwärts'));
    reloadBtn?.setAttribute('title', this.t('Reload', 'Neu laden'));
    bookmarksBtn?.setAttribute('title', this.t('Bookmarks', 'Lesezeichen'));
    historyBtn?.setAttribute('title', this.t('History', 'Verlauf'));
    settingsBtn?.setAttribute('title', this.t('Settings', 'Einstellungen'));
    bookmarkCurrentBtn?.setAttribute('title', this.t('Add bookmark (Ctrl+D)', 'Lesezeichen hinzufügen (Ctrl+D)'));
    newTabBtn?.setAttribute('title', this.t('Open new tab', 'Neuen Tab öffnen'));
    clearDownloadsBtn?.setAttribute('title', this.t('Clear completed', 'Abgeschlossene löschen'));

    if (clearHistoryBtn) {
      clearHistoryBtn.textContent = this.t('Clear history', 'Verlauf löschen');
    }

    if (changelogBtn) {
      changelogBtn.textContent = this.t('View changelog', 'Changelog ansehen');
    }

    const emptyMessages = document.querySelectorAll('.empty-message');
    if (emptyMessages[0]) {
      emptyMessages[0].textContent = this.t('No bookmarks available.', 'Keine Lesezeichen vorhanden.');
    }
    if (emptyMessages[1]) {
      emptyMessages[1].textContent = this.t('No history available.', 'Kein Verlauf vorhanden.');
    }

    const downloadEmptyMessage = document.querySelector('.download-empty-message');
    if (downloadEmptyMessage) {
      downloadEmptyMessage.textContent = this.t('No downloads', 'Keine Downloads');
    }
  }

  private updateTrustRadar(url: string): void {
    const trustEl = document.getElementById('trust-radar');
    if (!trustEl) return;

    if (!this.trustRadarEnabled) {
      trustEl.style.display = 'none';
      return;
    }

    trustEl.style.display = 'block';

    const isCustomBrowserSite = url.startsWith('vibebrowser://');
    if (isCustomBrowserSite) {
      trustEl.textContent = 'Trust CBS';
      trustEl.setAttribute(
        'title',
        this.t(
          'CBS = Custom Browser Site (trusted internal page, maximum trust)',
          'CBS = Custom Browser Site (vertrauenswürdige interne Seite, maximaler Trust)'
        )
      );
      trustEl.classList.remove('medium', 'risky');
      trustEl.classList.add('good');
      return;
    }

    const score = this.calculateTrustScore(url);
    trustEl.textContent = `Trust ${score}`;
    trustEl.setAttribute(
      'title',
      this.t(
        'Trust score based on protocol, host and URL heuristics',
        'Trust-Score basierend auf Protokoll, Host und URL-Heuristiken'
      )
    );
    trustEl.classList.remove('good', 'medium', 'risky');

    if (score >= 75) {
      trustEl.classList.add('good');
    } else if (score >= 45) {
      trustEl.classList.add('medium');
    } else {
      trustEl.classList.add('risky');
    }
  }

  private calculateTrustScore(url: string): number {
    try {
      const parsed = new URL(url);
      let score = 65;
      const host = parsed.hostname.toLowerCase();

      if (parsed.protocol === 'https:') score += 15;
      if (parsed.protocol === 'http:') score -= 25;

      if (host.includes('xn--')) score -= 25;
      if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) score -= 20;
      if (host.length > 30) score -= 8;
      if ((host.match(/-/g) || []).length >= 3) score -= 8;

      const suspiciousTerms = ['login', 'verify', 'secure', 'wallet', 'free', 'bonus', 'gift'];
      const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();
      if (suspiciousTerms.some((term) => pathAndQuery.includes(term))) score -= 10;

      if (host.endsWith('.gov') || host.endsWith('.edu')) score += 8;

      return Math.max(0, Math.min(100, score));
    } catch {
      return 20;
    }
  }

  // ============================================================================
  // PUBLIC METHODS - Called from onclick handlers
  // ============================================================================

  /**
   * Get active tab ID (public for onclick handlers)
   */
  public getActiveTabId(): string | null {
    return this.tabManager.getActiveTabId();
  }

  /**
   * Create new tab (public for onclick handlers)
   */
  public createNewTab(): void {
    this.handleNewTab();
  }

  public cycleCurrentTabGroup(): void {
    const activeTabId = this.tabManager.getActiveTabId();
    if (!activeTabId) return;

    const activeTab = this.tabManager.getTab(activeTabId);
    if (!activeTab) return;

    const host = this.getHostFromUrl(activeTab.url);
    if (!host) {
      alert(this.t('Tab groups are available only for website tabs.', 'Tab-Gruppen sind nur für Webseiten-Tabs verfügbar.'));
      return;
    }

    const order = ['none', 'work', 'study', 'fun', 'media'];
    const current = this.tabGroupAssignments[host] || 'none';
    const currentIndex = order.indexOf(current);
    const next = order[(currentIndex + 1) % order.length];

    if (next === 'none') {
      delete this.tabGroupAssignments[host];
      alert(this.t(`Group removed for ${host}`, `Gruppe für ${host} entfernt`));
    } else {
      this.tabGroupAssignments[host] = next;
      alert(this.t(`Assigned ${host} to ${this.tabGroupPalette[next].label}`, `${host} wurde Gruppe ${this.tabGroupPalette[next].label} zugewiesen`));
    }

    this.saveTabGroupAssignments();
    this.tabManager.getAllTabs().forEach((tab) => this.applyTabGroupStyle(tab));
  }

  public quickSwitchGroup(): void {
    const input = window.prompt(
      this.t('Switch to group: work, study, fun, media', 'Zu Gruppe wechseln: work, study, fun, media'),
      'work'
    );

    if (!input) return;

    const normalized = input.trim().toLowerCase();
    if (!this.tabGroupPalette[normalized]) {
      alert(this.t('Unknown group.', 'Unbekannte Gruppe.'));
      return;
    }

    const activeTabId = this.tabManager.getActiveTabId();
    const targetTab = this.tabManager
      .getAllTabs()
      .find((tab) => tab.id !== activeTabId && this.getTabGroupForUrl(tab.url) === normalized);

    if (!targetTab) {
      alert(this.t('No tab found in that group.', 'Kein Tab in dieser Gruppe gefunden.'));
      return;
    }

    this.tabManager.switchTab(targetTab.id);
    window.electronAPI!.tabs.switch(targetTab.id);
  }

  public async saveWorkspaceSnapshot(): Promise<void> {
    const tabs = this.tabManager
      .getAllTabs()
      .filter((tab) => !tab.url.startsWith('vibebrowser://') && !tab.url.startsWith('data:'))
      .map((tab) => ({ url: tab.url, title: tab.title || tab.url }));

    if (tabs.length === 0) {
      alert(this.t('No web tabs to save.', 'Keine Webseiten-Tabs zum Speichern.'));
      return;
    }

    const name = window.prompt(this.t('Workspace name:', 'Workspace-Name:'), `Workspace ${new Date().toLocaleString()}`);
    if (!name || !name.trim()) return;

    await window.electronAPI!.sessions.save(name.trim(), tabs);
    alert(this.t('Workspace saved.', 'Workspace gespeichert.'));
  }

  public async switchWorkspace(): Promise<void> {
    const sessions = (await window.electronAPI!.sessions.getAll()).filter((s: any) => s.name !== '__autosave__');
    if (!sessions.length) {
      alert(this.t('No saved workspaces yet.', 'Noch keine gespeicherten Workspaces vorhanden.'));
      return;
    }

    const listing = sessions
      .map((s: any, index: number) => `${index + 1}. ${s.name} (${s.tabs?.length || 0} tabs)`)
      .join('\n');

    const selected = window.prompt(
      `${this.t('Select workspace number:', 'Workspace-Nummer auswählen:')}\n\n${listing}`,
      '1'
    );

    if (!selected) return;

    const index = Number(selected) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= sessions.length) {
      alert(this.t('Invalid workspace number.', 'Ungültige Workspace-Nummer.'));
      return;
    }

    const chosen = sessions[index];
    const shouldReplace = window.confirm(
      this.t('Replace current tabs with selected workspace?', 'Aktuelle Tabs durch den ausgewählten Workspace ersetzen?')
    );

    if (shouldReplace) {
      const currentTabs = [...this.tabManager.getAllTabs()];
      currentTabs.forEach((tab) => {
        const el = document.getElementById(`ui-${tab.id}`);
        if (el) {
          this.handleCloseTab(tab.id, el as HTMLElement);
        }
      });
    }

    let firstTabId: string | null = null;
    for (const tabEntry of chosen.tabs || []) {
      const tabData = await window.electronAPI!.tabs.create(tabEntry.url);
      const newTab: TabData = {
        id: tabData.tabId,
        title: tabEntry.title || this.t('Loading...', 'Lädt...'),
        url: tabEntry.url,
        favicon: '',
        isLoading: true,
      };

      this.tabManager.addTab(newTab);
      this.createTabUI(tabData.tabId);

      if (!firstTabId) {
        firstTabId = tabData.tabId;
      }
    }

    if (firstTabId) {
      this.tabManager.switchTab(firstTabId);
      window.electronAPI!.tabs.switch(firstTabId);
    }
  }

  /**
   * Open Settings Tab
   */
  public async openSettingsTab(): Promise<void> {
    try {
      // Check if settings tab already exists
      const existingSettingsTab = Array.from(document.querySelectorAll('.tab')).find(
        tab => tab.getAttribute('data-tab-type') === 'settings'
      );

      if (existingSettingsTab) {
        // Switch to existing settings tab
        const tabId = existingSettingsTab.getAttribute('data-tab-id');
        if (tabId) {
          this.tabManager.switchTab(tabId);
          window.electronAPI!.tabs.switch(tabId);
          return;
        }
      }

      // Create real BrowserView tab in main process first
      const createdTab = await window.electronAPI!.tabs.create('about:blank');
      const tabId = createdTab.tabId;

      const tabData: TabData = {
        id: tabId,
        url: 'vibebrowser://settings',
        title: this.t('⚙ Settings', '⚙ Einstellungen'),
        favicon: '',
        isLoading: false
      };

      this.tabManager.addTab(tabData);
      this.createTabUI(tabId);
      this.tabManager.switchTab(tabId);
      window.electronAPI!.tabs.switch(tabId);

      const tabElement = document.getElementById(`ui-${tabId}`);
      if (tabElement) {
        tabElement.setAttribute('data-tab-type', 'settings');
      }

      // Load settings content into webview
      await this.loadSettingsIntoTab(tabId);
    } catch (error) {
      console.error('[SETTINGS] ❌ ERROR:', error);
      console.error('[SETTINGS] Error stack:', (error as Error).stack);
      alert(this.t(`Error opening settings: ${(error as Error).message}`, `Fehler beim Öffnen der Einstellungen: ${(error as Error).message}`));
    }
  }

  /**
   * Open Bookmarks Tab
   */
  public async openBookmarksTab(): Promise<void> {
    try {
      // Check if bookmarks tab already exists
      const existingBookmarksTab = Array.from(document.querySelectorAll('.tab')).find(
        tab => tab.getAttribute('data-tab-type') === 'bookmarks'
      );

      if (existingBookmarksTab) {
        const tabId = existingBookmarksTab.getAttribute('data-tab-id');
        if (tabId) {
          this.tabManager.switchTab(tabId);
          window.electronAPI!.tabs.switch(tabId);
          return;
        }
      }

      // Create real BrowserView tab in main process first
      const createdTab = await window.electronAPI!.tabs.create('about:blank');
      const tabId = createdTab.tabId;

      const tabData: TabData = {
        id: tabId,
        url: 'vibebrowser://bookmarks',
        title: this.t('📚 Bookmarks', '📚 Lesezeichen'),
        favicon: '',
        isLoading: false
      };

      this.tabManager.addTab(tabData);
      this.createTabUI(tabId);
      this.tabManager.switchTab(tabId);
      window.electronAPI!.tabs.switch(tabId);

      const tabElement = document.getElementById(`ui-${tabId}`);
      if (tabElement) {
        tabElement.setAttribute('data-tab-type', 'bookmarks');
      }

      await this.loadBookmarksIntoTab(tabId);
    } catch (error) {
      console.error('[BOOKMARKS] ❌ ERROR:', error);
      console.error('[BOOKMARKS] Error stack:', (error as Error).stack);
      alert(this.t(`Error opening bookmarks: ${(error as Error).message}`, `Fehler beim Öffnen der Lesezeichen: ${(error as Error).message}`));
    }
  }

  /**
   * Open History Tab
   */
  public async openHistoryTab(): Promise<void> {
    try {
      // Check if history tab already exists
      const existingHistoryTab = Array.from(document.querySelectorAll('.tab')).find(
        tab => tab.getAttribute('data-tab-type') === 'history'
      );

      if (existingHistoryTab) {
        const tabId = existingHistoryTab.getAttribute('data-tab-id');
        if (tabId) {
          this.tabManager.switchTab(tabId);
          window.electronAPI!.tabs.switch(tabId);
          return;
        }
      }

      // Create real BrowserView tab in main process first
      const createdTab = await window.electronAPI!.tabs.create('about:blank');
      const tabId = createdTab.tabId;

      const tabData: TabData = {
        id: tabId,
        url: 'vibebrowser://history',
        title: this.t('🕐 History', '🕐 Verlauf'),
        favicon: '',
        isLoading: false
      };

      this.tabManager.addTab(tabData);
      this.createTabUI(tabId);
      this.tabManager.switchTab(tabId);
      window.electronAPI!.tabs.switch(tabId);

      const tabElement = document.getElementById(`ui-${tabId}`);
      if (tabElement) {
        tabElement.setAttribute('data-tab-type', 'history');
      }

      await this.loadHistoryIntoTab(tabId);
    } catch (error) {
      console.error('[HISTORY] ❌ ERROR:', error);
      console.error('[HISTORY] Error stack:', (error as Error).stack);
      alert(this.t(`Error opening history: ${(error as Error).message}`, `Fehler beim Öffnen des Verlaufs: ${(error as Error).message}`));
    }
  }

  public async openOfflineTab(): Promise<void> {
    if (this.isOpeningOfflineTab) {
      return;
    }

    this.isOpeningOfflineTab = true;

    try {
      const existingOfflineTab = Array.from(document.querySelectorAll('.tab')).find(
        tab => tab.getAttribute('data-tab-type') === 'offline'
      );

      if (existingOfflineTab) {
        const tabId = existingOfflineTab.getAttribute('data-tab-id');
        if (tabId) {
          this.tabManager.switchTab(tabId);
          window.electronAPI!.tabs.switch(tabId);
          return;
        }
      }

      const createdTab = await window.electronAPI!.tabs.create('about:blank');
      const tabId = createdTab.tabId;

      const tabData: TabData = {
        id: tabId,
        url: 'vibebrowser://offline',
        title: this.t('📴 VibeBrowser Offline', '📴 VibeBrowser Offline'),
        favicon: '',
        isLoading: false
      };

      this.tabManager.addTab(tabData);
      this.createTabUI(tabId);
      this.tabManager.switchTab(tabId);
      window.electronAPI!.tabs.switch(tabId);

      const tabElement = document.getElementById(`ui-${tabId}`);
      if (tabElement) {
        tabElement.setAttribute('data-tab-type', 'offline');
      }

      await this.loadOfflineIntoTab(tabId);
    } catch (error) {
      console.error('[OFFLINE] ❌ ERROR:', error);
      console.error('[OFFLINE] Error stack:', (error as Error).stack);
      alert(this.t(`Error opening offline page: ${(error as Error).message}`, `Fehler beim Öffnen der Offline-Seite: ${(error as Error).message}`));
    } finally {
      this.isOpeningOfflineTab = false;
    }
  }

  /**
   * Load settings content into tab
   */
  private async loadSettingsIntoTab(tabId: string): Promise<void> {
    // For now, navigate to a data URL with settings HTML
    const settingsHTML = await this.generateSettingsHTML();
    await window.electronAPI!.navigate.to(tabId, `data:text/html;charset=utf-8,${encodeURIComponent(settingsHTML)}`);
  }

  /**
   * Load bookmarks content into tab
   */
  private async loadBookmarksIntoTab(tabId: string): Promise<void> {
    const bookmarksHTML = await this.generateBookmarksHTML();
    await window.electronAPI!.navigate.to(tabId, `data:text/html;charset=utf-8,${encodeURIComponent(bookmarksHTML)}`);
  }

  /**
   * Load history content into tab
   */
  private async loadHistoryIntoTab(tabId: string): Promise<void> {
    const historyHTML = await this.generateHistoryHTML();
    await window.electronAPI!.navigate.to(tabId, `data:text/html;charset=utf-8,${encodeURIComponent(historyHTML)}`);
  }

  private async loadOfflineIntoTab(tabId: string): Promise<void> {
    const offlineHTML = this.generateOfflineHTML();
    await window.electronAPI!.navigate.to(tabId, `data:text/html;charset=utf-8,${encodeURIComponent(offlineHTML)}`);
  }

  private generateOfflineHTML(): string {
    return `
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
          .container {
            max-width: 900px;
            margin: 0 auto;
            display: grid;
            gap: 18px;
          }
          .card {
            background: #11111b;
            border: 1px solid #313244;
            border-radius: 12px;
            padding: 20px;
          }
          h1 {
            color: #89b4fa;
            font-size: 30px;
            margin-bottom: 8px;
          }
          .muted {
            color: #a6adc8;
            font-size: 14px;
          }
          .row {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 14px;
          }
          button {
            border: 0;
            border-radius: 8px;
            padding: 10px 14px;
            cursor: pointer;
            font-weight: 600;
            background: #89b4fa;
            color: #1e1e2e;
          }
          button.secondary {
            background: #313244;
            color: #cdd6f4;
          }
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
          .status {
            margin-top: 6px;
            font-weight: 600;
            color: #94e2d5;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h1>📴 VibeBrowser Offline</h1>
            <p class="muted">Du bist gerade offline oder die Seite konnte nicht geladen werden. Diese Seite funktioniert komplett lokal.</p>
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
  }

  /**
   * Generate Settings HTML
   */
  private async generateSettingsHTML(): Promise<string> {
    const settings = await window.electronAPI!.settings.get();
    const themes = await window.electronAPI!.themes.getAll();
    const customCssPath = await window.electronAPI!.customCss.getPath();
    const adblockStats = await window.electronAPI!.adblock.getStats();
    const dataSaverStats = await window.electronAPI!.dataSaver.getStats();
    const safeEditorModeCss = this.escapeHtml(settings.editorModeCss || '');
    const hasBackground = Boolean(settings.customBackgroundImage);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Settings</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #1e1e2e;
            color: #cdd6f4;
            padding: 40px;
          }
          .container { max-width: 800px; margin: 0 auto; }
          h1 { font-size: 32px; margin-bottom: 30px; color: #89b4fa; }
          .section { background: #313244; padding: 24px; border-radius: 8px; margin-bottom: 20px; }
          .section h2 { font-size: 18px; margin-bottom: 16px; }
          label { display: block; margin-bottom: 8px; font-size: 14px; }
          input, select {
            width: 100%;
            padding: 10px;
            background: #45475a;
            border: 1px solid #585b70;
            color: #cdd6f4;
            border-radius: 6px;
            font-size: 14px;
            margin-bottom: 16px;
          }
          .setting-desc {
            font-size: 12px;
            color: #a6adc8;
            margin-bottom: 10px;
          }
          button {
            padding: 10px 20px;
            background: #89b4fa;
            color: #1e1e2e;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
          }
          button:hover { background: #a6c8f5; }
          textarea {
            min-height: 120px;
            resize: vertical;
            font-family: Consolas, 'Courier New', monospace;
          }
          .preview-card {
            margin-top: 10px;
            background: #45475a;
            border: 1px solid #585b70;
            border-radius: 8px;
            padding: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>⚙ Settings</h1>
          
          <div class="section">
            <h2>Homepage</h2>
            <label>Default URL for new tabs</label>
            <input type="text" id="homepage" value="${settings.homepage || 'https://www.google.com'}" />
          </div>

          <div class="section">
            <h2>Search engine</h2>
            <label>Default search engine</label>
            <select id="searchEngine">
              <option value="https://www.google.com/search?q=" ${settings.searchEngine === 'https://www.google.com/search?q=' ? 'selected' : ''}>Google</option>
              <option value="https://duckduckgo.com/?q=" ${settings.searchEngine === 'https://duckduckgo.com/?q=' ? 'selected' : ''}>DuckDuckGo</option>
              <option value="https://www.bing.com/search?q=" ${settings.searchEngine === 'https://www.bing.com/search?q=' ? 'selected' : ''}>Bing</option>
            </select>
          </div>

          <div class="section">
            <h2>Language</h2>
            <label>Browser language</label>
            <select id="language">
              <option value="en" ${(settings.language || 'en') === 'en' ? 'selected' : ''}>English</option>
              <option value="de" ${(settings.language || 'en') === 'de' ? 'selected' : ''}>Deutsch</option>
            </select>
          </div>

          <div class="section">
            <h2>Design</h2>
            <label>Theme</label>
            <select id="theme">
              ${themes.map((t: any) => `<option value="${t.name}" ${settings.theme === t.name ? 'selected' : ''}>${t.name}</option>`).join('')}
            </select>
          </div>

          <div class="section">
            <h2>Adblock</h2>
            <label>
              <input type="checkbox" id="adblockEnabled" ${settings.adblockEnabled ? 'checked' : ''} />
              Enable Adblock
            </label>
            <p class="setting-desc">Active rules: ${adblockStats.rules} | Whitelist: ${adblockStats.whitelist} | Blocked: ${adblockStats.blocked}</p>
          </div>

          <div class="section">
            <h2>Data Saver (Mobile Data)</h2>
            <label>
              <input type="checkbox" id="dataSaverEnabled" ${settings.dataSaverEnabled ? 'checked' : ''} />
              Enable data saver mode
            </label>
            <p class="setting-desc">Blocks heavy resources (images/media/fonts) and known trackers to reduce internet data usage.</p>
            <p class="setting-desc" id="data-saver-stats">
              Allowed requests: ${dataSaverStats.allowedRequests} | Blocked: ${dataSaverStats.blockedRequests} |
              Est. transferred: ${Math.round((dataSaverStats.estimatedTransferredBytes / (1024 * 1024)) * 100) / 100} MB |
              Est. saved: ${Math.round((dataSaverStats.estimatedSavedBytes / (1024 * 1024)) * 100) / 100} MB
            </p>
            <button type="button" onclick="refreshDataSaverStats()">Refresh data stats</button>
          </div>

          <div class="section">
            <h2>Custom CSS</h2>
            <label>
              <input type="checkbox" id="customCssEnabled" ${settings.customCssEnabled ? 'checked' : ''} />
              Enable custom.css
            </label>
            <p class="setting-desc">Path: ${customCssPath}</p>
            <button type="button" onclick="openCustomCss()">Open custom.css</button>
            <div class="setting-desc" style="margin-top: 12px;">
              Beispiel:
              <pre style="margin-top: 8px; white-space: pre-wrap; background: #1e1e2e; padding: 10px; border-radius: 6px;">.toolbar-btn { border-radius: 10px; }
.url-bar { border: 1px solid #89b4fa; }</pre>
            </div>
          </div>

          <div class="section">
            <h2>Hintergrund</h2>
            <label>
              <input type="checkbox" id="customBackgroundEnabled" ${settings.customBackgroundEnabled ? 'checked' : ''} />
              Enable custom background image
            </label>
            <input type="file" id="backgroundImageInput" accept="image/*" />
            <p class="setting-desc">${hasBackground ? 'An image is saved and persists after restart.' : 'No image saved yet.'}</p>
          </div>

          <div class="section">
            <h2>Editor Mode</h2>
            <p class="setting-desc">Customize UI elements live with CSS. Persisted across restarts.</p>
            <textarea id="editorModeCss" placeholder="Beispiel: .tab { border-radius: 12px; }\n.titlebar { backdrop-filter: blur(8px); }">${safeEditorModeCss}</textarea>
            <button type="button" onclick="previewEditorModeCss()">Refresh preview</button>
            <div class="preview-card" id="editor-preview-card">
              Preview card: color, radius and borders are affected by your CSS.
            </div>
          </div>

          <div class="section">
            <h2>Trust Radar</h2>
            <label>
              <input type="checkbox" id="trustRadarEnabled" ${settings.trustRadarEnabled !== false ? 'checked' : ''} />
              Enable Trust Radar indicator
            </label>
            <p class="setting-desc">Evaluates the active page and shows a score in the toolbar.</p>
          </div>

          <div class="section">
            <h2>Updates</h2>
            <p class="setting-desc">Checks for new releases automatically every 5 minutes.</p>
            <button type="button" onclick="checkForUpdatesNow()">Check for updates now</button>
          </div>

          <div class="section">
            <h2>Data Management</h2>
            <p class="setting-desc">Reset settings or backup/restore settings, bookmarks and history.</p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" onclick="resetToDefaults()">Reset to defaults</button>
              <button type="button" onclick="exportUserData()">Export data</button>
              <button type="button" onclick="importUserData()">Import data</button>
            </div>
          </div>

          <button onclick="saveSettings()">Save</button>
        </div>

        <script>
          let selectedBackgroundImage = '';
          let backgroundReadPromise = null;

          async function saveSettings() {
            if (backgroundReadPromise) {
              await backgroundReadPromise;
            }

            const current = await window.electronAPI.settings.get();
            const settings = {
              ...current,
              homepage: document.getElementById('homepage').value,
              searchEngine: document.getElementById('searchEngine').value,
              language: document.getElementById('language').value,
              theme: document.getElementById('theme').value,
              adblockEnabled: document.getElementById('adblockEnabled').checked,
              dataSaverEnabled: document.getElementById('dataSaverEnabled').checked,
              customCssEnabled: document.getElementById('customCssEnabled').checked,
              customBackgroundEnabled: document.getElementById('customBackgroundEnabled').checked,
              customBackgroundImage: selectedBackgroundImage || current.customBackgroundImage || '',
              editorModeCss: document.getElementById('editorModeCss').value,
              trustRadarEnabled: document.getElementById('trustRadarEnabled').checked
            };
            if (window.electronAPI && window.electronAPI.settings) {
              await window.electronAPI.settings.save(settings);
              window.electronAPI.settings.notifyUpdated();
              alert('Settings saved!');
            } else {
              alert('Error: IPC not available.');
            }
          }

          function openCustomCss() {
            if (window.electronAPI && window.electronAPI.customCss) {
              window.electronAPI.customCss.open();
            }
          }

          function checkForUpdatesNow() {
            if (window.electronAPI && window.electronAPI.updates) {
              window.electronAPI.updates.checkForUpdates();
              alert('Update check started.');
              return;
            }

            alert('Error: update check unavailable.');
          }

          async function resetToDefaults() {
            if (!window.electronAPI || !window.electronAPI.settings || !window.electronAPI.settings.resetToDefaults) {
              alert('Error: reset unavailable.');
              return;
            }

            const confirmed = confirm('Reset settings to defaults?');
            if (!confirmed) return;

            const result = await window.electronAPI.settings.resetToDefaults();
            if (result && result.success) {
              alert('Settings reset to defaults. Re-open settings to see all default values.');
            } else {
              alert('Reset failed.');
            }
          }

          async function exportUserData() {
            if (!window.electronAPI || !window.electronAPI.settings || !window.electronAPI.settings.exportUserData) {
              alert('Error: export unavailable.');
              return;
            }

            const result = await window.electronAPI.settings.exportUserData();
            if (result && result.success) {
              alert('Data export completed.');
              return;
            }

            if (result && result.cancelled) {
              return;
            }

            alert('Export failed.');
          }

          async function importUserData() {
            if (!window.electronAPI || !window.electronAPI.settings || !window.electronAPI.settings.importUserData) {
              alert('Error: import unavailable.');
              return;
            }

            const confirmed = confirm('Import data from backup? Existing settings/bookmarks/history will be overwritten.');
            if (!confirmed) return;

            const result = await window.electronAPI.settings.importUserData();
            if (result && result.success) {
              alert('Data import completed. Re-open settings to refresh values.');
              return;
            }

            if (result && result.cancelled) {
              return;
            }

            alert('Import failed.');
          }

          function formatMB(bytes) {
            return (Math.round((bytes / (1024 * 1024)) * 100) / 100).toFixed(2);
          }

          async function refreshDataSaverStats() {
            if (!window.electronAPI || !window.electronAPI.dataSaver) {
              return;
            }

            const stats = await window.electronAPI.dataSaver.getStats();
            const el = document.getElementById('data-saver-stats');
            if (!el) return;

            el.textContent =
              'Allowed requests: ' + stats.allowedRequests +
              ' | Blocked: ' + stats.blockedRequests +
              ' | Est. transferred: ' + formatMB(stats.estimatedTransferredBytes) + ' MB' +
              ' | Est. saved: ' + formatMB(stats.estimatedSavedBytes) + ' MB';
          }

          function previewEditorModeCss() {
            const css = document.getElementById('editorModeCss').value;
            let styleEl = document.getElementById('editor-preview-style');
            if (!styleEl) {
              styleEl = document.createElement('style');
              styleEl.id = 'editor-preview-style';
              document.head.appendChild(styleEl);
            }
            styleEl.textContent = css;
          }

          document.getElementById('backgroundImageInput')?.addEventListener('change', (event) => {
            const input = event.target;
            const file = input && input.files ? input.files[0] : null;
            if (!file) return;

            const reader = new FileReader();
            backgroundReadPromise = new Promise((resolve) => {
              reader.onload = () => {
                selectedBackgroundImage = typeof reader.result === 'string' ? reader.result : '';
                resolve(null);
              };

              reader.onerror = () => {
                selectedBackgroundImage = '';
                alert('Could not read selected image.');
                resolve(null);
              };
            });

            reader.readAsDataURL(file);
          });

          previewEditorModeCss();
          refreshDataSaverStats();
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Generate Bookmarks HTML
   */
  private async generateBookmarksHTML(): Promise<string> {
    const bookmarks = await window.electronAPI!.bookmarks.getAll();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${this.t('Bookmarks', 'Lesezeichen')}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #1e1e2e;
            color: #cdd6f4;
            padding: 40px;
          }
          .container { max-width: 1000px; margin: 0 auto; }
          h1 { font-size: 32px; margin-bottom: 30px; color: #89b4fa; }
          .bookmark {
            background: #313244;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            transition: background 0.2s;
          }
          .bookmark:hover { background: #45475a; }
          .bookmark img { width: 16px; height: 16px; }
          .bookmark-title { font-weight: 500; }
          .bookmark-url { font-size: 12px; color: #a6adc8; }
          .empty { text-align: center; padding: 60px; color: #a6adc8; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${this.t('📚 Bookmarks', '📚 Lesezeichen')}</h1>
          ${bookmarks.length === 0 ? 
            `<div class="empty">${this.t('No bookmarks available', 'Keine Lesezeichen vorhanden')}</div>` :
            bookmarks.map(b => `
              <div class="bookmark" onclick="window.location.href=${JSON.stringify(b.url)}">
                <img src="${b.favicon || 'data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"16\\" height=\\"16\\"><rect width=\\"16\\" height=\\"16\\" fill=\\"%2389b4fa\\"/></svg>'}" />
                <div>
                  <div class="bookmark-title">${this.escapeHtml(b.title)}</div>
                  <div class="bookmark-url">${this.escapeHtml(b.url)}</div>
                </div>
              </div>
            `).join('')
          }
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate History HTML
   */
  private async generateHistoryHTML(): Promise<string> {
    const history = await window.electronAPI!.history.getAll();
    const sortedHistory = history.sort((a, b) => b.timestamp - a.timestamp);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${this.t('History', 'Verlauf')}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #1e1e2e;
            color: #cdd6f4;
            padding: 40px;
          }
          .container { max-width: 1000px; margin: 0 auto; }
          h1 { font-size: 32px; margin-bottom: 30px; color: #89b4fa; }
          .history-item {
            background: #313244;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            transition: background 0.2s;
          }
          .history-item:hover { background: #45475a; }
          .history-title { font-weight: 500; }
          .history-url { font-size: 12px; color: #a6adc8; }
          .history-time { font-size: 11px; color: #6c7086; margin-left: auto; }
          .empty { text-align: center; padding: 60px; color: #a6adc8; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${this.t('🕐 History', '🕐 Verlauf')}</h1>
          ${sortedHistory.length === 0 ?
            `<div class="empty">${this.t('No history available', 'Kein Verlauf vorhanden')}</div>` :
            sortedHistory.map(h => `
              <div class="history-item" onclick="window.location.href=${JSON.stringify(h.url)}">
                <div style="flex: 1;">
                  <div class="history-title">${this.escapeHtml(h.title)}</div>
                  <div class="history-url">${this.escapeHtml(h.url)}</div>
                </div>
                <div class="history-time">${this.formatTimeAgo(h.timestamp)}</div>
              </div>
            `).join('')
          }
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Bookmark current page (public for onclick)
   */
  public async handleBookmarkCurrentPage(): Promise<void> {
    const activeTabId = this.tabManager.getActiveTabId();
    if (!activeTabId) return;

    // Get current page info
    const tabData = this.tabManager.getTab(activeTabId);
    if (!tabData) return;

    try {
      await window.electronAPI!.bookmarks.add({
        url: tabData.url,
        title: tabData.title || tabData.url,
        favicon: tabData.favicon || ''
      });
      
      console.log('[DEBUG] Bookmark added:', tabData.title);
      alert(this.t(`✓ Bookmark saved: ${tabData.title}`, `✓ Lesezeichen gespeichert: ${tabData.title}`));
    } catch (error) {
      console.error('Error adding bookmark:', error);
      alert(this.t('Error saving bookmark', 'Fehler beim Speichern des Lesezeichens'));
    }
  }
}

// Define window.app type
declare global {
  interface Window {
    app: VibeBrowserApp;
  }
}

// App starten wenn DOM ready ist
document.addEventListener('DOMContentLoaded', () => {
  const app = new VibeBrowserApp();
  
  // Make app globally available for onclick handlers
  window.app = app;
});
