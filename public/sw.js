const CACHE_NAME = 'foodmad-v1'

// Pages to cache immediately on install
const PRECACHE_URLS = ['/', '/feed', '/profile']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Remove old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return

  // Skip Supabase API calls — always fetch fresh
  if (event.request.url.includes('supabase.co')) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Return cached version if available, otherwise fetch from network
      return cached || fetch(event.request).catch(() => cached)
    })
  )
})
