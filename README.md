# gog-receipts

![GitHub stars](https://img.shields.io/github/stars/mongoose4791/gog-receipts)
![GitHub followers](https://img.shields.io/github/followers/mongoose4791?label=Follow)

![GitHub issues](https://img.shields.io/github/issues/mongoose4791/gog-receipts?color=forestgreen)
![GitHub pull requests](https://img.shields.io/github/issues-pr/mongoose4791/gog-receipts?color=forestgreen)
![Last commit](https://img.shields.io/github/last-commit/mongoose4791/gog-receipts?color=forestgreen)

![License](https://img.shields.io/badge/license-SSPL-blue)
![Node](https://img.shields.io/badge/node-20%2B-blue)
![Linux](https://img.shields.io/badge/platform-linux--only-blue)
![npm](https://img.shields.io/npm/v/gog-receipts)


## About
Retrieving official purchase receipts from GOG for tax purposes or digital preservation is a tedious, manual process of navigating order history and printing individual pages.

This Linux-based Node.js tool automates the entire workflow. It logs in, discovers your orders, and archives official [GOG](https://www.gog.com/) receipts as PDFs. It supports usage as a standalone CLI or a library integrated into other projects.

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

Run the CLI with the desired options:
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

#### Command Examples

Standard run: Downloads all receipts to the default `receipts` folder.
    
```sh
npm run cli
```

Custom output directory: Saves PDFs to a specific folder (e.g., `my-docs`).
    
```sh
npm run cli -- --receipts-dir ./my-docs
```

Visible browser (Headful): Runs the browser with the UI visible. Useful for debugging or seeing the process in action.
    
```sh
npm run cli -- --headful
```

Increased timeout: Sets the navigation timeout to 120 seconds. Helpful for slow internet connections.

```sh
npm run cli -- --timeout 120000
```

Login flow only: Logs in to GOG and saves the token to the config file. Useful for running the script without downloading receipts.

```sh
npm run cli -- login
```

Run tests: Runs the test suite.

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

## Contact

Issues and pull requests are welcome on [GitHub](https://github.com/mongoose4791/gog-receipts).

## Roadmap

- Secure token storage using system keychain (e.g., keytar).
- Improve receipt link discovery to use a more robust API-based approach instead of web scraping.
- Continue download on network errors.
- Continue download after the process is interrupted (also redownload the last file just in case).