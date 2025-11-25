import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  storeLoginCode,
  getStoredLoginCode,
  getStoredToken,
  storeToken,
  _internal,
} from './storage.js';

async function withTempConfigHome(fn) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gog-receipts-test-storage-'));
  const prev = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = tmpRoot;
  try {
    return await fn(tmpRoot);
  } finally {
    if (prev === undefined) delete process.env.XDG_CONFIG_HOME; else process.env.XDG_CONFIG_HOME = prev;
    try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
  }
}

test('defaultConfigPath uses XDG_CONFIG_HOME and appends gog-receipts', async () => withTempConfigHome(async (tmpRoot) => {
  const p = _internal.defaultConfigPath('file.json');
  assert.ok(p.startsWith(tmpRoot));
  assert.ok(p.includes(path.join('gog-receipts', 'file.json')));
}));

test('storeLoginCode persists JSON and getStoredLoginCode reads it back', async () => withTempConfigHome(async () => {
  const file = await storeLoginCode('CODE-1');
  assert.ok(fs.existsSync(file));
  const data = getStoredLoginCode();
  assert.ok(data);
  assert.equal(data.loginCode, 'CODE-1');
  assert.ok(typeof data.createdAt === 'string');
}));

test('getStoredLoginCode returns null for missing or invalid file', async () => withTempConfigHome(async (tmpRoot) => {
  // Missing case
  assert.equal(getStoredLoginCode(), null);
  // Invalid JSON
  const badPath = _internal.defaultConfigPath('loginCode.json');
  fs.mkdirSync(path.dirname(badPath), { recursive: true });
  fs.writeFileSync(badPath, '{not-json', 'utf8');
  assert.equal(getStoredLoginCode(), null);
}));

test('storeToken persists and getStoredToken reads it back', async () => withTempConfigHome(async () => {
  const token = { access_token: 'A', refresh_token: 'R', token_type: 'bearer' };
  const file = await storeToken(token);
  assert.ok(fs.existsSync(file));
  const read = getStoredToken();
  assert.deepEqual(read, token);
}));

test('getStoredToken returns null when missing or invalid shape/JSON', async () => withTempConfigHome(async () => {
  // Missing
  assert.equal(getStoredToken(), null);
}));

test('getStoredToken accepts legacy code-only shape, rejects unrelated object', async () => withTempConfigHome(async () => {
  const tokenPath = _internal.defaultConfigPath('token.json');
  fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
  // Legacy: has code string
  fs.writeFileSync(tokenPath, JSON.stringify({ code: 'LEGACY' }), 'utf8');
  assert.deepEqual(getStoredToken(), { code: 'LEGACY' });
  // Overwrite with unrelated object (no code/access/refresh)
  fs.writeFileSync(tokenPath, JSON.stringify({ hello: 'world' }), 'utf8');
  assert.equal(getStoredToken(), null);
  // Overwrite with invalid JSON
  fs.writeFileSync(tokenPath, '{broken', 'utf8');
  assert.equal(getStoredToken(), null);
}));
