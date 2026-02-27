/**
 * Browser-View Manager: Verwaltet die WebView-Instanzen
 */

import { TabData } from '../../common/types';

export class BrowserViewManager {
  private viewsContainer: HTMLElement;
  private views: Map<string, HTMLIFrameElement> = new Map();

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container mit ID '${containerId}' nicht gefunden`);
    }
    this.viewsContainer = container;
  }

  createView(tabId: string, url: string): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.id = `view-${tabId}`;
    iframe.className = 'browser-view';
    iframe.src = url;
    iframe.sandbox.add(
      'allow-same-origin',
      'allow-scripts',
      'allow-forms',
      'allow-popups'
    );
    this.viewsContainer.appendChild(iframe);
    this.views.set(tabId, iframe);
    return iframe;
  }

  showView(tabId: string): void {
    this.views.forEach((view, id) => {
      view.style.display = id === tabId ? 'block' : 'none';
    });
  }

  removeView(tabId: string): void {
    const view = this.views.get(tabId);
    if (view) {
      view.remove();
      this.views.delete(tabId);
    }
  }

  updateUrl(tabId: string, url: string): void {
    const view = this.views.get(tabId);
    if (view) {
      view.src = url;
    }
  }

  navigateBack(tabId: string): void {
    const view = this.views.get(tabId);
    if (view) {
      view.contentWindow?.history.back();
    }
  }

  navigateForward(tabId: string): void {
    const view = this.views.get(tabId);
    if (view) {
      view.contentWindow?.history.forward();
    }
  }

  reload(tabId: string): void {
    const view = this.views.get(tabId);
    if (view) {
      view.contentWindow?.location.reload();
    }
  }

  getView(tabId: string): HTMLIFrameElement | undefined {
    return this.views.get(tabId);
  }
}
