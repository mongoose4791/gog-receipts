import {test, describe, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Module under test
import { extractLoginCode, storeLoginCode, getStoredToken } from './gog-login.js';

// Utilities to control config location so we don't touch real user files
function makeTempConfigDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gog-receipts-test-'));
  return dir;
}

function setConfigEnv(dir) {
  // Prefer XDG on unix, fallback to APPDATA on win in module code — we set both for safety
  process.env.XDG_CONFIG_HOME = dir;
  process.env.APPDATA = dir;
}

function resetConfigEnv() {
  delete process.env.XDG_CONFIG_HOME;
  delete process.env.APPDATA;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

describe('login-gog module', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempConfigDir();
    setConfigEnv(tmpDir);
  });

  afterEach(() => {
    resetConfigEnv();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  describe('extractLoginCode', () => {
    test('extracts code from URL query parameter', () => {
      const url = 'https://embed.gog.com/on_login_success?origin=client&code=ABC123';
      assert.equal(extractLoginCode(url), 'ABC123');
    });

    test('returns the input when given a plain code string', () => {
      assert.equal(extractLoginCode('MYCODE_456'), 'MYCODE_456');
    });

    test('throws when URL has no code parameter', () => {
      const badUrl = 'https://embed.gog.com/on_login_success?origin=client';
      assert.throws(() => extractLoginCode(badUrl), /does not contain a valid code/i);
    });

    test('throws when no input is provided', () => {
      assert.throws(() => extractLoginCode(undefined), /No code or URL provided/i);
    });
  });

  describe('storeLoginCode', () => {
    test('writes loginCode.json under config directory with expected shape', async () => {
      const filePath = await storeLoginCode('XYZ789');
      assert.ok(filePath.endsWith(path.join('gog-receipts', 'loginCode.json')));
      assert.ok(fs.existsSync(filePath));
      const data = readJson(filePath);
      assert.equal(data.loginCode, 'XYZ789');
      // Validate createdAt is ISO-8601 style string
      const created = new Date(data.createdAt);
      assert.ok(!Number.isNaN(created.getTime()), 'createdAt should be a valid date string');
    });
  });

  describe('getStoredToken', () => {
    test('returns null when token file does not exist', () => {
      const token = getStoredToken();
      assert.equal(token, null);
    });

    test('returns parsed token when access_token is present', () => {
      const file = path.join(process.env.XDG_CONFIG_HOME || '', 'gog-receipts', 'token.json');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const payload = { access_token: 'a1', token_type: 'bearer', expires_in: 3600 };
      fs.writeFileSync(file, JSON.stringify(payload), 'utf8');
      const token = getStoredToken();
      assert.deepEqual(token, payload);
    });

    test('returns parsed token when only refresh_token is present', () => {
      const file = path.join(process.env.XDG_CONFIG_HOME || '', 'gog-receipts', 'token.json');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const payload = { refresh_token: 'r1' };
      fs.writeFileSync(file, JSON.stringify(payload), 'utf8');
      const token = getStoredToken();
      assert.deepEqual(token, payload);
    });

    test('returns parsed legacy object when only code is present', () => {
      const file = path.join(process.env.XDG_CONFIG_HOME || '', 'gog-receipts', 'token.json');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const payload = { code: 'legacy_code' };
      fs.writeFileSync(file, JSON.stringify(payload), 'utf8');
      const token = getStoredToken();
      assert.deepEqual(token, payload);
    });

    test('returns null when token file contains invalid JSON', () => {
      const file = path.join(process.env.XDG_CONFIG_HOME || '', 'gog-receipts', 'token.json');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, '{ not: valid json', 'utf8');
      const token = getStoredToken();
      assert.equal(token, null);
    });
  });
});
