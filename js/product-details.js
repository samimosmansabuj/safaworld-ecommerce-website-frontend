/* =========================
   PRODUCT DETAILS JS
========================= */

let CURRENT_PRODUCT = null;
let SELECTED_VARIANT = null;
let VARIANT_ATTR_STATE = {};

// ===== Hover (desktop) / drag (mobile) zoom on product image =====
function initGalleryZoom() {
    const galMain = document.getElementById('galMain');
    const img = document.getElementById('productImage');
    if (!galMain || !img) return;

    if (galMain.dataset.zoomInitialized) return;
    galMain.dataset.zoomInitialized = "true";

    const hint = document.createElement('div');
    hint.className = 'zoom-hint';
    hint.textContent = '+';
    galMain.appendChild(hint);

    function setZoomPoint(clientX, clientY) {
        const rect = galMain.getBoundingClientRect();
        const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
        const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
        img.style.transformOrigin = `${x}% ${y}%`;
    }

    // ---- DESKTOP: hover to zoom, move to pan ----
    galMain.addEventListener('mouseenter', () => {
        galMain.classList.add('zoomed');
    });

    galMain.addEventListener('mousemove', (e) => {
        setZoomPoint(e.clientX, e.clientY);
    });

    galMain.addEventListener('mouseleave', () => {
        galMain.classList.remove('zoomed');
        img.style.transformOrigin = 'center center';
    });

    // ---- MOBILE: touch and hold + slide to zoom/pan ----
    galMain.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        setZoomPoint(t.clientX, t.clientY);
        galMain.classList.add('zoomed');
    }, { passive: true });

    galMain.addEventListener('touchmove', (e) => {
        const t = e.touches[0];
        setZoomPoint(t.clientX, t.clientY);
    }, { passive: true });

    galMain.addEventListener('touchend', () => {
        galMain.classList.remove('zoomed');
        img.style.transformOrigin = 'center center';
    });
}
window.initGalleryZoom = initGalleryZoom;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGalleryZoom);
} else {
    initGalleryZoom();
}

function requireVariantSelection() {
    toast?.("Please select a variant");

    const groups = document.querySelectorAll(".variant-group");
    groups.forEach(group => {
        group.classList.add("variant-glow");
    });

    // auto-remove the glow once they click any option
    document.querySelectorAll(".variant-option").forEach(btn => {
        btn.addEventListener("click", clearVariantGlow, { once: true });
    });

    // also clear it automatically after a few seconds so it doesn't nag forever
    clearTimeout(window._variantGlowTimeout);
    window._variantGlowTimeout = setTimeout(clearVariantGlow, 2500);

    // scroll the picker into view so they actually see it
    document.getElementById("variantPickerWrap")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearVariantGlow() {
    document.querySelectorAll(".variant-group").forEach(g => g.classList.remove("variant-glow"));
}

function getProductSlug() {
    // 1. Check query parameter ?slug=...
    const params = new URLSearchParams(window.location.search);
    let slug = params.get("slug");
    if (slug) return slug;

    // 2. Check path: /product/:slug or /p/:slug
    const cleanPath = window.location.pathname.replace(/^\/+|\/+$/g, '');
    const parts = cleanPath.split('/');
    if ((parts[0] === 'product' || parts[0] === 'p') && parts[1]) {
        return parts[1];
    }

    // 3. Fallback to clean direct slug (e.g. /bike-throttle-design-drop-sholder-t-shirt)
    if (cleanPath && cleanPath !== "product-details" && cleanPath !== "product-details.html" && !cleanPath.includes('/')) {
        return cleanPath;
    }

    // 4. Check history state or sessionStorage
    return history.state?.slug || sessionStorage.getItem("current_product_slug") || "";
}

/* =========================
   LOAD PRODUCT DETAILS
========================= */
function showProductError(msg) {
    if (typeof window.hideLoader === "function") window.hideLoader();
    const page = document.querySelector(".page");
    if (page) {
        page.innerHTML = `
            <div style="text-align:center; padding: 80px 20px; max-width: 600px; margin: 0 auto;">
                <div style="font-size: 48px; margin-bottom: 16px;">🛍️</div>
                <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">${escapeHtml(msg || "Product Not Found")}</h2>
                <p style="color: #666; font-size: 14px; margin-bottom: 24px;">The product you are looking for may have been moved or is currently unavailable.</p>
                <button onclick="if(typeof window.spaNavigate==='function')window.spaNavigate('/product-list');else window.location.href='/product-list';"
                    style="padding: 12px 28px; background: #000; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                    Browse All Products
                </button>
            </div>
        `;
    }
}

async function loadProductDetails(explicitSlug) {

    const slug = explicitSlug || getProductSlug();

    if (!slug) {
        console.error("No slug found");
        showProductError("No product specified");
        return;
    }

    // Clean address bar immediately to /product/:slug
    if (window.location.pathname.includes("product-details") || window.location.search.includes("slug=") || !window.location.pathname.startsWith("/product/")) {
        window.history.replaceState({ slug }, document.title, `/product/${slug}`);
    }
    sessionStorage.setItem("current_product_slug", slug);

    const apiBase = window.API_BASE || (typeof API_BASE !== 'undefined' ? API_BASE : "https://apitest.pencilwoodbd.org");

    try {

        const res = await fetch(`${apiBase}/api/ecom/products/${slug}/`);
        
        if (!res.ok) {
            console.error("Product fetch failed HTTP status:", res.status);
            showProductError("Product not found");
            return;
        }

        const data = await res.json();

        let product = data?.data ? data.data : data;

        if (!product || product.detail === "Not found." || data.status === false) {
            console.error("Product not found in API response:", data);
            showProductError("Product not found");
            return;
        }

        CURRENT_PRODUCT = product;
        window.__CURRENT_PRODUCT_ID__ = product.id;
        if (window.__runTracking) window.__runTracking();
        SELECTED_VARIANT = null;
        VARIANT_ATTR_STATE = {};

        // Dynamically update SEO & Meta tags (OG, Twitter, Canonical) for this product
        if (typeof window.updateMetaTags === 'function') {
            let cleanDesc = (product.description || "").replace(/[\r\n]+/g, " ").trim();
            if (cleanDesc.length > 160) cleanDesc = cleanDesc.slice(0, 157) + "...";
            let mainImg = (Array.isArray(product.images) && product.images.length > 0) ? product.images[0] : (product.image || "");
            if (mainImg && !mainImg.startsWith("http")) {
                mainImg = apiBase + mainImg;
            }
            window.updateMetaTags({
                title: `${product.name} — Safa World`,
                description: cleanDesc || `Buy ${product.name} online in Bangladesh at Safa World.`,
                image: mainImg || "https://safaworldbd.com/images/safa-world-logo.jpg",
                url: `https://safaworldbd.com/product/${slug}`,
                type: "product"
            });
        }

        if (typeof GAViewItemEvent === 'function') {
            GAViewItemEvent(product);
        }

        const name = product.name || "";
        const sku = product.sku || "";
        const rating = Number(product.rating || 0);
        const reviewCount = Number(product.review_count || 0);
        const soldCount = Number(product.sold_count || 0);

        const titleEl = document.getElementById("productTitle");
        if (titleEl) titleEl.textContent = name;

        const shortDescEl = document.getElementById("productShortDescription");
        if (shortDescEl) shortDescEl.textContent = product.description || "";

        const skuEl = document.getElementById("productSKU");
        if (skuEl) skuEl.textContent = sku ? `SKU: ${sku}` : "";

        const bcCur = document.querySelector("#bc-br .bc-cur");
        if (bcCur && name) {
            bcCur.textContent = name;
        }

        const desc = document.getElementById("productDescription");
        if (desc) desc.textContent = product.description || "No description available.";

        /* =========================
           RATING
        ========================= */
        const rScoreEl = document.querySelector(".r-score");
        if (rScoreEl) rScoreEl.textContent = rating.toFixed(1);

        const rCntEl = document.querySelector(".r-cnt");
        if (rCntEl) rCntEl.textContent = `${reviewCount} ratings`;

        const rSoldEl = document.querySelector(".r-sold");
        if (rSoldEl) rSoldEl.textContent = `${soldCount}+ sold`;

        if (typeof mkStars === 'function') {
            mkStars("prodStars", rating, 16);
            mkStars("bigStars", rating, 20);
        }

        /* =========================
           BADGES (bestseller etc.)
        ========================= */
        renderBadges(product);

        /* =========================
           IMAGES (default = product-level images)
        ========================= */
        renderImages(product.images || []);

        /* =========================
           VARIANTS
        ========================= */
        if (Array.isArray(product.variants) && product.variants.length > 0) {
            renderVariantPicker(product.variants);
            // Auto-select first ACTIVE variant with stock, else first variant
            const firstAvailable =
                product.variants.find(v => v.stock > 0) || product.variants[0];
            if (firstAvailable && firstAvailable.attributes) {
                selectVariantByAttributes(firstAvailable.attributes, product.variants);
            }
        } else {
            SELECTED_VARIANT = null;
            renderPriceAndStock(product.price, product.discount_price, product.stock);
            const vWrap = document.getElementById("variantPickerWrap");
            if (vWrap) vWrap.innerHTML = "";
        }

        /* =========================
           FEATURES
        ========================= */
        renderFeatures(product.features || []);

        /* =========================
           REVIEWS
        ========================= */
        renderReviews(product.reviews || [], rating, reviewCount);

        /* =========================
           FAQ
        ========================= */
        renderFAQs(product.faqs || []);

        /* =========================
           SPEC TABLE (built from features too, if present)
        ========================= */
        renderSpecTable(product.features || []);

        /* =========================
           DELIVERY NOTE
        ========================= */
        const deliveryNote = document.getElementById("deliveryNote");
        if (deliveryNote) {
            deliveryNote.innerHTML = `🚚 Dhaka: 1-2 Days Delivery · Outside Dhaka: 2-4 Days`;
        }

        /* =========================
           BUTTONS
        ========================= */
        setupButtons(product, slug);
        initWishlist(product.id);

        /* =========================
           RELATED PRODUCTS
        ========================= */
        loadRelatedProducts(product);

        /* =========================
           VARIANT PROMPT (from wishlist/cart redirect flows)
        ========================= */
        const pendingAction = sessionStorage.getItem("prompt_variant_on_load");
        if (pendingAction && Array.isArray(product.variants) && product.variants.length > 0) {
            sessionStorage.removeItem("prompt_variant_on_load");
            // let the DOM paint first, then nudge
            setTimeout(() => requireVariantSelection(), 300);
        }

        if (typeof window.hideLoader === "function") window.hideLoader();

    } catch (err) {
        console.error("PRODUCT DETAILS ERROR:", err);
        if (typeof window.hideLoader === "function") window.hideLoader();
    }
}

/* =========================
   BADGES (bestseller / verified / etc.)
========================= */
function renderBadges(product) {
    const wrap = document.getElementById("productBadges");
    if (!wrap) return;

    let html = "";
    if (product.is_bestseller) {
        html += `<span class="badge-chip badge-bestseller">🔥 Bestseller</span>`;
    }
    if (Number(product.discount_price) > 0 && Number(product.discount_price) < Number(product.price)) {
        const off = Math.round(((product.price - product.discount_price) / product.price) * 100);
        html += `<span class="badge-chip badge-discount">${off}% OFF</span>`;
    }
    wrap.innerHTML = html;
}

/* =========================
   FEATURES TAB
========================= */
function renderFeatures(features) {
    const grid = document.getElementById("featureGrid");
    if (!grid) return;

    if (!Array.isArray(features) || !features.length) {
        grid.innerHTML = `<div class="feat-empty">No feature details added for this product yet.</div>`;
        return;
    }

    grid.innerHTML = features.map(f => `
        <div class="feat-card">
            <span class="feat-icon">${escapeHtml(f.icon || "✔")}</span>
            <div>
                <div class="feat-name">${escapeHtml(f.title || "")}</div>
                <div class="feat-desc">${escapeHtml(f.description || "")}</div>
            </div>
        </div>
    `).join("");
}

/* =========================
   SPEC TABLE (reuses features as name/value rows)
========================= */
function renderSpecTable(features) {
    const table = document.getElementById("specTable");
    if (!table) return;

    if (!Array.isArray(features) || !features.length) {
        table.innerHTML = "";
        return;
    }

    table.innerHTML = features.map(f => `
        <tr>
            <td class="spec-key">${escapeHtml(f.title || "")}</td>
            <td class="spec-val">${escapeHtml(f.description || "")}</td>
        </tr>
    `).join("");
}

/* =========================
   REVIEWS TAB — with pagination 
========================= */
let ALL_REVIEWS = [];
let REVIEWS_SHOWN = 3;
const REVIEWS_INITIAL = 3;
const REVIEWS_STEP = 10;

function renderReviews(reviews, rating, reviewCount) {
    const scoreEl = document.getElementById("reviewScore");
    const countEl = document.getElementById("reviewCountText");

    if (scoreEl) scoreEl.textContent = rating.toFixed(1);
    if (countEl) countEl.textContent = `${reviewCount} reviews`;

    ALL_REVIEWS = Array.isArray(reviews) ? reviews : [];
    REVIEWS_SHOWN = REVIEWS_INITIAL;

    renderReviewList();
}

function renderReviewList() {
    const listEl = document.getElementById("reviewList");
    if (!listEl) return;

    if (!ALL_REVIEWS.length) {
        listEl.innerHTML = `<div class="rv-item"><p>No reviews yet</p></div>`;
        removeReviewToggle();
        return;
    }

    const visible = ALL_REVIEWS.slice(0, REVIEWS_SHOWN);

    listEl.innerHTML = visible.map(r => `
        <div class="rv-item">
            <div class="rv-item-head">
                <span class="rv-name">${escapeHtml(r.name || "Anonymous")}</span>
                ${r.verified ? `<span class="rv-verified">✔ Verified Purchase</span>` : ""}
                <span class="rv-date">${escapeHtml(r.date || "")}</span>
            </div>
            <div class="rv-stars">${"★".repeat(Math.round(r.rating || 0))}${"☆".repeat(5 - Math.round(r.rating || 0))}</div>
            <p class="rv-comment">${escapeHtml(r.comment || "")}</p>
        </div>
    `).join("");

    renderReviewToggle();
}

function renderReviewToggle() {
    removeReviewToggle();

    const container = document.getElementById("pane-reviews");
    if (!container) return;

    const total = ALL_REVIEWS.length;

    // nothing to expand or collapse (e.g. total <= REVIEWS_INITIAL)
    if (total <= REVIEWS_INITIAL) return;

    const wrap = document.createElement("div");
    wrap.className = "rv-toggle-wrap";
    wrap.id = "rvToggleWrap";

    const hasMore = REVIEWS_SHOWN < total;
    const isExpanded = REVIEWS_SHOWN > REVIEWS_INITIAL;

    if (hasMore) {
        const moreBtn = document.createElement("button");
        moreBtn.className = "rv-toggle-btn";
        moreBtn.textContent = "See More";
        moreBtn.onclick = () => {
            REVIEWS_SHOWN = Math.min(REVIEWS_SHOWN + REVIEWS_STEP, total);
            renderReviewList();
            document.getElementById("rvToggleWrap")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        };
        wrap.appendChild(moreBtn);
    }

    if (isExpanded) {
        const lessBtn = document.createElement("button");
        lessBtn.className = "rv-toggle-btn";
        lessBtn.textContent = "See Less";
        lessBtn.onclick = () => {
            REVIEWS_SHOWN = REVIEWS_INITIAL;
            renderReviewList();
            document.getElementById("pane-reviews")?.scrollIntoView({ behavior: "smooth", block: "start" });
        };
        wrap.appendChild(lessBtn);
    }

    container.appendChild(wrap);
}

function removeReviewToggle() {
    document.getElementById("rvToggleWrap")?.remove();
}
/* =========================
   FAQ TAB
========================= */
function renderFAQs(faqs) {
    const listEl = document.getElementById("faqList");
    if (!listEl) return;

    if (!Array.isArray(faqs) || !faqs.length) {
        listEl.innerHTML = `<div class="faq-item"><div class="faq-q"><span class="faq-q-txt">No FAQs available for this product yet.</span></div></div>`;
        return;
    }

    listEl.innerHTML = faqs.map(f => `
        <div class="faq-item">
            <div class="faq-q" onclick="faqToggle(this)">
                <span class="faq-q-txt">${escapeHtml(f.question || "")}</span>
    
                <svg class="faq-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path d="M6 9l6 6 6-6"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="3"
                          stroke-linecap="round"
                          stroke-linejoin="round"/>
                </svg>
    
            </div>
            <div class="faq-a">
                <p>${escapeHtml(f.answer || "")}</p>
            </div>
        </div>
    `).join("");
}



/* =========================
   SMALL UTIL: escape user/CMS text before injecting as HTML
========================= */
function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* =========================
   RENDER IMAGES (product-level, used as fallback / default)
========================= */
function renderImages(images) {

    let imgList = Array.isArray(images) ? images.slice() : [];

    let mainImage = imgList.length > 0 ? imgList[0] : "";

    if (mainImage && !mainImage.startsWith("http")) {
        mainImage = API_BASE + mainImage;
    }

    const productImage = document.getElementById("productImage");
    if (productImage) {
        productImage.src = mainImage || "https://placehold.co/600x600?text=No+Image";
        productImage.onerror = () => {
            productImage.src = "https://placehold.co/600x600?text=No+Image";
        };
    }

    const thumbGrid = document.getElementById("thumbGrid");
    if (thumbGrid) {
        thumbGrid.innerHTML = "";
        imgList.forEach(img => {
            let finalImg = img;
            if (finalImg && !finalImg.startsWith("http")) {
                finalImg = API_BASE + finalImg;
            }
            thumbGrid.innerHTML += `
                <div class="thumb" onclick="document.getElementById('productImage').src='${finalImg}'">
                    <img src="${finalImg}" alt="thumbnail">
                </div>
            `;
        });
    }
}

/* =========================
   SET MAIN IMAGE (used when a variant is picked and has its own image)
========================= */
function setMainImage(url) {
    const productImage = document.getElementById("productImage");
    if (!productImage) return;
    let finalUrl = url;
    if (finalUrl && !finalUrl.startsWith("http")) {
        finalUrl = API_BASE + finalUrl;
    }
    productImage.src = finalUrl || "https://placehold.co/600x600?text=No+Image";
}

/* =========================
   RENDER VARIANT PICKER
   Groups all attribute keys across variants (e.g. color, size)
   and renders a swatch/button group for each.
========================= */
function renderVariantPicker(variants) {

    const wrap = document.getElementById("variantPickerWrap");
    if (!wrap) return;

    // Collect attribute keys -> possible values (preserve first-seen order)
    const attrMap = {};

    variants.forEach(v => {
        const attrs = v.attributes || {};
        Object.keys(attrs).forEach(key => {
            if (!attrMap[key]) attrMap[key] = [];
            if (!attrMap[key].includes(attrs[key])) {
                attrMap[key].push(attrs[key]);
            }
        });
    });

    let html = "";

    Object.keys(attrMap).forEach(attrKey => {

        html += `
            <div class="variant-group" data-attr-key="${attrKey}">
                <div class="variant-group-label">${capitalize(attrKey)}</div>
                <div class="variant-options">
        `;

        attrMap[attrKey].forEach(val => {
            html += `
                <button
                    type="button"
                    class="variant-option"
                    data-attr-key="${attrKey}"
                    data-attr-value="${val}"
                    onclick="onVariantOptionClick('${attrKey}', '${val.replace(/'/g, "\\'")}')">
                    ${val}
                </button>
            `;
        });

        html += `</div></div>`;
    });

    wrap.innerHTML = html;
}

function capitalize(s) {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/* =========================
   HANDLE VARIANT OPTION CLICK
========================= */
function onVariantOptionClick(attrKey, attrValue) {

    VARIANT_ATTR_STATE[attrKey] = attrValue;

    const variants = CURRENT_PRODUCT?.variants || [];

    selectVariantByAttributes(VARIANT_ATTR_STATE, variants, true);
}

/* =========================
   SELECT VARIANT MATCHING GIVEN ATTRIBUTES
   (exact match if all attrs given; otherwise finds first variant
   that matches the attrs currently chosen so far)
========================= */
function selectVariantByAttributes(attrsWanted, variants, isUserClick = false) {

    if (!Array.isArray(variants) || !variants.length) return;

    // Try exact match on all currently selected attribute keys
    let match = variants.find(v => {
        const va = v.attributes || {};
        return Object.keys(attrsWanted).every(k => va[k] === attrsWanted[k]);
    });

    // Fallback: if no exact match (invalid combo), keep whichever partial
    // matches the most selected keys
    if (!match) {
        let bestScore = -1;
        variants.forEach(v => {
            const va = v.attributes || {};
            let score = 0;
            Object.keys(attrsWanted).forEach(k => {
                if (va[k] === attrsWanted[k]) score++;
            });
            if (score > bestScore) {
                bestScore = score;
                match = v;
            }
        });
    }

    if (!match) return;

    SELECTED_VARIANT = match;
    VARIANT_ATTR_STATE = { ...(match.attributes || {}) };

    // Update active state on buttons
    document.querySelectorAll(".variant-option").forEach(btn => {
        const key = btn.dataset.attrKey;
        const val = btn.dataset.attrValue;
        btn.classList.toggle("active", VARIANT_ATTR_STATE[key] === val);
    });

    // Update price + stock display
    renderPriceAndStock(match.price, match.discount_price, match.stock);

    // at the end of selectVariantByAttributes(), after renderPriceAndStock(...)
    initWishlist(CURRENT_PRODUCT.id);

    // Update image if variant carries its own image(s)
    if (match.image) {
        setMainImage(match.image);
    } else if (Array.isArray(match.images) && match.images.length) {
        setMainImage(match.images[0]);
    }
    // else: leave product-level image as-is
}

/* =========================
   RENDER PRICE + STOCK (shared by simple & variant products)
========================= */
function renderPriceAndStock(price, discountPrice, stock) {

    price = Number(price || 0);
    discountPrice = Number(discountPrice || 0);
    const finalPrice = discountPrice || price;
    stock = parseInt(stock ?? 0, 10);

    const priceEl = document.getElementById("productPrice");
    if (priceEl) priceEl.textContent = `৳ ${finalPrice}`;

    const stickyPriceEl = document.getElementById("stickyPrice");
    if (stickyPriceEl) stickyPriceEl.textContent = `৳ ${finalPrice}`;

    const oldPriceText = (discountPrice && discountPrice < price) ? `৳ ${price}` : "";
    const oldPriceEl = document.getElementById("productOldPrice");
    if (oldPriceEl) oldPriceEl.textContent = oldPriceText;

    const stickyOldPriceEl = document.getElementById("stickyOldPrice");
    if (stickyOldPriceEl) stickyOldPriceEl.textContent = oldPriceText;

    const discountEl = document.getElementById("productDiscount");
    if (discountEl) {
        if (discountPrice && discountPrice < price) {
            const off = Math.round(((price - discountPrice) / price) * 100);
            discountEl.textContent = `${off}% OFF`;
        } else {
            discountEl.textContent = "";
        }
    }

    const stockLeftEl = document.getElementById("stockLeft");
    const stockStatusEl = document.getElementById("stockStatus");

    if (stockLeftEl && stockLeftEl.parentElement) {
        stockLeftEl.parentElement.style.display = "none";
    }

    if (stockStatusEl) {
        if (stock <= 0) {
            stockStatusEl.textContent = "✖ Out of Stock";
            stockStatusEl.style.color = "#dc2626";
        } else if (stock <= 10) {
            stockStatusEl.textContent = `⚠ Only ${stock} left`;
            stockStatusEl.style.color = "#dc2626";
            if (stockLeftEl) {
                stockLeftEl.textContent = stock;
                if (stockLeftEl.parentElement) stockLeftEl.parentElement.style.display = "block";
            }
        } else {
            stockStatusEl.textContent = "✔ In Stock";
            stockStatusEl.style.color = "#16a34a";
        }
    }

    const isOutOfStock = stock <= 0;

    const buttons = [
        document.getElementById("buyBtn"),
        document.getElementById("stickyBuyBtn"),
        document.getElementById("ctaBuyBtn"),
        document.getElementById("cartBtn"),
        document.getElementById("cartBtnSticky")
    ];

    buttons.forEach(btn => {
        if (!btn) return;
        if (isOutOfStock) {
            btn.disabled = true;
            btn.style.opacity = "0.5";
            btn.style.cursor = "not-allowed";
            btn.innerText = "Out of Stock";
        } else {
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.style.cursor = "pointer";
            // restore original label if it was overwritten
            if (btn.innerText === "Out of Stock") {
                btn.innerText = btn.dataset.originalText || "Buy Now";
            }
        }
    });
}

/* =========================
   BUTTONS (updated)
========================= */
function setupButtons(product, slug) {

    const buyBtns = [
        document.getElementById("buyBtn"),
        document.getElementById("stickyBuyBtn"),
        document.getElementById("ctaBuyBtn")
    ];

    buyBtns.forEach(btn => {
        if (!btn) return;

        btn.onclick = async () => {

            if (product.variants && product.variants.length > 0 && !SELECTED_VARIANT) {
                requireVariantSelection();
                return;
            }

            GAAddToCartEvent({
                id: product.id,
                name: product.name,
                discount_price: SELECTED_VARIANT ? SELECTED_VARIANT.discount_price : product.discount_price
            });

            const token = localStorage.getItem("access") || localStorage.getItem("token");

            if (!token) {
                const variant = SELECTED_VARIANT;
                guestCartAdd(product.id, variant ? variant.id : null, 1, {
                    name: product.name,
                    image: product.images?.[0] || "",
                    price: variant ? variant.price : product.price,
                    discount_price: variant ? variant.discount_price : product.discount_price,
                    attributes: variant ? variant.attributes : null,
                });

                localStorage.setItem("checkout_guest_items", JSON.stringify([{
                    product_id: product.id,
                    variant_id: variant ? variant.id : null,
                    quantity: 1
                }]));
                localStorage.removeItem("checkout_cart_ids");

                if (typeof window.spaNavigate === 'function') {
                    window.spaNavigate("/checkout");
                } else {
                    window.location.href = "/checkout";
                }
                return;
            }

            try {
                const payload = { product_id: product.id, quantity: 1 };
                if (SELECTED_VARIANT) payload.variant_id = SELECTED_VARIANT.id;

                const addRes = await fetch(`${API_BASE}/cart/add/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });

                if (!addRes.ok) {
                    console.error("ADD CART ERROR:", await addRes.text());
                    toast?.("Add to cart failed");
                    return;
                }

                const addData = await addRes.json();
                if (!addData.status) {
                    toast?.(addData.message || "Failed to add cart");
                    return;
                }

                const cartRes = await fetch(`${API_BASE}/cart/`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const cartData = await cartRes.json();

                if (!cartData.status || !Array.isArray(cartData.data) || !cartData.data.length) {
                    toast?.("Cart is empty");
                    return;
                }

                const cartItem = cartData.data[cartData.data.length - 1];
                localStorage.setItem("checkout_cart_ids", JSON.stringify([cartItem.id]));
                localStorage.removeItem("checkout_guest_items");

                if (typeof window.spaNavigate === 'function') {
                    window.spaNavigate("/checkout");
                } else {
                    window.location.href = "/checkout";
                }

            } catch (err) {
                console.error("BUY NOW ERROR:", err);
                toast?.("Buy now failed");
            }
        };
    });

    const cartBtns = [
        document.getElementById("cartBtn"),
        document.getElementById("cartBtnSticky")
    ];

    cartBtns.forEach(btn => {
        if (!btn) return;
        btn.onclick = () => {
            if (product.variants && product.variants.length > 0 && !SELECTED_VARIANT) {
                requireVariantSelection();
                return;
            }
            quickAddCart(product.id, SELECTED_VARIANT ? SELECTED_VARIANT.id : null, {
                name: product.name,
                image: SELECTED_VARIANT?.image || product.images?.[0] || "",
                price: SELECTED_VARIANT ? SELECTED_VARIANT.price : product.price,
                discount_price: SELECTED_VARIANT ? SELECTED_VARIANT.discount_price : product.discount_price,
                attributes: SELECTED_VARIANT ? SELECTED_VARIANT.attributes : null,
            });
        };
    });

    const waBtn = document.getElementById("ctaWhatsappBtn");
    if (waBtn) {
        waBtn.onclick = () => {
            const msg = `I want to order: ${product.name}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
        };
    }

    const wishBtn = document.getElementById("wishBtn");
    const wishIco = document.getElementById("wishIco");

    const wishHandler = () => {
        if (product.variants && product.variants.length > 0 && !SELECTED_VARIANT) {
            requireVariantSelection();
            return;
        }
        toggleWishlist(product.id);
    };

    wishBtn?.addEventListener("click", wishHandler);
    wishIco?.addEventListener("click", wishHandler);
}

/* ========================= WISHLIST ========================= */

let WISHLIST_ID = null;
let IS_WISHLISTED = false;

async function initWishlist(productId) {
    const token = localStorage.getItem("access") || localStorage.getItem("token");
    const variantId = SELECTED_VARIANT ? SELECTED_VARIANT.id : null;

    if (!token) {
        IS_WISHLISTED = guestWishlistHas(productId, variantId);
        renderWishlistState();
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/wishlist/`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();

        IS_WISHLISTED = false;
        WISHLIST_ID = null;

        if (data.status && Array.isArray(data.data)) {
            const item = data.data.find(x =>
                x.product_id == productId && (x.variant_id || null) === (variantId || null)
            );
            if (item) {
                IS_WISHLISTED = true;
                WISHLIST_ID = item.id;
            }
        }
        renderWishlistState();
    } catch (err) {
        console.error(err);
    }
}

function renderWishlistState() {
    const btn = document.getElementById("wishBtn");
    const icon = document.getElementById("wishIco");

    if (IS_WISHLISTED) {
        if (btn) btn.innerHTML = "❤️ Wishlisted";
        if (icon) icon.innerHTML = "❤️";
    } else {
        if (btn) btn.innerHTML = "♡ Wishlist";
        if (icon) icon.innerHTML = "♡";
    }
}

async function toggleWishlist(productId) {
    const token = localStorage.getItem("access") || localStorage.getItem("token");
    const variantId = SELECTED_VARIANT ? SELECTED_VARIANT.id : null;

    if (!token) {
        if (IS_WISHLISTED) {
            guestWishlistRemove(productId, variantId);
            IS_WISHLISTED = false;
            toast?.("Removed from wishlist");
        } else {
            guestWishlistAdd(productId, {
                slug: CURRENT_PRODUCT?.slug || "",
                name: CURRENT_PRODUCT?.name || "",
                image: SELECTED_VARIANT?.image || CURRENT_PRODUCT?.images?.[0] || "",
                price: SELECTED_VARIANT ? SELECTED_VARIANT.price : CURRENT_PRODUCT?.price || 0,
                discount_price: SELECTED_VARIANT ? SELECTED_VARIANT.discount_price : CURRENT_PRODUCT?.discount_price || null,
                variant_id: variantId,
                attributes: SELECTED_VARIANT ? SELECTED_VARIANT.attributes : null,
            });
            IS_WISHLISTED = true;
            toast?.("Added to wishlist ❤️");
        }
        renderWishlistState();
        updateWishlistCount?.();
        return;
    }

    try {
        if (IS_WISHLISTED) {
            const res = await fetch(`${API_BASE}/wishlist/remove/${WISHLIST_ID}/`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status) {
                IS_WISHLISTED = false;
                WISHLIST_ID = null;
                renderWishlistState();
                updateWishlistCount();
                toast?.("Removed from wishlist");
            }
        } else {
            const res = await fetch(`${API_BASE}/wishlist/add/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ product_id: productId, variant_id: variantId })
            });
            const data = await res.json();
            if (data.status) {
                IS_WISHLISTED = true;
                renderWishlistState();
                updateWishlistCount();
                toast?.("Added to wishlist ❤️");
                initWishlist(productId);
            }
        }
    } catch (err) {
        console.error(err);
        toast?.("Wishlist failed");
    }
}

/* =========================
   RELATED PRODUCTS
========================= */
async function loadRelatedProducts(product) {

    const container = document.getElementById("relatedProducts");
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/api/ecom/products/`);
        const data = await res.json();

        let products = [];
        if (data?.results?.data) products = data.results.data;
        else if (data?.data) products = data.data;
        else if (Array.isArray(data)) products = data;

        const related = products.filter(p => p.id !== product.id).slice(0, 6);

        container.innerHTML = "";

        related.forEach(p => {

            const slug = p.slug || makeSlug(p.name);

            let image = "";
            if (p.images && Array.isArray(p.images) && p.images.length > 0) {
                image = p.images[0];
            } else if (p.image) {
                image = p.image;
            }

            if (image && !image.startsWith("http")) {
                image = API_BASE + image;
            }

            container.innerHTML += `
            <div class="prod-card">
                <div class="prod-img" onclick="openProduct('${slug}')">
                    <img src="${image}" alt="${p.name}">
                </div>
                <div class="prod-name" onclick="openProduct('${slug}')">${p.name}</div>
                <div class="prod-price">৳ ${p.discount_price || p.price}</div>
                <button class="prod-cart" onclick="quickAddCart(${p.id})">+ Cart</button>
            </div>
            `;
        });

    } catch (err) {
        console.error("RELATED PRODUCTS ERROR:", err);
    }
}

/* =========================
   FAQ TOGGLE
========================= */
function faqToggle(el) {
    const item = el.parentElement;
    item.classList.toggle("open");
}

/* =========================
   TAB SWITCH
========================= */
function switchTab(tab, evt) {
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("on"));
    document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.remove("on"));
    document.getElementById(`pane-${tab}`)?.classList.add("on");
    const target = evt?.target || window.event?.target;
    target?.classList.add("on");
}

function openShare() {
    document.getElementById("shareOverlay").classList.add("active");
}

function closeShare(e) {
    if (!e || e.target.id === "shareOverlay") {
        document.getElementById("shareOverlay").classList.remove("active");
    }
}

function shareTo(type) {

    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);

    if (type === "wa") {
        window.open(`https://wa.me/?text=${title}%20${url}`, "_blank");
    } else if (type === "fb") {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
    } else if (type === "ig") {
        navigator.clipboard.writeText(window.location.href);
        alert("Link copied for Instagram share!");
    } else if (type === "copy") {
        navigator.clipboard.writeText(window.location.href);
        alert("Link copied!");
    }

    closeShare();
}


window.loadProductDetails = loadProductDetails;

/* =========================
   INIT
========================= */
if (document.readyState === 'loading') {
    window.addEventListener("DOMContentLoaded", () => {
        loadProductDetails();
        updateCartCountFromBackend?.();
    });
} else {
    // In direct load or standalone load
    const isSpaNav = window.location.pathname.replace(/^\/+|\/+$/g, '') !== '' && document.getElementById('whyChooseSection');
    if (!isSpaNav) {
        loadProductDetails();
        updateCartCountFromBackend?.();
    }
}