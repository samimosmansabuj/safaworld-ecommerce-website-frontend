/* =========================
   SITE CONTENT (dynamic, controlled from dashboard)
========================= */

async function loadSiteContent() {
    try {
        const yearEl = document.getElementById("footerYear");
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        const res = await fetch(`${API_BASE}/api/ecom/site-content/`);
        const json = await res.json();

        if (!json || !json.status) return;

        const data = json.data || {};

        renderNavMenu(data.nav_menu || []);
        renderFooterLinks(data.footer_links || []);
        renderSocialLinks(data.social_links || []);
        renderNewsFeed(data.news_feed || []);
        applySectionVisibility(data.sections || {});
        renderWhyChooseUs(data.why_choose_us || []);
        renderCustomSections(data.custom_sections || []);

    } catch (err) {
        console.warn("Failed to load site content:", err);
    }
}

function renderNavMenu(links) {
    const subnav = document.querySelector(".subnav-in");
    if (!subnav) return;

    links.forEach((link) => {
        const a = document.createElement("a");
        a.href = link.url || "#";
        a.textContent = link.name;
        if (link.open_new_tab) {
            a.target = "_blank";
            a.rel = "noopener";
        }
        subnav.appendChild(a);
    });
}

function renderFooterLinks(links) {
    const container = document.getElementById("footerLinksList");
    if (!container) return;

    if (!links.length) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = links
        .map((link, i) => {
            // const separator = i < links.length - 1 ? " | " : "";
            const separator = i < links.length - 1 ? `<span class="footer-policy-sep" aria-hidden="true">|</span>` : "";
            return `<a href="${link.url || '#'}">${escapeHtml(link.name)}</a>${separator}`;
        })
        .join("");
}

function renderSocialLinks(links) {
    const container = document.getElementById("footerSocialLinksList");
    if (!container) return;

    if (!links.length) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = links
        .map((link) => {
            const iconMarkup = link.icon
                ? (link.icon.startsWith("bi-")
                    ? `<i class="bi ${link.icon}"></i>`
                    : link.icon)
                : link.name;
            return `<a href="${link.url || '#'}" target="_blank" rel="noopener" title="${escapeHtml(link.name)}">${iconMarkup}</a>`;
        })
        .join("");
}

function renderNewsFeed(items) {
    if (!items.length) return;

    let ticker = document.getElementById("newsFeedTicker");
    if (!ticker) {
        ticker = document.createElement("div");
        ticker.id = "newsFeedTicker";
        ticker.className = "news-feed-ticker";
        document.body.insertBefore(ticker, document.body.firstChild);
    }

    const track = document.createElement("div");
    track.className = "news-feed-track";
    track.innerHTML = items
        .map((item) => {
            const text = escapeHtml(item.text);
            return item.url
                ? `<a href="${item.url}">${text}</a>`
                : `<span>${text}</span>`;
        })
        .join("<span class='news-feed-sep'>•</span>");

    ticker.innerHTML = "";
    ticker.appendChild(track);
}

function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function applySectionVisibility(sections) {
 
    const sectionElMap = {
        "hero_slider": document.getElementById("heroSliderSection"),
        "kidz_product": document.getElementById("kidzProductSection"),
        "filter_products_grid": document.getElementById("filterProductsSection"),
        "social_proof_banner": document.getElementById("socialProofSection"),
        "why_choose": document.getElementById("whyChooseSection"),
        "showcase": document.getElementById("showcaseSection"),
        "ecosystem": document.getElementById("ecoSection"),
    };

    Object.keys(sectionElMap).forEach((key) => {
        const el = sectionElMap[key];
        if (!el) return;
        const isActive = key in sections ? sections[key] : true;
        el.style.display = isActive ? "" : "none";
    });
}

function renderWhyChooseUs(cards) {
    const grid = document.getElementById("whyChooseGrid");
    if (!grid) return;

    if (!cards.length) {
        const section = document.getElementById("whyChooseSection");
        if (section) section.style.display = "none";
        return;
    }

    grid.innerHTML = cards
        .map((c) => `
            <div class="why-card">
                <div class="why-icon">${c.icon || ""}</div>
                <div class="why-name">${escapeHtml(c.title)}</div>
                <div class="why-desc">${escapeHtml(c.description)}</div>
            </div>
        `)
        .join("");
}


function renderCustomSections(customSections) {
    if (!customSections.length) return;


    const isHomePage = !!document.getElementById("whyChooseSection");
    if (!isHomePage) return;

    const page = document.querySelector(".page");
    if (!page) return;

    customSections.forEach((section) => {
        const wrapper = document.createElement("div");
        wrapper.className = "lp-section custom-home-section";
        wrapper.id = `customSection_${section.section_key}`;

        const imageHtml = section.image
            ? `<img src="${resolveSiteAssetUrl(section.image)}" alt="${escapeHtml(section.heading)}" class="custom-section-image">`
            : "";

        const buttonHtml = (section.button_text && section.button_url)
            ? `<a href="${section.button_url}" class="custom-section-btn">${escapeHtml(section.button_text)}</a>`
            : "";

        wrapper.innerHTML = `
            ${section.heading ? `<div class="lp-head"><div class="lp-title">${escapeHtml(section.heading)}</div></div>` : ""}
            <div class="lp-body custom-section-body">
                ${imageHtml}
                ${section.subheading ? `<div class="custom-section-subheading">${escapeHtml(section.subheading)}</div>` : ""}
                ${section.body_html ? `<div class="custom-section-text">${escapeHtml(section.body_html)}</div>` : ""}
                ${buttonHtml}
            </div>
        `;

        
        wrapper.style.marginTop = "24px";
        wrapper.style.marginBottom = "24px";

        page.appendChild(wrapper);
    });
}

function resolveSiteAssetUrl(path) {
    if (!path) return "";
    return path.startsWith("http") ? path : API_BASE + path;
}