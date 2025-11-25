/**
 * Filename utilities for receipt PDFs.
 */

/**
 * Sanitize an arbitrary string into a filesystem-safe slug using dashes.
 *
 * @param {string} input Source string.
 * @returns {string} Sanitized string suitable for filenames.
 */
export function sanitizeForFilename(input) {
  return input
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

/**
 * Build a receipt PDF filename (without extension) from token and optional purchase date.
 * When a date is provided, follow the current scheme: "<safeDate> Order <token>".
 * Otherwise, just the token is used.
 *
 * @param {string} token Unique token from the preview URL.
 * @param {string|null|undefined} purchaseDate Raw purchase date string.
 * @returns {string} Base filename without extension.
 */
export function makeReceiptFilename(token, purchaseDate) {
  const safeDate = purchaseDate ? sanitizeForFilename(purchaseDate) : '';
  return safeDate ? `${safeDate} Order ${token}` : token;
}

export default {
  sanitizeForFilename,
  makeReceiptFilename,
};
