import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

type RuleMatcher = {
  type: 'domain-anchored' | 'prefix' | 'wildcard' | 'contains';
  value: string;
  regex: RegExp | null;
};

/**
 * VibeBrowser Adblock Manager
 * Blockt Ads, Tracker, und andere Inhalte basierend auf Filterlisten
 */
export class AdblockManager {
  private blocklistPath: string;
  private customBlocklistPath: string;
  private blockRules: Set<string> = new Set();
  private whitelistRules: Set<string> = new Set();
  private blockMatchers: RuleMatcher[] = [];
  private whitelistMatchers: RuleMatcher[] = [];
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
    this.blockRules.clear();
    this.whitelistRules.clear();
    this.blockMatchers = [];
    this.whitelistMatchers = [];

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

        this.addRule(trimmed);
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
            this.addRule(trimmed);
          }
        }
      } catch (error) {
        console.error('Failed to load custom adblock rules:', error);
      }
    }
  }

  private addRule(rawRule: string): void {
    const cleanedRule = rawRule.trim();
    if (!cleanedRule) return;

    const isWhitelist = cleanedRule.startsWith('@@');
    const normalizedRaw = isWhitelist ? cleanedRule.substring(2) : cleanedRule;
    const matcher = this.compileRule(normalizedRaw);

    if (!matcher) return;

    if (isWhitelist) {
      this.whitelistRules.add(normalizedRaw);
      this.whitelistMatchers.push(matcher);
    } else {
      this.blockRules.add(normalizedRaw);
      this.blockMatchers.push(matcher);
    }
  }

  /**
   * Check if a URL should be blocked
   */
  public shouldBlockURL(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const fullUrl = urlObj.toString().toLowerCase();

      // Check whitelist first
      for (const matcher of this.whitelistMatchers) {
        if (this.matchesRule(hostname, fullUrl, matcher)) {
          return false;
        }
      }

      // Check blocklist
      for (const matcher of this.blockMatchers) {
        if (this.matchesRule(hostname, fullUrl, matcher)) {
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
  private compileRule(rawRule: string): RuleMatcher | null {
    const trimmed = rawRule.trim().toLowerCase();
    if (!trimmed) return null;

    const ruleWithoutOptions = trimmed.split('$')[0].trim();
    if (!ruleWithoutOptions) return null;

    if (ruleWithoutOptions.startsWith('||')) {
      const hostPart = ruleWithoutOptions
        .substring(2)
        .replace(/\^.*$/, '')
        .replace(/^\./, '');

      if (!hostPart) return null;
      return { type: 'domain-anchored', value: hostPart, regex: null };
    }

    if (ruleWithoutOptions.startsWith('|')) {
      const prefix = ruleWithoutOptions.substring(1);
      if (!prefix) return null;
      return { type: 'prefix', value: prefix, regex: null };
    }

    if (ruleWithoutOptions.includes('*') || ruleWithoutOptions.includes('^')) {
      const escaped = ruleWithoutOptions
        .replace(/[.+?${}()|[\]\\]/g, '\\$&')
        .replace(/\\\*/g, '.*')
        .replace(/\^/g, '(?:[^a-z0-9_\\-.%]|$)');

      return {
        type: 'wildcard',
        value: ruleWithoutOptions,
        regex: new RegExp(escaped, 'i'),
      };
    }

    return { type: 'contains', value: ruleWithoutOptions, regex: null };
  }

  private matchesRule(hostname: string, url: string, rule: RuleMatcher): boolean {
    if (rule.type === 'domain-anchored') {
      return hostname === rule.value || hostname.endsWith(`.${rule.value}`);
    }

    if (rule.type === 'prefix') {
      return url.startsWith(rule.value);
    }

    if (rule.type === 'wildcard' && rule.regex) {
      return rule.regex.test(url) || rule.regex.test(hostname);
    }

    return hostname.includes(rule.value) || url.includes(rule.value);
  }

  /**
   * Add custom blocking rule
   */
  public addCustomRule(rule: string): void {
    if (!rule.trim()) return;

    this.addRule(rule);

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
||pubads.g.doubleclick.net^
||adservice.google.com^
||adservice.google.de^

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

! YouTube ad endpoints (best effort)
||youtube.com/api/stats/ads^
||youtube.com/pagead/
||youtube.com/get_midroll_info^
||googlevideo.com/videoplayback*adformat=

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
