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
async function initCheckoutPage() {
    await loadDistricts();
    await loadCustomerProfile();
    await loadSavedAddresses();
    await loadCheckoutSummary();
    bindDistrictChange();
    bindAddressSelect();
    bindLiveValidationClear();
    bindOrderAttemptCapture();
}
window.initCheckoutPage = initCheckoutPage;

window.addEventListener("DOMContentLoaded", () => {
    initCheckoutPage();
});

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
/* ===== OLD (bdapi.vercel.app) - commented out =====
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

===== END OLD ===== */

/* ===== NEW: https://bdapis.com/api/v1.2/districts (cached, fast) ===== */
const DISTRICT_API_URL = "https://bdapis.com/api/v1.2/districts";
const DISTRICT_CACHE_KEY = "bd_districts_v1_2";

async function _ckFetchDistricts() {
    const rawDistricts = [
        {
            "district": "Barguna",
            "districtbn": "বরগুনা",
            "coordinates": "22.0953, 90.1121"
        },
        {
            "district": "Barishal",
            "districtbn": "বরিশাল",
            "coordinates": "22.7022, 90.3696"
        },
        {
            "district": "Bhola",
            "districtbn": "ভোলা",
            "coordinates": "22.1785, 90.7101"
        },
        {
            "district": "Jhalokati",
            "districtbn": "ঝালকাঠী",
            "coordinates": "22.5721, 90.1870"
        },
        {
            "district": "Patuakhali",
            "districtbn": "পটুয়াখালী",
            "coordinates": "22.2249, 90.4548"
        },
        {
            "district": "Pirojpur",
            "districtbn": "পিরোজপুর",
            "coordinates": "22.5791, 89.9759"
        },
        {
            "district": "Bandarban",
            "districtbn": "বান্দরবান",
            "coordinates": "21.8311, 92.3686"
        },
        {
            "district": "Brahmanbaria",
            "districtbn": "ব্রাহ্মণবাড়িয়া",
            "coordinates": "23.9608, 91.1115"
        },
        {
            "district": "Chandpur",
            "districtbn": "চাঁদপুর",
            "coordinates": "23.2513, 90.8518"
        },
        {
            "district": "Chattogram",
            "districtbn": "চট্টগ্রাম",
            "coordinates": "22.5150, 91.7539"
        },
        {
            "district": "Cox's Bazar",
            "districtbn": "কক্স বাজার",
            "coordinates": "21.5641, 92.0282"
        },
        {
            "district": "Cumilla",
            "districtbn": "কুমিল্লা",
            "coordinates": "23.4576, 91.1809"
        },
        {
            "district": "Feni",
            "districtbn": "ফেনী",
            "coordinates": "22.9409, 91.4067"
        },
        {
            "district": "Khagrachari",
            "districtbn": "খাগড়াছড়ি",
            "coordinates": "23.1322, 91.9490"
        },
        {
            "district": "Lakshmipur",
            "districtbn": "লক্ষ্মীপুর",
            "coordinates": "22.9447, 90.8282"
        },
        {
            "district": "Noakhali",
            "districtbn": "নোয়াখালী",
            "coordinates": "22.8724, 91.0973"
        },
        {
            "district": "Rangamati",
            "districtbn": "রাঙ্গামাটি",
            "coordinates": "22.7324, 92.2985"
        },
        {
            "district": "Dhaka",
            "districtbn": "ঢাকা",
            "coordinates": "23.8105, 90.3372"
        },
        {
            "district": "Faridpur",
            "districtbn": "ফরিদপুর",
            "coordinates": "23.5424, 89.6309"
        },
        {
            "district": "Gazipur",
            "districtbn": "গাজীপুর",
            "coordinates": "24.0958, 90.4125"
        },
        {
            "district": "Gopalganj",
            "districtbn": "গোপালগঞ্জ",
            "coordinates": "23.0488, 89.8879"
        },
        {
            "district": "Kishoreganj",
            "districtbn": "কিশোরগঞ্জ",
            "coordinates": "24.4260, 90.9821"
        },
        {
            "district": "Madaripur",
            "districtbn": "মাদারীপুর",
            "coordinates": "23.2393, 90.1870"
        },
        {
            "district": "Manikganj",
            "districtbn": "মানিকগঞ্জ",
            "coordinates": "23.8617, 90.0003"
        },
        {
            "district": "Munshiganj",
            "districtbn": "মুন্সিগঞ্জ",
            "coordinates": "23.4981, 90.4127"
        },
        {
            "district": "Narayanganj",
            "districtbn": "নারায়ণগঞ্জ",
            "coordinates": "23.7147, 90.5636"
        },
        {
            "district": "Narsingdi",
            "districtbn": "নরসিংদী",
            "coordinates": "24.1344, 90.7860"
        },
        {
            "district": "Rajbari",
            "districtbn": "রাজবাড়ী",
            "coordinates": "23.7151, 89.5875"
        },
        {
            "district": "Shariatpur",
            "districtbn": "শরিয়তপুর",
            "coordinates": "23.2423, 90.4348"
        },
        {
            "district": "Tangail",
            "districtbn": "টাঙ্গাইল",
            "coordinates": "24.3917, 89.9948"
        },
        {
            "district": "Bagerhat",
            "districtbn": "বাগেরহাট",
            "coordinates": "22.6602, 89.7895"
        },
        {
            "district": "Chuadanga",
            "districtbn": "চুয়াডাঙ্গা",
            "coordinates": "23.6161, 88.8263"
        },
        {
            "district": "Jashore",
            "districtbn": "যশোর",
            "coordinates": "23.1634, 89.2182"
        },
        {
            "district": "Jhenaidah",
            "districtbn": "ঝিনাইদহ",
            "coordinates": "23.5450, 89.1726"
        },
        {
            "district": "Khulna",
            "districtbn": "খুলনা",
            "coordinates": "22.6738, 89.3967"
        },
        {
            "district": "Kushtia",
            "districtbn": "কুষ্টিয়া",
            "coordinates": "23.8907, 89.1099"
        },
        {
            "district": "Magura",
            "districtbn": "মাগুরা",
            "coordinates": "23.4290, 89.4364"
        },
        {
            "district": "Meherpur",
            "districtbn": "মেহেরপুর",
            "coordinates": "23.8052, 88.6724"
        },
        {
            "district": "Narail",
            "districtbn": "নড়াইল",
            "coordinates": "23.1163, 89.5840"
        },
        {
            "district": "Satkhira",
            "districtbn": "সাতক্ষীরা",
            "coordinates": "22.3155, 89.1115"
        },
        {
            "district": "Jamalpur",
            "districtbn": "জামালপুর",
            "coordinates": "25.0831, 89.7853"
        },
        {
            "district": "Mymensingh",
            "districtbn": "ময়মনসিংহ",
            "coordinates": "24.7539, 90.4073"
        },
        {
            "district": "Netrokona",
            "districtbn": "নেত্রকোনা",
            "coordinates": "24.8103, 90.8656"
        },
        {
            "district": "Sherpur",
            "districtbn": "শেরপুর",
            "coordinates": "25.0746, 90.1495"
        },
        {
            "district": "Bogura",
            "districtbn": "বগুড়া",
            "coordinates": "24.8510, 89.3697"
        },
        {
            "district": "Joypurhat",
            "districtbn": "জয়পুরহাট",
            "coordinates": "25.0947, 89.0945"
        },
        {
            "district": "Naogaon",
            "districtbn": "নওগাঁ",
            "coordinates": "24.9132, 88.7531"
        },
        {
            "district": "Natore",
            "districtbn": "নাটোর",
            "coordinates": "24.4102, 89.0076"
        },
        {
            "district": "Chapai Nawabganj",
            "districtbn": "চাঁপাইনবাবগঞ্জ",
            "coordinates": "24.7413, 88.2912"
        },
        {
            "district": "Pabna",
            "districtbn": "পাবনা",
            "coordinates": "24.1585, 89.4481"
        },
        {
            "district": "Rajshahi",
            "districtbn": "রাজশাহী",
            "coordinates": "24.3733, 88.6049"
        },
        {
            "district": "Sirajganj",
            "districtbn": "সিরাজগঞ্জ",
            "coordinates": "24.3141, 89.5700"
        },
        {
            "district": "Dinajpur",
            "districtbn": "দিনাজপুর",
            "coordinates": "25.6279, 88.6332"
        },
        {
            "district": "Gaibandha",
            "districtbn": "গাইবান্ধা",
            "coordinates": "25.3297, 89.5430"
        },
        {
            "district": "Kurigram",
            "districtbn": "কুড়িগ্রাম",
            "coordinates": "25.8072, 89.6295"
        },
        {
            "district": "Lalmonirhat",
            "districtbn": "লালমনিরহাট",
            "coordinates": "25.9923, 89.2847"
        },
        {
            "district": "Nilphamari",
            "districtbn": "নিলফামারী",
            "coordinates": "25.8483, 88.9414"
        },
        {
            "district": "Panchagarh",
            "districtbn": "পঞ্চগড়",
            "coordinates": "26.2709, 88.5952"
        },
        {
            "district": "Rangpur",
            "districtbn": "রংপুর",
            "coordinates": "25.7468, 89.2508"
        },
        {
            "district": "Thakurgaon",
            "districtbn": "ঠাকুরগাঁও",
            "coordinates": "26.0418, 88.4283"
        },
        {
            "district": "Habiganj",
            "districtbn": "হবিগঞ্জ",
            "coordinates": "24.4771, 91.4507"
        },
        {
            "district": "Moulvibazar",
            "districtbn": "মৌলভীবাজার",
            "coordinates": "24.3095, 91.7315"
        },
        {
            "district": "Sunamganj",
            "districtbn": "সুনামগঞ্জ",
            "coordinates": "25.0715, 91.3992"
        },
        {
            "district": "Sylhet",
            "districtbn": "সিলেট",
            "coordinates": "24.8993, 91.8700"
        }
    ];
    // console.log("Raw districts loaded:", rawDistricts.length);
    try {
        const cached = sessionStorage.getItem(DISTRICT_CACHE_KEY);
        if (cached) return JSON.parse(cached);
    } catch (e) {}

    const res = await fetch(DISTRICT_API_URL);
    const json = await res.json();
    const list = (json && json.data) || [];
    if (list.length) {
        try { sessionStorage.setItem(DISTRICT_CACHE_KEY, JSON.stringify(list)); } catch (e) {}
    }
    return list;
}

async function loadDistricts() {
    const select = document.getElementById("ckDistrict");
    if (!select) return;

    try {
        const list = await _ckFetchDistricts();
    districtsData = list;
        // single innerHTML write = fast
        select.innerHTML =
            '<option value="">Select District</option>' +
            list.map(d => `<option value="${d.district}" data-id="${d.district}">${d.districtbn}</option>`).join("");
    } catch (err) {
        console.error("District Load Error:", err);
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

/* =========================================
   ORDER ATTEMPT
========================================= */
let lastOrderAttemptSignature = "";

function bindOrderAttemptCapture() {
    const phoneField = document.getElementById("ckPhone");
    if (!phoneField) return;

    if (phoneField.dataset.attemptBound === "1") return;
    phoneField.dataset.attemptBound = "1";

    phoneField.addEventListener("blur", saveOrderAttemptIfPossible);
}

async function saveOrderAttemptIfPossible() {
    const phone = document.getElementById("ckPhone")?.value.trim();
    if (!phone || phone.length < 11) return;

    const items = checkoutData?.items || [];
    if (!items.length) return;

    const attribution = window.getAttributionData ? window.getAttributionData() : {};

    const payload = {
        customer: {
            name: document.getElementById("ckName")?.value.trim() || "",
            phone,
            address: document.getElementById("ckAddress")?.value.trim() || "",
            district: document.getElementById("ckDistrict")?.value || ""
        },
        products: items.map(item => ({
            id: item.product_id,
            variant_id: item.variant_id || null,
            quantity: item.quantity
        })),
        source: "checkout",
        utm_source: attribution.utm_source || null,
        utm_medium: attribution.utm_medium || null,
        utm_campaign: attribution.utm_campaign || null
    };

    const signature = JSON.stringify(payload);
    if (signature === lastOrderAttemptSignature) return;

    try {
        const res = await fetch(`${API_BASE}/site/api/order-attempt/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: signature
        });
        if (res.ok) lastOrderAttemptSignature = signature;
    } catch (err) {
        console.error("ORDER ATTEMPT SAVE ERROR:", err);
    }
}

/* =========================================
   VISITOR ACTIVITY: order_placed
========================================= */
function trackOrderPlacedEvent(orderId) {
    if (typeof window.trackEvent !== "function") return;
    window.trackEvent("order_placed", {
        order_id: orderId,
        total: checkoutData?.subtotal || 0,
        item_count: (checkoutData?.items || []).length,
    });
}

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
            trackOrderPlacedEvent(data.order_id);

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
                        trackOrderPlacedEvent(successData && successData.order_id);
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
        const target = isLoggedIn() ? "/my-orders" : "/";
        if (typeof window.spaNavigate === 'function') {
            window.spaNavigate(target);
        } else {
            window.location.href = target;
        }
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