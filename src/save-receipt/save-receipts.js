import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import {waitForPageSettled, collectPreviewLinksAllPages, extractPurchaseDate} from './page-utils.js';
import {makeReceiptFilename} from './filename.js';

const ORDERS_URL = 'https://www.gog.com/en/account/settings/orders';

// Refactored: helpers moved to ./page-utils.js and ./filename.js

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
 * @param {boolean} [options.useToken=true] Whether to attach the provided token to requests.
 * @param {string|{access_token:string}} [options.token] An access token string or token payload returned by loginFlow.
 * @param {(evt: {type: 'navigating', url: string}
 *   | {type: 'page', current: number, total: number}
 *   | {type: 'found', count: number}
 *   | {type: 'processing', index: number, total: number, url: string}
 *   | {type: 'saved', index: number, total: number, url: string, path: string}
 *   | {type: 'done', saved: number})} [options.onProgress] Optional progress callback for live stdout updates from the caller.
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
                                       token,
                                       onProgress,
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

        // If requested, attach the provided token so authenticated pages can be accessed.
        if (useToken) {
            const bearer = typeof token === 'string' ? token : token?.access_token;
            if (bearer) {
                await page.setExtraHTTPHeaders({'Authorization': `Bearer ${bearer}`});
            }
        }

        onProgress?.({type: 'navigating', url: ORDERS_URL});
        await page.goto(ORDERS_URL, {waitUntil, timeout});

        // Wait until the page is fully settled before scraping/generating output.
        await waitForPageSettled(page, timeout);

        // Collect preview links by pattern across all paginated Orders pages if present.
        const absoluteUrls = await collectPreviewLinksAllPages(
            page,
            waitUntil,
            timeout,
            (info) => onProgress?.(info)
        );
        onProgress?.({type: 'found', count: absoluteUrls.length});

        // Ensure output directory exists.
        fs.mkdirSync(receiptsDir, {recursive: true});

        /** @type {string[]} */
        const saved = [];

        // Reuse the same page for authenticated context; navigate to each preview and save as PDF.
        for (let i = 0; i < absoluteUrls.length; i++) {
            const url = absoluteUrls[i];
            onProgress?.({type: 'processing', index: i, total: absoluteUrls.length, url});
            await page.goto(url, {waitUntil, timeout});
            await waitForPageSettled(page, timeout);

            // Extract the purchase date text from the preview page DOM.
            // On each page there is a span with the content "Date of purchase" and inside it a <b> element containing the date.
            const purchaseDate = await extractPurchaseDate(page);

            // Sanitize the date string for safe filenames and combine with token for uniqueness.
            const token = url.split('/').filter(Boolean).pop() || 'receipt';
            const baseName = makeReceiptFilename(token, purchaseDate);
            const filePath = path.join(receiptsDir, `${baseName}.pdf`);
            await page.pdf({path: filePath, format: 'A4', printBackground});
            saved.push(filePath);
            onProgress?.({type: 'saved', index: i, total: absoluteUrls.length, url, path: filePath});
        }

        onProgress?.({type: 'done', saved: saved.length});
        return saved;
    } finally {
        await browser.close();
    }
}

export default saveReceipts;
