/* =========================
   TOKEN
========================= */
function getToken() {
    return localStorage.getItem("access") || localStorage.getItem("token") || "";
}
function isLoggedIn() {
    return !!getToken();
}

/* =========================
   GUEST WISHLIST (localStorage)
   Shape: [{ product_id, slug, name, image, price, discount_price }]
========================= */
const GUEST_WISHLIST_KEY = "guest_wishlist";

function getGuestWishlist() {
    try {
        return JSON.parse(localStorage.getItem(GUEST_WISHLIST_KEY)) || [];
    } catch {
        return [];
    }
}

function saveGuestWishlist(list) {
    localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(list));
}

function guestWishlistCount() {
    return getGuestWishlist().length;
}

function guestWishlistHas(productId, variantId = null) {
    return getGuestWishlist().some(i =>
        i.product_id === productId && (i.variant_id || null) === (variantId || null)
    );
}

function guestWishlistAdd(productId, snapshot = {}) {
    const list = getGuestWishlist();
    const variantId = snapshot.variant_id || null;

    if (list.some(i => i.product_id === productId && (i.variant_id || null) === variantId)) {
        return false;
    }
    list.push({
        product_id: productId,
        variant_id: variantId,
        slug: snapshot.slug || "",
        name: snapshot.name || "",
        image: snapshot.image || "",
        price: snapshot.price || 0,
        discount_price: snapshot.discount_price || null,
        attributes: snapshot.attributes || null,
    });
    saveGuestWishlist(list);
    return true;
}

function guestWishlistRemove(productId, variantId = null) {
    let list = getGuestWishlist();
    list = list.filter(i =>
        !(i.product_id === productId && (i.variant_id || null) === (variantId || null))
    );
    saveGuestWishlist(list);
}

function clearGuestWishlist() {
    localStorage.removeItem(GUEST_WISHLIST_KEY);
}

/* =========================
   HELPERS
========================= */
function fixImage(img) {
    if (!img) return "";
    if (img.startsWith("http")) return img;
    return API_BASE + img;
}

function openProduct(slug) {
    if (!slug) return;
    window.location.href = `product-details.html?slug=${slug}`;
}

/* =========================
   ADD TO WISHLIST (auth or guest) — called from product cards/details
========================= */
async function addToWishlist(productId, snapshot = {}) {
    if (isLoggedIn()) {
        try {
            const response = await fetch(`${API_BASE}/wishlist/add/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${getToken()}`
                },
                body: JSON.stringify({ product_id: productId })
            });
            const data = await response.json();
            if (data.status) {
                toast?.("Added to wishlist ❤️");
                updateWishlistCount?.();
            } else {
                toast?.(data.message || "Already in wishlist");
            }
        } catch (error) {
            console.error(error);
            toast?.("Something went wrong");
        }
        return;
    }

    // Guest
    const added = guestWishlistAdd(productId, snapshot);
    if (added) {
        toast?.("Added to wishlist ❤️");
    } else {
        toast?.("Already in wishlist");
    }
    updateWishlistCount?.();
}

/* =========================
   LOAD WISHLIST (auth or guest)
========================= */
async function loadWishlist() {
    const container = document.getElementById("wishlistContainer");
    const emptyBox = document.getElementById("emptyWishlist");
    const countText = document.getElementById("wishlistCountText");

    if (!container) return;

    container.innerHTML = `<p>Loading wishlist...</p>`;

    let items = [];

    try {
        if (isLoggedIn()) {
            const response = await fetch(`${API_BASE}/wishlist/`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${getToken()}` }
            });
            const data = await response.json();

            if (!data.status || !Array.isArray(data.data)) {
                container.innerHTML = `<p>Failed to load wishlist</p>`;
                return;
            }

            items = data.data.map(i => ({
                key: `db-${i.id}`,
                server_id: i.id,
                product_id: i.product_id,
                variant_id: i.variant_id || null,
                slug: i.slug,
                name: i.name,
                image: i.image,
                price: i.price,
                discount_price: i.discount_price,
                attributes: i.attributes,
            }));
        } else {
            items = getGuestWishlist().map(i => ({
                key: `guest-${i.product_id}-${i.variant_id || 0}`,
                server_id: null,
                product_id: i.product_id,
                variant_id: i.variant_id || null,
                slug: i.slug,
                name: i.name,
                image: i.image,
                price: i.price,
                discount_price: i.discount_price,
                attributes: i.attributes,
            }));
        }
    } catch (error) {
        console.error("WISHLIST ERROR:", error);
        container.innerHTML = `<p style="color:red">Failed to load wishlist</p>`;
        return;
    }

    if (!isLoggedIn() && items.length) {
        try {
            const res = await fetch(`${API_BASE}/api/ecom/products/`);
            const data = await res.json();
            const allProducts = data?.data || data?.results?.data || [];

            items = items.map(item => {
                const live = allProducts.find(p => p.id === item.product_id);
                if (live) {
                    return {
                        ...item,
                        price: live.price,
                        discount_price: live.discount_price,
                        name: live.name || item.name,
                        image: live.image || item.image,
                    };
                }
                return item;
            });

            // also refresh the stored guest wishlist so future loads/counts stay accurate
            const guestList = getGuestWishlist().map(g => {
                const live = allProducts.find(p => p.id === g.product_id);
                return live ? { ...g, price: live.price, discount_price: live.discount_price } : g;
            });
            saveGuestWishlist(guestList);

        } catch (err) {
            console.error("Price refresh failed:", err);
        }
    }
    if (!items.length) {
        container.style.display = "none";
        if (emptyBox) emptyBox.style.display = "flex";
        if (countText) countText.textContent = "0 Items";
        return;
    }

    container.style.display = "grid";
    if (emptyBox) emptyBox.style.display = "none";
    if (countText) countText.textContent = `${items.length} Item${items.length > 1 ? "s" : ""}`;

    container.innerHTML = "";

    items.forEach(item => {
        const image = fixImage(item.image);
        const slug = item.slug || "";
    
        const variantText = item.attributes && typeof item.attributes === "object"
            ? Object.values(item.attributes).join(" / ")
            : "";
    
        container.innerHTML += `
            <div class="wishlist-row">
    
                <div class="wishlist-image" onclick="openProduct('${slug}')">
                    <img src="${image}" alt="${item.name}">
                </div>
    
                <div class="wishlist-info">
                    <div class="wishlist-name" onclick="openProduct('${slug}')">
                        ${item.name}
                        ${variantText ? `<span style="color:#888;font-size:12px"> (${variantText})</span>` : ""}
                    </div>
    
                    <div class="wishlist-price">
                        ৳ ${item.discount_price || item.price}
                        ${item.discount_price ? `<span class="wishlist-old">৳ ${item.price}</span>` : ""}
                    </div>
                </div>
    
                <div class="wishlist-actions">
                    <button class="icon-btn cart-btn" onclick="moveWishlistToCart('${item.key}')" title="Add to Cart">
                        🛒
                    </button>
                    <button class="icon-btn remove-btn" onclick="removeWishlist('${item.key}')" title="Remove">
                        ✕
                    </button>
                </div>
    
            </div>
        `;
    });
}

/* =========================
   REMOVE WISHLIST (auth or guest, dispatched by key)
========================= */
async function removeWishlist(key) {
    const isGuest = key.startsWith("guest-");

    if (!isGuest) {
        const serverId = Number(key.split("-")[1]);
        try {
            const response = await fetch(`${API_BASE}/wishlist/remove/${serverId}/`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${getToken()}` }
            });
            const data = await response.json();
            if (data.status) {
                toast?.("Removed from wishlist");
                loadWishlist();
                updateWishlistCount?.();
            } else {
                toast?.(data.message || "Remove failed");
            }
        } catch (error) {
            console.error(error);
            toast?.("Something went wrong");
        }
        return;
    }

    // key format: guest-<product_id>-<variant_id or 0>
    const parts = key.replace("guest-", "").split("-");
    const productId = Number(parts[0]);
    const variantId = parts[1] && parts[1] !== "0" ? Number(parts[1]) : null;

    guestWishlistRemove(productId, variantId);
    toast?.("Removed from wishlist");
    loadWishlist();
    updateWishlistCount?.();
}

/* =========================
   MOVE WISHLIST ITEM -> CART
========================= */
async function moveWishlistToCart(key) {
    const isGuest = key.startsWith("guest-");

    if (!isGuest) {
        const serverId = Number(key.split("-")[1]);

        // প্রথমে wishlist item এর তথ্য দরকার হতে পারে (product_id, variant_id)
        // যদি loadWishlist এ থাকা data থেকে না পাওয়া যায়, wishlist লিস্ট আবার fetch করতে হবে
        try {
            const wishRes = await fetch(`${API_BASE}/wishlist/`, {
                headers: { "Authorization": `Bearer ${getToken()}` }
            });
            const wishData = await wishRes.json();
            const item = (wishData?.data || []).find(i => i.id === serverId);
            if (!item) {
                toast?.("Item not found");
                return;
            }

            // Cart এ add করা
            const cartRes = await fetch(`${API_BASE}/cart/add/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    product_id: item.product_id,
                    variant_id: item.variant_id || null,
                    quantity: 1
                })
            });
            const cartData = await cartRes.json();

            if (cartData.status) {
                // wishlist থেকে remove করা (optional, যদি move করতে চান)
                await fetch(`${API_BASE}/wishlist/remove/${serverId}/`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${getToken()}` }
                });

                toast?.("Moved to cart 🛒");
                loadWishlist();
                updateWishlistCount?.();
                updateCartCountFromBackend?.();
            } else {
                toast?.(cartData.message || "Add to cart failed");
            }
        } catch (error) {
            console.error(error);
            toast?.("Something went wrong");
        }
        return;
    }

    // GUEST
    const parts = key.replace("guest-", "").split("-");
    const productId = Number(parts[0]);
    const variantId = parts[1] && parts[1] !== "0" ? Number(parts[1]) : null;

    const wishlistRow = getGuestWishlist().find(i =>
        i.product_id === productId && (i.variant_id || null) === variantId
    );
    if (!wishlistRow) return;

    await quickAddCart(productId, variantId, {
        name: wishlistRow.name,
        image: wishlistRow.image,
        price: wishlistRow.price,
        discount_price: wishlistRow.discount_price,
        attributes: wishlistRow.attributes,
    });

    guestWishlistRemove(productId, variantId);
    toast?.("Moved to cart 🛒");
    loadWishlist();
    updateWishlistCount?.();
}

/* =========================
   WISHLIST COUNT (navbar + mobile bottom nav)
========================= */
async function updateWishlistCount() {
    // Update both desktop badge and mobile bottom nav badge
    const dots = [
        document.getElementById("wishCount"),
        document.getElementById("wishCountMob")
    ];

    const hasDot = dots.some(d => d !== null);
    if (!hasDot) return;

    let count = "0";

    if (!isLoggedIn()) {
        count = String(guestWishlistCount());
    } else {
        try {
            const res = await fetch(`${API_BASE}/wishlist/`, {
                headers: { "Authorization": `Bearer ${getToken()}` }
            });
            const data = await res.json();
            count = (data.status && Array.isArray(data.data)) ? String(data.data.length) : "0";
        } catch (err) {
            console.error("Wishlist Count Error:", err);
            count = "0";
        }
    }

    // Apply to all badge elements
    dots.forEach(dot => { if (dot) dot.textContent = count; });
}

/* =========================
   INIT
========================= */
window.addEventListener("DOMContentLoaded", () => {
    loadWishlist();
    updateCartCountFromBackend?.();
    updateWishlistCount?.();
});