# gog-receipts

![Status](https://img.shields.io/badge/status-in_development-orange)

Important: This project is currently in active development and is not ready for use yet. Interfaces, behavior, and documentation may change without notice. Please do not rely on it for production or personal workflows at this time.

![GitHub stars](https://img.shields.io/github/stars/mongoose4791/gog-receipts)

![License](https://img.shields.io/badge/license-Hippocratic%203.0-blue)
![GitHub issues](https://img.shields.io/github/issues/mongoose4791/gog-receipts)
![GitHub pull requests](https://img.shields.io/github/issues-pr/mongoose4791/gog-receipts)
![Last commit](https://img.shields.io/github/last-commit/mongoose4791/gog-receipts)

A simple command-line tool for automatically downloading and storing your
official GOG purchase receipts, providing easy access for tax, documentation,
and long-term preservation.

Note on OS support: This project targets Linux only. We adhere strictly to Linux XDG conventions for configuration and do not support Windows or macOS paths/environments.

## Compatibility

- Operating system: Linux only. Windows and macOS are not supported; contributions that add complexity solely for non-Linux platforms will not be accepted.
- Runtime: Node.js 20+ only. While Node 18+ may happen to work during development, the project targets Node 20 for CI and local development.
- Irrelevance of legacy compatibility: Supporting older Node versions or legacy environments is out of scope. We avoid shims/polyfills and prefer modern, standard APIs (ESM modules, global fetch, node:test). Requests to add complexity solely to support older versions will not be accepted.

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

   This project uses Puppeteer for automating receipt downloads. Install the managed Chrome binary once using the provided script:

   ```sh
   npm run browser:install
   ```

4. Run the CLI locally

   Start the CLI:

   ```sh
   npm run cli
   ```

   Run the login flow only (included in `npm run cli`):

   ```sh
   npm run login
   ```

5. Run tests

   ```sh
   npm test
   ```

## TODOs

- Add keytar (or a similar package like node-keytar) to store the sensitive token securely instead of writing it to a file.
- Finish authentication module.
- Download receipts.