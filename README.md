# gog-receipts

![GitHub stars](https://img.shields.io/github/stars/mongoose4791/gog-receipts)

[![Star this repository](https://img.shields.io/github/stars/mongoose4791/gog-receipts?style=social)](https://github.com/mongoose4791/gog-receipts/stargazers)


[![Hippocratic License HL3-CL-LAW-MIL-SOC-SV](https://img.shields.io/static/v1?label=Hippocratic%20License&message=HL3-CL-LAW-MIL-SOC-SV&labelColor=5e2751&color=bc8c3d)](https://firstdonoharm.dev/version/3/0/cl-law-mil-soc-sv.html)
![Node version](https://img.shields.io/badge/node-%E2%89%A520-brightgreen)
![GitHub issues](https://img.shields.io/github/issues/mongoose4791/gog-receipts)
![GitHub pull requests](https://img.shields.io/github/issues-pr/mongoose4791/gog-receipts)
![Last commit](https://img.shields.io/github/last-commit/mongoose4791/gog-receipts)

A Linux-based Node.js tool and library for automatically downloading and archiving
official [GOG](https://www.gog.com/) purchase receipts as PDFs. Designed for tax documentation
and digital preservation, it can be used as a standalone CLI or integrated programmatically into other projects.

## Compatibility

- Operating system: Linux only. Windows and macOS are not supported.
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

## Usage

### 1. CLI Usage

#### Main Command
```sh
npm run cli -- [options]
```

Options:

| Option            | Alias | Description                                                                        | Default            |
|:------------------|:------|:-----------------------------------------------------------------------------------|:-------------------|
| `--receipts-dir`  | `-d`  | Output directory for PDFs                                                          | `receipts`         |
| `--no-background` |       | Do not print CSS backgrounds                                                       | `false`            |
| `--viewport`      | `-v`  | Viewport size as WIDTHxHEIGHT                                                      | `1280x800`         |
| `--wait`          | `-w`  | WaitUntil event for navigation: load\|domcontentloaded\|networkidle0\|networkidle2 | `networkidle0`     |
| `--timeout`       | `-t`  | Navigation timeout in ms                                                           | `60000`            |
| `--headful`       |       | Run browser with UI                                                                | `false` (headless) |
| `--help`          | `-h`  | Show help                                                                          |                    |

#### Login flow only

```sh
npm run cli -- login
```

#### Run tests

```sh
npm test
```

### 2. Library Usage
    
You can import the core functions into your own Node.js project like this:
    
```javascript
import { loginFlow, saveReceipts } from 'gog-receipts';

// Example usage wrapped in an async function
async function main() {
  // 1. Login (interactive or with code)
  // Returns the token object and saves it to config
  const token = await loginFlow();
    
  // 2. Save receipts
  // Returns an array of saved file paths
  const savedFiles = await saveReceipts({
    receiptsDir: './my-receipts',
    token: token, // Optional if token is already saved in config
    headless: true, // Run browser invisibly (default)
    onProgress: (event) => console.log(event) 
  });
      
  console.log(`Saved ${savedFiles.length} files.`);
}
    
main();
```


- ESM-only: The project uses native ES modules. There is no build step; sources run directly on Node 20+.
- Entry points:
    - CLI: src/cli.js
    - Library: src/index.js
- Config location (Linux/XDG only):
    - Root: $XDG_CONFIG_HOME/gog-receipts/ or ~/.config/gog-receipts/
    - Files created by the login flow:
        - loginCode.json: stores the last one-time login code with a timestamp
        - token.json: stores the token payload (e.g., access_token, refresh_token)
    - Parent directories are always created with fs.mkdirSync(dir, { recursive: true }).

## Contact

Issues and pull requests are welcome on [GitHub](https://github.com/mongoose4791/gog-receipts).

## Roadmap

- Secure token storage using system keychain (e.g., keytar).
- Improve receipt link discovery to use a more robust API-based approach instead of web scraping.