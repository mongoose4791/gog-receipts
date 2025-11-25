import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import {getStoredToken} from '../gog-login/gog-login.js';
const ORDERS_URL = 'https://www.gog.com/en/account/settings/orders';

/**
 * Wait until the page has settled enough that late async work and rendering are complete.
 * Combines network idle wait, font readiness, and a couple of RAF ticks.
 *
 * @param {import('puppeteer').Page} page Puppeteer page instance.
 * @param {number} timeout Timeout in milliseconds for network idle waiting.
 * @returns {Promise<void>} Resolves when the page is considered settled.
 */
async function waitForPageSettled(page, timeout) {
    try {
        await page.waitForNetworkIdle({idleTime: 1000, timeout});
    } catch {}

    await page.evaluate(async () => {
        try {
            if (document.fonts && 'ready' in document.fonts) {
                await document.fonts.ready;
            }
        } catch {}
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
}

/**
 * Collect absolute URLs for GOG email preview links directly from the DOM.
 * Does not rely on CSS classes; uses a strict URL pattern filter instead.
 * Pattern: https://www.gog.com/en/email/preview/<hex>
 *
 * @param {import('puppeteer').Page} page Puppeteer page instance.
 * @returns {Promise<string[]>} List of unique, absolute URLs that match the pattern.
 */
async function collectPreviewLinks(page) {
    return page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        const base = 'https://www.gog.com';
        const pattern = /^https:\/\/www\.gog\.com\/en\/email\/preview\/[0-9a-fA-F]+$/;
        const out = new Set();
        for (const a of anchors) {
            const h = a.getAttribute('href');
            if (!h) continue;
            let abs;
            try {
                abs = new URL(h, base).href;
            } catch {
                continue;
            }
            if (pattern.test(abs)) {
                out.add(abs);
            }
        }
        return Array.from(out);
    });
}

/**
 * Save all GOG receipt preview pages as PDFs using Puppeteer.
 *
 * Note: The destination URL for discovery is fixed to the Orders page; this function
 * navigates there to discover all preview links and then renders each preview page to PDF.
 *
 * Filenames: Each PDF filename prefers the purchase date found on the receipt page
 * (span containing the text "Date of purchase" with a nested <b> date). The date is
 * sanitized for filesystem safety and combined with the preview token for uniqueness,
 * e.g., "2024-11-05-Order-1234-abcdef.pdf". If no date is found, the token alone is used.
 *
 * @param {Object} [options] Options for rendering and navigation.
 * @param {string} [options.receiptsDir="receipts"] Output directory where PDFs will be stored. Created if missing.
 * @param {boolean} [options.printBackground=true] Include CSS backgrounds.
 * @param {{width:number,height:number}} [options.viewport={width:1280,height:800}] Viewport size.
 * @param {('load'|'domcontentloaded'|'networkidle0'|'networkidle2')} [options.waitUntil='networkidle0'] Navigation waitUntil event.
 * @param {number} [options.timeout=60000] Navigation timeout in ms.
 * @param {boolean} [options.headless=true] Puppeteer headless mode.
 * @param {boolean} [options.useToken=true] Whether to attach the stored login token to requests.
 * @returns {Promise<string[]>} The list of saved PDF paths.
 */
export async function saveReceipts({
   receiptsDir = 'receipts',
   printBackground = true,
   viewport = {width: 1280, height: 800},
   waitUntil = 'networkidle0',
   timeout = 60000,
   headless = true,
   useToken = true,
} = {}) {

    // const browser = await puppeteer.launch({headless: false, product: 'firefox'});
    const browser = await puppeteer.launch({
        // product: 'firefox',
        headless,
        devtools: false,
        args: ['--no-sandbox', '--incognito', '--disable-web-security']
    })

    try {
        const page = await browser.newPage();
        await page.setViewport(viewport);

        // If requested, try to attach the stored token so authenticated pages can be accessed.
        if (useToken) {
            const stored = getStoredToken();
            const bearer = stored?.access_token;
            if (bearer) {
                await page.setExtraHTTPHeaders({'Authorization': `Bearer ${bearer}`});
            }
        }

        await page.goto(ORDERS_URL, {waitUntil, timeout});

        // Wait until the page is fully settled before scraping/generating output.
        await waitForPageSettled(page, timeout);

        // Collect preview links by pattern.
        const absoluteUrls = await collectPreviewLinks(page);

        // Ensure output directory exists.
        fs.mkdirSync(receiptsDir, {recursive: true});

        /** @type {string[]} */
        const saved = [];

        // Reuse the same page for authenticated context; navigate to each preview and save as PDF.
        for (const url of absoluteUrls) {
            await page.goto(url, {waitUntil, timeout});
            await waitForPageSettled(page, timeout);

            // Extract the purchase date text from the preview page DOM.
            // On each page there is a span with the content "Date of purchase" and inside it a <b> element containing the date.
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

            // Sanitize the date string for safe filenames and combine with token for uniqueness.
            const token = url.split('/').filter(Boolean).pop() || 'receipt';
            const safeDate = purchaseDate
                ? purchaseDate.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-')
                : '';
            const baseName = safeDate ? `${safeDate} Order ${token}` : token;
            const filePath = path.join(receiptsDir, `${baseName}.pdf`);
            await page.pdf({path: filePath, format: 'A4', printBackground});
            saved.push(filePath);
        }

        return saved;
    } finally {
        await browser.close();
    }
}

export default saveReceipts;
