# gog-receipts

![GitHub stars](https://img.shields.io/github/stars/mongoose4791/gog-receipts)

![License](https://img.shields.io/badge/license-Hippocratic%203.0-blue)
![GitHub issues](https://img.shields.io/github/issues/mongoose4791/gog-receipts)
![GitHub pull requests](https://img.shields.io/github/issues-pr/mongoose4791/gog-receipts)
![Last commit](https://img.shields.io/github/last-commit/mongoose4791/gog-receipts)

A simple command-line tool for automatically downloading and storing your
official GOG purchase receipts, providing easy access for tax, documentation,
and long-term preservation.

Note on OS support: This project targets Linux only. We adhere strictly to Linux XDG conventions for configuration and
do not support Windows or macOS paths/environments.

## Compatibility

- Operating system: Linux only. Windows and macOS are not supported;
- Runtime: Node.js 20+ only. While Node 18+ may happen to work during development, the project targets Node 20 for CI
  and local development.
- Irrelevance of legacy compatibility: Supporting older Node versions or legacy environments is out of scope. We avoid
  shims/polyfills and prefer modern, standard APIs (ESM modules, global fetch, node:test). Requests to add complexity
  solely to support older versions will not be accepted.

## Setup

Follow these steps to get the project running locally.

1. Prerequisites
    - Linux environment
    - Node.js 20+ (recommended for parity with CI)

2. Install dependencies

   Use npm ci for a clean, reproducible install:

   ```sh
   npm ci
   ```

3. Install the browser used by Puppeteer

   This project uses Puppeteer with Firefox for automating receipt downloads. Install the managed Firefox binary once
   using the provided script:

   ```sh
   npm run browser:install
   ```

4. Run tests

   ```sh
   npm test
   ```

## How it works

- ESM-only: The project uses native ES modules. There is no build step; sources run directly on Node 20+.
- Entry points:
    - CLI: src/cli.js
    - Library: src/gog-login/gog-login.js, src/save-receipt/save-receipts.js
- Config location (Linux/XDG only):
    - Root: $XDG_CONFIG_HOME/gog-receipts/ or ~/.config/gog-receipts/
    - Files created by the login flow:
        - loginCode.json: stores the last one-time login code with a timestamp
        - token.json: stores the token payload (e.g., access_token, refresh_token)
    - Parent directories are always created with fs.mkdirSync(dir, { recursive: true }).

## Usage

Login flow only:

```sh
npm run login
```

Full CLI (login then download receipts):

```sh
npm run cli -- [options]
```

Options:

- --receipts-dir, -d: Output directory for PDFs (default: receipts)
- --no-background: Do not print CSS backgrounds
- --viewport, -v: Viewport size as WIDTHxHEIGHT (default: 1280x800)
- --wait, -w: load|domcontentloaded|networkidle0|networkidle2 (default: networkidle0)
- --timeout, -t: Navigation timeout in ms (default: 60000)
- --headful: Run browser with UI (default is headless)

Notes:

- Linux only. Windows and macOS paths are not supported.

## Contact

For questions, issues, or security disclosures, please reach out to me
at [GitHub](https://github.com/mongoose4791/gog-receipts).
Answers may take a long time. This repo is not the center of my life.

## TODOs

- Add keytar (or a similar package like node-keytar) to store the sensitive token securely instead of writing it to a
  file.
- cleanup
- better way to gather links to receipts