async function loadComponent(id, file) {
    const el = document.getElementById(id);

    if (!el) {
        console.warn("Missing container:", id);
        return;
    }

    let dynamicTitle = "";
    if (id === "bc-br") {
        const titleEl = el.querySelector("title");
        if (titleEl) {
            dynamicTitle = titleEl.textContent;
        }
    }

    try {
        const resp = await fetch(file);
        if (!resp.ok) throw new Error(`Failed to fetch ${file}: ${resp.status}`);
        const html = await resp.text();
        el.innerHTML = html;

        if (id === "bc-br" && dynamicTitle) {
            const bcCur = el.querySelector(".bc-cur");
            if (bcCur) {
                bcCur.textContent = dynamicTitle;
            }
        }
    } catch (err) {
        console.error(`Error loading component "${id}" from "${file}":`, err);
    }
}

/* =========================
   INIT COMPONENTS
========================= */
async function initComponents() {
    await loadComponent("topnavbar-container", "components/navbar.html");
    await loadComponent("global-loader", "components/global-loader.html")
    loadComponent("drawer-container", "components/drawer.html");
    loadComponent("toast-container", "components/toast.html");
    loadComponent("float-wa", "components/float-wa.html");
    loadComponent("float-cart", "components/float-cart.html");
    loadComponent("eco-container", "components/eco-bar.html");
    loadComponent("bc-br", "components/breadcrumb.html");

    if (document.getElementById("footer-container")) {
        await loadComponent("footer-container", "components/footer.html");
    }

    setTimeout(() => {
        // Ensure cart.js is loaded on any page
        if (typeof loadCartItems !== "function") {
            const s = document.createElement("script");
            s.src = "js/cart.js?v=12";
            s.onload = () => {
                if (typeof updateCartCountFromBackend === "function") updateCartCountFromBackend();
                if (typeof loadCartItems === "function") loadCartItems();
            };
            document.body.appendChild(s);
        } else {
            loadCartItems();
        }

        if (typeof bindSearch === "function") bindSearch();
        if (typeof updateAuthButtons === "function") updateAuthButtons();
        if (typeof updateCartCountFromBackend === "function") updateCartCountFromBackend();
        if (typeof updateWishlistCount === "function") updateWishlistCount();
        if (typeof loadSiteContent === "function") loadSiteContent();

        if (typeof makeDraggable === "function") {
            makeDraggable(document.querySelector(".float-cart-btn"), "floatCartPos");
            makeDraggable(document.querySelector(".float-wa-btn"), "floatWaPos");
        }

        // Set active state on mobile bottom nav based on current page
        setMobNavActive();
    }, 100);
}

/* =========================
   MOBILE BOTTOM NAV ACTIVE STATE
========================= */
function setMobNavActive() {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '') || "index.html";
    const page = path.split("/").pop() || "index.html";

    const nav = document.querySelector(".mob-bottom-nav");
    if (!nav) return;

    // Map page patterns → item selectors
    const rules = [
        { match: ["index.html", "", "/", "index"], selector: ".mob-nav-home" },
        { match: ["product-list.html", "product-list", "all_product.html", "all_product"], selector: ".mob-nav-item:nth-child(4)" },
        { match: ["wishlist.html", "wishlist"], selector: ".mob-nav-item:nth-child(5)" },
        { match: ["contact-us.html", "contact-us"], selector: ".mob-nav-item:nth-child(1)" },
        { match: ["profile.html", "profile"], selector: ".mob-nav-item.account-btn" },
        { match: ["login.html", "login"], selector: ".mob-nav-item.login-btn" },
    ];

    rules.forEach(rule => {
        if (rule.match.includes(page)) {
            const el = nav.querySelector(rule.selector);
            if (el) el.classList.add("active");
        }
    });
}

initComponents();