import puppeteer from 'puppeteer';
import { getStoredToken } from './gog-login/gog-login.js';

/**
 * Saves the given URL as a PDF using Puppeteer.
 * @param {Object} options
 * @param {string} options.url - The URL to navigate to.
 * @param {string} [options.out="page.pdf"] - Output file path for the PDF.
 * @param {string} [options.format="A4"] - Paper format (e.g., A4, Letter).
 * @param {boolean} [options.printBackground=true] - Include CSS backgrounds.
 * @param {{width:number,height:number}} [options.viewport={width:1280,height:800}] - Viewport size.
 * @param {('load'|'domcontentloaded'|'networkidle0'|'networkidle2')} [options.waitUntil='networkidle0'] - Navigation waitUntil event.
 * @param {number} [options.timeout=60000] - Navigation timeout in ms.
 * @param {boolean|"new"} [options.headless='new'] - Puppeteer headless mode.
 * @param {boolean} [options.useToken=true] - Whether to attach the stored login token to requests.
 * @returns {Promise<string>} The output PDF path.
 */
export async function saveReceipt({
  url,
  out = 'page.pdf',
  format = 'A4',
  printBackground = true,
  viewport = { width: 1280, height: 800 },
  waitUntil = 'networkidle0',
  timeout = 60000,
  headless = 'new',
  useToken = true,
} = {}) {
  if (!url) throw new Error('Missing required option: url');

  const browser = await puppeteer.launch({ headless });
  try {
    const page = await browser.newPage();
    await page.setViewport(viewport);

    // If requested, try to attach the stored token so authenticated pages can be accessed.
    if (useToken) {
      const stored = getStoredToken();
      const bearer = stored?.access_token || stored?.code; // prefer proper access token, fallback to legacy stored code
      if (bearer) {
        await page.setExtraHTTPHeaders({ 'Authorization': `Bearer ${bearer}` });
      }
    }

    await page.goto(url, { waitUntil, timeout });
    await page.pdf({ path: out, format, printBackground });
    return out;
  } finally {
    await browser.close();
  }
}

export default saveReceipt;
