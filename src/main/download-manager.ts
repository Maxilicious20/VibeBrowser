/**
 * Download Manager - Handles file downloads with pause/resume/cancel functionality
 */

import { DownloadItem } from '../common/types';
import { app, DownloadItem as ElectronDownloadItem, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export class DownloadManager {
  private downloads: Map<string, DownloadItem> = new Map();
  private activeDownloads: Map<string, ElectronDownloadItem> = new Map();
  private mainWindow: BrowserWindow | null = null;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.setupDownloadHandler();
  }

  private setupDownloadHandler(): void {
    if (!this.mainWindow) return;

    this.mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
      const downloadId = `download-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const filename = item.getFilename();
      const downloadPath = path.join(app.getPath('downloads'), filename);

      // Set save path
      item.setSavePath(downloadPath);

      const downloadItem: DownloadItem = {
        id: downloadId,
        filename: filename,
        url: item.getURL(),
        savePath: downloadPath,
        totalBytes: item.getTotalBytes(),
        receivedBytes: 0,
        state: 'progressing',
        startTime: Date.now(),
        paused: false,
        canResume: item.canResume(),
      };

      this.downloads.set(downloadId, downloadItem);
      this.activeDownloads.set(downloadId, item);

      // Notify renderer
      this.mainWindow?.webContents.send('downloads:started', downloadItem);

      // Update progress
      item.on('updated', (event, state) => {
        downloadItem.receivedBytes = item.getReceivedBytes();
        downloadItem.totalBytes = item.getTotalBytes();
        downloadItem.state = state === 'interrupted' ? 'interrupted' : 'progressing';
        downloadItem.paused = item.isPaused();
        downloadItem.canResume = item.canResume();

        this.mainWindow?.webContents.send('downloads:progress', downloadItem);
      });

      // Download completed
      item.once('done', (event, state) => {
        if (state === 'completed') {
          downloadItem.state = 'completed';
          downloadItem.receivedBytes = downloadItem.totalBytes;
          this.mainWindow?.webContents.send('downloads:completed', downloadItem);
        } else if (state === 'cancelled') {
          downloadItem.state = 'cancelled';
        } else if (state === 'interrupted') {
          downloadItem.state = 'interrupted';
        }

        this.activeDownloads.delete(downloadId);
      });
    });
  }

  /**
   * Get all downloads
   */
  getAllDownloads(): DownloadItem[] {
    return Array.from(this.downloads.values());
  }

  /**
   * Pause a download
   */
  pauseDownload(downloadId: string): boolean {
    const item = this.activeDownloads.get(downloadId);
    if (item && !item.isPaused() && item.canResume()) {
      item.pause();
      const downloadItem = this.downloads.get(downloadId);
      if (downloadItem) {
        downloadItem.paused = true;
        this.mainWindow?.webContents.send('downloads:progress', downloadItem);
      }
      return true;
    }
    return false;
  }

  /**
   * Resume a download
   */
  resumeDownload(downloadId: string): boolean {
    const item = this.activeDownloads.get(downloadId);
    if (item && item.isPaused() && item.canResume()) {
      item.resume();
      const downloadItem = this.downloads.get(downloadId);
      if (downloadItem) {
        downloadItem.paused = false;
        this.mainWindow?.webContents.send('downloads:progress', downloadItem);
      }
      return true;
    }
    return false;
  }

  /**
   * Cancel a download
   */
  cancelDownload(downloadId: string): boolean {
    const item = this.activeDownloads.get(downloadId);
    if (item) {
      item.cancel();
      const downloadItem = this.downloads.get(downloadId);
      if (downloadItem) {
        downloadItem.state = 'cancelled';
      }
      this.activeDownloads.delete(downloadId);
      return true;
    }
    return false;
  }

  /**
   * Open downloaded file
   */
  async openDownload(downloadId: string): Promise<boolean> {
    const downloadItem = this.downloads.get(downloadId);
    if (downloadItem && downloadItem.state === 'completed') {
      if (fs.existsSync(downloadItem.savePath)) {
        await shell.openPath(downloadItem.savePath);
        return true;
      }
    }
    return false;
  }

  /**
   * Show download in folder
   */
  showInFolder(downloadId: string): boolean {
    const downloadItem = this.downloads.get(downloadId);
    if (downloadItem && fs.existsSync(downloadItem.savePath)) {
      shell.showItemInFolder(downloadItem.savePath);
      return true;
    }
    return false;
  }

  /**
   * Clear completed downloads from list
   */
  clearCompletedDownloads(): void {
    const toDelete: string[] = [];
    this.downloads.forEach((item, id) => {
      if (item.state === 'completed' || item.state === 'cancelled') {
        toDelete.push(id);
      }
    });
    toDelete.forEach(id => this.downloads.delete(id));
  }
}
