/* ==========================================================
   Safa World — Dynamic SEO & Meta Tag Manager
   Controls Open Graph, Twitter Cards, Canonical URLs & Titles
   ========================================================== */

(function () {
    'use strict';

    const SITE_NAME = "Safa World";
    const BASE_URL = "https://safaworldbd.com";
    const DEFAULT_IMAGE = "https://safaworldbd.com/images/safa-world-logo.jpg";
    const DEFAULT_TITLE = "Safa World — Premium Online Shop Bangladesh";
    const DEFAULT_DESC = "Safa World — Bangladesh's premium online shop. Quality products delivered to your doorstep. Cash on delivery available.";

    const ROUTE_META_MAP = {
        '': {
            title: DEFAULT_TITLE,
            description: DEFAULT_DESC,
            url: BASE_URL + '/',
            image: DEFAULT_IMAGE,
            type: 'website'
        },
        'index': {
            title: DEFAULT_TITLE,
            description: DEFAULT_DESC,
            url: BASE_URL + '/',
            image: DEFAULT_IMAGE,
            type: 'website'
        },
        'product-list': {
            title: "All Products — Safa World",
            description: "Explore all premium collections, toys, and lifestyle products at Safa World Bangladesh. Fast delivery nationwide.",
            url: BASE_URL + '/product-list',
            image: DEFAULT_IMAGE,
            type: 'website'
        },
        'all_product': {
            title: "All Products — Safa World",
            description: "Explore all premium collections, toys, and lifestyle products at Safa World Bangladesh.",
            url: BASE_URL + '/product-list',
            image: DEFAULT_IMAGE,
            type: 'website'
        },
        'about-us': {
            title: "About Us — Safa World",
            description: "Learn more about Safa World, our mission, values, and dedication to delivering authentic premium products.",
            url: BASE_URL + '/about-us',
            image: DEFAULT_IMAGE,
            type: 'website'
        },
        'contact-us': {
            title: "Contact Us — Safa World",
            description: "Get in touch with Safa World customer support. Phone: 01311210855, Email: safaworld20@gmail.com.",
            url: BASE_URL + '/contact-us',
            image: DEFAULT_IMAGE,
            type: 'website'
        },
        'privacy-policy': {
            title: "Privacy Policy — Safa World",
            description: "Read our privacy policy and learn how we protect your personal information at Safa World.",
            url: BASE_URL + '/privacy-policy',
            image: DEFAULT_IMAGE,
            type: 'website'
        },
        'terms-and-conditions': {
            title: "Terms & Conditions — Safa World",
            description: "Read the terms and conditions for shopping with Safa World.",
            url: BASE_URL + '/terms-and-conditions',
            image: DEFAULT_IMAGE,
            type: 'website'
        },
        'return-policy': {
            title: "Return Policy — Safa World",
            description: "Our hassle-free return and exchange policy. Shop with confidence at Safa World.",
            url: BASE_URL + '/return-policy',
            image: DEFAULT_IMAGE,
            type: 'website'
        },
        'cart': {
            title: "Shopping Cart — Safa World",
            description: "View and manage items in your Safa World shopping cart.",
            url: BASE_URL + '/cart',
            image: DEFAULT_IMAGE,
            type: 'website'
        },
        'checkout': {
            title: "Checkout — Safa World",
            description: "Secure checkout at Safa World. Fast cash on delivery available nationwide.",
            url: BASE_URL + '/checkout',
            image: DEFAULT_IMAGE,
            type: 'website'
        },
        'wishlist': {
            title: "My Wishlist — Safa World",
            description: "Your saved wishlist items at Safa World.",
            url: BASE_URL + '/wishlist',
            image: DEFAULT_IMAGE,
            type: 'website'
        },
        'login': {
            title: "Login / Register — Safa World",
            description: "Sign in to your Safa World account to track orders and manage your profile.",
            url: BASE_URL + '/login',
            image: DEFAULT_IMAGE,
            type: 'website'
        },
        'profile': {
            title: "My Profile — Safa World",
            description: "Manage your Safa World account, profile, and personal details.",
            url: BASE_URL + '/profile',
            image: DEFAULT_IMAGE,
            type: 'website'
        },
        'my-orders': {
            title: "My Orders — Safa World",
            description: "View order history and track shipments at Safa World.",
            url: BASE_URL + '/my-orders',
            image: DEFAULT_IMAGE,
            type: 'website'
        },
        'order': {
            title: "Order Details — Safa World",
            description: "View specific order details and live invoice at Safa World.",
            url: BASE_URL + '/order',
            image: DEFAULT_IMAGE,
            type: 'website'
        },
        'address': {
            title: "My Addresses — Safa World",
            description: "Manage your delivery addresses for seamless checkout.",
            url: BASE_URL + '/address',
            image: DEFAULT_IMAGE,
            type: 'website'
        }
    };

    function setOrCreateMeta(attrName, attrVal, content) {
        if (!content) return;
        let el = document.querySelector(`meta[${attrName}="${attrVal}"]`);
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute(attrName, attrVal);
            document.head.appendChild(el);
        }
        el.setAttribute('content', content);
    }

    function setOrCreateLink(rel, href) {
        if (!href) return;
        let el = document.querySelector(`link[rel="${rel}"]`);
        if (!el) {
            el = document.createElement('link');
            el.setAttribute('rel', rel);
            document.head.appendChild(el);
        }
        el.setAttribute('href', href);
    }

    /**
     * Updates all meta tags dynamically
     * @param {Object} options - { title, description, image, url, type }
     */
    function updateMetaTags(options = {}) {
        const title = options.title || DEFAULT_TITLE;
        const description = options.description || DEFAULT_DESC;
        let image = options.image || DEFAULT_IMAGE;
        if (image && !image.startsWith('http')) {
            image = BASE_URL + (image.startsWith('/') ? '' : '/') + image;
        }
        const url = options.url || (BASE_URL + window.location.pathname);
        const type = options.type || 'website';

        // Document Title
        document.title = title;

        // Standard Meta
        setOrCreateMeta('name', 'description', description);
        setOrCreateLink('canonical', url);

        // Open Graph
        setOrCreateMeta('property', 'og:title', title);
        setOrCreateMeta('property', 'og:description', description);
        setOrCreateMeta('property', 'og:image', image);
        setOrCreateMeta('property', 'og:url', url);
        setOrCreateMeta('property', 'og:type', type);
        setOrCreateMeta('property', 'og:site_name', SITE_NAME);

        // Twitter Card
        setOrCreateMeta('name', 'twitter:card', 'summary_large_image');
        setOrCreateMeta('name', 'twitter:title', title);
        setOrCreateMeta('name', 'twitter:description', description);
        setOrCreateMeta('name', 'twitter:image', image);
    }

    function updateMetaForRoute(cleanPath) {
        const normalized = cleanPath ? cleanPath.replace(/^\/+|\/+$/g, '') : '';
        if (ROUTE_META_MAP[normalized]) {
            updateMetaTags(ROUTE_META_MAP[normalized]);
        }
    }

    window.updateMetaTags = updateMetaTags;
    window.updateMetaForRoute = updateMetaForRoute;

    // Run on initial load
    const initialRoute = window.location.pathname.replace(/^\/+|\/+$/g, '');
    if (!initialRoute.startsWith('product/') && !initialRoute.startsWith('p/')) {
        updateMetaForRoute(initialRoute);
    }
})();
