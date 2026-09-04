/* =========================================
   STATE
========================================= */
let checkoutData = null;

let selectedDistrictId = null;

let selectedDeliveryCharge = 0;

let districtsData = [];

let CUSTOMER_PROFILE = null;

let appliedCoupon = null;  

let couponDiscount = 0;

/* =========================================
   INIT
========================================= */
window.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadDistricts();

        await loadCustomerProfile();

        await loadSavedAddresses();

        await loadCheckoutSummary();

        bindDistrictChange();

        bindAddressSelect();

        bindLiveValidationClear();
    }
);

/* =========================================
   TOKEN
========================================= */
function getToken() {

    return (
        localStorage.getItem("access") ||
        localStorage.getItem("token") ||
        ""
    );
}

/* =========================================
   AUTH HEADERS
========================================= */
function getAuthHeaders() {
    const headers = {
        "Content-Type": "application/json"
    };

    const token = getToken();

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
}

/* =========================================
   CUSTOMER PROFILE
========================================= */
async function loadCustomerProfile() {
    if (!isLoggedIn()) return;

    try {
        const res = await fetch(`${API_BASE}/api/auth/profile/`, {
            method: "GET",
            headers: getAuthHeaders()
        });
        const data = await res.json();

        if (!data.status) return;

        CUSTOMER_PROFILE = data.data;

        const nameField = document.getElementById("ckName");
        const phoneField = document.getElementById("ckPhone");

        const phone = CUSTOMER_PROFILE.phone || "";
        const name = CUSTOMER_PROFILE.name || "";

        if (phoneField) {
            phoneField.value = phone;
            phoneField.readOnly = true;
            phoneField.classList.add("field-locked");
        }

        const hasRealName = name && name !== phone;

        if (nameField) {
            if (hasRealName) {
                nameField.value = name;
                nameField.readOnly = true;
                nameField.classList.add("field-locked");
            } else {
                nameField.readOnly = false;
                nameField.classList.remove("field-locked");
            }
        }

    } catch (err) {
        console.error("PROFILE LOAD ERROR:", err);
    }
}

/* =========================================
   LOAD DISTRICTS FROM BACKEND API
========================================= */
async function loadDistricts() {

    const districtSelect =
        document.getElementById("ckDistrict");

    if (!districtSelect) return;

    try {

        const res = await fetch(
            "https://bdapi.vercel.app/api/v.1/district"
        );

        const data = await res.json();

        districtSelect.innerHTML = `
            <option value="">
                Select District
            </option>
        `;

        if (
            data.status === 200 &&
            data.success
        ) {

            districtsData = data.data;

            data.data.forEach(district => {

                districtSelect.innerHTML += `
                    <option
                        value="${district.name}"
                        data-id="${district.id}">
                        ${district.bn_name}
                    </option>
                `;
            });
        }

    } catch (err) {

        console.error(
            "DISTRICT ERROR:",
            err
        );
    }
}

/* =========================================
   DISTRICT CHANGE
========================================= */
function bindDistrictChange() {

    const districtSelect =
        document.getElementById("ckDistrict");

    if (!districtSelect) return;

    districtSelect.addEventListener(
        "change",
        async () => {

            selectedDistrictId =
                districtSelect.value;

            await loadCheckoutSummary();
        }
    );
}

/* =========================================
   LOAD CHECKOUT SUMMARY (auth or guest)
========================================= */
async function loadCheckoutSummary() {

    try {
        const district = document.getElementById("ckDistrict")?.value;

        if (isLoggedIn()) {
            const selectedCartIds = JSON.parse(localStorage.getItem("checkout_cart_ids")) || [];
            const params = new URLSearchParams();
            selectedCartIds.forEach(id => params.append("cart_ids", id));
            if (district) params.append("district", district);

            const res = await fetch(`${API_BASE}/api/checkout/summary/?${params.toString()}`, {
                method: "GET",
                headers: getAuthHeaders()
            });
            const data = await res.json();

            if (!data.status) {
                toast(data.message || "Checkout failed");
                return;
            }

            checkoutData = data.data;
            selectedDeliveryCharge = Number(data.data.delivery_charge || 0);
            renderDeliveryChargeText();
            renderCheckoutProducts(data.data.items || []);
            renderSummary(data.data.items || [], data.data.subtotal || 0);
            await revalidateAppliedCouponIfAny();

            GAInitiateCheckoutEvent(
                (data.data.items || []).map(item => ({
                    id: item.product_id,
                    name: item.product,
                    price: item.total / item.quantity,
                    quantity: item.quantity
                })),
                data.data.subtotal || 0
            );

        } else {
            const guestItems = JSON.parse(localStorage.getItem("checkout_guest_items")) || [];

            if (!guestItems.length) {
                toast("No items to checkout");
                return;
            }

            const params = new URLSearchParams();
            params.append("items", JSON.stringify(guestItems));
            if (district) params.append("district", district);

            const res = await fetch(`${API_BASE}/api/checkout/summary/?${params.toString()}`, {
                method: "GET"
            });
            const data = await res.json();

            if (!data.status) {
                toast(data.message || "Checkout failed");
                return;
            }

            checkoutData = data.data;
            selectedDeliveryCharge = Number(data.data.delivery_charge || 0);
            renderDeliveryChargeText();
            renderCheckoutProducts(data.data.items || []);
            renderSummary(data.data.items || [], data.data.subtotal || 0);
            await revalidateAppliedCouponIfAny();

            GAInitiateCheckoutEvent(
                (data.data.items || []).map(item => ({
                    id: item.product_id,
                    name: item.product,
                    price: item.total / item.quantity,
                    quantity: item.quantity
                })),
                data.data.subtotal || 0
            );
        }

    } catch (err) {
        console.error("CHECKOUT ERROR:", err);
        toast("Failed to load checkout");
    }
}

function renderDeliveryChargeText() {
    const deliveryText = document.getElementById("deliveryChargeText");
    if (deliveryText) deliveryText.innerText = `৳ ${selectedDeliveryCharge}`;
}

/* =========================================
   RENDER PRODUCTS
========================================= */
function renderCheckoutProducts(items) {
    const container = document.getElementById("checkoutProducts");
    if (!container) return;
    container.innerHTML = "";

    if (!items.length) {
        container.innerHTML = `<div class="empty-checkout">No checkout items found</div>`;
        return;
    }

    items.forEach(item => {
        const variantText = item.variant && typeof item.variant === "object"
            ? Object.values(item.variant).join(" / ")
            : "";

        container.innerHTML += `
            <div class="ck-product">
                <div class="ck-product-info">
                    <div class="ck-product-name">
                        ${item.product}
                        ${variantText ? `<span style="color:#888;font-size:12px"> (${variantText})</span>` : ""}
                    </div>
                    <div class="ck-product-meta">
                        Qty: ${item.quantity}
                    </div>
                </div>
                <div class="ck-product-right">
                    <div class="ck-product-price">
                        ৳ ${item.total}
                    </div>
                </div>
            </div>
        `;
    });
}

/* =========================================
   RENDER SUMMARY
========================================= */
function renderSummary(items, subtotal) {
    const summaryBox = document.getElementById("checkoutSummaryItems");
    if (!summaryBox) return;
    summaryBox.innerHTML = "";
    let breakdownHtml = "";

    items.forEach(item => {
        const variantText = item.variant && typeof item.variant === "object"
            ? Object.values(item.variant).join(" / ")
            : "";

        summaryBox.innerHTML += `
            <div class="sum-row">
                <span>
                    ${item.product}${variantText ? ` (${variantText})` : ""}
                    × ${item.quantity}
                </span>
                <span>
                    ৳ ${item.total}
                </span>
            </div>
        `;

        if (Number(item.delivery_charge || 0) > 0) {
            breakdownHtml += `
                <div class="delivery-item">
                    <span class="delivery-item-name">${item.product}</span>
                    <span class="delivery-item-charge">৳ ${item.delivery_charge}</span>
                </div>
            `;
        }
    });

    document.getElementById("ckSubtotal").innerText = subtotal;

    const breakdown = document.getElementById("deliveryBreakdown");
    if (breakdown) {
        breakdown.innerHTML = breakdownHtml || `<div class="delivery-item">No delivery charge</div>`;
    }

    updateTotals();
}

/* =========================================
   UPDATE TOTALS
========================================= */
function updateTotals() {

    const subtotal =
        Number(
            document.getElementById(
                "ckSubtotal"
            ).innerText || 0
        );

    const shipping =
        Number(
            selectedDeliveryCharge || 0
        );

    const subtotalAfterDiscount =
        subtotal - couponDiscount;

    const total = 
        subtotalAfterDiscount + shipping;

    const afterDiscountRow = 
        document.getElementById(
            "subtotalAfterDiscountRow"
        );
    const afterDiscountAmount = 
        document.getElementById(
            "ckSubtotalAfterDiscount"
        );

    if (couponDiscount > 0) {
        if (afterDiscountRow) afterDiscountRow.style.display = "flex";
        if (afterDiscountAmount) afterDiscountAmount.innerText = subtotalAfterDiscount;
    } else {
        if (afterDiscountRow) afterDiscountRow.style.display = "none";
    }

    document.getElementById(
        "ckShipping"
    ).innerText = shipping;

    document.getElementById(
        "ckTotal"
    ).innerText = total;
}

/* =========================================
   COUPON
========================================= */

async function revalidateAppliedCouponIfAny() {
    if (!appliedCoupon) return;
    await applyCoupon(appliedCoupon.code, true);
}

function setCouponMessage(message, type) {
    const el = document.getElementById("couponMessage");
    if (!el) return;
    el.textContent = message || "";
    el.className = "coupon-message" + (type ? ` ${type}` : "");
}

function updateCouponUI() {
    const row = document.getElementById("couponDiscountRow");
    const codeEl = document.getElementById("ckCouponCode");
    const amountEl = document.getElementById("ckCouponDiscount");
    const input = document.getElementById("ckCouponInput");
    const btn = document.getElementById("couponApplyBtn");

    if (appliedCoupon) {
        if (row) row.style.display = "flex";
        if (codeEl) codeEl.textContent = appliedCoupon.code;
        if (amountEl) amountEl.innerText = couponDiscount;

        if (input) {
            input.value = appliedCoupon.code;
            input.disabled = true;
        }
        if (btn) {
            btn.textContent = "Remove";
            btn.classList.add("remove");
            btn.setAttribute("onclick", "removeCoupon()");
        }
    } else {
        if (row) row.style.display = "none";
        if (input) input.disabled = false;
        if (btn) {
            btn.textContent = "Apply";
            btn.classList.remove("remove");
            btn.setAttribute("onclick", "applyCoupon()");
        }
    }

    updateTotals();
}


async function applyCoupon(code, silent) {
    const input = document.getElementById("ckCouponInput");
    const btn = document.getElementById("couponApplyBtn");

    const couponCode = (code || input?.value || "").trim();

    if (!couponCode) {
        if (!silent) setCouponMessage("Enter a coupon code", "error");
        return;
    }

    const phone = document.getElementById("ckPhone")?.value.trim();
    if (!phone) {
        if (!silent) {
            setCouponMessage("", "");
            toast("Please enter your phone number first");
        }
        return;
    }

    const subtotal = Number(document.getElementById("ckSubtotal")?.innerText || 0);
    const productIds = (checkoutData?.items || []).map(item => item.product_id);

    if (btn && !silent) btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/site/api/apply-coupon/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code: couponCode,
                phone,
                subtotal,
                product_ids: productIds
            })
        });
        const data = await res.json();

        if (data.status) {
            appliedCoupon = { code: data.data.code };
            couponDiscount = Number(data.data.discount_amount || 0);
            setCouponMessage(`Coupon "${data.data.code}" applied`, "success");
        } else {
            appliedCoupon = null;
            couponDiscount = 0;
            setCouponMessage(data.message || "Invalid coupon code", "error");
        }

    } catch (err) {
        console.error("COUPON ERROR:", err);
        appliedCoupon = null;
        couponDiscount = 0;
        if (!silent) setCouponMessage("Failed to apply coupon", "error");
    }

    if (btn) btn.disabled = false;
    updateCouponUI();
}

function removeCoupon() {
    appliedCoupon = null;
    couponDiscount = 0;
    setCouponMessage("", "");

    const input = document.getElementById("ckCouponInput");
    if (input) input.value = "";

    updateCouponUI();
}

/* =========================================
   LOAD SAVED ADDRESSES
========================================= */
async function loadSavedAddresses() {

    const select =
        document.getElementById(
            "ckAddressSelect"
        );

    if (!select) return;

    const addresses =
        JSON.parse(
            localStorage.getItem(
                "pw_addresses"
            )
        ) || [];

    select.innerHTML = `
        <option value="">
            Select Saved Address
        </option>
    `;

    addresses.forEach((addr, index) => {

        select.innerHTML += `
            <option value="${index}">
                ${addr.name} — ${addr.district}
            </option>
        `;
    });
}

/* =========================================
   ADDRESS SELECT
========================================= */
function bindAddressSelect() {

    const select =
        document.getElementById(
            "ckAddressSelect"
        );

    if (!select) return;

    select.addEventListener(
        "change",
        () => {

            const addresses =
                JSON.parse(
                    localStorage.getItem(
                        "pw_addresses"
                    )
                ) || [];

            const selected =
                addresses[select.value];

            if (!selected) return;

            const nameField = document.getElementById("ckName");
            const phoneField = document.getElementById("ckPhone");

            if (nameField && !nameField.readOnly) {
                nameField.value = selected.name || "";
            }

            if (phoneField && !phoneField.readOnly) {
                phoneField.value = selected.phone || "";
            }

            document.getElementById(
                "ckAddress"
            ).value = selected.address || "";

            const districtSelect =
                document.getElementById(
                    "ckDistrict"
                );

            districtSelect.value =
                selected.district || "";

            selectedDistrictId =
                selected.district || "";

            loadCheckoutSummary();
        }
    );
}

/* =========================================
   VALIDATION
========================================= */

// Fields checked on submit, in the order they appear on the form.
// `label` is used in the toast message shown to the user.
const CHECKOUT_REQUIRED_FIELDS = [
    { id: "ckName", label: "Full Name" },
    { id: "ckPhone", label: "Phone Number" },
    { id: "ckAddress", label: "Delivery Address" },
    { id: "ckDistrict", label: "District" },
];

function clearFieldError(el) {
    if (!el) return;
    el.classList.remove("field-error");
    const wrap = el.closest(".ck-field") || el.parentElement;
    wrap?.querySelector(".field-error-msg")?.remove();
}

function clearAllFieldErrors() {
    CHECKOUT_REQUIRED_FIELDS.forEach(f => {
        clearFieldError(document.getElementById(f.id));
    });
}

function showFieldError(el, message) {
    if (!el) return;
    el.classList.add("field-error");

    // avoid duplicate messages if validate runs more than once
    const wrap = el.closest(".ck-field") || el.parentElement;
    wrap?.querySelector(".field-error-msg")?.remove();

    const msgEl = document.createElement("div");
    msgEl.className = "field-error-msg";
    msgEl.textContent = message;
    wrap?.appendChild(msgEl);
}

// Re-validates a single field as the user types/selects, so the red
// highlight clears the moment they fix it (no need to resubmit).
function bindLiveValidationClear() {
    CHECKOUT_REQUIRED_FIELDS.forEach(f => {
        const el = document.getElementById(f.id);
        if (!el) return;
        const evt = (el.tagName === "SELECT") ? "change" : "input";
        el.addEventListener(evt, () => {
            if (el.value && el.value.trim()) {
                clearFieldError(el);
            }
        });
    });
}

/**
 * Validates all required checkout fields.
 * Highlights every missing field, shows an inline message under each one,
 * shows a single summary toast, and scrolls to + focuses the first
 * missing field.
 * Returns true if the form is valid, false otherwise.
 */
function validateCheckoutForm() {
    clearAllFieldErrors();

    const missing = [];

    CHECKOUT_REQUIRED_FIELDS.forEach(f => {
        const el = document.getElementById(f.id);
        if (!el) return;
        const value = (el.value || "").trim();
        if (!value) {
            missing.push(f);
            showFieldError(el, `${f.label} is required`);
        }
    });

    if (missing.length) {
        const first = document.getElementById(missing[0].id);

        if (missing.length === 1) {
            toast(`Please fill in ${missing[0].label}`);
        } else {
            const names = missing.map(f => f.label).join(", ");
            toast(`Please fill in the highlighted fields: ${names}`);
        }

        first?.scrollIntoView({ behavior: "smooth", block: "center" });
        first?.focus();

        return false;
    }

    return true;
}

/* =========================================
   PLACE ORDER (auth or guest)
========================================= */
async function placeOrder() {

    if (!validateCheckoutForm()) {
        return;
    }

    const placeBtn = document.getElementById("placeOrderBtn");
    if (placeBtn) {
        if (placeBtn.disabled) return;
        placeBtn.disabled = true;
        placeBtn.textContent = "Placing Order...";
    }

    const name = document.getElementById("ckName").value.trim();
    const phone = document.getElementById("ckPhone").value.trim();
    const address = document.getElementById("ckAddress").value.trim();
    const district = document.getElementById("ckDistrict").value;

    try {
        let body;
        const attribution = window.getAttributionData ? window.getAttributionData() : {};
        const couponCode = appliedCoupon ? appliedCoupon.code : null;

        if (isLoggedIn()) {
            const selectedCartIds = JSON.parse(localStorage.getItem("checkout_cart_ids")) || [];
            const guestItemsFallback = JSON.parse(localStorage.getItem("checkout_guest_items")) || [];
            body = { cart_ids: selectedCartIds, items: guestItemsFallback, name, phone, address, district, coupon_code: couponCode, ...attribution };
        } else {
            const guestItems = JSON.parse(localStorage.getItem("checkout_guest_items")) || [];
            if (!guestItems.length) {
                toast("No items to checkout");
                return;
            }
            const cartIdsFallback = JSON.parse(localStorage.getItem("checkout_cart_ids")) || [];
            body = { items: guestItems, cart_ids: cartIdsFallback, name, phone, address, district, coupon_code: couponCode, ...attribution };
        }

        const res = await fetch(`${API_BASE}/api/checkout/place-order/`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (data.status) {
            GAInitiatePurchaseEvent(
                (checkoutData?.items || []).map(item => ({
                    id: item.product_id,
                    name: item.product,
                    price: item.total / item.quantity,
                    quantity: item.quantity
                })),
                checkoutData?.subtotal || 0,
                data.order_id
            );

            localStorage.removeItem("checkout_cart_ids");
            localStorage.removeItem("checkout_guest_items");

            appliedCoupon = null;
            couponDiscount = 0;

            if (!isLoggedIn()) {
                clearGuestCart();
            } else if (CUSTOMER_PROFILE && (!CUSTOMER_PROFILE.name || CUSTOMER_PROFILE.name === CUSTOMER_PROFILE.phone)) {
                fetch(`${API_BASE}/api/auth/profile/`, {
                    method: "PUT",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ name })
                }).catch(err => console.error("PROFILE NAME SAVE ERROR:", err));
            }

            localStorage.removeItem("checkout_cart_ids");
            localStorage.removeItem("checkout_guest_items");
            if (!isLoggedIn()) clearGuestCart();

            showOrderSuccess();
        } else {
            if (data.otp_required) {
                showOtpVerifyModal({
                    phone: data.phone || phone,
                    message: data.message,
                    apiBase: API_BASE,
                    orderEndpoint: "/api/checkout/place-order/",
                    orderPayload: body,
                    onSuccess: function (successData) {
                        showOrderSuccess(successData);
                    }
                });
                // if (placeBtn) {
                //     placeBtn.textContent = "Place Order";
                //     placeBtn.disabled = false;
                // }
                return;
            } else {
                toast(data.message || "Order failed");

                if (data.field && document.getElementById(data.field)) {
                    showFieldError(document.getElementById(data.field), data.message || "Invalid value");
                }
                if (placeBtn) {
                    placeBtn.textContent = "Place Order";
                    placeBtn.disabled = false;
                }
            }
        }
    } catch (err) {
        console.error("ORDER ERROR:", err);
        toast("Something went wrong. Please try again.");
        if (placeBtn) {
            placeBtn.textContent = "Place Order";
            placeBtn.disabled = false;
        }
    }
}

/* =========================================
   TOAST
========================================= */
function toast(msg) {

    const c =
        document.getElementById(
            "toast-container"
        );

    if (!c) {
        alert(msg);
        return;
    }

    const el =
        document.createElement("div");

    el.className = "toast";

    el.innerText = msg;

    c.appendChild(el);

    setTimeout(() => {
        el.classList.add("show");
    }, 50);

    setTimeout(() => {

        el.classList.remove("show");

        setTimeout(() => {
            el.remove();
        }, 300);

    }, 2800);
}

/* =========================================
   SUCCESS POP-UP
========================================= */

function showOrderSuccess(data) {

    localStorage.removeItem("checkout_cart_ids");
    localStorage.removeItem("checkout_guest_items");

    if (!isLoggedIn()) {
        clearGuestCart();
    }

    const overlay = document.createElement("div");

    overlay.id = "orderSuccessModal";

    overlay.innerHTML = `
        <div class="success-modal">

            <div class="success-icon">
                ✓
            </div>

            <h2>
                Order Placed Successfully
            </h2>

            <p>
                Thank you for your order.
                We have received your order and
                will contact you soon.
            </p>

            <div class="success-order-text">
                Redirecting to My Orders...
            </div>

        </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => {
        window.location.href = isLoggedIn() ? "my-orders.html" : "index.html";
    }, 2500);
}

function toggleDeliveryBreakdown() {

    const box =
        document.getElementById(
            "deliveryBreakdown"
        );

    const arrow =
        document.getElementById(
            "deliveryArrow"
        );

    if (!box) return;

    box.classList.toggle("show");

    if (
        box.classList.contains("show")
    ) {

        arrow.innerText = "▲";

    } else {

        arrow.innerText = "▼";
    }
}