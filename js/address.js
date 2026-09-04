/* =========================
   CONFIG
========================= */
window.API_BASE;

/* =========================
   INIT
========================= */
window.addEventListener("DOMContentLoaded", () => {

    loadDistricts();

    loadAddresses();

    const btn =
        document.getElementById("addAddressBtn");

    if (btn) {
        btn.addEventListener("click", addAddress);
    }
});

/* =========================
   DISTRICTS API
========================= */
async function loadDistricts() {

    const select =
        document.getElementById("deliverydistrict");

    if (!select) return;

    try {

        select.innerHTML = `
            <option value="">
                Select District
            </option>
        `;

        const res = await fetch(
            "https://bdapi.vercel.app/api/v.1/district"
        );

        const data = await res.json();

        console.log("DISTRICTS:", data);

        if (
            data.status === 200 &&
            data.success &&
            Array.isArray(data.data)
        ) {

            data.data.forEach(district => {

                select.innerHTML += `
                    <option
                        value="${district.name}">
                        ${district.bn_name}
                    </option>
                `;
            });
        }

    } catch (err) {

        console.error(
            "District Load Error:",
            err
        );
    }
}

/* =========================
   LOAD ADDRESSES
========================= */
function loadAddresses() {

    const list =
        document.getElementById("addressList");

    if (!list) return;

    const addresses =
        JSON.parse(
            localStorage.getItem("pw_addresses")
        ) || [];

    const countEl =
        document.getElementById("addressCount");

    if (countEl) {

        countEl.textContent =
            `${addresses.length} Saved`;
    }

    list.innerHTML = "";

    if (!addresses.length) {

        list.innerHTML = `
            <div class="addr-card">
                No address added yet
            </div>
        `;

        return;
    }

    addresses.forEach((addr, index) => {

        list.innerHTML += `
            <div class="address-card">

                <div class="addr-name">
                    ${addr.name}
                </div>

                <div class="addr-phone">
                    ${addr.phone}
                </div>

                <div class="addr-district">
                    ${addr.district}
                </div>

                <div class="addr-text">
                    ${addr.address}
                </div>

                <div class="addr-actions">

                    <button
                        onclick="editAddress(${index})">

                        Edit

                    </button>

                    <button
                        onclick="deleteAddress(${index})">

                        Delete

                    </button>

                </div>

            </div>
        `;
    });
}

/* =========================
   ADD ADDRESS
========================= */
function addAddress() {

    const name =
        document.getElementById("addrName").value.trim();

    const phone =
        document.getElementById("addrPhone").value.trim();

    const district =
        document.getElementById("deliverydistrict").value;

    const address =
        document.getElementById("addrText").value.trim();

    if (!name) {
        toast("Enter full name");
        return;
    }

    if (!phone) {
        toast("Enter phone number");
        return;
    }

    if (!district) {
        toast("Select district");
        return;
    }

    if (!address) {
        toast("Enter address");
        return;
    }

    const addresses =
        JSON.parse(
            localStorage.getItem("pw_addresses")
        ) || [];

    addresses.push({
        name,
        phone,
        district,
        address
    });

    localStorage.setItem(
        "pw_addresses",
        JSON.stringify(addresses)
    );

    document.getElementById("addrName").value = "";
    document.getElementById("addrPhone").value = "";
    document.getElementById("deliverydistrict").value = "";
    document.getElementById("addrText").value = "";

    loadAddresses();

    toast("Address added ✅");
}

/* =========================
   EDIT ADDRESS
========================= */
function editAddress(index) {

    const addresses =
        JSON.parse(
            localStorage.getItem("pw_addresses")
        ) || [];

    const addr =
        addresses[index];

    if (!addr) return;

    document.getElementById("addrName").value =
        addr.name || "";

    document.getElementById("addrPhone").value =
        addr.phone || "";

    document.getElementById("deliverydistrict").value =
        addr.district || "";

    document.getElementById("addrText").value =
        addr.address || "";

    addresses.splice(index, 1);

    localStorage.setItem(
        "pw_addresses",
        JSON.stringify(addresses)
    );

    loadAddresses();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    toast("Address loaded for editing");
}

/* =========================
   DELETE ADDRESS
========================= */
function deleteAddress(index) {

    const addresses =
        JSON.parse(
            localStorage.getItem("pw_addresses")
        ) || [];

    addresses.splice(index, 1);

    localStorage.setItem(
        "pw_addresses",
        JSON.stringify(addresses)
    );

    loadAddresses();

    toast("Address removed");
}

/* =========================
   TOAST
========================= */
function toast(msg) {

    const c =
        document.getElementById(
            "toast-container"
        );

    if (!c) return;

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

    }, 2200);
}