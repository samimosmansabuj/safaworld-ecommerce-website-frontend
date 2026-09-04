/* =========================
   INIT
========================= */
window.addEventListener("DOMContentLoaded", () => {

    if (!isLoggedIn()) {

        window.location.href =
            "login.html";

        return;
    }

    loadProfile();
});

/* =========================
   LOAD PROFILE
========================= */
async function loadProfile() {

    try {

        const res = await fetch(
            `${API_BASE}/api/auth/profile/`,
            {
                method: "GET",

                headers: getAuthHeaders()
            }
        );

        const data =
            await res.json();

        console.log(
            "PROFILE:",
            data
        );

        if (
            !res.ok ||
            !data.status
        ) {

            toast(
                data.message ||
                "Failed to load profile"
            );

            return;
        }

        fillProfile(
            data.data || {}
        );

    } catch (err) {

        console.error(
            "PROFILE LOAD ERROR:",
            err
        );

        toast(
            "Failed to load profile"
        );
    }
}

/* =========================
   FILL UI
========================= */
function fillProfile(profile) {

    document.getElementById(
        "profileFullName"
    ).value =
        profile.name || "";

    document.getElementById(
        "profilePhone"
    ).value =
        profile.phone || "";

    document.getElementById(
        "profileWhatsapp"
    ).value =
        profile.whatsapp || "";

    document.getElementById(
        "profileEmail"
    ).value =
        profile.email || "";
}

/* =========================
   SAVE PROFILE
========================= */
async function saveProfile() {

    const name =
        document.getElementById(
            "profileFullName"
        ).value.trim();

    const phone =
        document.getElementById(
            "profilePhone"
        ).value.trim();

    const whatsapp =
        document.getElementById(
            "profileWhatsapp"
        ).value.trim();

    if (!name) {

        toast(
            "Enter full name"
        );

        return;
    }

    if (!phone) {

        toast(
            "Enter phone number"
        );

        return;
    }

    try {

        const res = await fetch(
            `${API_BASE}/api/auth/profile/`,
            {
                method: "PUT",

                headers: getAuthHeaders(),

                body: JSON.stringify({
                    name,
                    phone,
                    whatsapp
                })
            }
        );

        const data =
            await res.json();

        console.log(
            "PROFILE UPDATE:",
            data
        );

        if (
            res.ok &&
            data.status
        ) {

            toast(
                "Profile updated ✅"
            );

            loadProfile();

        } else {

            toast(
                data.message ||
                "Update failed"
            );
        }

    } catch (err) {

        console.error(
            "PROFILE UPDATE ERROR:",
            err
        );

        toast(
            "Failed to update profile"
        );
    }
}

/* =========================
   TOAST
========================= */
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

    el.className =
        "toast";

    el.innerText =
        msg;

    c.appendChild(el);

    setTimeout(() => {

        el.classList.add(
            "show"
        );

    }, 50);

    setTimeout(() => {

        el.classList.remove(
            "show"
        );

        setTimeout(() => {
            el.remove();
        }, 300);

    }, 2200);
}