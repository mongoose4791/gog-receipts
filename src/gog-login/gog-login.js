// Public entry for the gog-login module.
// This file re-exports a curated API while delegating implementation to
// smaller modules for clarity and testability.

import { getAuthUrl } from './urls.js';
import { exchangeLoginCodeForToken, refreshAccessToken } from './exchange.js';
import {
    storeLoginCode,
    getStoredLoginCode,
    getStoredToken,
    storeToken,
} from './storage.js';

/**
 * High-level login flow.
 * - Attempts to reuse an existing token (refresh if needed)
 * - Otherwise tries any stored login code
 * - Otherwise uses a provided URL/code
 * - Otherwise prompts interactively
 * Returns the token object on success and persists it to disk.
 *
 * @param {string|undefined} [loginCodeUrl] Optional raw code or callback URL containing ?code=.
 * @returns {Promise<object>} The resolved token payload.
 */
export async function loginFlow(loginCodeUrl = undefined) {
    process.stdout.write('Authenticating with GOG...\n');

    // 1) Try existing token and refresh if possible
    process.stdout.write('Try existing token and refresh if possible...\n');
    const refreshed = await tryRefreshWithStoredToken();
    if (refreshed) {
        process.stdout.write('Welcome back! Session restored.\n');
        return refreshed;
    }

    // 2) If we have a stored login code already, try exchanging it
    process.stdout.write('If we have a stored login code already, try exchanging it...\n');
    if (!loginCodeUrl) {
        const tokenFromStoredCode = await tryExchangeStoredLoginCode();
        if (tokenFromStoredCode) {
            process.stdout.write('Restored session from saved login code.\n');
            return tokenFromStoredCode;
        }
    }

    // 3) If the caller provided a login URL/code, use it
    process.stdout.write('If the caller provided a login URL/code, use it...\n');
    if (loginCodeUrl) {
        const tokenFromProvided = await handleProvidedLoginCode(loginCodeUrl);
        process.stdout.write('Login successful using provided code.\n');
        return tokenFromProvided;
    }

    // 4) If nothing works, prompt for login code/URL interactively
    process.stdout.write('If nothing works, prompt for login code/URL interactively...\n');
    const tokenFromInteractive = await handleInteractiveLogin();
    process.stdout.write('Login successful.\n');
    return tokenFromInteractive;
}

/**
 * Attempt to refresh an existing stored session token.
 * - Reads token.json using getStoredToken()
 * - If a refresh_token is present, calls refreshAccessToken()
 * - On success, persists the refreshed token via storeToken()
 * - On failure or absence, returns null
 *
 * Side effects: Writes token.json when refresh succeeds. Logs progress to stdout.
 *
 * @returns {Promise<object|null>} Refreshed token object or null when not available.
 */
async function tryRefreshWithStoredToken() {
    try {
        const existing = getStoredToken();
        if (existing && existing.refresh_token) {
            try {
                const refreshed = await refreshAccessToken(existing.refresh_token);
                const tokenFilePath = await storeToken(refreshed);
                process.stdout.write('Session refreshed. Token saved to: ' + tokenFilePath + '\n');
                return refreshed;
            } catch (e) {
                process.stdout.write('Previous session expired. Starting fresh login.\n');
                return null;
            }
        }
    } catch {
        // ignore and continue
    }
    return null;
}

/**
 * Try exchanging a previously saved one-time login code for a token.
 * - Reads loginCode.json using getStoredLoginCode()
 * - If present, exchanges it via exchangeLoginCodeForToken()
 * - Persists the token to token.json on success
 *
 * Side effects: Writes token.json when exchange succeeds. Logs progress to stdout.
 *
 * @returns {Promise<object|null>} Token object if exchange worked, otherwise null.
 */
async function tryExchangeStoredLoginCode() {
    try {
        const stored = getStoredLoginCode();
        if (stored?.loginCode) {
            const token = await exchangeLoginCodeForToken(stored.loginCode);
            const tokenFilePath = await storeToken(token);
            process.stdout.write('Saved login code valid. Token saved to: ' + tokenFilePath + '\n');
            return token;
        }
    } catch (e) {
        process.stdout.write('Saved login code failed. You need to log in manually.\n');
    }
    return null;
}

/**
 * Handle a caller-provided login code or URL.
 * - Extracts the code using extractLoginCode()
 * - Persists the code to loginCode.json
 * - Exchanges the code for a token and persists token.json
 *
 * Side effects: Writes loginCode.json and token.json. Logs progress to stdout.
 *
 * @param {string} loginCodeUrl Raw code or full callback URL containing ?code=.
 * @returns {Promise<object>} The token returned by the exchange endpoint.
 */
async function handleProvidedLoginCode(loginCodeUrl) {
    const loginCode = extractLoginCode(loginCodeUrl);
    const loginCodeFilePath = await storeLoginCode(loginCode);
    process.stdout.write('\nLogin code extracted and saved to: ' + loginCodeFilePath + '\n');

    const token = await exchangeLoginCodeForToken(loginCode);
    const tokenFilePath = await storeToken(token);
    process.stdout.write('Token exchange successful. Saved to: ' + tokenFilePath + '\n');
    return token;
}

/**
 * Prompt the user for a login URL/code interactively and perform the exchange.
 * - Prints instructions and waits for a single line from stdin
 * - Extracts, stores, and exchanges the code
 *
 * Side effects: Writes loginCode.json and token.json. Reads stdin; logs to stdout.
 *
 * @returns {Promise<object>} The token returned by the exchange endpoint.
 */
async function handleInteractiveLogin() {
    const url = await promptForLoginCodeUrl();
    const loginCode = extractLoginCode(url);
    const loginCodeFile = await storeLoginCode(loginCode);
    process.stdout.write('\nLogin code extracted and saved to: ' + loginCodeFile + '\n');

    const token = await exchangeLoginCodeForToken(loginCode);
    const tokenFile = await storeToken(token);
    process.stdout.write('Token exchange successful. Saved to: ' + tokenFile + '\n');
    return token;
}

/**
 * Print interactive instructions and wait for the user to paste the final GOG redirect URL.
 * The function resumes stdin, reads a single chunk, trims it, and resolves.
 *
 * @returns {Promise<string>} The pasted URL string from the user.
 */
async function promptForLoginCodeUrl() {
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
}

/**
 * Extract the login code from either a raw code string or a callback URL.
 * Throws if a URL is provided without a code parameter.
 *
 * @param {string} codeOrUrl Raw code string or full redirect URL.
 * @returns {string} Extracted code string.
 */
export function extractLoginCode(codeOrUrl) {
    if (!codeOrUrl) throw new Error('No code or URL provided.');

    const input = String(codeOrUrl).trim();
    // Try to parse as URL first. Only treat it as non-URL if URL parsing throws.
    let urlObj;
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

// Re-export selected persistence helpers as part of the public API
export { storeLoginCode, getStoredLoginCode, getStoredToken };
