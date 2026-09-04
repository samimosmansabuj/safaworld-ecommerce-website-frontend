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
    const kidzProductsGrid = document.getElementById("kidzProductsGrid");
    if (!kidzProductsGrid) return;
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

        let kidz_products = [];

        if (data?.results?.data) {
            kidz_products = data.results.data;
        }
        else if (data?.data) {
            kidz_products = data.data;
        }
        else if (Array.isArray(data)) {
            kidz_products = data;
        }

        if (!Array.isArray(kidz_products)) {
            throw new Error("Invalid API response");
        }

        kidzProductsGrid.innerHTML = "";
        if (!kidz_products.length) {
            kidzProductsGrid.innerHTML = `<p>No products found</p>`;
            return;
        }

        kidz_products.forEach(p => {
            if (p.category.name !== "Kidz") return;

            const slug = p.slug || makeSlug(p.name);
            let image = "";
            if (p.image) {
                image = p.image.startsWith("http") ? p.image : API_BASE + p.image;
            }

            const productName = p.name
                .split(' ').slice(0, 5).join(' ') + (p.name.split(' ').length > 5 ? '...' : '');

            const hasVariants = !!p.has_variants;

            kidzProductsGrid.innerHTML += `
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

        kidzProductsGrid.innerHTML = `
            <p style="color:red">
                Failed to load products
            </p>
        `;
    }
}

