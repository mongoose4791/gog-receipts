// Module to help with GOG authentication code retrieval and storage.
//  - Show the AUTH_URL to the user
//  - Ask the user to paste either the full redirected URL or just the code
//  - Extract the "code" value and persist it as an auth token

import fs from 'fs';
import path from 'path';
import os from 'os';

export const AUTH_URL = 'https://auth.gog.com/auth?client_id=46899977096215655&redirect_uri=https%3A%2F%2Fembed.gog.com%2Fon_login_success%3Forigin%3Dclient&response_type=code&layout=client2';
// OAuth constants derived from docs: https://gogapidocs.readthedocs.io/en/latest/auth.html
const TOKEN_URL = 'https://auth.gog.com/token';
const CLIENT_ID = '46899977096215655';
const REDIRECT_URI = 'https://embed.gog.com/on_login_success?origin=client';

/**
 * Extracts the GOG auth code from either a direct code string or a full redirect URL.
 * @param {string} codeOrUrl
 * @returns {string} code
 * @throws {Error} when the URL doesn't contain a code
 */
export function extractCode(codeOrUrl) {
  if (!codeOrUrl) throw new Error('No code or URL provided.');
  const input = String(codeOrUrl).trim();
  if (!input.startsWith('https://')) {
    return input;
  }
  const urlObj = new URL(input);
  const code = urlObj.searchParams.get('code');
  if (!code) throw new Error('The URL does not contain a valid code.');
  return code;
}

function defaultTokenPath() {
  // Prefer XDG config home on Unix, fallback to ~/.config
  const isWin = process.platform === 'win32';
  if (isWin) {
    const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(base, 'gog-receipts', 'token.json');
  }
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(base, 'gog-receipts', 'token.json');
}

/**
 * Exchanges an authorization code for an access token using GOG OAuth endpoint.
 * @param {string} code
 * @returns {Promise<{access_token:string,token_type:string,expires_in:number,refresh_token?:string,scope?:string}>>}
 */
async function exchangeCodeForToken(code) {
  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', code);
  body.set('client_id', CLIENT_ID);
  body.set('redirect_uri', REDIRECT_URI);

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const txt = await res.text();
  let json;
  try { json = JSON.parse(txt); } catch {
    throw new Error(`Token endpoint returned non-JSON response (${res.status}): ${txt.slice(0, 200)}`);
  }
  if (!res.ok) {
    const errMsg = json.error_description || json.error || `HTTP ${res.status}`;
    throw new Error(`Failed to exchange code for token: ${errMsg}`);
  }
  if (!json.access_token) {
    throw new Error('Token response missing access_token');
  }
  return json;
}

/**
 * Exchanges the given code for tokens and persists them to disk as JSON.
 * @param {object} params
 * @param {string} params.code - The authorization code to exchange and store.
 * @param {string} [params.tokenPath] - File path to store the token.json
 * @returns {Promise<string>} token file path used
 */
export async function storeToken({ code, tokenPath } = {}) {
  if (!code) throw new Error('Missing code to store.');
  const file = tokenPath || defaultTokenPath();
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });

  const token = await exchangeCodeForToken(code);
  const now = Date.now();
  const expiresIn = typeof token.expires_in === 'number' ? token.expires_in : undefined;
  const expiresAt = expiresIn ? new Date(now + expiresIn * 1000).toISOString() : undefined;

  const payload = {
    // Keep the original code for troubleshooting/backwards compatibility
    code,
    access_token: token.access_token,
    token_type: token.token_type,
    refresh_token: token.refresh_token,
    scope: token.scope,
    expires_in: token.expires_in,
    expires_at: expiresAt,
    savedAt: new Date(now).toISOString(),
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
  return file;
}

/**
 * Reads the stored token.json (containing the last saved authorization code).
 * @param {object} [params]
 * @param {string} [params.tokenPath] - Optional explicit token file path.
 * @returns {{code:string,savedAt:string}|null} The stored payload or null if not found/invalid.
 */
export function getStoredToken({ tokenPath } = {}) {
  try {
    const file = tokenPath || defaultTokenPath();
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    if (!data || typeof data.code !== 'string' || !data.code) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Interactive login flow: guides the user to the GOG login page and asks for code/URL.
 * @param {object} params
 * @param {string|undefined} params.input - Optional pre-supplied code or URL.
 * @param {string|undefined} params.tokenPath - Optional custom token path.
 * @param {NodeJS.ReadStream} [params.stdin] - Custom stdin for prompting.
 * @param {NodeJS.WriteStream} [params.stdout] - Custom stdout for messages.
 * @returns {Promise<{code:string, tokenPath:string}>>}
 */
export async function loginFlow({ input, tokenPath, stdin = process.stdin, stdout = process.stdout } = {}) {
  const ask = async () => {
    return await new Promise((resolve) => {
      stdout.write(`\nVisit ${AUTH_URL}\n`);
      stdout.write('After you are redirected to a blank page, copy the address and paste it here, or paste the code:\n');
      stdout.write('Code or web address: ');
      stdin.setEncoding('utf8');
      stdin.resume();
      const onData = (chunk) => {
        stdin.pause();
        stdin.removeListener('data', onData);
        resolve(String(chunk).trim());
      };
      stdin.on('data', onData);
    });
  };

  const provided = input || await ask();
  const code = extractCode(provided);
  const file = await storeToken({ code, tokenPath });
  stdout.write('Logged in successfully. Token stored at: ' + file + '\n');
  return { code, tokenPath: file };
}

export default {
  AUTH_URL,
  extractCode,
  storeToken,
  getStoredToken,
  loginFlow,
};

