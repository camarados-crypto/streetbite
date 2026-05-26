// StreetBite Service Worker
const CACHE = 'streetbite-v1';
const APP_SHELL = [
  '/streetbite/',
  '/streetbite/index.html',
  '/streetbite/manifest.json',
  '/streetbite/css/base.css',
  '/streetbite/css/hero.css',
  '/streetbite/css/modals.css',
  '/streetbite/css/passport.css',
  '/streetbite/css/profile.css',
  '/streetbite/css/feed.css',
  '/streetbite/js/config.js',
  '/streetbite/js/state.js',
  '/streetbite/js/api.js',
  '/streetbite/js/data.js',
  '/streetbite/js/ui.js',
  '/streetbite/js/badges.js',
  '/streetbite/js/home.js',
  '/streetbite/js/collections.js',
  '/streetbite/js/card.js',
  '/streetbite/js/detail.js',
  '/streetbite/js/checkin.js',
  '/streetbite/js/dishmap.js',
  '/streetbite/js/passport.js',
  '/streetbite/js/social.js',
  '/streetbite/js/feed.js',
  '/streetbite/js/submit.js',
  '/streetbite/js/profile.js',
  '/streetbite/js/notifications.js',
  '/streetbite/js/buddy.js',
  '/streetbite/js/app.js',
];

// Install: cache app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for API, cache-first for app shell
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Always network for Supabase API, external images, fonts
  if (
    url.includes('supabase.co') ||
    url.includes('unsplash.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('unpkg.com') ||
    url.includes('qrserver.com')
  ) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Cache-first for app shell assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache successful GET responses
        if (e.request.method === 'GET' && response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: return cached index.html for navigation
        if (e.request.mode === 'navigate') {
          return caches.match('/streetbite/index.html');
        }
      });
    })
  );
});
