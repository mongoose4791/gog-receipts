import {test, describe, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Module under test
import { extractLoginCode, storeLoginCode, getStoredToken, loginFlow } from './gog-login.js';
import gogLoginDefault from './gog-login.js';

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

describe('gog-login module', () => {
  let tmpDir;
  let origFetch;
  let origStdoutWrite;
  let capturedOut;

  beforeEach(() => {
    tmpDir = makeTempConfigDir();
    setConfigEnv(tmpDir);
    // Capture stdout
    capturedOut = '';
    origStdoutWrite = process.stdout.write;
    process.stdout.write = (chunk, encoding, cb) => {
      capturedOut += String(chunk);
      if (typeof encoding === 'function') return encoding();
      if (typeof cb === 'function') return cb();
      return true;
    };
    // Save and reset fetch
    origFetch = global.fetch;
  });

  afterEach(() => {
    // Restore stdout
    process.stdout.write = origStdoutWrite;
    // Restore fetch
    global.fetch = origFetch;
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

  describe('getStoredLoginCode', () => {
    test('returns null when login code file does not exist', async () => {
      const { getStoredLoginCode } = await import('./gog-login.js');
      const stored = getStoredLoginCode();
      assert.equal(stored, null);
    });

    test('returns stored login code payload', async () => {
      const { getStoredLoginCode } = await import('./gog-login.js');
      const filePath = await storeLoginCode('CODE123');
      assert.ok(fs.existsSync(filePath));
      const stored = getStoredLoginCode();
      assert.equal(stored.loginCode, 'CODE123');
      assert.ok(typeof stored.createdAt === 'string');
    });
  });

  describe('storeToken via default export', () => {
    test('writes token.json which getStoredToken can read back', async () => {
      const token = { access_token: 't123', refresh_token: 'r123', token_type: 'bearer', expires_in: 3600 };
      const filePath = await gogLoginDefault.storeToken(token);
      assert.ok(filePath.endsWith(path.join('gog-receipts', 'token.json')));
      const readBack = getStoredToken();
      assert.deepEqual(readBack, token);
    });
  });

  describe('loginFlow', () => {
    function mockFetchOnce(expectedKind, responseJson, ok = true, status = 200) {
      global.fetch = async (urlStr, opts) => {
        const url = new URL(String(urlStr));
        // Identify which flow is calling by grant_type or presence of code/refresh_token
        const gt = url.searchParams.get('grant_type');
        if (expectedKind === 'new' && gt !== 'authorization_code') {
          throw new Error('Expected authorization_code grant');
        }
        if (expectedKind === 'refresh' && gt !== 'refresh_token') {
          throw new Error('Expected refresh_token grant');
        }
        return {
          ok,
          status,
          async text() { return JSON.stringify(responseJson); }
        };
      };
    }

    test('with provided login URL: exchanges code, stores token, and reports used path', async () => {
      const token = { access_token: 'acc1', refresh_token: 'ref1', token_type: 'bearer', expires_in: 3600 };
      mockFetchOnce('new', token);
      const providedUrl = 'https://embed.gog.com/on_login_success?origin=client&code=PROVIDED1';
      const result = await loginFlow(providedUrl);
      assert.deepEqual(result, token);
      // token.json should exist
      const tokenFile = path.join(process.env.XDG_CONFIG_HOME || '', 'gog-receipts', 'token.json');
      assert.ok(fs.existsSync(tokenFile));
      // stdout should mention provided path
      assert.match(capturedOut, /Authentication handled by: provided login URL\/code\./);
      // also should log extraction and exchange messages
      assert.match(capturedOut, /Extracted GOG-Login-Code successfully/);
      assert.match(capturedOut, /exchanged for token successfully/);
    });

    test('with stored login code: exchanges without prompt and reports stored code path', async () => {
      // Prepare stored login code
      await storeLoginCode('STORED_CODE_1');
      const token = { access_token: 'acc2', refresh_token: 'ref2', token_type: 'bearer', expires_in: 3600 };
      mockFetchOnce('new', token);
      const result = await loginFlow();
      assert.deepEqual(result, token);
      assert.match(capturedOut, /Authentication handled by: exchanged previously stored login code\./);
    });

    test('with refresh token present: refreshes and reports refreshed path', async () => {
      // Seed token.json with refresh token
      const tokenFile = path.join(process.env.XDG_CONFIG_HOME || '', 'gog-receipts', 'token.json');
      fs.mkdirSync(path.dirname(tokenFile), { recursive: true });
      fs.writeFileSync(tokenFile, JSON.stringify({ refresh_token: 'REFRESH_ME' }), 'utf8');

      const refreshed = { access_token: 'newAcc', refresh_token: 'newRef', token_type: 'bearer', expires_in: 3600 };
      mockFetchOnce('refresh', refreshed);

      const result = await loginFlow();
      assert.deepEqual(result, refreshed);
      assert.match(capturedOut, /Authentication handled by: refreshed existing token\./);
    });
  });
});
