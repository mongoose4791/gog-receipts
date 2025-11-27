#!/usr/bin/env node
import {saveReceipts} from './save-receipt/save-receipts.js';
import {loginFlow} from './gog-login/gog-login.js';
import {parseArgs, printHelp} from './cli-helpers.js';

/**
 * CLI entry point. Parses args and executes either the login flow
 * or the receipt saving command. Exits the process with appropriate code.
 *
 * @returns {Promise<void>} Resolves when the CLI completes or exits.
 */
async function run() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        printHelp();
        process.exit(0);
    }

    // Login flow (no external code/URL in default command)
    const token = await loginFlow(args.subArg);

    // Handle subcommands first
    if (args.subcommand === 'login') {
        process.exit(0);
    }

    // Generate PDFs for all discovered receipt preview pages.
    const saved = await saveReceipts({
        receiptsDir: args.receiptsDir,
        printBackground: args.printBackground,
        viewport: args.viewport,
        waitUntil: args.waitUntil,
        timeout: args.timeout,
        headless: args.headless,
        token,
        onProgress: (evt) => {
            // Live updates to stdout without coupling tests to logs
            try {
                switch (evt?.type) {
                    case 'navigating':
                        process.stdout.write(`Navigating: ${evt.url}\n`);
                        break;
                    case 'found':
                        process.stdout.write(`Found ${evt.count} receipt preview link(s)\n`);
                        break;
                    case 'processing':
                        process.stdout.write(`Processing [${evt.index + 1}/${evt.total}]: ${evt.url}\n`);
                        break;
                    case 'saved':
                        process.stdout.write(`Saved [${evt.index + 1}/${evt.total}]: ${evt.path}\n`);
                        break;
                    case 'done':
                        process.stdout.write(`Done. Saved ${evt.saved} file(s).\n`);
                        break;
                }
            } catch {
            }
        }
    });
    process.stdout.write(`Saved ${saved.length} receipt PDF(s) to ${args.receiptsDir}\n`);
}

run().catch(err => {
    console.error('Error:', err?.message || err);
    process.exit(1);
});
