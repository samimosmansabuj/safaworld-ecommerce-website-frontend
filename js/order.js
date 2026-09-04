/* =========================
   INIT
========================= */

window.addEventListener("DOMContentLoaded", () => {
    loadOrderDetails();
});

/* =========================
   TOKEN
========================= */

function getToken() {
    return (
        localStorage.getItem("access") ||
        localStorage.getItem("token") ||
        ""
    );
}

/* =========================
   HEADERS
========================= */

function getAuthHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getToken()}`
    };
}

/* =========================
   LOAD ORDER
========================= */

async function loadOrderDetails() {

    const params = new URLSearchParams(
        window.location.search
    );

    const orderId = params.get("id");

    if (!orderId) {
        showError("Order ID missing");
        return;
    }

    try {

        const res = await fetch(
            `${API_BASE}/api/order/${orderId}/`,
            {
                method: "GET",
                headers: getAuthHeaders()
            }
        );

        const response = await res.json();

        console.log("ORDER DETAILS:", response);

        if (!response.status) {

            showError(
                response.message ||
                "Order not found"
            );

            return;
        }

        renderOrder(response.data);

    } catch (err) {

        console.error(err);

        showError(
            "Failed to load order"
        );
    }
}

/* =========================
   RENDER ORDER
========================= */

function renderOrder(order) {

    document.getElementById("orderId").textContent =
        order.order_id;

    document.querySelector(".order-date").textContent =
        `Placed on: ${formatDateTime(order.date)}`;

    const statusEl =
        document.getElementById("orderStatus");

    statusEl.textContent =
        formatStatus(order.status);

    statusEl.className =
        `order-status ${order.status}`;

    renderItems(order.items);

    renderDelivery(order);

    renderSummary(order);

    renderPayment(order);
}

/* =========================
   ITEMS
========================= */

function renderItems(items) {

    const container =
        document.getElementById("orderItems");

    container.innerHTML = "";

    if (!items || !items.length) {

        container.innerHTML =
            `<p>No items found</p>`;

        return;
    }

    items.forEach(item => {

        let variantHtml = "";

        if (
            item.variant &&
            typeof item.variant === "object"
        ) {

            Object.entries(item.variant)
                .forEach(([key, value]) => {

                    variantHtml += `
                        <div class="oi-meta">
                            ${key}: ${value}
                        </div>
                    `;
                });
        }

        let imageUrl = item.image;

        if (
            imageUrl &&
            !imageUrl.startsWith("http")
        ) {
            imageUrl = `${API_BASE}${imageUrl}`;
        }

        container.innerHTML += `

            <div class="order-item">

                <div class="oi-img">

                    ${
                        imageUrl
                        ? `<img src="${imageUrl}" alt="${item.name || "Product"}">`
                        : `<div class="oi-placeholder">📦</div>`
                    }

                </div>

                <div class="oi-info">

                    <div class="oi-name">
                        ${item.name || "-"}
                    </div>

                    <div class="oi-meta">
                        Qty: ${item.qty}
                    </div>

                    ${variantHtml}

                </div>

                <div class="oi-price">
                    ৳ ${item.total}
                </div>

            </div>

        `;
    });
}

/* =========================
   DELIVERY
========================= */

function renderDelivery(order) {

    document.getElementById(
        "orderDelivery"
    ).innerHTML = `

        <h2>
            Delivery Information
        </h2>

        ${
            order.customer_name
            ? `
                <p>
                    <strong>Name:</strong>
                    ${order.customer_name}
                </p>
            `
            : ""
        }

        ${
            order.customer_phone
            ? `
                <p>
                    <strong>Phone:</strong>
                    ${order.customer_phone}
                </p>
            `
            : ""
        }

        <p>
            <strong>Address:</strong>
            ${order.address || "-"}
        </p>

    `;
}

/* =========================
   PAYMENT
========================= */

function renderPayment(order) {

    const paymentCard =
        document.querySelectorAll(".card")[2];

    if (!paymentCard) return;

    paymentCard.innerHTML = `

        <h2>Payment</h2>

        <p>
            <strong>Method:</strong>
            ${formatStatus(order.payment_type)}
        </p>

        <p>
            <strong>Status:</strong>
            ${formatStatus(order.payment_status)}
        </p>

    `;
}

/* =========================
   SUMMARY
========================= */

function renderSummary(order) {

    document.getElementById(
        "orderSummary"
    ).innerHTML = `

        <h2>
            Order Summary
        </h2>

        <div class="summary-row">
            <span>Subtotal</span>
            <span>৳ ${order.subtotal}</span>
        </div>

        <div class="summary-row">
            <span>Delivery</span>
            <span>৳ ${order.shipping}</span>
        </div>

        <div class="summary-row">
            <span>Total Items</span>
            <span>${order.items?.length || 0}</span>
        </div>

        <div class="summary-row total">
            <span>Total</span>
            <span>৳ ${order.total}</span>
        </div>

    `;
}

/* =========================
   HELPERS
========================= */

function formatStatus(status) {

    if (!status) return "";

    return status
        .replaceAll("_", " ")
        .replace(/\b\w/g, c => c.toUpperCase());
}

function formatDateTime(date) {

    try {

        return new Date(date)
            .toLocaleString(
                "en-GB",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );

    } catch {

        return date;
    }
}

function showError(msg) {

    document.querySelector(
        ".order-page"
    ).innerHTML = `

        <div style="
            text-align:center;
            padding:40px;
        ">
            ${msg}
        </div>

    `;
}