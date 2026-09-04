/* =========================
   INIT
========================= */
window.addEventListener("DOMContentLoaded", () => {
    loadOrders();
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
   LOAD ORDERS
========================= */
async function loadOrders() {

    const ordersList = document.getElementById("ordersList");

    if (!ordersList) return;

    ordersList.innerHTML =
        `<p style="text-align:center">Loading orders...</p>`;

    try {

        const res = await fetch(
            `${API_BASE}/api/order/my-orders/`,
            {
                method: "GET",
                headers: getAuthHeaders()
            }
        );

        const response = await res.json();

        if (!response.status) {
            ordersList.innerHTML =
                `<p style="text-align:center">Failed to load orders</p>`;
            return;
        }

        const orders = response.data || [];

        if (!orders.length) {
            ordersList.innerHTML =
                `<p style="text-align:center">No orders yet 😢</p>`;
            return;
        }

        ordersList.innerHTML = "";

        orders.forEach(order => {

            let itemsHtml = "";

            order.items.forEach(item => {
                const variantText = item.variant && typeof item.variant === "object"
                    ? Object.values(item.variant).join(" / ")
                    : "";
            
                itemsHtml += `
                    <div class="order-item">
                        <div class="oi-img">
                            ${item.image ? `<img src="${item.image}" alt="${item.name}">` : "👜"}
                        </div>
                        <div class="oi-info">
                            <div class="oi-name">
                                ${item.name}
                                ${variantText ? `<span style="color:#888;font-size:12px"> (${variantText})</span>` : ""}
                            </div>
                            <div class="oi-meta">
                                Qty: ${item.qty}
                            </div>
                        </div>
                    </div>
                `;
            });

            ordersList.innerHTML += `

                <div class="order-card"
                     data-status="${order.status}">

                    <div class="order-top">

                        <div>

                            <div class="order-id">
                                Order #${order.order_id}
                            </div>

                            <div class="order-date">
                                Placed on:
                                ${new Date(order.date).toLocaleDateString()}
                            </div>

                        </div>

                        <div class="order-status ${order.status}">
                            ${getStatusLabel(order.status)}
                        </div>

                    </div>

                    <div class="order-items">
                        ${itemsHtml}
                    </div>

                    <div class="order-bottom">

                        <div class="order-total">
                            Total: ৳ ${order.total}
                        </div>

                        <button
                            class="btn-view"
                            onclick="viewOrder('${order.order_id}')">

                            View Details →

                        </button>

                    </div>

                </div>

            `;
        });

    } catch (err) {

        console.error(err);

        ordersList.innerHTML =
            `<p style="text-align:center">Failed to load orders</p>`;

        toast("Failed to load orders");
    }
}

/* =========================
   FILTER
========================= */
function filterOrders(status, btn) {

    document.querySelectorAll(".of-btn")
        .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");

    document.querySelectorAll(".order-card")
        .forEach(card => {

            if (
                status === "all" ||
                card.dataset.status === status
            ) {
                card.style.display = "block";
            } else {
                card.style.display = "none";
            }

        });
}

/* =========================
   VIEW ORDER
========================= */
function viewOrder(orderId) {
    window.location.href = `order.html?id=${orderId}`;
}

/* =========================
   STATUS
========================= */
function getStatusLabel(status) {
    const map = {
        new: "Pending",
        follow_up: "Follow Up",
        confirmed: "Confirmed",
        shipped: "Shipped",
        delivered: "Delivered",
        cancelled: "Cancelled",
        returned: "Returned",
        refunded: "Refunded"
    };

    return map[status] || status;
}

/* =========================
   TOAST
========================= */
function toast(msg) {

    const c = document.getElementById("toast-container");

    if (!c) {
        alert(msg);
        return;
    }

    const el = document.createElement("div");

    el.className = "toast";
    el.innerText = msg;

    c.appendChild(el);

    setTimeout(() => el.classList.add("show"), 50);

    setTimeout(() => {

        el.classList.remove("show");

        setTimeout(() => el.remove(), 300);

    }, 2200);
}