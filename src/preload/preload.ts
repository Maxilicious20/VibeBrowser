/**
 * Preload-Skript fuer sichere IPC-Kommunikation
 * Exponiert nur spezifische sichere Funktionen an den Renderer-Prozess
 */

import { contextBridge, ipcRenderer } from 'electron';
import { ipcChannels, TabData } from '../common/types';

const electronAPI = {
  window: {
    minimize: () => ipcRenderer.send(ipcChannels.MINIMIZE_WINDOW),
    maximize: () => ipcRenderer.send(ipcChannels.MAXIMIZE_WINDOW),
    close: () => ipcRenderer.send(ipcChannels.CLOSE_WINDOW),
  },
  navigate: {
    to: (tabId: string, url: string) =>
      ipcRenderer.send(ipcChannels.NAVIGATE_URL, tabId, url),
    back: (tabId: string) =>
      ipcRenderer.send(ipcChannels.NAVIGATE_BACK, tabId),
    forward: (tabId: string) =>
      ipcRenderer.send(ipcChannels.NAVIGATE_FORWARD, tabId),
    reload: (tabId: string) =>
      ipcRenderer.send(ipcChannels.RELOAD_PAGE, tabId),
  },
  tabs: {
    create: (url?: string) => ipcRenderer.invoke(ipcChannels.CREATE_TAB, url),
    close: (tabId: string) => ipcRenderer.send(ipcChannels.CLOSE_TAB, tabId),
    switch: (tabId: string) => ipcRenderer.send(ipcChannels.SWITCH_TAB, tabId),
    showTabToolsMenu: () => ipcRenderer.invoke(ipcChannels.SHOW_TAB_TOOLS_MENU),
    setUiTopInset: (insetPx: number) => ipcRenderer.send(ipcChannels.SET_UI_TOP_INSET, insetPx),
    getInfo: (tabId: string) => ipcRenderer.invoke(ipcChannels.GET_TAB_INFO, tabId),
    onUpdate: (callback: (tab: TabData) => void) =>
      ipcRenderer.on(ipcChannels.UPDATE_TAB, (_event, tab) => callback(tab)),
    onTitleChanged: (callback: (tabId: string, title: string) => void) =>
      ipcRenderer.on(ipcChannels.TAB_TITLE_CHANGED, (_event, tabId, title) =>
        callback(tabId, title)
      ),
    onUrlChanged: (callback: (tabId: string, url: string) => void) =>
      ipcRenderer.on(ipcChannels.TAB_URL_CHANGED, (_event, tabId, url) =>
        callback(tabId, url)
      ),
    onLoadingChanged: (callback: (tabId: string, isLoading: boolean) => void) =>
      ipcRenderer.on(
        ipcChannels.TAB_LOADING_CHANGED,
        (_event, tabId, isLoading) => callback(tabId, isLoading)
      ),
    onFaviconChanged: (callback: (tabId: string, faviconUrl: string) => void) =>
      ipcRenderer.on(
        ipcChannels.TAB_FAVICON_CHANGED,
        (_event, tabId, faviconUrl) => callback(tabId, faviconUrl)
      ),
  },
  bookmarks: {
    add: (bookmark: any) => ipcRenderer.invoke(ipcChannels.ADD_BOOKMARK, bookmark),
    remove: (id: string) => ipcRenderer.invoke(ipcChannels.REMOVE_BOOKMARK, id),
    getAll: () => ipcRenderer.invoke(ipcChannels.GET_BOOKMARKS),
    isBookmarked: (url: string) => ipcRenderer.invoke(ipcChannels.IS_BOOKMARKED, url),
  },
  history: {
    getAll: () => ipcRenderer.invoke(ipcChannels.GET_HISTORY),
    search: (query: string) => ipcRenderer.invoke(ipcChannels.SEARCH_HISTORY, query),
    clear: () => ipcRenderer.invoke(ipcChannels.CLEAR_HISTORY),
  },
  settings: {
    get: () => ipcRenderer.invoke(ipcChannels.GET_SETTINGS),
    save: (settings: any) => ipcRenderer.invoke(ipcChannels.SAVE_SETTINGS, settings),
    resetToDefaults: () => ipcRenderer.invoke(ipcChannels.RESET_SETTINGS_DEFAULTS),
    exportUserData: () => ipcRenderer.invoke(ipcChannels.EXPORT_USER_DATA),
    importUserData: () => ipcRenderer.invoke(ipcChannels.IMPORT_USER_DATA),
    notifyUpdated: () => ipcRenderer.send(ipcChannels.SETTINGS_UPDATED),
    onUpdated: (callback: () => void) => ipcRenderer.on(ipcChannels.SETTINGS_UPDATED, callback),
  },
  customCss: {
    get: () => ipcRenderer.invoke(ipcChannels.GET_CUSTOM_CSS),
    getPath: () => ipcRenderer.invoke(ipcChannels.GET_CUSTOM_CSS_PATH),
    open: () => ipcRenderer.send(ipcChannels.OPEN_CUSTOM_CSS),
  },
  storage: {
    getStoredTabs: () => ipcRenderer.invoke(ipcChannels.GET_STORED_TABS),
  },
  zoom: {
    in: (tabId: string) => ipcRenderer.send(ipcChannels.ZOOM_IN, tabId),
    out: (tabId: string) => ipcRenderer.send(ipcChannels.ZOOM_OUT, tabId),
    reset: (tabId: string) => ipcRenderer.send(ipcChannels.ZOOM_RESET, tabId),
    getLevel: (tabId: string) => ipcRenderer.invoke(ipcChannels.GET_ZOOM_LEVEL, tabId),
  },
  find: {
    inPage: (tabId: string, text: string) => ipcRenderer.send(ipcChannels.FIND_IN_PAGE, tabId, text),
    stop: (tabId: string) => ipcRenderer.send(ipcChannels.STOP_FIND_IN_PAGE, tabId),
  },
  updates: {
    checkForUpdates: () => ipcRenderer.send(ipcChannels.CHECK_FOR_UPDATES),
    onDownloading: (callback: () => void) => ipcRenderer.on('update-downloading', callback),
    onDownloadProgress: (callback: (progress: any) => void) => 
      ipcRenderer.on('update-download-progress', (_event, progress) => callback(progress)),
  },
  themes: {
    getAll: () => ipcRenderer.invoke(ipcChannels.GET_THEMES),
    load: (themeName: string) => ipcRenderer.invoke(ipcChannels.LOAD_THEME, themeName),
    savePreference: (themeName: string) => ipcRenderer.invoke(ipcChannels.SAVE_THEME_PREFERENCE, themeName),
    getPreference: () => ipcRenderer.invoke(ipcChannels.GET_THEME_PREFERENCE),
    openFolder: () => ipcRenderer.send(ipcChannels.OPEN_THEMES_FOLDER),
  },
  adblock: {
    shouldBlock: (url: string) => ipcRenderer.invoke(ipcChannels.SHOULD_BLOCK_URL, url),
    getStats: () => ipcRenderer.invoke(ipcChannels.GET_ADBLOCK_STATS),
    addRule: (rule: string) => ipcRenderer.invoke(ipcChannels.ADD_ADBLOCK_RULE, rule),
    reloadRules: () => ipcRenderer.send(ipcChannels.RELOAD_ADBLOCK_RULES),
    getRulesPath: () => ipcRenderer.invoke(ipcChannels.GET_ADBLOCK_RULES_PATH),
  },
  search: {
    getSuggestions: (query: string) => ipcRenderer.invoke(ipcChannels.GET_SEARCH_SUGGESTIONS, query),
    getPopular: () => ipcRenderer.invoke(ipcChannels.GET_POPULAR_SEARCHES),
  },
  downloads: {
    getAll: () => ipcRenderer.invoke(ipcChannels.GET_DOWNLOADS),
    pause: (id: string) => ipcRenderer.invoke(ipcChannels.PAUSE_DOWNLOAD, id),
    resume: (id: string) => ipcRenderer.invoke(ipcChannels.RESUME_DOWNLOAD, id),
    cancel: (id: string) => ipcRenderer.invoke(ipcChannels.CANCEL_DOWNLOAD, id),
    open: (id: string) => ipcRenderer.invoke(ipcChannels.OPEN_DOWNLOAD, id),
    showInFolder: (id: string) => ipcRenderer.invoke(ipcChannels.SHOW_IN_FOLDER, id),
    clearCompleted: () => ipcRenderer.invoke(ipcChannels.CLEAR_COMPLETED_DOWNLOADS),
    onStarted: (callback: (download: any) => void) =>
      ipcRenderer.on(ipcChannels.DOWNLOAD_STARTED, (_event, download) => callback(download)),
    onProgress: (callback: (download: any) => void) =>
      ipcRenderer.on(ipcChannels.DOWNLOAD_PROGRESS, (_event, download) => callback(download)),
    onCompleted: (callback: (download: any) => void) =>
      ipcRenderer.on(ipcChannels.DOWNLOAD_COMPLETED, (_event, download) => callback(download)),
  },
  sessions: {
    save: (name: string, tabs: Array<{ url: string; title: string }>) =>
      ipcRenderer.invoke(ipcChannels.SAVE_SESSION, name, tabs),
    load: (sessionId: string) => ipcRenderer.invoke(ipcChannels.LOAD_SESSION, sessionId),
    getAll: () => ipcRenderer.invoke(ipcChannels.GET_SESSIONS),
    delete: (sessionId: string) => ipcRenderer.invoke(ipcChannels.DELETE_SESSION, sessionId),
    restore: (sessionId: string) => ipcRenderer.invoke(ipcChannels.RESTORE_SESSION, sessionId),
  },
  shortcuts: {
    onNewTab: (callback: () => void) => ipcRenderer.on('shortcut:new-tab', callback),
    onCloseTab: (callback: () => void) => ipcRenderer.on('shortcut:close-tab', callback),
    onNextTab: (callback: () => void) => ipcRenderer.on('shortcut:next-tab', callback),
    onPrevTab: (callback: () => void) => ipcRenderer.on('shortcut:prev-tab', callback),
    onReload: (callback: () => void) => ipcRenderer.on('shortcut:reload', callback),
    onHardReload: (callback: () => void) => ipcRenderer.on('shortcut:hard-reload', callback),
    onFocusUrl: (callback: () => void) => ipcRenderer.on('shortcut:focus-url', callback),
    onFind: (callback: () => void) => ipcRenderer.on('shortcut:find', callback),
    onBookmark: (callback: () => void) => ipcRenderer.on('shortcut:bookmark', callback),
    onHistory: (callback: () => void) => ipcRenderer.on('shortcut:history', callback),
    onBookmarks: (callback: () => void) => ipcRenderer.on('shortcut:bookmarks', callback),
    onBack: (callback: () => void) => ipcRenderer.on('shortcut:back', callback),
    onForward: (callback: () => void) => ipcRenderer.on('shortcut:forward', callback),
    onZoomIn: (callback: () => void) => ipcRenderer.on('shortcut:zoom-in', callback),
    onZoomOut: (callback: () => void) => ipcRenderer.on('shortcut:zoom-out', callback),
    onZoomReset: (callback: () => void) => ipcRenderer.on('shortcut:zoom-reset', callback),
    onSwitchToTab: (callback: (event: any, index: number) => void) => 
      ipcRenderer.on('shortcut:switch-to-tab', (_event, index) => callback(_event, index)),
    onReopenClosedTab: (callback: () => void) => ipcRenderer.on('shortcut:reopen-closed-tab', callback),
  },
  app: {
    getInfo: () => ipcRenderer.invoke(ipcChannels.GET_APP_INFO),
  },
  dataSaver: {
    getStats: () => ipcRenderer.invoke(ipcChannels.GET_DATA_SAVER_STATS),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// TypeScript-Typen fuer die exposierte API
declare global {
  interface Window {
    electronAPI: {
      window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
      };
      navigate: {
        to: (tabId: string, url: string) => void;
        back: (tabId: string) => void;
        forward: (tabId: string) => void;
        reload: (tabId: string) => void;
      };
      tabs: {
        create: (url?: string) => Promise<{ tabId: string; url: string }>;
        close: (tabId: string) => void;
        switch: (tabId: string) => void;
        showTabToolsMenu: () => Promise<'cycle-group' | 'switch-group' | 'save-workspace' | 'switch-workspace' | null>;
        setUiTopInset: (insetPx: number) => void;
        getInfo: (tabId: string) => Promise<{ url: string; title: string }>;
        onUpdate: (callback: (tab: TabData) => void) => void;
        onTitleChanged: (callback: (tabId: string, title: string) => void) => void;
        onUrlChanged: (callback: (tabId: string, url: string) => void) => void;
        onLoadingChanged: (callback: (tabId: string, isLoading: boolean) => void) => void;
        onFaviconChanged: (callback: (tabId: string, faviconUrl: string) => void) => void;
      };
      bookmarks: {
        add: (bookmark: any) => Promise<{ success: boolean }>;
        remove: (id: string) => Promise<{ success: boolean }>;
        getAll: () => Promise<any[]>;
        isBookmarked: (url: string) => Promise<boolean>;
      };
      history: {
        getAll: () => Promise<any[]>;
        search: (query: string) => Promise<any[]>;
        clear: () => Promise<{ success: boolean }>;
      };
      settings: {
        get: () => Promise<any>;
        save: (settings: any) => Promise<{ success: boolean }>;
        resetToDefaults: () => Promise<{ success: boolean }>;
        exportUserData: () => Promise<{ success: boolean; path?: string; cancelled?: boolean; error?: string }>;
        importUserData: () => Promise<{ success: boolean; cancelled?: boolean; error?: string }>;
        notifyUpdated: () => void;
        onUpdated: (callback: () => void) => void;
      };
      customCss: {
        get: () => Promise<string>;
        getPath: () => Promise<string>;
        open: () => void;
      };
      storage: {
        getStoredTabs: () => Promise<any[]>;
      };
      zoom: {
        in: (tabId: string) => void;
        out: (tabId: string) => void;
        reset: (tabId: string) => void;
        getLevel: (tabId: string) => Promise<number>;
      };
      find: {
        inPage: (tabId: string, text: string) => void;
        stop: (tabId: string) => void;
      };
      updates: {
        checkForUpdates: () => void;
        onDownloading: (callback: () => void) => void;
        onDownloadProgress: (callback: (progress: any) => void) => void;
      };
      themes: {
        getAll: () => Promise<{ name: string; isDefault: boolean }[]>;
        load: (themeName: string) => Promise<string>;
        savePreference: (themeName: string) => Promise<{ success: boolean }>;
        getPreference: () => Promise<string>;
        openFolder: () => void;
      };
      adblock: {
        shouldBlock: (url: string) => Promise<boolean>;
        getStats: () => Promise<{ rules: number; whitelist: number; blocked: number }>;
        addRule: (rule: string) => Promise<{ success: boolean }>;
        reloadRules: () => void;
        getRulesPath: () => Promise<string>;
      };
      search: {
        getSuggestions: (query: string) => Promise<string[]>;
        getPopular: () => Promise<{ term: string; count: number }[]>;
      };
      downloads: {
        getAll: () => Promise<any[]>;
        pause: (id: string) => Promise<boolean>;
        resume: (id: string) => Promise<boolean>;
        cancel: (id: string) => Promise<boolean>;
        open: (id: string) => Promise<boolean>;
        showInFolder: (id: string) => Promise<boolean>;
        clearCompleted: () => Promise<{ success: boolean }>;
        onStarted?: (callback: (download: any) => void) => void;
        onProgress?: (callback: (download: any) => void) => void;
        onCompleted?: (callback: (download: any) => void) => void;
      };
      sessions: {
        save: (name: string, tabs: Array<{ url: string; title: string }>) => Promise<any>;
        load: (sessionId: string) => Promise<any>;
        getAll: () => Promise<any[]>;
        delete: (sessionId: string) => Promise<boolean>;
        restore: (sessionId: string) => Promise<any>;
      };
      shortcuts: {
        onNewTab: (callback: () => void) => void;
        onCloseTab: (callback: () => void) => void;
        onNextTab: (callback: () => void) => void;
        onPrevTab: (callback: () => void) => void;
        onReload: (callback: () => void) => void;
        onHardReload: (callback: () => void) => void;
        onFocusUrl: (callback: () => void) => void;
        onFind: (callback: () => void) => void;
        onBookmark: (callback: () => void) => void;
        onHistory: (callback: () => void) => void;
        onBookmarks: (callback: () => void) => void;
        onBack: (callback: () => void) => void;
        onForward: (callback: () => void) => void;
        onZoomIn: (callback: () => void) => void;
        onZoomOut: (callback: () => void) => void;
        onZoomReset: (callback: () => void) => void;
        onSwitchToTab: (callback: (event: any, index: number) => void) => void;
        onReopenClosedTab: (callback: () => void) => void;
      };
      app: {
        getInfo: () => Promise<{ version: string; githubRepo: string }>;
      };
      dataSaver: {
        getStats: () => Promise<{
          enabled: boolean;
          allowedRequests: number;
          blockedRequests: number;
          estimatedSavedBytes: number;
          estimatedTransferredBytes: number;
          blockedByType: Record<string, number>;
        }>;
      };
    };
  }
}
