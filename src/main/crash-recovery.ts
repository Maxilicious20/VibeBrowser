/**
 * Crash Recovery Manager - Automatically restore tabs on app restart
 */

import { StorageManager, StoredTab } from './storage';
import { SessionManager } from './session-manager';

export class CrashRecoveryManager {
  private storageManager: StorageManager;
  private sessionManager: SessionManager;
  private recoveryCheckInterval: NodeJS.Timeout | null = null;

  constructor(storageManager: StorageManager, sessionManager: SessionManager) {
    this.storageManager = storageManager;
    this.sessionManager = sessionManager;
  }

  /**
   * Start crash recovery - save tabs periodically
   */
  startAutoSave(intervalMs: number = 30000): void {
    // Save tabs every 30 seconds
    this.recoveryCheckInterval = setInterval(() => {
      try {
        const tabs = this.storageManager.loadTabs();
        if (tabs.length > 0) {
          // Create auto-save session
          const tabsData = tabs.map(t => ({
            url: t.url,
            title: t.title,
          }));
          this.sessionManager.saveAutoSaveSession(tabsData);
        }
      } catch (error) {
        console.error('Error during auto-save:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    if (this.recoveryCheckInterval) {
      clearInterval(this.recoveryCheckInterval);
      this.recoveryCheckInterval = null;
    }
  }

  /**
   * Check if we need to recover from crash
   */
  shouldRecover(): boolean {
    try {
      // Check if app crashed unexpectedly
      const lastSession = this.sessionManager.getAutoSaveSession();
      if (lastSession && lastSession.tabs.length > 0) {
        return true;
      }
    } catch (error) {
      console.error('Error checking for recovery:', error);
    }
    return false;
  }

  /**
   * Recover last session
   */
  getRecoverySession(): Array<{ url: string; title: string }> | null {
    const autoSave = this.sessionManager.getAutoSaveSession();
    if (autoSave) {
      return autoSave.tabs;
    }
    return null;
  }

  /**
   * Clear recovery data
   */
  clearRecoveryData(): void {
    const autoSave = this.sessionManager.getAutoSaveSession();
    if (autoSave) {
      this.sessionManager.deleteSession(autoSave.id);
    }
  }
}
