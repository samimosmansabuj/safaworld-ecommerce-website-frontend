/* =========================
   PRODUCT LIST PAGE
========================= */
async function loadProducts() {
    const grid = document.getElementById("productsGrid");
    const total = document.getElementById("totalProducts");

    if (!grid) return;

    try {
        const params = new URLSearchParams(window.location.search);

        const search = params.get("search");
        const category = params.get("category");
        const sort = params.get("sort");

        let apiUrl = `${API_BASE}/api/ecom/products/`;

        const queryParams = new URLSearchParams();

        if (search) queryParams.append("search", search);
        if (category) queryParams.append("category", category);
        if (sort) queryParams.append("sort", sort);

        if (queryParams.toString()) {
            apiUrl += `?${queryParams.toString()}`;
        }

        const res = await fetch(apiUrl);

        const data = await res.json();

        let products = [];

        if (data?.results?.data) {
            products = data.results.data;
        }
        else if (data?.data) {
            products = data.data;
        }
        else if (Array.isArray(data)) {
            products = data;
        }

        if (!Array.isArray(products)) {
            throw new Error("Invalid API response");
        }

        ALL_PRODUCTS = products;
        filteredProducts = [...products];

        /* DYNAMIC CATEGORY LOAD */
        loadCategories(products);

        /* NEWEST FIRST DEFAULT */
        filteredProducts.sort((a, b) => {
            return (b.id || 0) - (a.id || 0);
        });

        goPage(1);

        if (total) {
            total.textContent =
                `${products.length} Products`;
        }

        if (typeof window.hideLoader === "function") window.hideLoader();

    } catch (err) {

        console.error(
            "LOAD PRODUCTS ERROR:",
            err
        );

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
        const params = new URLSearchParams(window.location.search);
        const search = params.get("search");
        const category = params.get("category");
        const sort = params.get("sort");

        let apiUrl = `${API_BASE}/api/ecom/products/`;

        const queryParams = new URLSearchParams();

        if (search) queryParams.append("search", search);
        if (category) queryParams.append("category", category);
        if (sort) queryParams.append("sort", sort);

        if (queryParams.toString()) {
            apiUrl += `?${queryParams.toString()}`;
        }

        const res = await fetch(apiUrl);

        const data = await res.json();

        let DropSholder_products = [];

        if (data?.results?.data) {
            DropSholder_products = data.results.data;
        }
        else if (data?.data) {
            DropSholder_products = data.data;
        }
        else if (Array.isArray(data)) {
            DropSholder_products = data;
        }

        if (!Array.isArray(DropSholder_products)) {
            throw new Error("Invalid API response");
        }

        DropSholderProductsGrid.innerHTML = "";
        if (!DropSholder_products.length) {
            DropSholderProductsGrid.innerHTML = `<p>No products found</p>`;
            return;
        }

        DropSholder_products.forEach(p => {
            if (p.category.name !== "Drop-Sholder") return;

            const slug = p.slug || makeSlug(p.name);
            let image = "";
            if (p.image) {
                image = p.image.startsWith("http") ? p.image : API_BASE + p.image;
            }

            const productName = p.name
                .split(' ').slice(0, 5).join(' ') + (p.name.split(' ').length > 5 ? '...' : '');

            const hasVariants = !!p.has_variants;

            DropSholderProductsGrid.innerHTML += `
            <div class="prod-card">

                <div class="prod-img" onclick="openProduct('${slug}')">
                    <img src="${image}" alt="${productName}">
                </div>

                <div class="prod-name" onclick="openProduct('${slug}')">
                    ${productName}
                </div>

                <div class="prod-price">
                    ৳ ${p.discount_price || p.price}
                </div>

                <button
                    class="prod-cart"
                    onclick="handleListCartClick(${p.id}, '${slug}', ${hasVariants})">
                    + Cart
                </button>

            </div>
            `;
        });


    } catch (err) {
        console.error(
            "LOAD PRODUCTS ERROR:",
            err
        );

        DropSholderProductsGrid.innerHTML = `
            <p style="color:red">
                Failed to load products
            </p>
        `;
    }
}

