// npmignore-check.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Read .npmignore from project root.
 * @returns {string} file contents
 */
function readNpmIgnore() {
    const file = path.resolve('.npmignore');
    return fs.readFileSync(file, 'utf8');
}

/**
 * Check if a line (pattern) exists in .npmignore
 * @param {string} content
 * @param {string} needle
 * @returns {boolean}
 */
function hasLine(content, needle) {
    const lines = content.split(/\r?\n/).map(l => l.trim());
    return lines.includes(needle);
}

test('critical leak sources are excluded in .npmignore', () => {
    const content = readNpmIgnore();

    // Direct token/otp files
    assert.ok(hasLine(content, 'loginCode.json'), 'loginCode.json should be ignored');
    assert.ok(hasLine(content, 'token.json'), 'token.json should be ignored');

    // Environment files
    assert.ok(hasLine(content, '.env'), '.env should be ignored');
    assert.ok(hasLine(content, '.env.*') || hasLine(content, '*.env'), 'env variants should be ignored');

    // Private keys
    assert.ok(hasLine(content, '*.pem'), '*.pem should be ignored');
});
