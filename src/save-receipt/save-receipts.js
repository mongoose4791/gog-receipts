import fs from 'node:fs';
import path from 'node:path';
import {makeReceiptFilename} from './filename.js';
import {fetchOrders} from '../gog-api/fetch-orders.js';
import {launchAndPreparePage, waitForPageSettled} from '../puppeteer/puppeteer.js';

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
    const {browser, page} = await launchAndPreparePage({headless, viewport, token, useToken});

    try {
        // page already prepared by launchAndPreparePage

        // Fetch orders via API and parse + download in a single pass
        const data = await fetchOrders(typeof token === 'string' ? {access_token: token} : token);
        const orders = Array.isArray(data?.orders) ? data.orders : [];

        // Report discovery count as the number of orders to process.
        // Note: some orders might lack a receiptLink or be duplicates; processing will skip those.
        onProgress?.({type: 'found', count: orders.length});

        // Ensure output directory exists.
        fs.mkdirSync(receiptsDir, {recursive: true});

        /** @type {string[]} */
        const saved = [];
        const seen = new Set();

        // Reuse the same page for authenticated context; navigate to each preview and save as PDF.
        // Parse orders and download receipts in the same loop as required.
        let processedIndex = 0;
        for (const o of orders) {
            const href = o?.receiptLink;
            if (typeof href !== 'string' || href.length === 0) {
                continue;
            }

            let url = null;
            try {
                url = new URL(href, 'https://www.gog.com').href;
            } catch {
                url = null;
            }
            if (!url || seen.has(url)) {
                continue;
            }
            seen.add(url);

            onProgress?.({type: 'processing', index: processedIndex, total: orders.length, url});
            await page.goto(url, {waitUntil, timeout});
            await waitForPageSettled(page, timeout);

            // Determine purchase date from Orders API field `date` (seconds timestamp) only.
            let purchaseDate = null;
            const dateSec = o && typeof o.date === 'number' ? o.date : null;
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
            onProgress?.({type: 'saved', index: processedIndex, total: orders.length, url, path: filePath});
            processedIndex++;
        }

        onProgress?.({type: 'done', saved: saved.length});
        return saved;
    } finally {
        await browser.close();
    }
}

export default saveReceipts;
