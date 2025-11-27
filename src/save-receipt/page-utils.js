/**
 * Utility helpers for working with Puppeteer pages in the receipts flow.
 *
 * ESM module. No side effects.
 */

/**
 * Wait until the page has settled enough that late async work and rendering are complete.
 * Combines network idle wait, font readiness, and a couple of RAF ticks.
 *
 * @param {import('puppeteer').Page} page Puppeteer page instance.
 * @param {number} timeout Timeout in milliseconds for network idle waiting.
 * @returns {Promise<void>} Resolves when the page is considered settled.
 */
export async function waitForPageSettled(page, timeout) {
    try {
        // @ts-ignore types accept options object in Puppeteer
        await page.waitForNetworkIdle({idleTime: 1000, timeout});
    } catch {
    }

    await page.evaluate(async () => {
        try {
            // @ts-ignore document.fonts may not exist in all pages
            if (document.fonts && 'ready' in document.fonts) {
                // @ts-ignore
                await document.fonts.ready;
            }
        } catch {
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
}

/**
 * Extract the purchase date text from the receipt preview page DOM.
 * On each page there is a span with the content "Date of purchase" and inside it a <b> element containing the date.
 *
 * @param {import('puppeteer').Page} page Puppeteer page instance.
 * @returns {Promise<string|null>} The raw purchase date string, or null if not found.
 */
export async function extractPurchaseDate(page) {
    /** @type {string|null} */
    const purchaseDate = await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('span'));
        for (const s of spans) {
            const text = (s.textContent || '').toLowerCase();
            if (text.includes('date of purchase')) {
                const b = s.querySelector('b');
                const dateText = b?.textContent?.trim();
                if (dateText) return dateText;
            }
        }
        return null;
    });
    return purchaseDate;
}

export default {
    waitForPageSettled,
    extractPurchaseDate,
};
