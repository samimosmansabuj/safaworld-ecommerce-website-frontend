/* =========================
   PRODUCT LIST PAGE
========================= */

/**
 * fetchAllProducts — backend এ pagination আছে (১২ per page),
 * তাই সব pages ধরে ধরে fetch করে পুরো product list বানায়।
 */

async function fetchAllProducts(baseApiUrl) {
    let allProducts = [];
    let nextUrl = baseApiUrl;
    while (nextUrl) {
        const res = await fetch(nextUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        /* ── product array বের করা ── */
        let pageProducts = [];

        if (data?.results?.data && Array.isArray(data.results.data)) {
            pageProducts = data.results.data;
        } else if (data?.data && Array.isArray(data.data)) {
            pageProducts = data.data;
        } else if (Array.isArray(data?.results)) {
            pageProducts = data.results;
        } else if (Array.isArray(data)) {
            pageProducts = data;
        }

        if (pageProducts.length > 0) {
            allProducts = allProducts.concat(pageProducts);
        }

        /* ── পরের পেজের URL (DRF standard: data.next) ── */
        const possibleNext =
            data?.next ||           // DRF top-level
            data?.results?.next ||  // nested results
            null;

        /* একই URL বা null হলে loop break */
        if (!possibleNext || possibleNext === nextUrl) break;

        nextUrl = possibleNext;
    }
    return allProducts;
}

async function loadProducts() {
    const grid  = document.getElementById("productsGrid");
    const total = document.getElementById("totalProducts");

    if (!grid) return;

    try {
        const params = new URLSearchParams(window.location.search);

        const search   = params.get("search");
        const category = params.get("category");
        const sort     = params.get("sort");

        /* page_size=12 — backend এর সাথে sync, frontend ও ১২ per page */
        const queryParams = new URLSearchParams();
        queryParams.append("page_size", "12");

        if (search)   queryParams.append("search", search);
        if (category) queryParams.append("category", category);
        if (sort){
            queryParams.append("sort", sort);
        } else {
            queryParams.append("sort", "last_update");
        }
        
        const apiUrl = `${API_BASE}/api/ecom/products/?${queryParams.toString()}`;

        const products = await fetchAllProducts(apiUrl);

        if (!Array.isArray(products)) {
            throw new Error("Invalid API response");
        }

        ALL_PRODUCTS     = products;
        filteredProducts = [...products];

        /* DYNAMIC CATEGORY LOAD */
        loadCategories(products);

        /* NEWEST FIRST DEFAULT */
        // filteredProducts.sort((a, b) => (b.id || 0) - (a.id || 0));

        goPage(1);

        if (total) {
            total.textContent = `${products.length} Products`;
        }

        if (typeof window.hideLoader === "function") window.hideLoader();

    } catch (err) {

        console.error("LOAD PRODUCTS ERROR:", err);

        grid.innerHTML = `
            <p style="color:red">
                Failed to load products
            </p>
        `;

        if (typeof window.hideLoader === "function") window.hideLoader();
    }
}

async function featureSectionAdd() {
    const DropSholderProductsGrid = document.getElementById("DropSholderProductsGrid");
    if (!DropSholderProductsGrid) return;

    try {
        const params   = new URLSearchParams(window.location.search);
        const search   = params.get("search");
        const category = params.get("category");
        const sort     = params.get("sort");

        const queryParams = new URLSearchParams();
        queryParams.append("page_size", "12");

        if (search)   queryParams.append("search", search);
        if (category) queryParams.append("category", category);
        if (sort){
            queryParams.append("sort", sort);
        } else {
            queryParams.append("sort", "last_update");
        }

        const apiUrl = `${API_BASE}/api/ecom/products/?${queryParams.toString()}`;

        /* সব pages fetch করি */
        const DropSholder_products = await fetchAllProducts(apiUrl);

        if (!Array.isArray(DropSholder_products)) {
            throw new Error("Invalid API response");
        }

        DropSholderProductsGrid.innerHTML = "";
        if (!DropSholder_products.length) {
            DropSholderProductsGrid.innerHTML = `<p>No products found</p>`;
            return;
        }

        DropSholder_products.forEach(p => {
            if (p.category.id !== 6) return;
            DropSholderProductsGrid.innerHTML += listProductCard(p);
        });

    } catch (err) {
        console.error("LOAD PRODUCTS ERROR:", err);

        DropSholderProductsGrid.innerHTML = `
            <p style="color:red">
                Failed to load products
            </p>
        `;
    }
}


function listProductCard(product) {
    const slug = product.slug || makeSlug(product.name);
    let image = "";

    if (product.image && product.image.length > 0) {
        image = product.image.startsWith("http") ? product.image : API_BASE + product.image;
    }

    const productName = product.name
        .split(' ').slice(0, 5).join(' ') + (product.name.split(' ').length > 5 ? '...' : '');

    const hasVariants = !!product.has_variants;

    return `
    <div class="prod-card">
        <div class="prod-img" onclick="openProduct('${slug}')">
            <img src="${image}" alt="${productName}">
        </div>
        <div class="prod-name" onclick="openProduct('${slug}')">${productName}</div>
        <div class="prod-price">৳ ${product.discount_price || product.price} <span class="price-orig">৳ ${product.price}</span></div>
        <button class="prod-cart" onclick="handleListCartClick(${product.id}, '${slug}', ${hasVariants})">+ Cart</button>
    </div>
    `
}