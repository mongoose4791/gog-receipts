import test from 'node:test';
import assert from 'node:assert/strict';
import { saveReceipt } from './save-receipt.js';

test('saveReceipt throws when url is missing', async () => {
  await assert.rejects(() => saveReceipt({}), /Missing required option: url/);
});
