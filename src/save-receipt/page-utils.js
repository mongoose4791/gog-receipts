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

export default {
    waitForPageSettled,
};
