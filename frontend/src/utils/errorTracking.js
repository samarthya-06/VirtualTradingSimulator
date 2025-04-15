import * as Sentry from '@sentry/react';

export const initializeErrorTracking = () => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.REACT_APP_SENTRY_DSN,
      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay()
      ],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      allowUrls: [
        window.location.origin
      ],
      ignoreErrors: [
        'Failed to fetch',
        'NetworkError',
        'AbortError',
        'net::ERR_BLOCKED_BY_CLIENT',
        'Razorpay',
        'lumberjack'
      ]
    });
  }
};

export const captureError = (error, context = {}) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      extra: context
    });
  } else {
    console.error('Error:', error, '\nContext:', context);
  }
};