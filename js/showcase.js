let SHOWCASE_ITEMS = [];

async function loadShowcase() {
    const section = document.getElementById("showcaseSection");
    const row = document.getElementById("showcaseRow");
    if (!section || !row) return;

    try {
        const res = await fetch(`${API_BASE}/api/ecom/showcase-media/`);
        const data = await res.json();

        if (data.status && Array.isArray(data.data) && data.data.length > 0) {
            SHOWCASE_ITEMS = data.data;
            renderShowcase();
            section.style.display = "";
        } else {
            section.style.display = "none";
        }
    } catch (err) {
        console.error("SHOWCASE LOAD ERROR:", err);
        section.style.display = "none";
    }
}

function resolveShowcaseUrl(path) {
    if (!path) return "";
    return path.startsWith("http") ? path : API_BASE + path;
}

function showcaseEmbedUrl(item) {
    const url = item.video;
    if (!url) return null;

    if (item.video_platform === "youtube") {
        let videoId = "";
        try {
            const u = new URL(url);
            if (u.hostname.includes("youtu.be")) {
                videoId = u.pathname.slice(1);
            } else {
                videoId = u.searchParams.get("v") || "";
            }
        } catch (e) {}
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&controls=0&loop=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3` : null;
    }

    if (item.video_platform === "facebook") {
        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true&mute=true&width=476&height=846`;
    }

    if (item.video_platform === "instagram") {
        const clean = url.split("?")[0].replace(/\/$/, "");
        return `${clean}/embed`;
    }

    if (item.video_platform === "tiktok") {
        return null;
    }

    return null;
}

function renderShowcase() {
    const row = document.getElementById("showcaseRow");
    if (!row) return;

    row.innerHTML = SHOWCASE_ITEMS.map((item, i) => {
        const posterUrl = resolveShowcaseUrl(item.image);
        const isFileVideo = item.video_platform === "file" && item.video;
        const hasVideo = !!item.video;

        let mediaHTML = "";

        if (item.media_type === "image" || !hasVideo) {
            mediaHTML = posterUrl
                ? `<img src="${posterUrl}" alt="${item.title || ""}" loading="lazy">`
                : "";
        } else if (isFileVideo) {
            const videoSrc = resolveShowcaseUrl(item.video);
            mediaHTML = `
                ${posterUrl ? `<img src="${posterUrl}" alt="${item.title || ""}" class="showcase-poster">` : ""}
                <video muted loop playsinline preload="metadata"
                    src="${videoSrc}" poster="${posterUrl}"></video>
            `;
        } else {
            mediaHTML = posterUrl
                ? `<img src="${posterUrl}" alt="${item.title || ""}" loading="lazy">`
                : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:2rem;">▶</div>`;
        }

        return `
        <div class="showcase-card" data-index="${i}" data-video="${hasVideo}" data-platform="${item.video_platform || ""}">
            ${mediaHTML}
            <div class="showcase-overlay"></div>
            ${hasVideo ? '<div class="showcase-play">▶</div>' : ""}
            <div class="showcase-copy">
                <div class="showcase-copy-title">${item.title || ""}</div>
                ${item.subtitle ? `<div class="showcase-copy-sub">${item.subtitle}</div>` : ""}
            </div>
        </div>
        `;
    }).join("");

    attachShowcaseInteractions();
}

function attachShowcaseInteractions() {
    const cards = document.querySelectorAll(".showcase-card");

    cards.forEach(card => {
        const hasVideo = card.dataset.video === "true";
        if (!hasVideo) return;

        const index = parseInt(card.dataset.index, 10);
        const item = SHOWCASE_ITEMS[index];
        const videoEl = card.querySelector("video");

        const playThis = () => {
            if (videoEl) {
                videoEl.play().catch(() => {});
                card.classList.add("is-playing");
                return;
            }
            const embedUrl = showcaseEmbedUrl(item);
            if (embedUrl && !card.querySelector("iframe")) {
                const iframe = document.createElement("iframe");
                iframe.src = embedUrl;
                iframe.allow = "autoplay; encrypted-media";
                if (item.video_platform === "facebook") {
                    iframe.style.cssText = `
                        position:absolute; top:50%; left:50%;
                        width:476px; height:846px;
                        transform:translate(-50%, -50%) scale(1.35);
                        transform-origin:center center;
                        border:0; z-index:1;
                    `;
                } else {
                    iframe.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0;z-index:1;";
                }
                card.appendChild(iframe);
                card.classList.add("is-playing");
            } else if (!embedUrl && item.video) {
                window.open(item.video, "_blank");
            }
        };

        const stopThis = () => {
            if (videoEl) {
                videoEl.pause();
                videoEl.currentTime = 0;
                card.classList.remove("is-playing");
            }
        };

        card.addEventListener("mouseenter", playThis);
        card.addEventListener("mouseleave", stopThis);

        card.addEventListener("click", () => {
            if (window.matchMedia("(hover: hover)").matches) return;
            if (card.classList.contains("is-playing")) {
                if (item.video_platform !== "file" && item.video) {
                    window.open(item.video, "_blank");
                }
                return;
            }
            document.querySelectorAll(".showcase-card.is-playing").forEach(c => {
                const v = c.querySelector("video");
                if (v) { v.pause(); v.currentTime = 0; }
                c.classList.remove("is-playing");
            });
            playThis();
        });
    });
}

function showcaseScroll(direction) {
    const row = document.getElementById("showcaseRow");
    if (!row) return;
    const cardWidth = row.querySelector(".showcase-card")?.offsetWidth || 220;
    row.scrollBy({ left: direction * (cardWidth + 10) * 2, behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", loadShowcase);