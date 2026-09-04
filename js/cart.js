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
   GUEST CART (localStorage)
   Shape: [{ product_id, variant_id, quantity, name, image, price, discount_price, attributes }]
========================= */
const GUEST_CART_KEY = "guest_cart";

function getGuestCart() {
    try {
        return JSON.parse(localStorage.getItem(GUEST_CART_KEY)) || [];
    } catch {
        return [];
    }
}

function saveGuestCart(cart) {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
}

function guestCartCount() {
    return getGuestCart().reduce((sum, i) => sum + Number(i.quantity || 0), 0);
}

function guestCartAdd(productId, variantId, quantity, snapshot = {}) {
    const cart = getGuestCart();
    const existing = cart.find(i =>
        i.product_id === productId && (i.variant_id || null) === (variantId || null)
    );

    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({
            product_id: productId,
            variant_id: variantId || null,
            quantity,
            name: snapshot.name || "",
            image: snapshot.image || "",
            price: snapshot.price || 0,
            discount_price: snapshot.discount_price || null,
            attributes: snapshot.attributes || null,
        });
    }
    saveGuestCart(cart);
}

function guestCartUpdateQty(productId, variantId, quantity) {
    const cart = getGuestCart();
    const item = cart.find(i =>
        i.product_id === productId && (i.variant_id || null) === (variantId || null)
    );
    if (item) {
        item.quantity = quantity;
        saveGuestCart(cart);
    }
}

function guestCartRemove(productId, variantId) {
    let cart = getGuestCart();
    cart = cart.filter(i =>
        !(i.product_id === productId && (i.variant_id || null) === (variantId || null))
    );
    saveGuestCart(cart);
}

function clearGuestCart() {
    localStorage.removeItem(GUEST_CART_KEY);
}

/* =========================
   UNIFIED CART STATE
========================= */
let CART_ITEMS_CACHE = [];

function getSelectedItems() {
    const checkboxes = document.querySelectorAll(".cart-drawer-check:checked, .cart-check:checked");
    const selectedKeys = Array.from(new Set(Array.from(checkboxes).map(cb => cb.dataset.key)));
    return CART_ITEMS_CACHE.filter(item => selectedKeys.includes(item.key));
}

function updateSummaryFromSelection() {
    const selected = getSelectedItems();
    let totalQty = 0, subtotal = 0;

    let summaryRowsHtml = "";
    selected.forEach(item => {
        const productName = item.product.split(' ').slice(0, 5).join(' ') +
            (item.product.split(' ').length > 5 ? '...' : '');
        totalQty += Number(item.quantity || 0);
        subtotal += Number(item.total || 0);

        summaryRowsHtml += `
            <div class="summary-row drawer-summary-item">
                <span>${productName} × ${item.quantity}</span>
                <span>৳ ${item.total}</span>
            </div>
        `;
    });

    // Update Drawer Elements
    const drawerSummaryList = document.getElementById("cartDrawerSummaryList");
    const drawerSubtotal = document.getElementById("cartDrawerSubtotal");
    const drawerCount = document.getElementById("cartDrawerItemCount");
    if (drawerSummaryList) drawerSummaryList.innerHTML = summaryRowsHtml;
    if (drawerSubtotal) drawerSubtotal.textContent = `৳ ${subtotal}`;
    if (drawerCount) drawerCount.textContent = `${totalQty} Item${totalQty === 1 ? '' : 's'}`;

    // Update Page Elements (cart.html fallback)
    const summaryList = document.getElementById("cartSummaryList");
    const subtotalEl = document.getElementById("cartSubtotal");
    const itemCountEl = document.getElementById("cartItemCount");
    if (summaryList) summaryList.innerHTML = summaryRowsHtml;
    if (subtotalEl) subtotalEl.textContent = `৳ ${subtotal}`;
    if (itemCountEl) itemCountEl.textContent = `${totalQty} Items`;
}

/* =========================
   LOAD CART (auth or guest)
========================= */
function fixImage(img) {
    if (!img) return "";
    if (img.startsWith("http")) return img;
    return API_BASE + img;
}

async function loadCartItems() {
    const drawerContainer = document.getElementById("cartDrawerItemsContainer");
    const drawerEmpty = document.getElementById("cartDrawerEmptyBox");
    const drawerFooter = document.getElementById("cartDrawerFooter");
    const pageContainer = document.getElementById("cartItemsContainer");
    const pageEmpty = document.getElementById("emptyCartBox");
    const pageLayout = document.querySelector(".cart-layout");

    // If neither drawer nor page container exists on DOM, return
    if (!drawerContainer && !pageContainer) return;

    if (drawerContainer) {
        drawerContainer.innerHTML = `
            <div class="cart-drawer-loading">
                <div class="cart-spinner"></div>
                <p>Loading your cart...</p>
            </div>
        `;
    }
    if (pageContainer) {
        pageContainer.innerHTML = `<p>Loading cart...</p>`;
    }

    let items = [];

    try {
        if (isLoggedIn()) {
            const res = await fetch(`${API_BASE}/cart/`, {
                headers: { "Authorization": `Bearer ${getToken()}` }
            });
            const data = await res.json();

            if (data.status && Array.isArray(data.data)) {
                items = data.data.map(i => ({
                    key: `db-${i.id}`,
                    server_id: i.id,
                    product_id: i.product_id,
                    variant_id: i.variant_id || null,
                    product: i.product,
                    image: i.image,
                    quantity: i.quantity,
                    price: i.price,
                    total: i.total,
                    attributes: i.variant,
                    out_of_stock: false,
                }));
            }
        } else {
            let guestCart = getGuestCart();

            if (guestCart.length) {
                // 🔥 REFRESH PRICE/STOCK FROM BACKEND (batch, single call)
                try {
                    const ids = guestCart.map(i => i.product_id).join(",");
                    const res = await fetch(`${API_BASE}/cart/guest-refresh/?ids=${ids}`);
                    const data = await res.json();

                    if (data.status && Array.isArray(data.data)) {
                        guestCart = guestCart.map(item => {
                            const live = data.data.find(p => p.id === item.product_id);
                            if (!live) return item;

                            let livePrice = live.price;
                            let liveDiscount = live.discount_price;
                            let liveStock = live.stock;

                            if (item.variant_id && Array.isArray(live.variants)) {
                                const v = live.variants.find(v => v.id === item.variant_id);
                                if (v) {
                                    livePrice = v.price;
                                    liveDiscount = v.discount_price;
                                    liveStock = v.stock;
                                }
                            }

                            return {
                                ...item,
                                name: live.name || item.name,
                                image: live.image || item.image,
                                price: livePrice,
                                discount_price: liveDiscount,
                                stock: liveStock,
                            };
                        });

                        saveGuestCart(guestCart); // persist refreshed snapshot
                    }
                } catch (err) {
                    console.error("GUEST CART REFRESH ERROR:", err);
                }
            }

            items = guestCart.map(i => {
                const unit = i.discount_price || i.price || 0;
                const outOfStock = typeof i.stock === "number" && i.stock < i.quantity;
                return {
                    key: `guest-${i.product_id}-${i.variant_id || 0}`,
                    server_id: null,
                    product_id: i.product_id,
                    variant_id: i.variant_id,
                    product: i.name,
                    image: i.image,
                    quantity: i.quantity,
                    price: unit,
                    total: unit * i.quantity,
                    attributes: i.attributes,
                    out_of_stock: outOfStock,
                };
            });
        }
    } catch (err) {
        console.error(err);
        if (drawerContainer) drawerContainer.innerHTML = `<p style="color:#d32f2f;padding:20px;text-align:center;">Failed to load cart</p>`;
        if (pageContainer) pageContainer.innerHTML = `<p style="color:red">Failed to load cart</p>`;
        return;
    }

    CART_ITEMS_CACHE = items;

    // Handle Empty State
    if (!items.length) {
        if (drawerContainer) drawerContainer.innerHTML = "";
        if (drawerEmpty) drawerEmpty.style.display = "flex";
        if (drawerFooter) drawerFooter.style.display = "none";
        const drawerCount = document.getElementById("cartDrawerItemCount");
        if (drawerCount) drawerCount.textContent = "0 Items";

        if (pageLayout) pageLayout.style.display = "none";
        if (pageEmpty) pageEmpty.style.display = "block";
        const pageCount = document.getElementById("cartItemCount");
        if (pageCount) pageCount.textContent = "0 Items";

        updateCartCountFromBackend();
        return;
    }

    // Has items
    if (drawerEmpty) drawerEmpty.style.display = "none";
    if (drawerFooter) drawerFooter.style.display = "block";
    if (pageEmpty) pageEmpty.style.display = "none";
    if (pageLayout) pageLayout.style.display = "";

    // Render Drawer Items
    if (drawerContainer) {
        drawerContainer.innerHTML = "";
        items.forEach(item => {
            const img = fixImage(item.image);
            const productName = item.product.split(' ').slice(0, 6).join(' ') +
                (item.product.split(' ').length > 6 ? '...' : '');

            const variantText = item.attributes && typeof item.attributes === "object"
                ? Object.values(item.attributes).join(" / ")
                : "";

            const stockWarning = item.out_of_stock
                ? `<div class="cart-drawer-stock-warning">Stock unavailable for this quantity</div>`
                : "";

            drawerContainer.innerHTML += `
                <div class="cart-drawer-item">
                    <input type="checkbox" class="cart-drawer-check" data-key="${item.key}" ${item.out_of_stock ? "" : "checked"} onchange="updateSummaryFromSelection()" title="Select item">
                    <img class="cart-drawer-img" src="${img}" alt="${productName}" onerror="this.src='images/safa-world-logo.jpg'">
                    <div class="cart-drawer-info">
                        <div class="cart-drawer-item-title">${productName}</div>
                        ${variantText ? `<div class="cart-drawer-variant">${variantText}</div>` : ""}
                        <div class="cart-drawer-price-row">
                            <span class="cart-drawer-item-total">৳ ${item.total}</span>
                            <span class="cart-drawer-unit-price">(${item.quantity} × ৳ ${item.price})</span>
                        </div>
                        ${stockWarning}
                        <div class="cart-drawer-bottom-row">
                            <div class="cart-drawer-qty">
                                <button type="button" onclick="changeQty('${item.key}', ${item.quantity - 1})" aria-label="Decrease quantity">−</button>
                                <span>${item.quantity}</span>
                                <button type="button" onclick="changeQty('${item.key}', ${item.quantity + 1})" aria-label="Increase quantity">+</button>
                            </div>
                            <button type="button" class="cart-drawer-item-remove" onclick="removeCartItem('${item.key}')" title="Remove item" aria-label="Remove item">
                                <i class="fa fa-trash-o"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    // Render Page items (cart.html)
    if (pageContainer) {
        pageContainer.innerHTML = "";
        items.forEach(item => {
            const img = fixImage(item.image);
            const productName = item.product.split(' ').slice(0, 5).join(' ') +
                (item.product.split(' ').length > 5 ? '...' : '');

            const variantText = item.attributes && typeof item.attributes === "object"
                ? Object.values(item.attributes).join(" / ")
                : "";

            const stockWarning = item.out_of_stock
                ? `<div class="cart-stock-warning" style="color:red;font-size:12px">Stock unavailable for this quantity</div>`
                : "";

            pageContainer.innerHTML += `
                <div class="cart-item">
                    <input type="checkbox" class="cart-check" data-key="${item.key}" ${item.out_of_stock ? "" : "checked"} onchange="updateSummaryFromSelection()">
                    <img class="cart-img" src="${img}" />
                    <div class="cart-info">
                        <div class="cart-name">
                            ${productName}
                            ${variantText ? `<span style="color:#888;font-size:12px"> (${variantText})</span>` : ""}
                        </div>
                        <div class="cart-total-price">৳ ${item.total}</div>
                        <div class="cart-subtotal-mini">${item.quantity} x ৳ ${item.price}</div>
                        ${stockWarning}
                    </div>
                    <div class="cart-qty">
                        <button onclick="changeQty('${item.key}', ${item.quantity - 1})">−</button>
                        <span>${item.quantity}</span>
                        <button onclick="changeQty('${item.key}', ${item.quantity + 1})">+</button>
                    </div>
                    <button class="remove-btn" onclick="removeCartItem('${item.key}')">×</button>
                </div>
            `;
        });
    }

    setTimeout(updateSummaryFromSelection, 50);
}

/* =========================
   CHECKOUT
========================= */
function goToCheckout() {
    const selected = getSelectedItems();
    if (!selected.length) {
        toast("Select at least one product");
        return;
    }

    if (isLoggedIn()) {
        const selectedIds = selected.map(i => i.server_id);
        localStorage.setItem("checkout_cart_ids", JSON.stringify(selectedIds));
        localStorage.removeItem("checkout_guest_items");
    } else {
        const selectedItems = selected.map(i => ({
            product_id: i.product_id,
            variant_id: i.variant_id,
            quantity: i.quantity
        }));
        localStorage.setItem("checkout_guest_items", JSON.stringify(selectedItems));
        localStorage.removeItem("checkout_cart_ids");
    }

    window.location.href = "checkout.html";
}

/* =========================
   QTY / REMOVE (auth or guest, dispatched by key)
========================= */
async function changeQty(key, quantity) {
    if (quantity < 1) return;
    const item = CART_ITEMS_CACHE.find(i => i.key === key);
    if (!item) return;

    if (item.server_id) {
        const res = await fetch(`${API_BASE}/cart/update/${item.server_id}/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
            body: JSON.stringify({ quantity })
        });
        const data = await res.json();
        if (data.status) loadCartItems();
    } else {
        guestCartUpdateQty(item.product_id, item.variant_id, quantity);
        loadCartItems();
        updateCartCountFromBackend?.();
    }
}

async function removeCartItem(key) {
    const item = CART_ITEMS_CACHE.find(i => i.key === key);
    if (!item) return;

    if (item.server_id) {
        const res = await fetch(`${API_BASE}/cart/remove/${item.server_id}/`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (data.status) loadCartItems();
    } else {
        guestCartRemove(item.product_id, item.variant_id);
        loadCartItems();
        updateCartCountFromBackend?.();
    }
}

/* =========================
   CART COUNT (used by navbar)
========================= */
function updateCartCountFromBackend() {
    const dot = document.getElementById("cartDot");
    if (!dot) return;

    if (!isLoggedIn()) {
        dot.textContent = guestCartCount();
        return;
    }

    fetch(`${API_BASE}/cart/`, { headers: { "Authorization": `Bearer ${getToken()}` } })
        .then(res => res.json())
        .then(data => {
            const items = data.data || [];
            let total = 0;
            items.forEach(i => { total += i.quantity || 0; });
            dot.textContent = total;
        })
        .catch(console.error);
}

/* =========================
   TOAST
========================= */
function toast(msg) {
    const c = document.getElementById("toast-container");
    if (!c) { alert(msg); return; }
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => el.classList.add("show"), 50);
    setTimeout(() => {
        el.classList.remove("show");
        setTimeout(() => el.remove(), 300);
    }, 2500);
}

/* =========================
   INIT
========================= */
window.addEventListener("DOMContentLoaded", () => {
    loadCartItems();
});