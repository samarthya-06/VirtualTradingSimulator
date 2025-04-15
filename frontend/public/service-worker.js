/* eslint-disable no-restricted-globals */

// This service worker can be customized!
// See https://developers.google.com/web/tools/workbox/modules
// for the list of available Workbox modules, or add any other
// code you'd like.
// You can also remove this file if you'd prefer not to use a
// service worker, and the Workbox build step will be skipped.

// Cache names
const CACHE_NAME = 'virtual-trading-simulator-v1';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const API_CACHE = `${CACHE_NAME}-api`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/js/bundle.js',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith(CACHE_NAME) && 
                     cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE &&
                     cacheName !== API_CACHE;
            })
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // API requests - network first, then cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response
          const responseToCache = response.clone();
          
          // Only cache successful responses
          if (response.status === 200) {
            caches.open(API_CACHE)
              .then((cache) => {
                // Cache with expiration (1 hour)
                const headers = new Headers(responseToCache.headers);
                headers.append('sw-fetched-on', new Date().getTime().toString());
                
                return cache.put(request, new Response(
                  responseToCache.body,
                  {
                    status: responseToCache.status,
                    statusText: responseToCache.statusText,
                    headers
                  }
                ));
              });
          }
          
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                // Check if cached response is expired (older than 1 hour)
                const fetchedOn = cachedResponse.headers.get('sw-fetched-on');
                if (fetchedOn) {
                  const expirationTime = 60 * 60 * 1000; // 1 hour in milliseconds
                  const now = new Date().getTime();
                  if (now - parseInt(fetchedOn) > expirationTime) {
                    // Expired response, don't use it
                    return new Response(JSON.stringify({ 
                      error: 'You are offline and cached data is expired' 
                    }), {
                      status: 503,
                      headers: { 'Content-Type': 'application/json' }
                    });
                  }
                }
                return cachedResponse;
              }
              
              // No cached response available
              return new Response(JSON.stringify({ 
                error: 'You are offline and no cached data is available' 
              }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              });
            });
        })
    );
    return;
  }

  // HTML requests - network first, then cache
  if (request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response
          const responseToCache = response.clone();
          
          // Cache the response
          caches.open(STATIC_CACHE)
            .then((cache) => {
              cache.put(request, responseToCache);
            });
          
          return response;
        })
        .catch(() => {
          // If network fails, serve from cache
          return caches.match('/index.html');
        })
    );
    return;
  }

  // For all other requests - cache first, then network
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Not in cache, get from network
        return fetch(request)
          .then((response) => {
            // Clone the response
            const responseToCache = response.clone();
            
            // Cache the fetched response
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
            
            return response;
          })
          .catch((error) => {
            // Special handling for image requests
            if (request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
              return new Response('<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><text x="50%" y="50%" font-family="Arial" font-size="24" text-anchor="middle">Image Offline</text></svg>', {
                headers: { 'Content-Type': 'image/svg+xml' }
              });
            }
            
            console.error('Fetch failed:', error);
            return new Response('Network error', { status: 503 });
          });
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const options = {
      body: data.message || 'New notification',
      icon: '/logo192.png',
      badge: '/logo192.png',
      data: {
        url: data.url || '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Virtual Trading Simulator', options)
    );
  } catch (error) {
    console.error('Error showing notification:', error);
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
}); 