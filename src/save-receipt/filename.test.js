import test from 'node:test';
import assert from 'node:assert/strict';

import {sanitizeForFilename, makeReceiptFilename} from './filename.js';

test('sanitizeForFilename removes unsafe chars and collapses dashes', () => {
    const input = ' 2024/11/05  –  Order #1234: Game Name! ';
    const out = sanitizeForFilename(input);
    assert.equal(out, '2024-11-05-Order-1234-Game-Name');
});

test('sanitizeForFilename trims leading/trailing separators', () => {
    const out = sanitizeForFilename('---Hello__World---');
    assert.equal(out, 'Hello-World');
});

test('makeReceiptFilename uses token only when date missing', () => {
    const name = makeReceiptFilename('abcdef', null);
    assert.equal(name, 'abcdef');
});

test('makeReceiptFilename prefixes sanitized date when provided', () => {
    const name = makeReceiptFilename('abcdef', '2025/01/31');
    assert.equal(name, '2025-01-31 Order abcdef');
});
