/**
 * UI Optimization Service
 * Handles mobile responsiveness and loading optimizations
 */
const uiOptimizationService = {
  /**
   * Initialize UI optimizations
   */
  initialize: () => {
    // Add viewport meta tag if not present
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(viewport);
    }

    // Add responsive CSS classes
    uiOptimizationService.addResponsiveClasses();

    // Initialize lazy loading
    uiOptimizationService.initializeLazyLoading();

    // Initialize performance monitoring
    uiOptimizationService.initializePerformanceMonitoring();
  },

  /**
   * Add responsive CSS classes
   */
  addResponsiveClasses: () => {
    const html = document.documentElement;
    const body = document.body;

    // Add responsive classes to html and body
    html.classList.add('responsive');
    body.classList.add('responsive');

    // Add device-specific classes
    if ('ontouchstart' in window) {
      html.classList.add('touch-device');
    }

    // Add screen size classes
    const updateScreenSizeClasses = () => {
      const width = window.innerWidth;
      html.classList.remove('xs', 'sm', 'md', 'lg', 'xl');
      
      if (width < 576) html.classList.add('xs');
      else if (width < 768) html.classList.add('sm');
      else if (width < 992) html.classList.add('md');
      else if (width < 1200) html.classList.add('lg');
      else html.classList.add('xl');
    };

    // Initial call
    updateScreenSizeClasses();

    // Update on resize
    window.addEventListener('resize', updateScreenSizeClasses);
  },

  /**
   * Initialize lazy loading
   */
  initializeLazyLoading: () => {
    // Use Intersection Observer for lazy loading
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            observer.unobserve(img);
          }
        });
      });

      // Observe all lazy-loaded images
      document.querySelectorAll('img.lazy').forEach(img => {
        imageObserver.observe(img);
      });
    }

    // Add loading="lazy" to images below the fold
    document.querySelectorAll('img:not([loading])').forEach(img => {
      const rect = img.getBoundingClientRect();
      if (rect.top > window.innerHeight) {
        img.loading = 'lazy';
      }
    });
  },

  /**
   * Initialize performance monitoring
   */
  initializePerformanceMonitoring: () => {
    // Monitor page load performance
    window.addEventListener('load', () => {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      
      // Log performance metrics
      console.log(`Page load time: ${loadTime}ms`);
      
      // Send metrics to analytics if needed
      if (window.analytics) {
        window.analytics.track('Page Load', {
          loadTime,
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          firstPaint: performance.getEntriesByType('paint')[0]?.startTime
        });
      }
    });

    // Create a map to track ongoing API calls
    const ongoingApiCalls = new Map();
    
    // Create a debounce function for logging slow API calls
    const debounceTime = 1000; // 1 second
    const slowCallThreshold = 2000; // 2 seconds
    let debounceTimeout;
    
    // Function to log slow API calls, debounced to avoid console spam
    const logSlowApiCall = (entry) => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        console.warn(`Slow API call detected: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
      }, debounceTime);
    };

    // Monitor resource loading
    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
          // Track API call start
          if (entry.name.includes('/api/')) {
            ongoingApiCalls.set(entry.name, {
              startTime: entry.startTime,
              shown: false
            });
            
            // Add loading indicator for potentially slow API calls
            if (entry.name.includes('/api/market/nse') || entry.name.includes('/api/market/bse')) {
              uiOptimizationService.addLoadingIndicator('market-data');
            }
          }
          
          // Log slow API calls but don't spam console with duplicates
          if (entry.duration > slowCallThreshold) {
            logSlowApiCall(entry);
            
            // Mark this endpoint as potentially slow for future preloading
            if (localStorage) {
              const slowEndpoints = JSON.parse(localStorage.getItem('slowEndpoints') || '{}');
              const endpoint = entry.name.split('?')[0]; // Remove query params
              
              slowEndpoints[endpoint] = {
                avgDuration: slowEndpoints[endpoint] 
                  ? (slowEndpoints[endpoint].avgDuration * 0.7 + entry.duration * 0.3) 
                  : entry.duration,
                count: (slowEndpoints[endpoint]?.count || 0) + 1,
                lastDetected: Date.now()
              };
              
              localStorage.setItem('slowEndpoints', JSON.stringify(slowEndpoints));
            }
          }
          
          // Remove loading indicator when API call completes
          if (ongoingApiCalls.has(entry.name)) {
            ongoingApiCalls.delete(entry.name);
            
            if (entry.name.includes('/api/market/nse') || entry.name.includes('/api/market/bse')) {
              uiOptimizationService.removeLoadingIndicator('market-data');
            }
          }
        }
      });
    });

    resourceObserver.observe({ entryTypes: ['resource'] });
  },

  /**
   * Optimize table rendering for mobile
   * @param {HTMLElement} table - Table element to optimize
   */
  optimizeTableForMobile: (table) => {
    if (!table) return;

    // Add responsive wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'table-responsive';
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);

    // Add horizontal scroll indicator
    const scrollIndicator = document.createElement('div');
    scrollIndicator.className = 'scroll-indicator';
    scrollIndicator.innerHTML = '← Scroll →';
    wrapper.appendChild(scrollIndicator);

    // Show/hide scroll indicator based on scroll position
    wrapper.addEventListener('scroll', () => {
      const { scrollLeft, scrollWidth, clientWidth } = wrapper;
      scrollIndicator.style.display = 
        scrollLeft > 0 || scrollLeft < scrollWidth - clientWidth ? 'block' : 'none';
    });
  },

  /**
   * Optimize chart rendering
   * @param {Object} chart - Chart instance
   */
  optimizeChart: (chart) => {
    if (!chart) return;

    // Add responsive options
    chart.options.responsive = true;
    chart.options.maintainAspectRatio = false;

    // Optimize animation performance
    chart.options.animation = {
      duration: 0, // Disable animations for better performance
      easing: 'linear'
    };

    // Add resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        chart.resize();
      }, 250);
    });
  },

  /**
   * Add loading skeleton
   * @param {HTMLElement} element - Element to add skeleton to
   */
  addLoadingSkeleton: (element) => {
    if (!element) return;

    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-loader';
    element.appendChild(skeleton);

    // Remove skeleton when content is loaded
    const observer = new MutationObserver((mutations) => {
      if (element.children.length > 1) {
        skeleton.remove();
        observer.disconnect();
      }
    });

    observer.observe(element, { childList: true });
  },

  /**
   * Add loading indicator for slow operations
   * @param {string} id - Identifier for the loading operation
   */
  addLoadingIndicator: (id) => {
    // Check if indicator already exists
    if (document.getElementById(`loading-indicator-${id}`)) return;
    
    // Create loading indicator
    const indicator = document.createElement('div');
    indicator.id = `loading-indicator-${id}`;
    indicator.className = 'loading-indicator';
    indicator.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-message">Loading data...</div>
    `;
    
    // Add CSS for loading indicator if not already present
    if (!document.getElementById('loading-indicator-styles')) {
      const style = document.createElement('style');
      style.id = 'loading-indicator-styles';
      style.textContent = `
        .loading-indicator {
          position: fixed;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 10px 15px;
          border-radius: 4px;
          font-size: 14px;
          display: flex;
          align-items: center;
          z-index: 9999;
          animation: fadeIn 0.3s;
        }
        .loading-spinner {
          border: 2px solid #f3f3f3;
          border-top: 2px solid #3498db;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          margin-right: 10px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Add to document
    document.body.appendChild(indicator);
    
    // Auto-remove after 10 seconds to prevent stuck indicators
    setTimeout(() => {
      uiOptimizationService.removeLoadingIndicator(id);
    }, 10000);
  },
  
  /**
   * Remove loading indicator
   * @param {string} id - Identifier for the loading operation
   */
  removeLoadingIndicator: (id) => {
    const indicator = document.getElementById(`loading-indicator-${id}`);
    if (indicator) {
      // Add fade out animation
      indicator.style.animation = 'fadeOut 0.3s';
      indicator.style.opacity = '0';
      
      // Remove after animation completes
      setTimeout(() => {
        indicator.remove();
      }, 300);
    }
  }
};

export default uiOptimizationService; 