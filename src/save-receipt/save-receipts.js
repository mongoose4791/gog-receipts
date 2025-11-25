import puppeteer from 'puppeteer';
import {getStoredToken} from '../gog-login/gog-login.js';
// const ORDERS_URL = 'https://www.gog.com/en/account/settings/orders';
// const ORDERS_URL = 'https://www.gog.com/library/windows';
// const ORDERS_URL = 'https://www.whatismybrowser.com/';
const ORDERS_URL = 'https://www.gog.com/en/account';

/**
 * Save the authenticated GOG Orders page as a PDF using Puppeteer.
 *
 * Note: The destination URL is fixed to the Orders page; this function no longer accepts a url parameter.
 *
 * @param {Object} [options] Options for rendering and navigation.
 * @param {string} [options.out="page.pdf"] Output file path for the PDF.
 * @param {boolean} [options.printBackground=true] Include CSS backgrounds.
 * @param {{width:number,height:number}} [options.viewport={width:1280,height:800}] Viewport size.
 * @param {('load'|'domcontentloaded'|'networkidle0'|'networkidle2')} [options.waitUntil='networkidle0'] Navigation waitUntil event.
 * @param {number} [options.timeout=60000] Navigation timeout in ms.
 * @param {boolean} [options.headless=true] Puppeteer headless mode.
 * @param {boolean} [options.useToken=true] Whether to attach the stored login token to requests.
 * @returns {Promise<string>} The output PDF path.
 */
export async function saveReceipts({
   out = 'page.pdf',
   printBackground = true,
   viewport = {width: 1280, height: 800},
   waitUntil = 'networkidle0',
   timeout = 60000,
   headless = true,
   useToken = true,
} = {}) {

    const browser = await puppeteer.launch({headless: false, product: 'firefox'});
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
        await new Promise(r => setTimeout(r, 5000));

        await page.screenshot({type: 'png', path: "test.png", fullPage: true });

        // await page.pdf({path: out, format: 'A4', printBackground});
        return out;
    } finally {
        await browser.close();
    }
}

export default saveReceipts;
