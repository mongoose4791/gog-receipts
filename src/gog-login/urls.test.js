import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getAuthUrl,
    getNewTokenUrl,
    getRefreshTokenUrl,
    AUTH_URL,
    TOKEN__URL,
    AUTH__CLIENT_ID,
    AUTH__REDIRECT_URI,
    AUTH__RESPONSE_TYPE,
    AUTH__LAYOUT,
    TOKEN__CLIENT_SECRET,
    TOKEN__GRANT_TYPE__NEW_LOGIN,
    TOKEN__GRANT_TYPE__REFRESH,
} from './urls.js';

test('getAuthUrl builds correct authorization URL and params', () => {
    const u = getAuthUrl();
    assert.equal(u.origin + u.pathname, AUTH_URL);
    const p = u.searchParams;
    assert.equal(p.get('client_id'), AUTH__CLIENT_ID);
    assert.equal(p.get('redirect_uri'), AUTH__REDIRECT_URI);
    assert.equal(p.get('response_type'), AUTH__RESPONSE_TYPE);
    assert.equal(p.get('layout'), AUTH__LAYOUT);
});

test('getNewTokenUrl includes code and required params', () => {
    const code = 'LOGIN-CODE-123';
    const u = getNewTokenUrl(code);
    assert.equal(u.origin + u.pathname, TOKEN__URL);
    const p = u.searchParams;
    assert.equal(p.get('client_id'), AUTH__CLIENT_ID);
    assert.equal(p.get('client_secret'), TOKEN__CLIENT_SECRET);
    assert.equal(p.get('grant_type'), TOKEN__GRANT_TYPE__NEW_LOGIN);
    assert.equal(p.get('code'), code);
    assert.equal(p.get('redirect_uri'), AUTH__REDIRECT_URI);
});

test('getRefreshTokenUrl includes refresh_token and required params', () => {
    const refresh = 'REFRESH-XYZ';
    const u = getRefreshTokenUrl(refresh);
    assert.equal(u.origin + u.pathname, TOKEN__URL);
    const p = u.searchParams;
    assert.equal(p.get('client_id'), AUTH__CLIENT_ID);
    assert.equal(p.get('client_secret'), TOKEN__CLIENT_SECRET);
    assert.equal(p.get('grant_type'), TOKEN__GRANT_TYPE__REFRESH);
    assert.equal(p.get('refresh_token'), refresh);
});
