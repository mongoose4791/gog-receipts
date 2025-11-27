/**
 * Fetch all GOG orders by traversing all available pages.
 * The underlying API returns objects with the shape: { orders: Array, totalPages: number }.
 *
 * @param {{ access_token?: string }} token
 * @returns {Promise<{orders: any[], totalPages: number}>} Combined orders and total page count
 */
export async function fetchOrders(token) {
    const API_ENDPOINT__ORDERS = 'https://www.gog.com/account/settings/orders/data?canceled=0&completed=1&in_progress=1&not_redeemed=1&pending=1&redeemed=1&page=1';
    const headers = {
        'Authorization': `Bearer ${token?.access_token}`,
    };

    /**
     * Build the orders URL for a specific page number.
     * @param {number} page
     * @returns {string}
     */
    function buildOrdersUrl(page) {
        const url = new URL(API_ENDPOINT__ORDERS);
        url.searchParams.set('page', String(page));
        return url.toString();
    }

    /**
     * Fetch a single page and return its parsed JSON response.
     * Always returns an object; fails if JSON cannot be parsed.
     * @param {number} page
     * @returns {Promise<any>}
     */
    async function fetchPage(page) {
        const url = buildOrdersUrl(page);
        // Minimal visibility into inner workings as requested
        try {
            console.log(`[fetchOrders] GET ${url}`);
        } catch {}
        const res = await fetch(url, {
            method: 'GET',
            headers,
        });

        if (!res?.ok) {
            throw new Error(`GOG API request failed (${res?.status ?? 'unknown'})`);
        }

        return await res.json();
    }

    // Fetch the first page to discover totalPages
    const firstPage = await fetchPage(1);
    
    const totalPages = Number(firstPage?.totalPages ?? 1) || 1;
    const orders = Array.isArray(firstPage?.orders) ? [...firstPage.orders] : [];
    try {
        console.log(`[fetchOrders] totalPages=${totalPages}, firstPageOrders=${orders.length}`);
    } catch {}

    // Fetch remaining pages sequentially to keep it simple and avoid excessive concurrency
    for (let pageNumber = 2; pageNumber <= totalPages; pageNumber++) {
        const page = await fetchPage(pageNumber);
        if (Array.isArray(page?.orders) && page.orders.length > 0) {
            orders.push(...page.orders);
            try {
                console.log(`[fetchOrders] page=${pageNumber} orders+=${page.orders.length} total=${orders.length}`);
            } catch {}
        }
    }

    try {
        console.log(`[fetchOrders] Done. orders=${orders.length}, totalPages=${totalPages}`);
    } catch {}
    return {orders, totalPages};
}