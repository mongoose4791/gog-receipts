import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import {waitForPageSettled} from './page-utils.js';
import {makeReceiptFilename} from './filename.js';
import {fetchOrders} from '../gog-api/fetch-orders.js';

// Refactored: helpers moved to ./page-utils.js and ./filename.js

/**
 * Save all GOG receipt preview pages as PDFs using Puppeteer.
 *
 * Discovery: Receipt preview URLs are sourced from the Orders API via fetchOrders().
 * Each order contains a receiptLink like "/de/email/preview/<token>". We use the link as-is
 * (locale preserved) and navigate to it when rendering the PDF. The function then renders
 * each preview page to PDF.
 *
 * Filenames: Each PDF filename derives the purchase date exclusively from the Orders API
 * (order.date seconds-based UNIX timestamp). The date is formatted as YYYY-MM-DD, sanitized
 * for filesystem safety and combined with the
 * preview token for uniqueness,
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
    const browser = await puppeteer.launch({
        headless,
        devtools: false,
        args: ['--no-sandbox', '--incognito', '--disable-web-security']
    });

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

        // Fetch orders via API and derive receipt preview URLs from the receiptLink field
        const data = await fetchOrders(typeof token === 'string' ? {access_token: token} : token);
        const orders = Array.isArray(data?.orders) ? data.orders : [];

        /** @type {string[]} */
        const absoluteUrls = [];
        /** @type {Map<string, number>} */
        const urlToDateSeconds = new Map();
        const seen = new Set();
        for (const o of orders) {
            const href = o?.receiptLink;
            if (typeof href !== 'string' || href.length === 0) {
                continue;
            }
            let u = null;
            try {
                u = new URL(href, 'https://www.gog.com').href;
            } catch {
                u = null;
            }
            if (u && !seen.has(u)) {
                seen.add(u);
                absoluteUrls.push(u);
                // Capture the order date (seconds-based timestamp) for this URL when available.
                if (o && typeof o.date === 'number' && Number.isFinite(o.date)) {
                    urlToDateSeconds.set(u, o.date);
                }
            }
        }

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

            // Determine purchase date from Orders API field `date` (seconds timestamp) only.
            let purchaseDate = null;
            const dateSec = urlToDateSeconds.get(url);
            if (typeof dateSec === 'number' && Number.isFinite(dateSec)) {
                try {
                    // Format to YYYY-MM-DD for stable filenames.
                    purchaseDate = new Date(dateSec * 1000).toISOString().slice(0, 10);
                } catch {
                    purchaseDate = null;
                }
            }

            // Sanitize the date string for safe filenames and combine with token for uniqueness.
            const previewToken = url.split('/').filter(Boolean).pop() || 'receipt';
            const baseName = makeReceiptFilename(previewToken, purchaseDate);
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
