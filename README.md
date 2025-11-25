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

## Authentication and login (gog-login)

This project provides a small authentication module used by the CLI:

- High-level flow: loginFlow(codeOrUrl?)
  - Reuses an existing token if present (refreshes when possible).
  - Otherwise tries a stored one-time login code.
  - Otherwise accepts a URL/code passed by the user.
  - Otherwise prompts interactively, printing a GOG login URL to open.
- Persistence: the following files are written under your config directory
  (XDG_CONFIG_HOME on Linux/macOS, APPDATA on Windows), inside gog-receipts/:
  - loginCode.json: stores { loginCode, createdAt }
  - token.json: stores the token payload returned by GOG

CLI usage for login:

  gog-receipts login [code|url]

You can paste either the full redirect URL you get after signing in at GOG or the code parameter value itself.

Note: Tests stub network calls and isolate config directories. Do not commit real tokens.

## Compatibility
- Runtime: Node.js 20+ only. While Node 18+ may happen to work during development, the project targets Node 20 for CI and local development.
- Irrelevance of legacy compatibility: Supporting older Node versions or legacy environments is out of scope. We avoid shims/polyfills and prefer modern, standard APIs (ESM modules, global fetch, node:test). Requests to add complexity solely to support older versions will not be accepted.

## TODOs
- add keytar (or a similar package like node-keytar) to store the sensitive token securely instead of writing it to a file.
- finish authentication module
- download receipts