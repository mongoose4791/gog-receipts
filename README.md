# gog-receipts

![GitHub stars](https://img.shields.io/github/stars/mongoose4791/gog-receipts)

![License](https://img.shields.io/badge/license-Hippocratic%203.0-blue)
![GitHub issues](https://img.shields.io/github/issues/mongoose4791/gog-receipts)
![GitHub pull requests](https://img.shields.io/github/issues-pr/mongoose4791/gog-receipts)
![Last commit](https://img.shields.io/github/last-commit/mongoose4791/gog-receipts)

A simple command-line tool for automatically downloading and storing your
official [GOG](https://www.gog.com/) purchase receipts, providing easy access for tax, documentation,
and long-term preservation.

## Compatibility

- Operating system: Linux only. Windows and macOS are not supported;
- Runtime: Node.js 20+ only. While Node 18+ may happen to work during development, the project targets Node 20 for CI
  and local development.

## Setup

Follow these steps to get the project running locally.

### Prerequisites

    - Linux environment

- Install [Node.js](https://nodejs.org/) which includes [Node Package Manager](https://www.npmjs.com/)
- Navigate into the root directory (where this README.md is) via CLI

### Installation of dependencies

Use npm ci for a clean, reproducible installation:

   ```sh
   npm ci
   ```

### Install the browser used by Puppeteer

This project uses [Puppeteer](https://pptr.dev/) with [Firefox](https://www.mozilla.org/firefox/) for automating receipt
downloads. Install the managed Firefox binary once
using the provided script:

   ```sh
   npm run browser:install
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

### Main CLI Command
```sh
npm run cli -- [options]
```

#### Options

| Option            | Alias | Description                                                                        | Default            |
|:------------------|:------|:-----------------------------------------------------------------------------------|:-------------------|
| `--receipts-dir`  | `-d`  | Output directory for PDFs                                                          | `receipts`         |
| `--no-background` |       | Do not print CSS backgrounds                                                       | `false`            |
| `--viewport`      | `-v`  | Viewport size as WIDTHxHEIGHT                                                      | `1280x800`         |
| `--wait`          | `-w`  | WaitUntil event for navigation: load\|domcontentloaded\|networkidle0\|networkidle2 | `networkidle0`     |
| `--timeout`       | `-t`  | Navigation timeout in ms                                                           | `60000`            |
| `--headful`       |       | Run browser with UI                                                                | `false` (headless) |
| `--help`          | `-h`  | Show help                                                                          |                    |

### Login flow only

```sh
npm run login
```

### Run tests

   ```sh
   npm test
   ```

## Contact

Issues and pull requests are welcome on [GitHub](https://github.com/mongoose4791/gog-receipts).

## Roadmap

- Secure token storage using system keychain (e.g., keytar).
- Improve receipt link discovery to use a more robust API-based approach instead of web scraping.