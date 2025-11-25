import { getNewTokenUrl, getRefreshTokenUrl } from './urls.js';

/**
 * Exchange a one-time login code for a token by calling GOG's endpoint.
 * Uses global fetch; tests should stub globalThis.fetch.
 *
 * @param {string} loginCode One-time code returned by the GOG auth redirect.
 * @returns {Promise<object>} Parsed token payload returned by the server.
 */
export async function exchangeLoginCodeForToken(loginCode) {
  const res = await fetch(getNewTokenUrl(loginCode).toString(), { method: 'GET' });
  const txt = await res.text();
  if (!res.ok) {
    throw new Error(`Token fetch failed. Status: ${res.status}. Response: ${txt}`);
  }
  return JSON.parse(txt);
}

/**
 * Refresh the access token using a refresh_token value.
 *
 * @param {string} refreshToken The refresh_token value issued previously.
 * @returns {Promise<object>} Parsed token payload returned by the server.
 */
export async function refreshAccessToken(refreshToken) {
  const res = await fetch(getRefreshTokenUrl(refreshToken).toString(), { method: 'GET' });
  const txt = await res.text();
  if (!res.ok) {
    throw new Error(`Token refresh failed. Status: ${res.status}. Response: ${txt}`);
  }
  return JSON.parse(txt);
}
