import puppeteer from 'puppeteer';

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
  headless = 'new'
} = {}) {
  if (!url) throw new Error('Missing required option: url');

  const browser = await puppeteer.launch({ headless });
  try {
    const page = await browser.newPage();
    await page.setViewport(viewport);
    await page.goto(url, { waitUntil, timeout });
    await page.pdf({ path: out, format, printBackground });
    return out;
  } finally {
    await browser.close();
  }
}

export default saveReceipt;
