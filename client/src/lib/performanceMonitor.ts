// Performance Monitoring for Arabic Learning Platform
import { securityManager } from './security';

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private observers: PerformanceObserver[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Initialize performance monitoring
  initialize(): void {
    if (!('performance' in window)) {
      console.warn('Performance API not available');
      return;
    }

    this.setupNavigationObserver();
    this.setupResourceObserver();
    this.setupLongTaskObserver();
    this.monitorMemoryUsage();
  }

  // Monitor page navigation performance
  private setupNavigationObserver(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric('page_load_time', navEntry.loadEventEnd - navEntry.loadEventStart);
            this.recordMetric('dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart);
            this.recordMetric('first_paint', navEntry.responseEnd - navEntry.requestStart);
          }
        }
      });
      
      observer.observe({ entryTypes: ['navigation'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Navigation observer setup failed:', error);
    }
  }

  // Monitor resource loading performance
  private setupResourceObserver(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            
            // Monitor slow resources
            const loadTime = resourceEntry.responseEnd - resourceEntry.requestStart;
            if (loadTime > 5000) { // Resources taking more than 5 seconds
              securityManager.logSecurityEvent('slow_resource_detected', {
                resource: resourceEntry.name,
                loadTime,
                size: resourceEntry.transferSize
              });
            }

            // Track by resource type
            const resourceType = this.getResourceType(resourceEntry.name);
            this.recordMetric(`${resourceType}_load_time`, loadTime);
          }
        }
      });
      
      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Resource observer setup failed:', error);
    }
  }

  // Monitor long tasks that block the main thread
  private setupLongTaskObserver(): void {
    try {
      if ('PerformanceObserver' in window && 'PerformanceLongTaskTiming' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'longtask') {
              const longTaskEntry = entry as PerformanceEntry;
              
              // Log long tasks for optimization
              securityManager.logSecurityEvent('long_task_detected', {
                duration: longTaskEntry.duration,
                startTime: longTaskEntry.startTime
              });
              
              this.recordMetric('long_task_duration', longTaskEntry.duration);
            }
          }
        });
        
        observer.observe({ entryTypes: ['longtask'] });
        this.observers.push(observer);
      }
    } catch (error) {
      console.warn('Long task observer setup failed:', error);
    }
  }

  // Monitor memory usage
  private monitorMemoryUsage(): void {
    if ('memory' in (performance as any)) {
      setInterval(() => {
        try {
          const memory = (performance as any).memory;
          this.recordMetric('heap_used', memory.usedJSHeapSize);
          this.recordMetric('heap_total', memory.totalJSHeapSize);
          this.recordMetric('heap_limit', memory.jsHeapSizeLimit);

          // Alert if memory usage is getting high
          const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
          if (usage > 0.8) {
            securityManager.logSecurityEvent('high_memory_usage', {
              usage: usage * 100,
              used: memory.usedJSHeapSize,
              limit: memory.jsHeapSizeLimit
            });
          }
        } catch (error) {
          console.warn('Memory monitoring failed:', error);
        }
      }, 30000); // Check every 30 seconds
    }
  }

  // Record a performance metric
  private recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }

  // Get resource type from URL
  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    
    if (['js', 'mjs'].includes(extension)) return 'script';
    if (['css'].includes(extension)) return 'stylesheet';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return 'image';
    if (['woff', 'woff2', 'ttf', 'otf'].includes(extension)) return 'font';
    if (['mp4', 'webm', 'ogg'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'ogg'].includes(extension)) return 'audio';
    
    return 'other';
  }

  // Get performance summary
  getPerformanceSummary(): any {
    const summary: any = {};
    
    for (const [metric, values] of this.metrics) {
      if (values.length > 0) {
        summary[metric] = {
          average: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    }
    
    return summary;
  }

  // Monitor specific operation
  measureOperation<T>(name: string, operation: () => T): T;
  measureOperation<T>(name: string, operation: () => Promise<T>): Promise<T>;
  measureOperation<T>(name: string, operation: () => T | Promise<T>): T | Promise<T> {
    const startTime = performance.now();
    
    const finish = () => {
      const endTime = performance.now();
      this.recordMetric(name, endTime - startTime);
    };

    try {
      const result = operation();
      
      if (result instanceof Promise) {
        return result.finally(finish);
      } else {
        finish();
        return result;
      }
    } catch (error) {
      finish();
      throw error;
    }
  }

  // Clean up observers
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();