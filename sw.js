/* =======================================================
   Safa World — Clean URLs & Routing Service Worker
   Enables clean URLs and dynamic product slug routing
   in VS Code Live Server and modern static environments.
   ======================================================= */

const CACHE_NAME = 'safaworld-routing-v1';

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
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // Only handle GET navigation requests on our origin
    if (req.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }

    // Ignore API calls and static assets with extensions
    if (url.pathname.startsWith('/api') || url.pathname.includes('.')) {
        return;
    }

    // Extract cleaned path segment(s)
    const cleanPath = url.pathname.replace(/^\/+|\/+$/g, '');

    // Root homepage
    if (!cleanPath) {
        return;
    }

    // Check if it's a known static page
    if (STATIC_ROUTES[cleanPath]) {
        const targetHtml = '/' + STATIC_ROUTES[cleanPath] + (url.search || '');
        event.respondWith(
            fetch(targetHtml).catch(() => fetch(req))
        );
        return;
    }

    // If single segment without slashes, it's a dynamic product slug!
    // Example: /bike-throttle-design-drop-sholder-t-shirt -> product-details.html?slug=...
    if (!cleanPath.includes('/')) {
        const slug = cleanPath;
        const targetUrl = `/product-details.html?slug=${encodeURIComponent(slug)}`;
        event.respondWith(
            fetch(targetUrl).catch(() => fetch(req))
        );
        return;
    }
});
