function showOtpVerifyModal(options) {

    const {
        phone,
        message,
        apiBase,
        orderEndpoint,
        orderPayload,
        onSuccess
    } = options;

    document.getElementById("otpVerifyOverlay")?.remove();

    const overlay = document.createElement("div");
    overlay.id = "otpVerifyOverlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.6)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "999999";
    overlay.style.padding = "16px";

    const card = document.createElement("div");
    card.style.textAlign = "center";
    card.style.padding = "30px 22px";
    card.style.background = "#fff";
    card.style.borderRadius = "22px";
    card.style.boxShadow = "0 15px 40px rgba(0,0,0,0.15)";
    card.style.maxWidth = "380px";
    card.style.width = "100%";

    card.innerHTML = `
        <div style="font-size:44px;">⚠️</div>

        <h2 style="margin:8px 0;">নাম্বার ভেরিফিকেশন প্রয়োজন</h2>

        <p style="color:#555;font-size:14px;line-height:1.5;">
            ${message || "আপনার একাউন্ট ব্লক করা আছে। অর্ডার করতে হলে আগে OTP ভেরিফাই করুন।"}
        </p>

        <div style="background:#f5f5f5;border-radius:10px;padding:12px;font-weight:700;font-size:16px;color:#333;margin:14px 0 12px;">
            ${phone}
        </div>

        <button id="otpSendBtn" style="width:100%;padding:11px;border:none;border-radius:10px;background:#1c2b39;color:#fff;font-weight:600;cursor:pointer;margin-bottom:12px;">
            OTP পাঠান
        </button>

        <input type="text" id="otpCodeInput" placeholder="৬ ডিজিটের OTP লিখুন" maxlength="6" inputmode="numeric"
            style="width:100%;box-sizing:border-box;padding:11px;border:1px solid #ddd;border-radius:10px;font-size:16px;text-align:center;letter-spacing:4px;display:none;margin-bottom:8px;">

        <div id="otpMsg" style="font-size:12.5px;min-height:16px;margin-bottom:10px;"></div>

        <button id="otpVerifyBtn" style="width:100%;padding:11px;border:none;border-radius:10px;background:#16a34a;color:#fff;font-weight:600;cursor:pointer;display:none;margin-bottom:10px;">
            ভেরিফাই করে অর্ডার করুন
        </button>

        <button id="otpCancelBtn" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px;background:#fff;color:#555;cursor:pointer;">
            বাতিল করুন
        </button>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    document.getElementById("otpCancelBtn").addEventListener("click", () => {
        overlay.remove();
        const placeBtn = document.getElementById("placeOrderBtn");
        if (placeBtn) {
            placeBtn.textContent = "Place Order";
            placeBtn.disabled = false;
        }
    });

    document.getElementById("otpSendBtn").addEventListener("click", async function () {
        const sendBtn = this;
        const msgEl = document.getElementById("otpMsg");
        const codeInput = document.getElementById("otpCodeInput");
        const verifyBtn = document.getElementById("otpVerifyBtn");

        sendBtn.disabled = true;
        sendBtn.innerText = "পাঠানো হচ্ছে...";

        try {
            const res = await fetch(`${apiBase}/api/send-otp/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone })
            });
            const data = await res.json();

            if (data.success) {
                msgEl.textContent = "OTP পাঠানো হয়েছে, আপনার ফোন চেক করুন।";
                msgEl.style.color = "#16a34a";
                codeInput.style.display = "block";
                verifyBtn.style.display = "block";
                sendBtn.innerText = "আবার পাঠান";
                sendBtn.disabled = false;
            } else {
                msgEl.textContent = data.message || "OTP পাঠাতে সমস্যা হয়েছে।";
                msgEl.style.color = "#dc2626";
                sendBtn.innerText = "OTP পাঠান";
                sendBtn.disabled = false;
            }
        } catch (err) {
            msgEl.textContent = "সমস্যা হয়েছে, আবার চেষ্টা করুন।";
            msgEl.style.color = "#dc2626";
            sendBtn.innerText = "OTP পাঠান";
            sendBtn.disabled = false;
        }
    });

    document.getElementById("otpVerifyBtn").addEventListener("click", async function () {
        const verifyBtn = this;
        const msgEl = document.getElementById("otpMsg");
        const codeInput = document.getElementById("otpCodeInput");
        const code = codeInput.value.trim();

        if (!code || code.length < 4) {
            msgEl.textContent = "OTP লিখুন।";
            msgEl.style.color = "#dc2626";
            return;
        }

        verifyBtn.disabled = true;
        verifyBtn.innerText = "ভেরিফাই করা হচ্ছে...";

        const retryBody = { ...orderPayload, otp_code: code };
        console.log("OTP RETRY BODY:", retryBody); 

        try {
            const res = await fetch(`${apiBase}${orderEndpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify(retryBody)
            });
            const data = await res.json();

            const ok = data.success !== undefined ? data.success : data.status;

            if (ok) {
                overlay.remove();
                if (typeof onSuccess === "function") {
                    onSuccess(data);
                }
            } else {
                msgEl.textContent = data.message || "OTP সঠিক নয় বা মেয়াদ শেষ হয়ে গেছে।";
                msgEl.style.color = "#dc2626";
                verifyBtn.disabled = false;
                verifyBtn.innerText = "ভেরিফাই করে অর্ডার করুন";
            }
        } catch (err) {
            msgEl.textContent = "সমস্যা হয়েছে, আবার চেষ্টা করুন।";
            msgEl.style.color = "#dc2626";
            verifyBtn.disabled = false;
            verifyBtn.innerText = "ভেরিফাই করে অর্ডার করুন";
        }
    });
}