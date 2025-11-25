import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  extractLoginCode,
  storeLoginCode,
  getStoredLoginCode,
  getStoredToken,
  loginFlow,
} from './gog-login.js';

async function withTempConfigHome(fn) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gog-receipts-test-'));
  const prevXdg = process.env.XDG_CONFIG_HOME;
  // Use XDG_CONFIG_HOME only; project targets Linux-style config directories
  process.env.XDG_CONFIG_HOME = tmpRoot;
  try {
    return await fn(tmpRoot);
  } finally {
    // Restore and cleanup
    if (prevXdg === undefined) delete process.env.XDG_CONFIG_HOME; else process.env.XDG_CONFIG_HOME = prevXdg;
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {}
  }
}

test('extractLoginCode: accepts raw code', () => {
  const code = extractLoginCode('abc123');
  assert.equal(code, 'abc123');
});

test('extractLoginCode: extracts from URL query parameter', () => {
  const url = 'https://embed.gog.com/on_login_success?origin=client&code=CODE-XYZ';
  const code = extractLoginCode(url);
  assert.equal(code, 'CODE-XYZ');
});

test('extractLoginCode: throws for URL without code', () => {
  assert.throws(() => extractLoginCode('https://example.com/callback?foo=bar'));
});

test('storeLoginCode and getStoredLoginCode work via config dir', async () => await withTempConfigHome(async () => {
  const savedPath = await storeLoginCode('CODE-123');
  assert.ok(typeof savedPath === 'string' && savedPath.length > 0);
  assert.ok(fs.existsSync(savedPath));

  const data = getStoredLoginCode();
  assert.ok(data);
  assert.equal(data.loginCode, 'CODE-123');
  assert.ok(typeof data.createdAt === 'string');
}));

test('getStoredToken returns null when no token file', async () => await withTempConfigHome(async () => {
  const token = getStoredToken();
  assert.equal(token, null);
}));

test('loginFlow with provided code stores and returns token (no stdout assertions)', async () => await withTempConfigHome(async () => {
  // Stub global fetch to simulate the token exchange endpoint
  const prevFetch = globalThis.fetch;
  const fakeToken = { access_token: 'ACCESS', refresh_token: 'REFRESH', token_type: 'bearer' };
  globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => JSON.stringify(fakeToken) });
  try {
    const returned = await loginFlow('https://embed.gog.com/on_login_success?origin=client&code=LOGIN-CODE');
    assert.deepEqual(returned, fakeToken);

    // Ensure the token persisted in config; read via exported getter
    const stored = getStoredToken();
    assert.deepEqual(stored, fakeToken);
  } finally {
    globalThis.fetch = prevFetch;
  }
}));
