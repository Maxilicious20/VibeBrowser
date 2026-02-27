/**
 * Keyboard Shortcut Manager
 * Handles global and local keyboard shortcuts
 */

import { app, BrowserWindow, globalShortcut } from 'electron';
import { BrowserViewLifecycleManager } from './browser-view';

export class KeyboardShortcutManager {
  private mainWindow: BrowserWindow;
  private browserViewManager: BrowserViewLifecycleManager;

  constructor(mainWindow: BrowserWindow, browserViewManager: BrowserViewLifecycleManager) {
    this.mainWindow = mainWindow;
    this.browserViewManager = browserViewManager;
  }

  /**
   * Register all keyboard shortcuts
   */
  registerShortcuts(): void {
    // Ctrl+T - New Tab
    globalShortcut.register('CommandOrControl+T', () => {
      this.mainWindow.webContents.send('shortcut:new-tab');
    });

    // Ctrl+W - Close Tab
    globalShortcut.register('CommandOrControl+W', () => {
      this.mainWindow.webContents.send('shortcut:close-tab');
    });

    // Ctrl+Shift+T - Reopen closed tab
    globalShortcut.register('CommandOrControl+Shift+T', () => {
      this.mainWindow.webContents.send('shortcut:reopen-closed-tab');
    });

    // Ctrl+Tab - Next Tab
    globalShortcut.register('Control+Tab', () => {
      this.mainWindow.webContents.send('shortcut:next-tab');
    });

    // Ctrl+Shift+Tab - Previous Tab
    globalShortcut.register('Control+Shift+Tab', () => {
      this.mainWindow.webContents.send('shortcut:prev-tab');
    });

    // Ctrl+R - Reload
    globalShortcut.register('CommandOrControl+R', () => {
      this.mainWindow.webContents.send('shortcut:reload');
    });

    // F5 - Reload
    globalShortcut.register('F5', () => {
      this.mainWindow.webContents.send('shortcut:reload');
    });

    // Ctrl+Shift+R - Hard Reload
    globalShortcut.register('CommandOrControl+Shift+R', () => {
      this.mainWindow.webContents.send('shortcut:hard-reload');
    });

    // Ctrl+L - Focus URL bar
    globalShortcut.register('CommandOrControl+L', () => {
      this.mainWindow.webContents.send('shortcut:focus-url');
    });

    // Ctrl+F - Find in page
    globalShortcut.register('CommandOrControl+F', () => {
      this.mainWindow.webContents.send('shortcut:find');
    });

    // Ctrl+D - Bookmark current page
    globalShortcut.register('CommandOrControl+D', () => {
      this.mainWindow.webContents.send('shortcut:bookmark');
    });

    // Ctrl+H - Show history
    globalShortcut.register('CommandOrControl+H', () => {
      this.mainWindow.webContents.send('shortcut:history');
    });

    // Ctrl+Shift+B - Show bookmarks
    globalShortcut.register('CommandOrControl+Shift+B', () => {
      this.mainWindow.webContents.send('shortcut:bookmarks');
    });

    // Alt+Left - Back
    globalShortcut.register('Alt+Left', () => {
      this.mainWindow.webContents.send('shortcut:back');
    });

    // Alt+Right - Forward
    globalShortcut.register('Alt+Right', () => {
      this.mainWindow.webContents.send('shortcut:forward');
    });

    // Ctrl+Plus - Zoom In
    globalShortcut.register('CommandOrControl+Plus', () => {
      this.mainWindow.webContents.send('shortcut:zoom-in');
    });

    globalShortcut.register('CommandOrControl+=', () => {
      this.mainWindow.webContents.send('shortcut:zoom-in');
    });

    // Ctrl+Minus - Zoom Out
    globalShortcut.register('CommandOrControl+-', () => {
      this.mainWindow.webContents.send('shortcut:zoom-out');
    });

    // Ctrl+0 - Reset Zoom
    globalShortcut.register('CommandOrControl+0', () => {
      this.mainWindow.webContents.send('shortcut:zoom-reset');
    });

    // Ctrl+1 through Ctrl+9 - Switch to tab by number
    for (let i = 1; i <= 9; i++) {
      globalShortcut.register(`CommandOrControl+${i}`, () => {
        this.mainWindow.webContents.send('shortcut:switch-to-tab', i);
      });
    }

    console.log('[KeyboardShortcuts] All shortcuts registered');
  }

  /**
   * Unregister all shortcuts (called on app quit)
   */
  unregisterAll(): void {
    globalShortcut.unregisterAll();
    console.log('[KeyboardShortcuts] All shortcuts unregistered');
  }
}
