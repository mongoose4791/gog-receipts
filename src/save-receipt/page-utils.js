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
    await page.waitForNetworkIdle({ idleTime: 1000, timeout });
  } catch {}

  await page.evaluate(async () => {
    try {
      // @ts-ignore document.fonts may not exist in all pages
      if (document.fonts && 'ready' in document.fonts) {
        // @ts-ignore
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
export async function collectPreviewLinks(page) {
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

/**
 * Collect preview links across all paginated Orders pages if pagination is present.
 * Pagination DOM contract:
 *  - Total pages: span.pagin__total (text content is a number)
 *  - Current page: input.pagin__input (value is the current page number)
 *  - Next page action: span.pagin__next (click to advance)
 * If no pagination is present, collects links from the current page only.
 *
 * @param {import('puppeteer').Page} page Puppeteer page instance already on the Orders URL.
 * @param {('load'|'domcontentloaded'|'networkidle0'|'networkidle2')} waitUntil Navigation waitUntil event.
 * @param {number} timeout Navigation timeout in ms.
 * @param {(info: {type: 'page', current: number, total: number})} [onPage] Optional callback invoked when page changes.
 * @returns {Promise<string[]>} Unique list of receipt preview links from all relevant pages.
 */
export async function collectPreviewLinksAllPages(page, waitUntil, timeout, onPage) {
  /** @type {Set<string>} */
  const all = new Set();

  // Helper to read pagination info from the DOM
  async function readPagination() {
    return page.evaluate(() => {
      const totalText = document.querySelector('span.pagin__total')?.textContent?.trim() || '';
      const total = parseInt(totalText.replace(/[^0-9]/g, ''), 10);
      const currentVal = /** @type {HTMLInputElement|null} */(document.querySelector('input.pagin__input'))?.value || '';
      const current = parseInt(currentVal.replace(/[^0-9]/g, ''), 10);
      return {
        total: Number.isFinite(total) ? total : NaN,
        current: Number.isFinite(current) ? current : NaN,
      };
    });
  }

  // First page
  await waitForPageSettled(page, timeout);
  for (const u of await collectPreviewLinks(page)) all.add(u);

  const { total, current } = await readPagination();
  const hasPagination = Number.isFinite(total) && total > 1;
  if (!hasPagination) {
    return Array.from(all);
  }

  let curr = Number.isFinite(current) ? current : 1;
  onPage?.({ type: 'page', current: curr, total });

  // Iterate until we reach total pages
  while (curr < total) {
    const nextHandle = await page.$('span.pagin__next');
    if (!nextHandle) break;

    // Click next and wait for the page number to increase or DOM to settle
    const prev = curr;
    await nextHandle.click({ delay: 10 }).catch(() => {});

    // Wait for either navigation or content update; best-effort
    try {
      // Some sites use full navigation, some update in place.
      await Promise.race([
        page.waitForNavigation({ waitUntil, timeout }),
        page.waitForFunction(
          (sel, expected) => {
            const el = document.querySelector(sel);
            if (!(el instanceof HTMLInputElement)) return false;
            const val = parseInt((el.value || '').replace(/[^0-9]/g, ''), 10);
            return Number.isFinite(val) && val > expected;
          },
          { timeout },
          'input.pagin__input', prev
        )
      ]).catch(() => {});
    } catch {}

    await waitForPageSettled(page, timeout);

    // Update current page value and collect links
    const info = await readPagination();
    curr = Number.isFinite(info.current) ? info.current : (prev + 1);
    onPage?.({ type: 'page', current: curr, total });
    for (const u of await collectPreviewLinks(page)) all.add(u);
  }

  return Array.from(all);
}

export default {
  waitForPageSettled,
  collectPreviewLinks,
  collectPreviewLinksAllPages,
  extractPurchaseDate,
};
