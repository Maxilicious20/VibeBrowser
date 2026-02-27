import { StorageManager } from './storage';

/**
 * VibeBrowser Search Suggestions Manager
 * Provides smart search suggestions based on history and bookmarks
 */
export class SearchSuggestionsManager {
  constructor(private storageManager: StorageManager) {}

  /**
   * Get suggestions based on input query
   */
  public async getSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const suggestions = new Set<string>();

    try {
      // Get history suggestions
      const history = await this.storageManager.loadHistory();
      const historyItems = history.slice(0, 100); // Last 100 items

      for (const item of historyItems) {
        // Match URL
        if (item.url.toLowerCase().includes(lowerQuery)) {
          suggestions.add(item.url);
        }

        // Match URL domain
        try {
          const { hostname } = new URL(item.url);
          if (hostname.toLowerCase().includes(lowerQuery)) {
            suggestions.add(`https://${hostname}`);
          }
        } catch {
          // Invalid URL
        }

        // Match title
        if (item.title && item.title.toLowerCase().includes(lowerQuery)) {
          suggestions.add(item.title);
        }
      }

      // Get bookmarks suggestions
      const bookmarks = await this.storageManager.loadBookmarks();
      for (const bookmark of bookmarks) {
        if (bookmark.url.toLowerCase().includes(lowerQuery)) {
          suggestions.add(bookmark.url);
        }

        if (bookmark.title.toLowerCase().includes(lowerQuery)) {
          suggestions.add(bookmark.title);
        }
      }

      // Sort by relevance (exact match first, then prefix match, then contain)
      const sorted = this.sortSuggestions(query, Array.from(suggestions));

      // Return top 10 suggestions
      return sorted.slice(0, 10);
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }

  /**
   * Sort suggestions by relevance
   */
  private sortSuggestions(query: string, suggestions: string[]): string[] {
    const lowerQuery = query.toLowerCase();

    return suggestions.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();

      // Exact match first
      if (aLower === lowerQuery) return -1;
      if (bLower === lowerQuery) return 1;

      // Starts with query
      if (aLower.startsWith(lowerQuery) && !bLower.startsWith(lowerQuery)) return -1;
      if (bLower.startsWith(lowerQuery) && !aLower.startsWith(lowerQuery)) return 1;

      // Both start with or neither - sort by length (shorter = more relevant)
      if (aLower.startsWith(lowerQuery) && bLower.startsWith(lowerQuery)) {
        return a.length - b.length;
      }

      // Contains - sort by position and frequency
      const aIndex = aLower.indexOf(lowerQuery);
      const bIndex = bLower.indexOf(lowerQuery);

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }

      return 0;
    });
  }

  /**
   * Get popular searches (from history frequency)
   */
  public async getPopularSearches(): Promise<{ term: string; count: number }[]> {
    try {
      const history = await this.storageManager.loadHistory();
      const searchTerms = new Map<string, number>();

      for (const item of history) {
        try {
          const { hostname } = new URL(item.url);
          // Extract search terms from known search engines
          const searchTerm = this.extractSearchTerm(item.url, hostname);
          if (searchTerm) {
            searchTerms.set(
              searchTerm,
              (searchTerms.get(searchTerm) || 0) + 1
            );
          }
        } catch {
          // Invalid URL
        }
      }

      // Convert to array and sort by count
      return Array.from(searchTerms.entries())
        .map(([term, count]) => ({ term, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    } catch (error) {
      console.error('Error getting popular searches:', error);
      return [];
    }
  }

  /**
   * Extract search term from URL for common search engines
   */
  private extractSearchTerm(url: string, hostname: string): string | null {
    const urlObj = new URL(url);
    const lowerHostname = hostname.toLowerCase();

    // Google
    if (lowerHostname.includes('google')) {
      return urlObj.searchParams.get('q');
    }

    // Bing
    if (lowerHostname.includes('bing')) {
      return urlObj.searchParams.get('q');
    }

    // DuckDuckGo
    if (lowerHostname.includes('duckduckgo')) {
      return urlObj.searchParams.get('q');
    }

    // YouTube
    if (lowerHostname.includes('youtube')) {
      return urlObj.searchParams.get('search_query');
    }

    // Wikipedia
    if (lowerHostname.includes('wikipedia')) {
      return urlObj.searchParams.get('search');
    }

    return null;
  }
}
