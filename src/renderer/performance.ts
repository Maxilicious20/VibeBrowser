/**
 * Performance & Memory Management Utilities
 */

export class PerformanceOptimizer {
  /**
   * Cleanup event listeners and references to prevent memory leaks
   */
  static cleanupElement(element: HTMLElement | null): void {
    if (!element) return;

    // Clone and replace to remove all event listeners
    const clone = element.cloneNode(true);
    if (element.parentNode) {
      element.parentNode.replaceChild(clone, element);
    }

    // Clear references
    (element as any).innerHTML = '';
  }

  /**
   * Debounce function for expensive operations
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        func(...args);
        timeout = null;
      }, wait);
    };
  }

  /**
   * Throttle function for animations and scroll events
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Lazy load images
   */
  static setupLazyLoading(): void {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            img.src = img.dataset.src || '';
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach((img) => {
        imageObserver.observe(img);
      });
    }
  }

  /**
   * Batch DOM updates to avoid reflows
   */
  static batchDOMUpdates(updates: () => void): void {
    if (document.hidden) {
      updates();
    } else {
      requestAnimationFrame(updates);
    }
  }

  /**
   * Check memory usage (for debugging)
   */
  static getMemoryUsage(): { used: number; total: number } | null {
    if ((performance as any).memory) {
      return {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
      };
    }
    return null;
  }

  /**
   * Force garbage collection attempt (for debugging only!)
   */
  static suggestGarbageCollection(): void {
    if (window.gc) {
      window.gc();
    }
  }
}
