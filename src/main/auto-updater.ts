/**
 * Auto-Update Manager
 * Handles automatic updates using electron-updater
 */

import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';

export class AutoUpdateManager {
  private mainWindow: BrowserWindow;
  private updateCheckInterval: NodeJS.Timeout | null = null;
  private readonly updateCheckIntervalMs: number = 5 * 60 * 1000;
  private readonly progressEmitThrottleMs: number = 250;
  private isCheckingForUpdates: boolean = false;
  private lastProgressEmitAt: number = 0;
  private lastProgressPercent: number = -1;

  private onCheckingForUpdate = () => {
    console.log('[AutoUpdater] Checking for updates...');
  };

  private onUpdateAvailable = (info: any) => {
    console.log('[AutoUpdater] Update available:', info.version);

    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update available',
      message: `A new version (${info.version}) is available!`,
      detail: 'Do you want to download the update now?',
      buttons: ['Yes, download', 'Remind me in 5 minutes', 'Later'],
      defaultId: 0,
      cancelId: 2,
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
        this.showDownloadProgress();
        return;
      }

      if (result.response === 1) {
        setTimeout(() => this.checkForUpdates(), 5 * 60 * 1000);
      }
    });
  };

  private onUpdateNotAvailable = (info: any) => {
    console.log('[AutoUpdater] No updates available. Current version:', info.version);
  };

  private onDownloadProgress = (progressObj: any) => {
    const percent = Math.round(progressObj.percent);
    const now = Date.now();
    const shouldEmit =
      percent !== this.lastProgressPercent ||
      now - this.lastProgressEmitAt >= this.progressEmitThrottleMs;

    if (!shouldEmit) {
      return;
    }

    this.lastProgressPercent = percent;
    this.lastProgressEmitAt = now;

    if (!this.mainWindow || this.mainWindow.isDestroyed() || this.mainWindow.webContents.isDestroyed()) {
      return;
    }

    this.mainWindow.webContents.send('update-download-progress', {
      percent,
      transferred: progressObj.transferred,
      total: progressObj.total,
    });
  };

  private onUpdateDownloaded = (info: any) => {
    console.log('[AutoUpdater] Update downloaded:', info.version);

    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update ready',
      message: `Version ${info.version} has been downloaded!`,
      detail: 'The app will update on next restart. Restart now?',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  };

  private onError = (error: any) => {
    console.error('[AutoUpdater] Error:', error);
  };

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.setupAutoUpdater();
  }

  /**
   * Initialize auto-updater
   */
  private setupAutoUpdater(): void {
    // Configure auto-updater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Check for updates on startup (after 3 seconds)
    setTimeout(() => {
      this.checkForUpdates();
    }, 3000);

    // Check for updates every 5 minutes
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates();
    }, this.updateCheckIntervalMs);

    autoUpdater.on('checking-for-update', this.onCheckingForUpdate);
    autoUpdater.on('update-available', this.onUpdateAvailable);
    autoUpdater.on('update-not-available', this.onUpdateNotAvailable);
    autoUpdater.on('download-progress', this.onDownloadProgress);
    autoUpdater.on('update-downloaded', this.onUpdateDownloaded);
    autoUpdater.on('error', this.onError);
  }

  /**
   * Manually check for updates
   */
  public checkForUpdates(): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('[AutoUpdater] Skipping update check in development mode');
      return;
    }

    if (this.isCheckingForUpdates) {
      return;
    }

    this.isCheckingForUpdates = true;
    autoUpdater
      .checkForUpdates()
      .catch((error) => {
        console.error('[AutoUpdater] checkForUpdates failed:', error);
      })
      .finally(() => {
        this.isCheckingForUpdates = false;
      });
  }

  /**
   * Show download progress notification
   */
  private showDownloadProgress(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed() || this.mainWindow.webContents.isDestroyed()) {
      return;
    }

    this.mainWindow.webContents.send('update-downloading');
  }

  /**
   * Cleanup on app quit
   */
  public cleanup(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
    }

    autoUpdater.removeListener('checking-for-update', this.onCheckingForUpdate);
    autoUpdater.removeListener('update-available', this.onUpdateAvailable);
    autoUpdater.removeListener('update-not-available', this.onUpdateNotAvailable);
    autoUpdater.removeListener('download-progress', this.onDownloadProgress);
    autoUpdater.removeListener('update-downloaded', this.onUpdateDownloaded);
    autoUpdater.removeListener('error', this.onError);
  }
}
