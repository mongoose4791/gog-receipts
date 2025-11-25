import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const LOGIN_CODE_FILE_NAME = 'loginCode.json';
const TOKEN_FILE_NAME = 'token.json';

/**
 * Resolve the app config path for a given filename using Linux XDG conventions only.
 * - XDG_CONFIG_HOME if set; otherwise ~/.config
 *
 * Note: This project intentionally targets Linux-only filesystem conventions.
 *
 * @param {string} filename File name to place under the app's config directory.
 * @returns {string} Absolute path to the config file.
 */
function defaultConfigPath(filename) {
  if (!filename) throw new Error('No filename provided.');
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(base, 'gog-receipts', filename);
}

/**
 * Persist the one-time login code to the config directory.
 * Returns the file path written.
 *
 * @param {string} loginCode The one-time code to store.
 * @returns {Promise<string>} Absolute path of the file written.
 */
export async function storeLoginCode(loginCode) {
  if (!loginCode) throw new Error('Missing code to store.');
  const file = defaultConfigPath(LOGIN_CODE_FILE_NAME);
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const payload = { createdAt: new Date().toISOString(), loginCode };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
  return file;
}

/**
 * Read the stored login code JSON, or null if missing/invalid.
 *
 * @returns {{loginCode: string, createdAt: string} | null} Stored code payload or null.
 */
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

/**
 * Read the stored token JSON, or null if missing/invalid.
 * Accepts modern access_token/refresh_token and legacy code-based shapes.
 *
 * @returns {object | null} Parsed token object or null when missing/invalid.
 */
export function getStoredToken() {
  try {
    const file = defaultConfigPath(TOKEN_FILE_NAME);
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    const hasAccess = typeof data.access_token === 'string' && data.access_token.length > 0;
    const hasRefresh = typeof data.refresh_token === 'string' && data.refresh_token.length > 0;
    const hasCode = typeof data.code === 'string' && data.code.length > 0;
    if (!(hasAccess || hasRefresh || hasCode)) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Persist the token JSON to the config directory. Returns the file path written.
 *
 * @param {object} token Token payload to persist.
 * @returns {Promise<string>} Absolute path of the file written.
 */
export async function storeToken(token) {
  if (!token) throw new Error('Missing token to store.');
  const file = defaultConfigPath(TOKEN_FILE_NAME);
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(token, null, 2), 'utf8');
  return file;
}

// For tests or future features, it can be useful to expose the resolver.
export const _internal = { defaultConfigPath };
