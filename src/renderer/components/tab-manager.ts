/**
 * Tab-Manager: Verwaltet Tabs und deren Status
 */

import { TabData, TabTransferData } from '../../common/types';

export class TabManager {
  private tabs: Map<string, TabData> = new Map();
  private activeTabId: string | null = null;
  private tabCounter: number = 0;
  private onTabUpdate: ((tab: TabData) => void) | null = null;
  private onTabDetach: ((transferData: TabTransferData) => void) | null = null;

  setUpdateCallback(callback: (tab: TabData) => void) {
    this.onTabUpdate = callback;
  }

  setDetachCallback(callback: (transferData: TabTransferData) => void) {
    this.onTabDetach = callback;
  }

  addTab(tab: TabData): void {
    this.tabs.set(tab.id, tab);
    if (!this.activeTabId) {
      this.activeTabId = tab.id;
    }
    this.notifyUpdate(tab);
  }

  createTab(urlOrTabData: string | TabData = 'https://duckduckgo.com'): string {
    let tabId: string;
    let tab: TabData;

    if (typeof urlOrTabData === 'string') {
      // Create from URL string
      tabId = `tab-${this.tabCounter++}`;
      tab = {
        id: tabId,
        title: 'Lädt...',
        url: urlOrTabData,
        favicon: '',
        isLoading: true,
      };
    } else {
      // Create from TabData object
      tab = urlOrTabData;
      tabId = tab.id;
    }

    this.tabs.set(tabId, tab);
    if (!this.activeTabId) {
      this.activeTabId = tabId;
    }
    this.notifyUpdate(tab);
    return tabId;
  }

  closeTab(tabId: string): void {
    const wasActive = this.activeTabId === tabId;
    this.tabs.delete(tabId);
    if (wasActive) {
      const remainingTabs = Array.from(this.tabs.keys());
      this.activeTabId = remainingTabs.length > 0 ? remainingTabs[0] : null;
      if (this.activeTabId) {
        const nextTab = this.tabs.get(this.activeTabId);
        if (nextTab) {
          this.notifyUpdate(nextTab);
        }
      }
    }
  }

  switchTab(tabId: string): void {
    if (!this.tabs.has(tabId)) {
      return;
    }

    const previousTabId = this.activeTabId;
    this.activeTabId = tabId;

    if (previousTabId && previousTabId !== tabId) {
      const previousTab = this.tabs.get(previousTabId);
      if (previousTab) {
        this.notifyUpdate(previousTab);
      }
    }

    const currentTab = this.tabs.get(tabId);
    if (currentTab) {
      this.notifyUpdate(currentTab);
    }
  }

  updateTab(tabId: string, updates: Partial<TabData>): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      Object.assign(tab, updates);
      this.notifyUpdate(tab);
    }
  }

  getTab(tabId: string): TabData | undefined {
    return this.tabs.get(tabId);
  }

  getActiveTabId(): string | null {
    return this.activeTabId;
  }

  getAllTabs(): TabData[] {
    return Array.from(this.tabs.values());
  }

  private notifyUpdate(tab: TabData): void {
    if (this.onTabUpdate) {
      this.onTabUpdate(tab);
    }
  }

  /**
   * Extract tab data for transfer (drag & drop)
   */
  extractTabForTransfer(tabId: string): TabTransferData | null {
    const tab = this.tabs.get(tabId);
    if (!tab) return null;

    return {
      tabId: tab.id,
      title: tab.title,
      url: tab.url,
      favicon: tab.favicon,
      transferType: 'internal',
    };
  }

  /**
   * Notify detach callback (tab being dragged out)
   */
  notifyDetach(transferData: TabTransferData): void {
    if (this.onTabDetach) {
      this.onTabDetach(transferData);
    }
  }

  /**
   * Check if tab can be detached (more than 1 tab exists)
   */
  canDetachTab(): boolean {
    return this.tabs.size > 1;
  }
}
