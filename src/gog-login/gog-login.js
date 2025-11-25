import fs from 'fs';
import path from 'path';
import os from 'os';

const LOGIN_CODE_FILE_NAME = 'loginCode.json';
const TOKEN_FILE_NAME = 'token.json';

// OAuth constants derived from docs: https://gogapidocs.readthedocs.io/en/latest/auth.html

const AUTH_URL = 'https://auth.gog.com/auth';
const AUTH__CLIENT_ID = '46899977096215655';
const AUTH__REDIRECT_URI = 'https://embed.gog.com/on_login_success?origin=client';
const AUTH__RESPONSE_TYPE = 'code';
const AUTH__LAYOUT = 'client2';

const TOKEN__URL = 'https://auth.gog.com/token';
const TOKEN__CLIENT_SECRET = '9d85c43b1482497dbbce61f6e4aa173a433796eeae2ca8c5f6129f2dc4de46d9';
const TOKEN__GRANT_TYPE__NEW_LOGIN = 'authorization_code';
const TOKEN__GRANT_TYPE__REFRESH = 'refresh_token';

export async function loginFlow(loginCodeUrl = undefined) {
    process.stdout.write('Authenticating with GOG...\n');

    // 1) Try existing token and refresh if possible
    try {
        const existing = getStoredToken();
        if (existing) {
            // If we have a refresh token, try to refresh first
            if (existing.refresh_token) {
                try {
                    const refreshed = await refreshAccessToken(existing.refresh_token);
                    const tokenFilePath = await storeToken(refreshed);
                    process.stdout.write('Existing GOG token refreshed successfully. Stored at: ' + tokenFilePath + '\n');
                    return refreshed;
                } catch (e) {
                    // If refresh fails, proceed to next steps without using the old token
                    process.stdout.write('Token refresh failed. Proceeding to login code flow. Reason: ' + (e?.message || e) + '\n');
                }
            }
            // Legacy shape: token file may only contain a code. We'll try to exchange below.
        }
    } catch {
    }

    // 2) If we have a stored login code already, try exchanging it before prompting
    if (!loginCodeUrl) {
        const stored = getStoredLoginCode();
        if (stored?.loginCode) {
            try {
                const token = await exchangeLoginCodeForToken(stored.loginCode);
                const tokenFilePath = await storeToken(token);
                process.stdout.write('Stored GOG-Login-Code exchanged for token successfully. Stored at: ' + tokenFilePath + '\n');
                return token;
            } catch (e) {
                process.stdout.write('Exchanging stored login code failed, will prompt for a new one. Reason: ' + (e?.message || e) + '\n');
            }
        }
    }

    // 3) If caller provided a login URL/code, use it
    if (loginCodeUrl) {
        const loginCode = extractLoginCode(loginCodeUrl);
        const loginCodeFilePath = await storeLoginCode(loginCode);
        process.stdout.write('\nExtracted GOG-Login-Code successfully. Stored at: ' + loginCodeFilePath + '\n');

        const token = await exchangeLoginCodeForToken(loginCode);
        const tokenFilePath = await storeToken(token);
        process.stdout.write('GOG-Login-Code exchanged for token successfully. Stored at: ' + tokenFilePath + '\n');
        return token;
    }

    // 4) Prompt for login code/URL interactively
    const askForLoginCodeUrl = async () => {
        return await new Promise((resolve) => {
            const url = getAuthUrl();
            process.stdout.write(`\nTo connect your GOG account, please follow these steps:\n\n`);
            process.stdout.write(`1. Open this link in your browser: ${url}\n`);
            process.stdout.write('2. Log in to your account.\n');
            process.stdout.write('3. After logging in, you will see a blank page. Copy the URL from the address bar.\n');
            process.stdout.write('4. Paste that URL here.\n\n');
            process.stdout.write('URL: ');
            process.stdin.setEncoding('utf8');
            process.stdin.resume();
            const onData = (chunk) => {
                process.stdin.pause();
                process.stdin.removeListener('data', onData);
                resolve(String(chunk).trim());
            };
            process.stdin.on('data', onData);
        });
    };

    const url = await askForLoginCodeUrl();

    const loginCode = extractLoginCode(url);
    const loginCodeFile = await storeLoginCode(loginCode);
    process.stdout.write('\nExtracted GOG-Login-Code successfully. Stored at: ' + loginCodeFile + '\n');

    const token = await exchangeLoginCodeForToken(loginCode);
    const tokenFile = await storeToken(token);
    process.stdout.write('GOG-Login-Code exchanged for token successfully. Stored at: ' + tokenFile + '\n');

    return token;
}

function getAuthUrl() {
    const url = new URL(AUTH_URL);
    url.searchParams.set('client_id', AUTH__CLIENT_ID);
    url.searchParams.set('redirect_uri', AUTH__REDIRECT_URI);
    url.searchParams.set('response_type', AUTH__RESPONSE_TYPE);
    url.searchParams.set('layout', AUTH__LAYOUT);
    return url;
}

function getNewTokenUrl(loginCode) {
    const url = new URL(TOKEN__URL);
    url.searchParams.set('client_id', AUTH__CLIENT_ID);
    url.searchParams.set('client_secret', TOKEN__CLIENT_SECRET);
    url.searchParams.set('grant_type', TOKEN__GRANT_TYPE__NEW_LOGIN);
    url.searchParams.set('code', loginCode);
    url.searchParams.set('redirect_uri', AUTH__REDIRECT_URI);
    return url;
}

function getRefreshTokenUrl(refreshToken) {
    const url = new URL(TOKEN__URL);
    url.searchParams.set('client_id', AUTH__CLIENT_ID);
    url.searchParams.set('client_secret', TOKEN__CLIENT_SECRET);
    url.searchParams.set('grant_type', TOKEN__GRANT_TYPE__REFRESH);
    url.searchParams.set('refresh_token', refreshToken);
    return url;
}

function defaultConfigPath(filename) {
    if (!filename) throw new Error('No filename provided.');
    // Prefer XDG config home on Unix, fallback to ~/.config
    const isWin = process.platform === 'win32';
    if (isWin) {
        const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
        return path.join(base, 'gog-receipts', filename);
    }
    const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    return path.join(base, 'gog-receipts', filename);
}

export function extractLoginCode(codeOrUrl) {
    if (!codeOrUrl) throw new Error('No code or URL provided.');

    const input = String(codeOrUrl).trim();
    // Try to parse as URL first. Only treat it as non-URL if URL parsing throws.
    let urlObj = null;
    try {
        urlObj = new URL(input);
    } catch {
        urlObj = null;
    }

    if (urlObj) {
        const codeFromUrl = urlObj.searchParams.get('code');
        if (codeFromUrl) return codeFromUrl;
        // If it's a URL but no code param, treat as error
        throw new Error('The URL does not contain a valid code.');
    }

    // Not a URL — assume the input itself is the code
    if (!input) throw new Error('Empty code provided.');
    return input;
}

export async function storeLoginCode(loginCode) {
    if (!loginCode) throw new Error('Missing code to store.');
    const file = defaultConfigPath(LOGIN_CODE_FILE_NAME);
    const dir = path.dirname(file);
    fs.mkdirSync(dir, {recursive: true});

    const payload = {
        createdAt: new Date().toISOString(),
        loginCode,
    };
    fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
    return file;
}

export function getStoredLoginCode() {
    try {
        const file = defaultConfigPath(LOGIN_CODE_FILE_NAME);
        if (!fs.existsSync(file)) return null;
        const raw = fs.readFileSync(file, 'utf8');
        const data = JSON.parse(raw);
        if (typeof data?.loginCode === 'string' && data.loginCode.length > 0) return data;
        return null;
    } catch {
        return null;
    }
}

export function getStoredToken() {
    try {
        const file = defaultConfigPath(TOKEN_FILE_NAME);
        if (!fs.existsSync(file)) return null;
        const raw = fs.readFileSync(file, 'utf8');
        const data = JSON.parse(raw);
        // Accept modern token shape or fallback legacy code-based shape
        const hasAccess = typeof data.access_token === 'string' && data.access_token.length > 0;
        const hasRefresh = typeof data.refresh_token === 'string' && data.refresh_token.length > 0;
        const hasCode = typeof data.code === 'string' && data.code.length > 0;
        if (!(hasAccess || hasRefresh || hasCode)) return null;
        return data;
    } catch {
        return null;
    }
}

async function exchangeLoginCodeForToken(loginCode) {
    const res = await fetch(getNewTokenUrl(loginCode).toString(), {
        method: 'GET',
    });

    const txt = await res.text();

    if (!res.ok) {
        throw new Error(`Token fetch failed. Status: ${res.status}. Response: ${txt}`);
    }

    return JSON.parse(txt);
}

async function refreshAccessToken(refreshToken) {
    const res = await fetch(getRefreshTokenUrl(refreshToken).toString(), {
        method: 'GET',
    });

    const txt = await res.text();

    if (!res.ok) {
        throw new Error(`Token refresh failed. Status: ${res.status}. Response: ${txt}`);
    }

    return JSON.parse(txt);
}

async function storeToken(token) {
    if (!token) throw new Error('Missing token to store.');
    const file = defaultConfigPath(TOKEN_FILE_NAME);
    const dir = path.dirname(file);
    fs.mkdirSync(dir, {recursive: true});

    fs.writeFileSync(file, JSON.stringify(token, null, 2), 'utf8');
    return file;
}

export default {
    extractCode: extractLoginCode, storeToken, getStoredToken, loginFlow,
};