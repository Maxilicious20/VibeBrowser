/**
 * UI-Toolbar Manager: Verwaltet die Navigations- und Control-Elemente
 */

export class ToolbarManager {
  private backBtn: HTMLButtonElement;
  private forwardBtn: HTMLButtonElement;
  private reloadBtn: HTMLButtonElement;
  private urlBar: HTMLInputElement;
  private minimizeBtn: HTMLButtonElement;
  private maximizeBtn: HTMLButtonElement;
  private closeBtn: HTMLButtonElement;

  private onNavigate: ((url: string) => void | Promise<void>) | null = null;
  private onBack: (() => void) | null = null;
  private onForward: (() => void) | null = null;
  private onReload: (() => void) | null = null;

  constructor() {
    this.backBtn = document.getElementById('back-btn') as HTMLButtonElement;
    this.forwardBtn = document.getElementById('forward-btn') as HTMLButtonElement;
    this.reloadBtn = document.getElementById('reload-btn') as HTMLButtonElement;
    this.urlBar = document.getElementById('url-bar') as HTMLInputElement;
    this.minimizeBtn = document.getElementById(
      'minimize-btn'
    ) as HTMLButtonElement;
    this.maximizeBtn = document.getElementById(
      'maximize-btn'
    ) as HTMLButtonElement;
    this.closeBtn = document.getElementById('close-btn') as HTMLButtonElement;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.backBtn?.addEventListener('click', () => this.onBack?.());
    this.forwardBtn?.addEventListener('click', () => this.onForward?.());
    this.reloadBtn?.addEventListener('click', () => this.onReload?.());

    this.urlBar?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        let url = this.urlBar.value.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        this.onNavigate?.(url);
      }
    });

    // Window-Controls
    this.minimizeBtn?.addEventListener('click', () => {
      window.electronAPI?.window.minimize();
    });

    this.maximizeBtn?.addEventListener('click', () => {
      window.electronAPI?.window.maximize();
    });

    this.closeBtn?.addEventListener('click', () => {
      window.electronAPI?.window.close();
    });
  }

  setNavigateCallback(callback: (url: string) => void | Promise<void>) {
    this.onNavigate = callback;
  }

  setBackCallback(callback: () => void) {
    this.onBack = callback;
  }

  setForwardCallback(callback: () => void) {
    this.onForward = callback;
  }

  setReloadCallback(callback: () => void) {
    this.onReload = callback;
  }

  setUrl(url: string): void {
    this.urlBar.value = url;
  }

  getUrl(): string {
    return this.urlBar.value;
  }

  focusUrlBar(): void {
    this.urlBar.focus();
    this.urlBar.select();
  }
}
