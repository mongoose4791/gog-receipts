# Guidelines for Junie

## Runtime
- Linux only (XDG paths).
- Node.js 20+.
- ESM only (type: module). No CommonJS.
- No build step; run sources directly.

## Entry points
- CLI: src/cli.js
- Library: src/gog-login/gog-login.js, src/save-receipt/save-receipts.js

## Config & files
- Config root: $XDG_CONFIG_HOME or ~/.config/gog-receipts/
- Files: loginCode.json (last one-time code), token.json (token payload). Both shall never be committed.
- Always mkdir parent dirs: fs.mkdirSync(dir, { recursive: true })

## Network & auth
- Use global fetch; internal modules build GOG URLs and GET.
- No real network in tests; stub globalThis.fetch.

## Puppeteer
- Required for receipt download in runtime.
- Do not launch browsers in unit tests.

## Development
- Install: npm ci
- Run CLI: npm run cli
- Login subcommand: npm run login
- Tests: npm test
- Never commit credentials or tokens.

## Testing
- Runner: node --test (Node’s built-in).
- Discover: any .test.js.
- ESM imports only: import from 'node:test' and 'node:assert/strict'.
- Test isolation from user config: use temp dir; set XDG_CONFIG_HOME; cleanup with fs.rmSync(..., { recursive: true, force: true }).
- Do not assert on stdout/stderr; verify return values/state/files.
- Run tests after each change

## Code style
- Keep CLI thin; move logic to modules.
- Small, single-purpose functions.
- JSDoc on all functions with @param and @returns (Promise<...> for async; void for procedures). Document optionals with [name].

## Compatibility
- Modern environment only; no shims/polyfills for older Node.
- Breaking older Node is acceptable if Node 20+ works.
- Backwards compatibility to older versions of the project is not a goal

## Docs
- Update README on every change; keep Markdown valid.

## Code style
- no single-line if statements
- no single-line loops
- 4 spaces represent one tab
