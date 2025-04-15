import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import App from './App';
import uiOptimizationService from './services/uiOptimizationService';
import './styles/uiOptimizations.css';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';

// Initialize UI optimizations
uiOptimizationService.initialize();

// Create a performance observer to monitor important timings
if (process.env.NODE_ENV === 'development' || process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING === 'true') {
  const reportPerformance = (name, value) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`${name}: ${value.toFixed(2)}ms`);
    }
    // Send metrics to analytics in production
    if (process.env.NODE_ENV === 'production' && window.gtag) {
      window.gtag('event', 'performance', {
        event_category: 'Performance',
        event_label: name,
        value: Math.round(value),
        non_interaction: true
      });
    }
  };

  // Create performance observer for key metrics
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      reportPerformance(entry.name, entry.startTime);
      
      // Log more details for specific metrics
      if (entry.name === 'first-contentful-paint') {
        reportPerformance('FCP', entry.startTime);
      } else if (entry.name === 'largest-contentful-paint') {
        reportPerformance('LCP', entry.startTime);
      }
    });
  });

  // Observe paint timings
  observer.observe({ type: 'paint', buffered: true });
  
  // Observe long tasks to detect potential UI blocking
  if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
    const longTaskObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        reportPerformance('Long Task Duration', entry.duration);
      });
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.unregister();

// Preload critical fonts and assets after initial render
setTimeout(() => {
  // Preload critical fonts
  const fontPreloads = [
    'https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap',
    'https://fonts.googleapis.com/icon?family=Material+Icons'
  ];
  
  fontPreloads.forEach(href => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    document.head.appendChild(link);
    
    // Actually load the font
    setTimeout(() => {
      link.rel = 'stylesheet';
    }, 100);
  });
}, 1000);

// Initialize performance measurement
reportWebVitals(metric => {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(metric);
  }
  
  // Send to analytics in production
  if (process.env.NODE_ENV === 'production' && window.gtag) {
    window.gtag('event', 'web_vitals', {
      event_category: 'Web Vitals',
      event_label: metric.name,
      value: Math.round(metric.value),
      non_interaction: true
    });
  }
}); 