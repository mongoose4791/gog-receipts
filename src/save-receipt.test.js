import test from 'node:test';
import assert from 'node:assert/strict';
import { saveReceipts } from './save-receipt/save-receipts.js';

// The CLI and library no longer accept a "url" or "format" argument.
// Avoid launching Puppeteer in unit tests; just verify the function is defined.
test('saveReceipts function is exported', () => {
  assert.equal(typeof saveReceipts, 'function');
});
