// verify-lib.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { loginFlow, saveReceipts } from './index.js';

test('src/index.js exports expected library functions', () => {
    assert.equal(typeof loginFlow, 'function', 'loginFlow should be a function');
    assert.equal(typeof saveReceipts, 'function', 'saveReceipts should be a function');
});
