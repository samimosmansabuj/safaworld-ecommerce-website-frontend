   (function () {
    "use strict";

    var VISITOR_KEY = "safaworld_visitor_id";
    var FLUSH_INTERVAL_MS = 5000;
    var IMPORTANT_EVENTS = ["add_to_cart", "wishlist_add", "checkout_start", "order_placed", "login", "signup"];

    function apiBase() {
        return window.API_BASE || "";
    }
    function endpointEvent() {
        return apiBase() + "/api/tracking/event/";
    }
    function endpointIdentify() {
        return apiBase() + "/api/tracking/identify/";
    }

    /* =========================
       VISITOR ID
    ========================= */
    function uuidv4() {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            var r = (Math.random() * 16) | 0;
            var v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    var memoryVisitorId = null;

    function getVisitorId() {
        try {
            var id = localStorage.getItem(VISITOR_KEY);
            if (!id) {
                id = uuidv4();
                localStorage.setItem(VISITOR_KEY, id);
            }
            return id;
        } catch (e) {
            if (!memoryVisitorId) memoryVisitorId = uuidv4();
            return memoryVisitorId;
        }
    }

    /* =========================
       QUEUE + FLUSH
    ========================= */
    var queue = [];

    function buildPayload(events) {
        var attribution = (typeof window.getAttributionData === "function") ? window.getAttributionData() : {};
        return {
            visitor_id: getVisitorId(),
            utm_source: attribution.utm_source || null,
            utm_medium: attribution.utm_medium || null,
            utm_campaign: attribution.utm_campaign || null,
            landing_url: attribution.landing_url || null,
            referrer: attribution.referrer || document.referrer || null,
            events: events
        };
    }

    function flush(useBeacon) {
        if (!queue.length || !apiBase()) return;

        var events = queue;
        queue = [];
        var body = JSON.stringify(buildPayload(events));


        if (useBeacon && navigator.sendBeacon) {
            try {
                var blob = new Blob([body], { type: "application/json" });
                if (navigator.sendBeacon(endpointEvent(), blob)) return;
            } catch (e) {  }
        }

        try {
            fetch(endpointEvent(), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: body,
                keepalive: true
            }).catch(function () { });
        } catch (e) { }
    }

    setInterval(function () { flush(false); }, FLUSH_INTERVAL_MS);
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") flush(true);
    });
    window.addEventListener("pagehide", function () { flush(true); });

    /* =========================
       PUBLIC: trackEvent
    ========================= */
    window.trackEvent = function (eventType, meta) {
        meta = meta || {};
        queue.push({
            event_type: eventType,
            page_url: window.location.pathname + window.location.search,
            page_title: document.title || "",
            referrer: document.referrer || "",
            product_id: meta.product_id || null,
            variant_id: meta.variant_id || null,
            meta: meta
        });
        if (IMPORTANT_EVENTS.indexOf(eventType) !== -1) flush(false);
    };


    window.identifyVisitor = function () {
        if (!apiBase()) return;
        var token = (typeof getAccessToken === "function") ? getAccessToken() : localStorage.getItem("access");
        if (!token) return;
        try {
            fetch(endpointIdentify(), {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
                body: JSON.stringify({ visitor_id: getVisitorId() })
            }).catch(function () { });
        } catch (e) { }
    };

    /* =========================
       PAGE VIEWS
    ========================= */
    var lastPageKey = null;

    function trackPageView() {
        var key = window.location.pathname + window.location.search;
        if (key === lastPageKey) return;
        lastPageKey = key;
        window.trackEvent("page_view", {});
    }

    if (window.history && typeof history.pushState === "function") {
        var originalPushState = history.pushState;
        history.pushState = function () {
            var result = originalPushState.apply(this, arguments);
            trackPageView();
            return result;
        };
    }

    window.addEventListener("popstate", function () {
        setTimeout(trackPageView, 600);
    });

    /* =========================
       PRODUCT VIEW
    ========================= */
    var lastProductKey = null;

    window.trackProductView = function (productId) {
        if (!productId) return;
        var key = window.location.pathname + window.location.search + "|" + productId;
        if (key === lastProductKey) return;
        lastProductKey = key;
        window.trackEvent("product_view", { product_id: productId });
    };

    /* =========================
       BOOT
    ========================= */
    function boot() {
        trackPageView();
        window.identifyVisitor();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
