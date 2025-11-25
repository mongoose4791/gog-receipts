import test from 'node:test';
import assert from 'node:assert/strict';

import { exchangeLoginCodeForToken, refreshAccessToken } from './exchange.js';

test('exchangeLoginCodeForToken: returns parsed token on success and calls expected URL', async () => {
  const code = 'LOGIN-CODE-OK';
  const fakeToken = { access_token: 'A', refresh_token: 'R', token_type: 'bearer' };
  const calls = [];
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, opts });
    return { ok: true, status: 200, text: async () => JSON.stringify(fakeToken) };
  };
  try {
    const out = await exchangeLoginCodeForToken(code);
    assert.deepEqual(out, fakeToken);
    assert.equal(calls.length, 1);
    const u = new URL(calls[0].url);
    assert.equal(calls[0].opts?.method, 'GET');
    assert.equal(u.searchParams.get('grant_type'), 'authorization_code');
    assert.equal(u.searchParams.get('code'), code);
  } finally {
    globalThis.fetch = prevFetch;
  }
});

test('exchangeLoginCodeForToken: throws on non-2xx with response text in message', async () => {
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 400, text: async () => 'Bad request' });
  try {
    await assert.rejects(
      () => exchangeLoginCodeForToken('ANY'),
      /Token fetch failed\. Status: 400\. Response: Bad request/
    );
  } finally {
    globalThis.fetch = prevFetch;
  }
});

test('refreshAccessToken: returns parsed token on success and calls expected URL', async () => {
  const refresh = 'REFRESH-OK';
  const fakeToken = { access_token: 'A2', refresh_token: refresh, token_type: 'bearer' };
  const calls = [];
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, opts });
    return { ok: true, status: 200, text: async () => JSON.stringify(fakeToken) };
  };
  try {
    const out = await refreshAccessToken(refresh);
    assert.deepEqual(out, fakeToken);
    assert.equal(calls.length, 1);
    const u = new URL(calls[0].url);
    assert.equal(calls[0].opts?.method, 'GET');
    assert.equal(u.searchParams.get('grant_type'), 'refresh_token');
    assert.equal(u.searchParams.get('refresh_token'), refresh);
  } finally {
    globalThis.fetch = prevFetch;
  }
});

test('refreshAccessToken: throws on non-2xx with response text in message', async () => {
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 401, text: async () => 'Expired' });
  try {
    await assert.rejects(
      () => refreshAccessToken('ANY'),
      /Token refresh failed\. Status: 401\. Response: Expired/
    );
  } finally {
    globalThis.fetch = prevFetch;
  }
});
