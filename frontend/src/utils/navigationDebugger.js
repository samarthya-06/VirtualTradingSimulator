/**
 * Navigation Debugger Utility
 *
 * This utility helps diagnose and fix navigation issues by monitoring
 * navigation events and providing tools to recover from stuck states.
 */

// Track navigation attempts and successes
let navigationAttempts = {};
let stuckDetectionInterval = null;

/**
 * Initialize the navigation debugger
 */
export const initNavigationDebugger = () => {
  // Only run in development or if explicitly enabled
  if (process.env.NODE_ENV !== 'development' &&
      process.env.REACT_APP_ENABLE_NAV_DEBUGGER !== 'true') {
    return;
  }

  console.log('Navigation debugger initialized');

  // Listen for navigation events
  window.addEventListener('popstate', handleNavigationEvent);

  // Set up stuck detection with a longer interval to reduce false positives
  stuckDetectionInterval = setInterval(checkForStuckNavigation, 5000);

  // Add recovery function to window for console access
  window.recoverNavigation = recoverFromStuckNavigation;
};

/**
 * Handle navigation events
 */
const handleNavigationEvent = () => {
  const path = window.location.pathname;

  // Record this navigation
  navigationAttempts[path] = {
    timestamp: Date.now(),
    completed: true
  };

  console.log(`Navigation completed to: ${path}`);
};

/**
 * Record a navigation attempt
 * @param {string} path - The path being navigated to
 */
export const recordNavigationAttempt = (path) => {
  navigationAttempts[path] = {
    timestamp: Date.now(),
    completed: false
  };
};

/**
 * Check for stuck navigation
 */
const checkForStuckNavigation = () => {
  const now = Date.now();
  const stuckThreshold = 8000; // Increased to 8000ms to reduce false positives

  // Look for incomplete navigations that started more than threshold ago
  Object.entries(navigationAttempts).forEach(([path, details]) => {
    if (!details.completed && (now - details.timestamp) > stuckThreshold) {
      console.warn(`Possible stuck navigation detected to: ${path}`);

      // More aggressive auto-recovery attempt
      try {
        console.log('Detected possible stuck navigation, but not auto-recovering to prevent issues');

        // Just log the issue without taking action
        // This prevents aggressive auto-recovery from causing more problems

        // Clear any navigation-related classes to ensure UI is responsive
        document.body.classList.remove('navigating');

        // Reset navigation state in window object
        if (window._navigationState && typeof window._navigationState.reset === 'function') {
          window._navigationState.reset();
        }
      } catch (error) {
        console.error('Error during navigation detection:', error);
      }

      // Clean up this entry
      delete navigationAttempts[path];
    }
  });

  // Clean up old entries
  const cleanupThreshold = 60000; // Set back to 60000ms (1 minute) for better tracking
  Object.entries(navigationAttempts).forEach(([path, details]) => {
    if ((now - details.timestamp) > cleanupThreshold) {
      delete navigationAttempts[path];
    }
  });
};

/**
 * Recover from stuck navigation
 * @param {string} targetPath - Optional path to navigate to
 * @param {boolean} forceReload - Whether to force a page reload
 */
export const recoverFromStuckNavigation = (targetPath, forceReload = false) => {
  console.log('Performing navigation recovery...');

  // Clear any existing recovery timeouts
  if (window._navigationRecoveryTimeout) {
    clearTimeout(window._navigationRecoveryTimeout);
    delete window._navigationRecoveryTimeout;
  }

  // Reset all navigation state
  document.body.classList.remove('navigating');

  // Clear any potential pointer-events restrictions
  const style = document.createElement('style');
  style.textContent = `
    body * {
      pointer-events: auto !important;
      cursor: auto !important;
    }
  `;
  document.head.appendChild(style);
  setTimeout(() => style.remove(), 1000);

  // Reset any global navigation state variables we know about
  if (window._navigationState) {
    window._navigationState.isNavigating = false;
    window._navigationState.navigationQueue = [];
  }

  // Force a navigation to the specified path or current path
  const path = targetPath || window.location.pathname;

  // Try React Router navigation first
  try {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  } catch (error) {
    console.error('Error during history navigation:', error);
  }

  // If a reload is requested or this is a forced recovery, do a hard navigation
  if (forceReload || targetPath) {
    console.log('Performing hard navigation to:', path);
    setTimeout(() => {
      window.location.href = path;
    }, 100);
    return 'Hard navigation recovery initiated';
  }

  return 'Navigation recovery attempted';
};

/**
 * Clean up the debugger
 */
export const cleanupNavigationDebugger = () => {
  if (stuckDetectionInterval) {
    clearInterval(stuckDetectionInterval);
  }

  window.removeEventListener('popstate', handleNavigationEvent);
  delete window.recoverNavigation;
};

// Create a named export object to avoid ESLint warning
const navigationDebugger = {
  initNavigationDebugger,
  recordNavigationAttempt,
  recoverFromStuckNavigation,
  cleanupNavigationDebugger
};

export default navigationDebugger;
