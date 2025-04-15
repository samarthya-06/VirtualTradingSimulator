import { toast } from 'react-toastify';

// Track navigation state
let isNavigating = false;
let navigationTimeouts = {};
let lastNavigatedPath = null;
let navigationQueue = [];
let navigationErrorCount = 0;
const MAX_ERROR_COUNT = 3;

// Add a timeout to automatically reset navigation state if stuck
let navigationResetTimeout = null;
const NAVIGATION_TIMEOUT = 8000; // 8 seconds - increased to reduce false positives

// Expose navigation state to window for debugging and recovery
window._navigationState = {
  isNavigating: false,
  navigationQueue: [],
  lastNavigatedPath: null,
  reset: function() {
    isNavigating = false;
    navigationQueue = [];
    navigationErrorCount = 0;
    this.isNavigating = false;
    this.navigationQueue = [];

    // Clear any pending navigation timeouts
    Object.values(navigationTimeouts).forEach(timeout => clearTimeout(timeout));
    navigationTimeouts = {};

    // Clear navigation reset timeout
    if (navigationResetTimeout) {
      clearTimeout(navigationResetTimeout);
      navigationResetTimeout = null;
    }

    document.body.classList.remove('navigating');
    console.log('Navigation state reset');

    return 'Navigation state has been reset';
  }
};

/**
 * Safely navigate to a path with debouncing and error handling
 * @param {Function} navigate - React Router's navigate function
 * @param {string} path - Target path to navigate to
 * @param {Object} options - Navigation options
 */
export const safeNavigate = (navigate, path, options = {}) => {
  const {
    debounceTime = 100, // Increased from 50ms to 100ms for better stability
    showLoading = true,
    forceNavigation = false,
    resetScroll = true,
    onComplete = null,
    bypassDebounce = false // New option to bypass debounce completely
  } = options;

  // Update window navigation state
  window._navigationState.isNavigating = isNavigating;
  window._navigationState.navigationQueue = [...navigationQueue];
  window._navigationState.lastNavigatedPath = lastNavigatedPath;

  // Don't navigate if we're already at this path and not forcing
  if (path === lastNavigatedPath && !forceNavigation) {
    console.log(`Already at ${path}, skipping navigation`);
    return;
  }

  // If already navigating, handle differently based on error count
  if (isNavigating) {
    // If we've had multiple navigation errors, force immediate navigation
    if (navigationErrorCount >= MAX_ERROR_COUNT) {
      console.log(`Forcing immediate navigation to ${path} due to previous errors`);
      // Clear all timeouts to prevent conflicts
      Object.values(navigationTimeouts).forEach(timeoutId => clearTimeout(timeoutId));
      navigationTimeouts = {};
      // Reset error count
      navigationErrorCount = 0;
      // Force immediate navigation
      navigate(path);
      lastNavigatedPath = path;
      return;
    }

    console.log(`Navigation already in progress, queueing navigation to ${path}`);

    // Replace the last queued navigation to the same path if it exists
    const existingQueueItem = navigationQueue.findIndex(item => item.path === path);
    if (existingQueueItem >= 0) {
      navigationQueue[existingQueueItem] = { path, options };
    } else {
      navigationQueue.push({ path, options });
    }
    return;
  }

  // Clear any existing navigation timeouts for this path
  if (navigationTimeouts[path]) {
    clearTimeout(navigationTimeouts[path]);
    delete navigationTimeouts[path];
  }

  // Set navigating state
  isNavigating = true;

  // Show loading indicator if enabled
  if (showLoading) {
    document.body.classList.add('navigating');
  }

  // Set up auto-reset timeout to prevent stuck navigation
  if (navigationResetTimeout) {
    clearTimeout(navigationResetTimeout);
  }

  navigationResetTimeout = setTimeout(() => {
    if (isNavigating) {
      console.warn(`Navigation to ${path} appears stuck, auto-resetting navigation state`);
      window._navigationState.reset();

      // Try to force the navigation as a fallback
      try {
        navigate(path, { replace: true });
      } catch (error) {
        console.error('Error during forced navigation:', error);
      }
    }
  }, NAVIGATION_TIMEOUT);

  // If bypassing debounce, navigate immediately
  const performNavigation = () => {
    try {
      // Perform the navigation
      navigate(path);
      lastNavigatedPath = path;

      // Reset scroll position if requested
      if (resetScroll) {
        window.scrollTo(0, 0);
      }

      console.log(`Successfully navigated to ${path}`);
    } catch (error) {
      console.error('Navigation error:', error);
      toast.error(`Failed to navigate to ${path.split('/').pop()}`);
      navigationErrorCount++;

      // If we've had multiple errors, try a direct navigation approach
      if (navigationErrorCount >= MAX_ERROR_COUNT) {
        console.warn(`Multiple navigation errors detected, will try direct navigation next time`);
      }
    } finally {
      // Reset navigation state immediately
      isNavigating = false;

      // Remove loading indicator
      document.body.classList.remove('navigating');

      // Clear the auto-reset timeout
      if (navigationResetTimeout) {
        clearTimeout(navigationResetTimeout);
        navigationResetTimeout = null;
      }

      // Call onComplete callback if provided
      if (typeof onComplete === 'function') {
        onComplete();
      }

      // Process next navigation in queue if any
      if (navigationQueue.length > 0) {
        // Use a small timeout to prevent potential race conditions
        setTimeout(() => {
          const nextNavigation = navigationQueue.shift();
          safeNavigate(navigate, nextNavigation.path, nextNavigation.options);
        }, 50);
      }
    }
  };

  // Either navigate immediately or set a timeout
  if (bypassDebounce || navigationErrorCount >= MAX_ERROR_COUNT - 1) {
    performNavigation();
  } else {
    navigationTimeouts[path] = setTimeout(performNavigation, debounceTime);
  }
};

/**
 * Add a global loading indicator style for navigation
 */
export const setupNavigationStyles = () => {
  // Create a style element if it doesn't exist
  if (!document.getElementById('navigation-styles')) {
    const style = document.createElement('style');
    style.id = 'navigation-styles';
    style.textContent = `
      body.navigating {
        cursor: progress !important;
      }
      body.navigating a,
      body.navigating button {
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  }
};

// Create a named export object to avoid ESLint warning
const navigationUtils = {
  safeNavigate,
  setupNavigationStyles
};

export default navigationUtils;