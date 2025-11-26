/**
 * URL builders for the GOG OAuth endpoints.
 * Kept in a separate module for testability and reuse.
 */

// OAuth constants derived from public docs: https://gogapidocs.readthedocs.io/en/latest/auth.html
export const AUTH_URL = 'https://auth.gog.com/auth';
export const AUTH__CLIENT_ID = '46899977096215655';
export const AUTH__REDIRECT_URI = 'https://embed.gog.com/on_login_success?origin=client';
export const AUTH__RESPONSE_TYPE = 'code';
export const AUTH__LAYOUT = 'client2';

export const TOKEN__URL = 'https://auth.gog.com/token';
export const TOKEN__CLIENT_SECRET = '9d85c43b1482497dbbce61f6e4aa173a433796eeae2ca8c5f6129f2dc4de46d9';
export const TOKEN__GRANT_TYPE__NEW_LOGIN = 'authorization_code';
export const TOKEN__GRANT_TYPE__REFRESH = 'refresh_token';

/**
 * Build the authorization URL users should open to authenticate.
 *
 * @returns {URL} Fully constructed authorization URL object.
 */
export function getAuthUrl() {
    const url = new URL(AUTH_URL);
    url.searchParams.set('client_id', AUTH__CLIENT_ID);
    url.searchParams.set('redirect_uri', AUTH__REDIRECT_URI);
    url.searchParams.set('response_type', AUTH__RESPONSE_TYPE);
    url.searchParams.set('layout', AUTH__LAYOUT);
    return url;
}

/**
 * Build the URL to exchange a one-time login code for a token.
 *
 * @param {string} loginCode One-time code returned by the GOG auth redirect.
 * @returns {URL} Fully constructed token exchange URL.
 */
export function getNewTokenUrl(loginCode) {
    const url = new URL(TOKEN__URL);
    url.searchParams.set('client_id', AUTH__CLIENT_ID);
    url.searchParams.set('client_secret', TOKEN__CLIENT_SECRET);
    url.searchParams.set('grant_type', TOKEN__GRANT_TYPE__NEW_LOGIN);
    url.searchParams.set('code', loginCode);
    url.searchParams.set('redirect_uri', AUTH__REDIRECT_URI);
    return url;
}

/**
 * Build the URL to refresh an access token using a refresh token.
 *
 * @param {string} refreshToken The refresh_token value from a previous token payload.
 * @returns {URL} Fully constructed refresh URL.
 */
export function getRefreshTokenUrl(refreshToken) {
    const url = new URL(TOKEN__URL);
    url.searchParams.set('client_id', AUTH__CLIENT_ID);
    url.searchParams.set('client_secret', TOKEN__CLIENT_SECRET);
    url.searchParams.set('grant_type', TOKEN__GRANT_TYPE__REFRESH);
    url.searchParams.set('refresh_token', refreshToken);
    return url;
}
