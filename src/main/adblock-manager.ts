import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

/**
 * VibeBrowser Adblock Manager
 * Blockt Ads, Tracker, und andere Inhalte basierend auf Filterlisten
 */
export class AdblockManager {
  private blocklistPath: string;
  private customBlocklistPath: string;
  private blockRules: Set<string> = new Set();
  private whitelistRules: Set<string> = new Set();
  private blockedCount: number = 0;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.blocklistPath = path.join(userDataPath, 'VibeBrowser', 'adblock-rules.txt');
    this.customBlocklistPath = path.join(userDataPath, 'VibeBrowser', 'adblock-custom.txt');

    this.loadBlockRules();
  }

  /**
   * Load and parse blocking rules
   */
  private loadBlockRules(): void {
    // Load default rules if not exists
    if (!fs.existsSync(this.blocklistPath)) {
      const defaultRules = this.getDefaultBlockRules();
      const dir = path.dirname(this.blocklistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.blocklistPath, defaultRules);
    }

    // Load rules from file
    try {
      const rulesContent = fs.readFileSync(this.blocklistPath, 'utf-8');
      const lines = rulesContent.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('!')) continue; // Skip empty and comments
        
        if (trimmed.startsWith('@@')) {
          this.whitelistRules.add(trimmed.substring(2));
        } else {
          this.blockRules.add(trimmed);
        }
      }
    } catch (error) {
      console.error('Failed to load adblock rules:', error);
    }

    // Load custom rules
    if (fs.existsSync(this.customBlocklistPath)) {
      try {
        const customContent = fs.readFileSync(this.customBlocklistPath, 'utf-8');
        const lines = customContent.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('!')) {
            this.blockRules.add(trimmed);
          }
        }
      } catch (error) {
        console.error('Failed to load custom adblock rules:', error);
      }
    }
  }

  /**
   * Check if a URL should be blocked
   */
  public shouldBlockURL(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const fullUrl = urlObj.toString();

      // Check whitelist first
      for (const rule of this.whitelistRules) {
        if (this.matchesRule(hostname, fullUrl, rule)) {
          return false;
        }
      }

      // Check blocklist
      for (const rule of this.blockRules) {
        if (this.matchesRule(hostname, fullUrl, rule)) {
          this.blockedCount += 1;
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Match URL against a rule pattern
   */
  private matchesRule(hostname: string, url: string, rule: string): boolean {
    // Simple wildcard matching
    if (rule.includes('*')) {
      const regex = new RegExp('^' + rule.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      return regex.test(hostname) || regex.test(url);
    }

    // Domain matching
    return hostname.includes(rule) || url.includes(rule);
  }

  /**
   * Add custom blocking rule
   */
  public addCustomRule(rule: string): void {
    if (!rule.trim()) return;

    this.blockRules.add(rule);

    // Append to custom rules file
    const dirPath = path.dirname(this.customBlocklistPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.appendFileSync(this.customBlocklistPath, rule + '\n');
  }

  /**
   * Get default blocking rules (popular ad networks)
   */
  private getDefaultBlockRules(): string {
    return `! VibeBrowser Adblock Rules
! Common ad networks and trackers

! Google Ads
||pagead2.googlesyndication.com^
||google-analytics.com^
||analytics.google.com^
||googleads.g.doubleclick.net^

! Facebook
||facebook.com/tr^
||pixel.facebook.com^

! Microsoft/Bing Ads
||bat.bing.com^
||c.microsoft.com^

! Amazon
||amazon-adsystem.com^

! Adtech
||criteo.com^
||criteo.net^
||doubleclick.net^
||serving-sys.com^
||adnxs.com^

! Tracking
||mixpanel.com^
||segment.com^
||quantserve.com^
||scorecardresearch.com^

! Whitelist (do not block)
@@||google.com^
@@||google.de^
@@||github.com^`;
  }

  /**
   * Get blocklist file path for editing
   */
  public getBlocklistPath(): string {
    return this.blocklistPath;
  }

  /**
   * Get custom blocklist file path
   */
  public getCustomBlocklistPath(): string {
    return this.customBlocklistPath;
  }

  /**
   * Reload rules from disk
   */
  public reloadRules(): void {
    this.blockRules.clear();
    this.whitelistRules.clear();
    this.loadBlockRules();
  }

  /**
   * Reset block counter
   */
  public resetBlockedCount(): void {
    this.blockedCount = 0;
  }

  /**
   * Get statistics
   */
  public getStats(): { rules: number; whitelist: number; blocked: number } {
    return {
      rules: this.blockRules.size,
      whitelist: this.whitelistRules.size,
      blocked: this.blockedCount,
    };
  }
}
