/* =======================================================
   Safa World — Clean URLs, Routing & PWA Service Worker
   Enables PWA offline capabilities, asset caching,
   and clean URL routing (/product/:slug)
   ======================================================= */

const CACHE_NAME = 'safaworld-pwa-v3';

const PRECACHE_ASSETS = [
    '/',
    '/offline.html',
    '/manifest.json',
    '/css/home.css?v=24',
    '/css/products.css?v=24',
    '/css/product.css?v=24',
    '/images/safa-world-logo.jpg',
    '/images/logo-loader.png',
    '/images/icons/icon-192x192.png',
    '/images/icons/icon-512x512.png',
    '/js/spa-router.js?v=242113',
    '/js/loadComponents.js?v=24',
    '/js/main.js?v=242112',
    '/js/meta-manager.js?v=24',
    '/js/pwa-installer.js?v=24'
];

const STATIC_ROUTES = {
    'product-list': 'product-list.html',
    'about-us': 'about-us.html',
    'contact-us': 'contact-us.html',
    'privacy-policy': 'privacy-policy.html',
    'terms-and-conditions': 'terms-and-conditions.html',
    'return-policy': 'return-policy.html',
    'login': 'login.html',
    'profile': 'profile.html',
    'my-orders': 'my-orders.html',
    'order': 'order.html',
    'checkout': 'checkout.html',
    'wishlist': 'wishlist.html',
    'cart': 'cart.html',
    'address': 'address.html',
    'all_product': 'all_product.html'
};

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn('Precache partial warning:', err);
            });
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // Only handle GET requests on our origin
    if (req.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }

    // Ignore API calls, components, and static assets with extensions (except pre-cached ones)
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/components/')) {
        return;
    }

    // If static file with extension, serve Cache-First / Network-Fallback
    if (url.pathname.includes('.')) {
        event.respondWith(
            caches.match(req).then((cachedResp) => {
                if (cachedResp) return cachedResp;
                return fetch(req).then((networkResp) => {
                    // Cache CSS, JS, and images dynamically
                    if (networkResp.ok && (url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.webp'))) {
                        const cloned = networkResp.clone();
                        caches.open(CACHE_NAME).then(c => c.put(req, cloned));
                    }
                    return networkResp;
                });
            })
        );
        return;
    }

    // Extract cleaned path segment(s)
    const cleanPath = url.pathname.replace(/^\/+|\/+$/g, '');

    // Root homepage
    if (!cleanPath) {
        event.respondWith(
            fetch(req).catch(() => caches.match('/') || caches.match('/offline.html'))
        );
        return;
    }

    // 1. Check /product/:slug or /p/:slug
    const pathParts = cleanPath.split('/');
    if ((pathParts[0] === 'product' || pathParts[0] === 'p') && pathParts[1]) {
        const slug = pathParts[1];
        const targetUrl = `/product-details.html?slug=${encodeURIComponent(slug)}`;
        event.respondWith(
            fetch(targetUrl).catch(() => caches.match(targetUrl) || caches.match('/offline.html'))
        );
        return;
    }

    // 2. Check if it's a known static page
    if (STATIC_ROUTES[cleanPath]) {
        const targetHtml = '/' + STATIC_ROUTES[cleanPath] + (url.search || '');
        event.respondWith(
            fetch(targetHtml).catch(() => caches.match(targetHtml) || caches.match('/offline.html'))
        );
        return;
    }

    // 3. Dynamic Product Slug legacy fallback (e.g. /bike-throttle-...)
    if (!cleanPath.includes('/')) {
        const slug = cleanPath;
        const targetUrl = `/product-details.html?slug=${encodeURIComponent(slug)}`;
        event.respondWith(
            fetch(targetUrl).catch(() => caches.match(targetUrl) || caches.match('/offline.html'))
        );
        return;
    }
});
