#!/usr/bin/env node
import { saveReceipt } from './save-receipt.js';

function printHelp() {
  const help = `
gog-receipts - Downloads and stores GOG purchase receipts for easy access

Usage:
  gog-receipts <url> [--out <file>] [--format <A4|Letter|...>] [--no-background] [--viewport <WxH>] [--wait <event>] [--timeout <ms>] [--headful]

Args:
  url                 The URL of the page to save as PDF.

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

function parseArgs(argv) {
  const opts = {
    url: undefined,
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

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { printHelp(); process.exit(0); }
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
