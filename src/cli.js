#!/usr/bin/env node
import { saveReceipt } from './save-receipt.js';
import { loginFlow } from './gog-login/gog-login.js';

/**
 * Print CLI help text to stdout.
 *
 * @returns {void}
 */
function printHelp() {
  const help = `
gog-receipts - Download and store your GOG purchase receipts as PDFs

Usage:
  gog-receipts login [code|url]
  gog-receipts <url> [--out <file>] [--format <A4|Letter|...>] [--no-background] [--viewport <WxH>] [--wait <event>] [--timeout <ms>] [--headful]

Commands:
  login               Authenticate with GOG. You can paste either the full redirect URL or just the code value.

Login flow:
  1. Run: gog-receipts login
  2. Open the printed GOG login URL in your browser and sign in.
  3. Copy the final redirect URL from your browser's address bar.
  4. Paste it back into the CLI when prompted, or pass it as an argument to 'login'.
  The tool will store two files under your config directory (Linux XDG: XDG_CONFIG_HOME or ~/.config):
    - loginCode.json: last one-time login code and timestamp
    - token.json: token payload used to access your account

Args:
  url                 The URL of the page to save as PDF.
  code|url            For login: either the redirect URL after logging in at GOG, or the code value itself.

Options:
  --out, -o           Output PDF file path (default: page.pdf)
  --format, -f        Paper format (default: A4)
  --no-background     Do not print CSS backgrounds (default: false)
  --viewport, -v      Viewport size as WIDTHxHEIGHT (default: 1280x800)
  --wait, -w          WaitUntil event for navigation: load|domcontentloaded|networkidle0|networkidle2 (default: networkidle0)
  --timeout, -t       Navigation timeout in ms (default: 60000)
  --headful           Run browser with UI (default: headless)
  --help, -h          Show this help
`;
  console.log(help);
}

/**
 * Parse command-line arguments into an options object.
 * Recognizes a 'login' subcommand and various flags for PDF saving.
 *
 * @param {string[]} argv Process arguments excluding the node and script path.
 * @returns {object} Parsed options. May include { help: true } or { error: true }.
 */
function parseArgs(argv) {
  const opts = {
    subcommand: undefined,
    subArg: undefined,
    url: 'https://www.gog.com/en/account/settings/orders',
    out: 'page.pdf',
    format: 'A4',
    printBackground: true,
    viewport: { width: 1280, height: 800 },
    waitUntil: 'networkidle0',
    timeout: 60000,
    headless: 'new'
  };

  const parts = [...argv];
  while (parts.length) {
    const token = parts.shift();

    if (token === '-h' || token === '--help') return { help: true };

    if (!opts.subcommand && (token === 'login')) {
      opts.subcommand = token;
      // next positional (if any) becomes subArg (code or url)
      if (parts.length && !parts[0].startsWith('-')) {
          opts.subArg = parts.shift();
      }
      // ignore the rest of flags for login
      continue;
    }

    if (!token.startsWith('-') && !opts.url) { opts.url = token; continue; }

    switch (token) {
      case '--out':
      case '-o': opts.out = parts.shift() ?? opts.out; break;
      case '--format':
      case '-f': opts.format = parts.shift() ?? opts.format; break;
      case '--no-background': opts.printBackground = false; break;
      case '--viewport':
      case '-v': {
        const val = parts.shift();
        if (val) {
          const m = val.toLowerCase().match(/^(\d+)x(\d+)$/);
          if (m) opts.viewport = { width: parseInt(m[1], 10), height: parseInt(m[2], 10) };
        }
        break;
      }
      case '--wait':
      case '-w': opts.waitUntil = parts.shift() ?? opts.waitUntil; break;
      case '--timeout':
      case '-t': opts.timeout = parseInt(parts.shift() ?? `${opts.timeout}`, 10); break;
      case '--headful': opts.headless = false; break;
      default:
        // Unknown flag or extra positional: treat as URL if not set yet
        if (!opts.url && !token.startsWith('-')) { opts.url = token; }
        else {
          console.error(`Unknown option: ${token}`);
          return { error: true };
        }
    }
  }
  return opts;
}

/**
 * CLI entry point. Parses args and executes either the login flow
 * or the receipt saving command. Exits the process with appropriate code.
 *
 * @returns {Promise<void>} Resolves when the CLI completes or exits.
 */
async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { printHelp(); process.exit(0); }

  // Handle subcommands first
  if (args.subcommand === 'login') {
    await loginFlow(args.subArg);
    process.exit(0);
  }

  if (args.error || !args.url) { printHelp(); process.exit(1); }

  const out = await saveReceipt({
    url: args.url,
    out: args.out,
    format: args.format,
    printBackground: args.printBackground,
    viewport: args.viewport,
    waitUntil: args.waitUntil,
    timeout: args.timeout,
    headless: args.headless,
  });
  console.log(`PDF saved: ${out}`);
}

run().catch(err => {
  console.error('Error:', err?.message || err);
  process.exit(1);
});
