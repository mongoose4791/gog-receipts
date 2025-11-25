Project development guidelines

Scope and audience
- This document captures project-specific knowledge for advanced contributors to gog-receipts. It focuses on build/configuration, testing strategy with Node’s built-in test runner, and development/debugging tips relevant to this codebase.

Runtime, build, and configuration
- Node.js version: Target Node 20+ (Node 18+ may work, but the repository relies on node:test and ESM; Node 20 is recommended for parity with CI and local development).
- Package type: ESM ("type": "module"). Use import/export; do not mix CommonJS.
- Build step: None. This is a pure Node project; run sources directly.
- Entry points:
  - CLI: src/cli.js, exposed via the bin field as gog-receipts.
  - Library modules: src/gog-login/gog-login.js, src/save-receipt.js.
- Dependencies:
  - puppeteer is required for browser automation in receipt downloads. Tests should avoid launching a browser; use stubs/mocks instead.

Configuration and environment
- Config directory resolution follows Linux XDG conventions only:
  - XDG_CONFIG_HOME is respected if set; otherwise defaults to ~/.config.
  - Files are written under the vendor app dir e.g. <config-root>/gog-receipts/.
- Auth artifacts:
  - loginCode.json stores a recent one-time login code and metadata.
  - token.json stores the OAuth-like token payload (current implementation writes to disk; see README TODOs for secure storage via keytar in the future).
- Network:
  - Authentication exchanges are performed via global fetch; modules construct URLs internally and perform GET requests to GOG endpoints.

Local development workflow
- Install dependencies once: npm ci (or npm install).
- Run the CLI locally:
  - npm run cli
  - npm run login for the login subcommand.
  - You can invoke the binary directly after npm link if desired: gog-receipts login
- Avoid committing real credentials or tokens. Tests must not perform real logins or network calls.

Testing
- Runner: Node’s built-in test runner (node --test) configured by the package.json script: npm test.
- File discovery: Any .test.js file is automatically discovered by node --test. Keep tests colocated under src/ or in a dedicated test directory; current repo places tests next to modules for convenience.
- ESM considerations: Use import from 'node:test' and 'node:assert/strict'. Do not use require().
- Isolation from user config: For any test that touches the on-disk config, set up a temporary config home so tests do not read/write the real user profile. Example pattern from src/gog-login/gog-login.test.js:
  - Create a temp directory with fs.mkdtempSync.
  - Override process.env.XDG_CONFIG_HOME for the duration of the test.
  - Cleanup the directory after the test using fs.rmSync(..., { recursive: true, force: true }).
- No real network: Stub globalThis.fetch in tests to return deterministic responses. Example used in loginFlow tests returns a 200 with a JSON payload for token exchange.
- Puppeteer: Do not launch Chromium in unit tests. The receipt download flow should be structured to make side effects injectable/mocked. Where unavoidable, gate code paths behind feature flags and do not execute those in unit tests.

How to add and run a new test (demonstration)
- Create a file ending with .test.js next to the module you’re testing or under a test directory. Example minimal test:
  - File: src/example.sanity.test.js
    import test from 'node:test';
    import assert from 'node:assert/strict';
    test('basic arithmetic works', () => {
      assert.equal(1 + 1, 2);
    });
- Run tests: npm test
- Remove demonstration tests before committing unless they validate real behavior. This repository keeps unit tests focused on concrete modules (see src/gog-login/gog-login.test.js). During this documentation update, we temporarily created and ran a simple test to validate the flow, then removed it to keep the repo minimal.

Project-specific testing techniques captured from current tests
- Parsing and validation
  - extractLoginCode accepts either a raw code string or a GOG callback URL and extracts the "code" query parameter. Tests assert success for valid inputs and throws for URL without code.
- Persistence
  - storeLoginCode writes { loginCode, createdAt } to loginCode.json under the resolved config directory. Tests verify correct persistence using a temp config home; no writes to the developer machine occur.
- Token handling
  - getStoredToken reads token.json and supports both modern access_token/refresh_token and a legacy code-based shape; tests validate null when the file is missing and correct readback after a simulated login flow.
- Login flow without I/O coupling
  - loginFlow accepts a URL/code parameter, writes the loginCode file, exchanges it for a token by calling fetch, persists token.json, and returns the parsed token object. Tests stub fetch to avoid external calls and assert both return value and persisted file contents.

Code style and structure
- ESM with top-level imports only; avoid dynamic require.
- Prefer small, single-purpose functions. Keep the CLI thin (src/cli.js) and move logic into modules to enable unit testing.
- JSDoc typing: All functions must include explicit JSDoc with @param and @returns tags, including concrete types. For async functions use Promise<...>; use void for procedures with no return. Document optional parameters with brackets and defaults where applicable.
- Side effects
  - All filesystem and network side effects should remain in leaf functions with narrow interfaces so they can be mocked/stubbed in tests.
  - When reading/writing config files, always create parent directories with fs.mkdirSync(dir, { recursive: true }).

Debugging and troubleshooting tips
- Verbose logs: The auth/login code prints status messages to stdout; tests avoid asserting on stdout. When debugging locally, observe these logs to follow the decision path.
- Inspect config: If something goes wrong, check the resolved config path and the token/loginCode files written under it.
- Network failures: Token exchange and refresh throw with error messages including HTTP status and response text. Capture these when filing issues.

Security notes
- Token storage: As noted in README TODOs, token storage should migrate to a secure credential store (e.g., keytar). Do not share token.json or commit it.
- Test isolation: Never run tests against real GOG endpoints. Always stub fetch.

Commands cheat sheet
- Install deps: npm ci
- Run CLI: npm run cli
- Login: npm run login
- Run tests: npm test

Compatibility policy
- Target runtime: Node 20+ only. While Node 18+ may work during development, maintaining compatibility with older Node versions or legacy environments is explicitly out of scope for this project.
- Irrelevance of legacy compatibility: We will not accept complexity solely to support older Node releases, legacy package managers, or historical OS conventions. Prefer modern, standard APIs (ESM, global fetch, node:test) without shims/polyfills.
- Contributor guidance: When adding features, assume a modern environment and avoid conditional code paths for older runtimes. If a change incidentally breaks older versions but remains correct on Node 20+, it is acceptable.
- Backward compatibility: Old versions of this project will not be supported.
- Tests covering backwards compatibility: No.
- Changing tests to reflect new behavior: Yes, as long as the change is intentional.

Documentation policy
- Keep README.md up to date. When behavior, CLI options, configuration paths, supported platforms, or workflows change, update README.md in the same PR whenever possible. Minor internal refactors that do not alter user-facing behavior may skip README updates, but prefer updating examples and notes if they clarify usage. 
- PRs may be blocked during review if README is not updated to reflect user-visible changes.
