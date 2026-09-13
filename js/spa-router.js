/* ==========================================================
   Safa World — React-Style Zero-Reload SPA Router
   Smooth client-side routing with Global Loader transitions
   ========================================================== */

(function () {
    'use strict';

    const PAGE_CACHE = new Map();
    const MIN_TRANSITION_MS = 280; // Minimum time to show loader for smooth feel
    let isNavigating = false;
    let currentActiveRoute = window.location.pathname.replace(/^\/+|\/+$/g, '');
    let currentActiveSearch = window.location.search;

    const STATIC_PAGES = {
        '': 'index.html',
        '/': 'index.html',
        'index': 'index.html',
        'index.html': 'index.html',
        'product-list': 'product-list.html',
        'product-list.html': 'product-list.html',
        'about-us': 'about-us.html',
        'about-us.html': 'about-us.html',
        'contact-us': 'contact-us.html',
        'contact-us.html': 'contact-us.html',
        'privacy-policy': 'privacy-policy.html',
        'privacy-policy.html': 'privacy-policy.html',
        'terms-and-conditions': 'terms-and-conditions.html',
        'terms-and-conditions.html': 'terms-and-conditions.html',
        'return-policy': 'return-policy.html',
        'return-policy.html': 'return-policy.html',
        'login': 'login.html',
        'login.html': 'login.html',
        'profile': 'profile.html',
        'profile.html': 'profile.html',
        'my-orders': 'my-orders.html',
        'my-orders.html': 'my-orders.html',
        'order': 'order.html',
        'order.html': 'order.html',
        'checkout': 'checkout.html',
        'checkout.html': 'checkout.html',
        'wishlist': 'wishlist.html',
        'wishlist.html': 'wishlist.html',
        'cart': 'cart.html',
        'cart.html': 'cart.html',
        'address': 'address.html',
        'address.html': 'address.html',
        'all_product': 'product-list.html',
        'all_product.html': 'product-list.html'
    };

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Resolve destination path to physical HTML file URL
     */
    function resolveRoute(pathname, search) {
        const cleanPath = pathname.replace(/^\/+|\/+$/g, '');

        // Root
        if (!cleanPath || cleanPath === 'index' || cleanPath === 'index.html') {
            return {
                cleanPath: '',
                fetchUrl: '/index.html',
                cleanUrl: '/' + (search || ''),
                isProduct: false
            };
        }

        // Product Details Page (/product/:slug or /p/:slug)
        const pathParts = cleanPath.split('/');
        if ((pathParts[0] === 'product' || pathParts[0] === 'p') && pathParts[1]) {
            const slug = pathParts[1];
            return {
                cleanPath: `product/${slug}`,
                fetchUrl: `/product-details.html?slug=${encodeURIComponent(slug)}`,
                cleanUrl: `/product/${slug}`,
                isProduct: true,
                slug: slug
            };
        }

        // Product Details Page (handles /product-details, /product-details.html, /product-details.html?slug=...)
        if (cleanPath === 'product-details' || cleanPath === 'product-details.html') {
            const params = new URLSearchParams(search);
            const querySlug = params.get('slug') || sessionStorage.getItem('current_product_slug') || '';
            return {
                cleanPath: querySlug ? `product/${querySlug}` : 'product-details',
                fetchUrl: `/product-details.html${search || (querySlug ? `?slug=${encodeURIComponent(querySlug)}` : '')}`,
                cleanUrl: querySlug ? `/product/${querySlug}` : `/product-details${search || ''}`,
                isProduct: true,
                slug: querySlug
            };
        }

        // Known static page
        if (STATIC_PAGES[cleanPath]) {
            return {
                cleanPath: cleanPath.replace(/\.html$/, ''),
                fetchUrl: '/' + STATIC_PAGES[cleanPath] + (search || ''),
                cleanUrl: '/' + cleanPath.replace(/\.html$/, '') + (search || ''),
                isProduct: false
            };
        }

        // Dynamic Product Slug legacy fallback (e.g. /bike-throttle-design-drop-sholder-t-shirt -> /product/...)
        if (!cleanPath.includes('/')) {
            const slug = cleanPath;
            return {
                cleanPath: `product/${slug}`,
                fetchUrl: `/product-details.html?slug=${encodeURIComponent(slug)}`,
                cleanUrl: `/product/${slug}`,
                isProduct: true,
                slug: slug
            };
        }

        // Fallback
        return {
            cleanPath: cleanPath,
            fetchUrl: '/' + cleanPath + (search || ''),
            cleanUrl: '/' + cleanPath + (search || ''),
            isProduct: false
        };
    }

    /**
     * Fetch HTML text with caching
     */
    async function fetchHtml(url) {
        if (PAGE_CACHE.has(url)) {
            return PAGE_CACHE.get(url);
        }
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${url}`);
        const text = await resp.text();
        PAGE_CACHE.set(url, text);
        return text;
    }

    /**
     * Dynamically load external script if not already present
     */
    function loadScriptAsync(src) {
        return new Promise((resolve, reject) => {
            const cleanSrc = src.split('?')[0];
            const alreadyLoaded = Array.from(document.querySelectorAll('script[src]'))
                .some(s => s.getAttribute('src')?.split('?')[0] === cleanSrc);

            if (alreadyLoaded) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => {
                console.warn('Script load failed:', src);
                resolve(); // resolve anyway to prevent hanging
            };
            document.body.appendChild(script);
        });
    }

    /**
     * Manage Breadcrumb rendering during SPA navigation
     */
    function updateBreadcrumb(routeInfo, doc) {
        let bcContainer = document.getElementById('bc-br');

        // 1. If destination is Homepage (root), hide/clear breadcrumb
        if (!routeInfo.cleanPath || routeInfo.cleanPath === 'index') {
            if (bcContainer) {
                bcContainer.innerHTML = '';
                bcContainer.style.display = 'none';
            }
            return;
        }

        // 2. Extract title from incoming doc or fallbacks
        let title = '';
        const incomingBc = doc ? doc.getElementById('bc-br') : null;
        if (incomingBc) {
            const titleEl = incomingBc.querySelector('title');
            if (titleEl && titleEl.textContent.trim()) {
                title = titleEl.textContent.trim();
            }
        }

        if (!title) {
            const BREADCRUMB_MAP = {
                'product-list': 'Product List',
                'all_product': 'All Products',
                'about-us': 'About Us',
                'contact-us': 'Contact Us',
                'privacy-policy': 'Privacy Policy',
                'terms-and-conditions': 'Terms & Conditions',
                'return-policy': 'Return Policy',
                'login': 'Login',
                'profile': 'My Profile',
                'my-orders': 'My Orders',
                'order': 'Order Details',
                'checkout': 'Checkout',
                'wishlist': 'My Wishlist',
                'cart': 'Shopping Cart',
                'address': 'My Addresses'
            };
            title = BREADCRUMB_MAP[routeInfo.cleanPath] || (routeInfo.isProduct ? 'Product Details' : 'Page');
        }

        // 3. Ensure #bc-br element exists in DOM
        if (!bcContainer) {
            bcContainer = document.createElement('div');
            bcContainer.id = 'bc-br';
            bcContainer.className = 'bc-br-section';

            const pageEl = document.querySelector('.page') || document.querySelector('.auth-page');
            if (pageEl && pageEl.parentNode) {
                pageEl.parentNode.insertBefore(bcContainer, pageEl);
            } else {
                const subnav = document.getElementById('subnavbar-container');
                if (subnav && subnav.parentNode) {
                    subnav.parentNode.insertBefore(bcContainer, subnav.nextSibling);
                } else {
                    document.body.appendChild(bcContainer);
                }
            }
        }

        // 4. Populate with proper Breadcrumb markup
        bcContainer.style.display = '';
        bcContainer.innerHTML = `
            <div class="info-page-hero">
              <nav class="info-hero-bc" aria-label="Breadcrumb">
                <a href="/">Home</a>
                <span aria-hidden="true">›</span>
                <span class="bc-cur">${title}</span>
              </nav>
            </div>
        `;
    }

    window.updateBreadcrumb = updateBreadcrumb;

    /**
     * Execute page-specific lifecycle hooks
     */
    async function executePageLifecycle(routeInfo, searchParams) {
        const { cleanPath, isProduct, slug } = routeInfo;

        // Close any opened menus/drawers
        if (typeof closeCartDrawer === 'function') closeCartDrawer();
        if (typeof closeDrw === 'function') closeDrw();
        if (typeof closeSearch === 'function') closeSearch();

        if (isProduct || cleanPath === 'product-details' || cleanPath.startsWith('product/')) {
            const activeSlug = slug || searchParams.get('slug') || sessionStorage.getItem('current_product_slug') || '';
            sessionStorage.setItem('current_product_slug', activeSlug);

            // Reset details state
            if (typeof CURRENT_PRODUCT !== 'undefined') CURRENT_PRODUCT = null;
            if (typeof SELECTED_VARIANT !== 'undefined') SELECTED_VARIANT = null;

            if (typeof loadProductDetails === 'function') {
                await loadProductDetails(activeSlug);
            }
            if (typeof initGalleryZoom === 'function') {
                initGalleryZoom();
            }
        } else {
            // Update dynamic SEO & Meta tags for static route
            if (typeof window.updateMetaForRoute === 'function') {
                window.updateMetaForRoute(cleanPath);
            }

            if (!cleanPath || cleanPath === 'index') {
                if (typeof perPage !== 'undefined') perPage = 12;
                if (typeof loadProducts === 'function') loadProducts();
                if (typeof featureSectionAdd === 'function') featureSectionAdd();
                if (typeof loadHeroSlider === 'function') loadHeroSlider();
                if (typeof loadShowcase === 'function') loadShowcase();
            } else if (cleanPath === 'product-list' || cleanPath === 'all_product') {
                if (typeof perPage !== 'undefined') perPage = 12;
                if (typeof ALL_PRODUCTS !== 'undefined' && typeof goPage === 'function') {
                    if (typeof currentPage !== 'undefined') currentPage = 1;
                }
                if (typeof loadProducts === 'function') loadProducts();
            } else if (cleanPath === 'profile') {
                if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
                    window.spaNavigate('/login');
                    return;
                }
                if (typeof loadProfile === 'function') loadProfile();
            } else if (cleanPath === 'my-orders') {
                if (typeof loadOrders === 'function') loadOrders();
            } else if (cleanPath === 'order') {
                if (typeof loadOrderDetails === 'function') loadOrderDetails();
            } else if (cleanPath === 'wishlist') {
                if (typeof loadWishlist === 'function') loadWishlist();
            } else if (cleanPath === 'cart') {
                if (typeof loadCartItems === 'function') loadCartItems();
            } else if (cleanPath === 'checkout') {
                if (typeof initCheckoutPage === 'function') {
                    await initCheckoutPage();
                }
            } else if (cleanPath === 'address') {
                if (typeof loadDistricts === 'function') loadDistricts();
                if (typeof loadAddresses === 'function') loadAddresses();
                const addBtn = document.getElementById("addAddressBtn");
                if (addBtn && typeof addAddress === 'function') {
                    addBtn.onclick = addAddress;
                }
            } else if (cleanPath === 'login') {
                if (typeof initLoginPage === 'function') initLoginPage();
            } else if (cleanPath === 'contact-us') {
                if (typeof initContactForm === 'function') initContactForm();
            }

            // Global UI updates
            if (typeof setMobNavActive === 'function') setMobNavActive();
            if (typeof updateAuthButtons === 'function') updateAuthButtons();
            if (typeof updateCartCountFromBackend === 'function') updateCartCountFromBackend();
            if (typeof updateWishlistCount === 'function') updateWishlistCount();

            // Scroll to top instantly
            window.scrollTo({ top: 0, behavior: 'instant' });
        }

        /**
         * Core SPA Navigate Method
         */
        async function spaNavigate(targetPath, pushHistory = true) {
            if (!targetPath) return;

            // Parse target URL
            let urlObj;
            try {
                urlObj = new URL(targetPath, window.location.origin);
            } catch (e) {
                console.error('Invalid navigation URL:', targetPath, e);
                window.location.href = targetPath;
                return;
            }

            const routeInfo = resolveRoute(urlObj.pathname, urlObj.search);

            // Don't re-navigate if already at the exact same route and search params
            if (pushHistory && currentActiveRoute === routeInfo.cleanPath && currentActiveSearch === urlObj.search) {
                return;
            }

            if (isNavigating) return;
            isNavigating = true;

            // 1. Show Global Loader immediately
            if (typeof window.showLoader === 'function') {
                window.showLoader();
            }

            const startTime = Date.now();

            try {
                // 2. Fetch destination HTML
                const [htmlText] = await Promise.all([
                    fetchHtml(routeInfo.fetchUrl),
                    sleep(MIN_TRANSITION_MS) // guarantee smooth loader display
                ]);

                // 3. Parse fetched HTML
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');

                // Update title
                if (doc.title) {
                    document.title = doc.title;
                }

                // Update meta description
                const newMeta = doc.querySelector('meta[name="description"]');
                if (newMeta) {
                    let curMeta = document.querySelector('meta[name="description"]');
                    if (!curMeta) {
                        curMeta = document.createElement('meta');
                        curMeta.name = 'description';
                        document.head.appendChild(curMeta);
                    }
                    curMeta.setAttribute('content', newMeta.getAttribute('content'));
                }

                // Update breadcrumb (handles creation, insertion, styling, and title)
                updateBreadcrumb(routeInfo, doc);

                // Swap main content container (.page or .auth-page)
                const newContent = doc.querySelector('.page') || doc.querySelector('.auth-page');
                const curContent = document.querySelector('.page') || document.querySelector('.auth-page');

                if (newContent && curContent) {
                    const imported = document.importNode(newContent, true);
                    curContent.parentNode.replaceChild(imported, curContent);
                } else if (newContent && !curContent) {
                    const imported = document.importNode(newContent, true);
                    const footerSec = document.querySelector('.footer-section');
                    if (footerSec) {
                        document.body.insertBefore(imported, footerSec);
                    } else {
                        document.body.appendChild(imported);
                    }
                }

                // Dynamically load any missing stylesheets into <head>
                const docStyles = doc.querySelectorAll('link[rel="stylesheet"]');
                docStyles.forEach(link => {
                    const href = link.getAttribute('href');
                    if (!href) return;
                    const exists = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
                        .some(l => l.getAttribute('href')?.split('?')[0] === href.split('?')[0]);
                    if (!exists) {
                        const newLink = document.createElement('link');
                        newLink.rel = 'stylesheet';
                        newLink.href = href;
                        document.head.appendChild(newLink);
                    }
                });

                // Dynamically load any missing external scripts
                const docScripts = doc.querySelectorAll('script[src]');
                for (const s of docScripts) {
                    const src = s.getAttribute('src');
                    if (!src) continue;
                    await loadScriptAsync(src);
                }

                // Execute inline scripts from incoming doc
                const docInline = doc.querySelectorAll('script:not([src])');
                docInline.forEach(s => {
                    try {
                        const inlineEl = document.createElement('script');
                        inlineEl.textContent = s.textContent;
                        document.body.appendChild(inlineEl);
                        document.body.removeChild(inlineEl);
                    } catch (e) {
                        console.warn('Inline script execution error:', e);
                    }
                });

                // 4. Update browser URL & history
                if (pushHistory) {
                    window.history.pushState(
                        { spa: true, url: routeInfo.cleanUrl, slug: routeInfo.slug },
                        document.title,
                        routeInfo.cleanUrl
                    );
                }

                currentActiveRoute = routeInfo.cleanPath;
                currentActiveSearch = urlObj.search;

                // 5. Execute lifecycle hooks for destination page
                await executePageLifecycle(routeInfo, urlObj.searchParams);

            } catch (err) {
                console.error('SPA Navigation error, falling back to full navigation:', err);
                window.location.href = targetPath;
                return;
            } finally {
                // 6. Smoothly hide Global Loader
                isNavigating = false;
                if (typeof window.hideLoader === 'function') {
                    window.hideLoader();
                }
            }
        }

        // Expose global navigate
        window.spaNavigate = spaNavigate;

        /**
         * Global Link Click Interceptor
         */
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            const rawHref = link.getAttribute('href');
            if (!rawHref) return;

            // Skip hashes, javascript:, mailto:, tel:
            if (rawHref.startsWith('#') || rawHref.startsWith('javascript:') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
                return;
            }

            // Skip external target=_blank or downloads
            if (link.target === '_blank' || link.hasAttribute('download')) {
                return;
            }

            // Check if origin matches
            let url;
            try {
                url = new URL(link.href, window.location.origin);
            } catch (err) {
                return;
            }

            if (url.origin !== window.location.origin) {
                return;
            }

            // Prevent full browser reload!
            e.preventDefault();
            window.spaNavigate(url.pathname + url.search + url.hash);
        });

        /**
         * Handle browser Back/Forward buttons without reload
         */
        window.addEventListener('popstate', () => {
            window.spaNavigate(window.location.pathname + window.location.search + window.location.hash, false);
        });

        /**
         * Initial startup check:
         * If the user loaded a clean sub-path (e.g. /product-list, /about-us, /:slug)
         * but the server returned index.html (e.g. due to Live Server fallback on Ctrl+Shift+R or production SPA rewrite),
         * hydrate the actual route seamlessly without waiting for a click!
         */
        const initialRoute = window.location.pathname.replace(/^\/+|\/+$/g, '');
        if (initialRoute && initialRoute !== 'index' && initialRoute !== 'index.html') {
            const isHomePageDom = !!document.getElementById('whyChooseSection');
            if (isHomePageDom) {
                // index.html was served as fallback for a subroute
                spaNavigate(window.location.pathname + window.location.search + window.location.hash, false);
            }
        }

    }
) ();
