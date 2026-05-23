#!/usr/bin/env node
/**
 * gdk — CLI entry point.
 *
 * Subcommands:
 *   create <name> --template <t>   scaffold a new project
 *   dev                            run bridge + tunnel + auto-QR
 *   deploy                         mint deeplink + QR for a public URL
 *   doctor                         check Pixel / Stella / entitlements
 *   capture --source dat|pixel     operator-gated frame capture for testing
 *   agent run [--prompt p]         one-shot managed-agent invocation
 *
 * Every subcommand is a thin shell over functions in src/cli.mjs so the CLI
 * stays trivial and testable.
 */
import { dispatch } from "../src/cli.mjs";

const argv = process.argv.slice(2);
const [command, ...rest] = argv;

try {
  await dispatch(command, rest);
} catch (error) {
  console.error(`gdk: ${error.message}`);
  if (process.env.OMNI_DEBUG) console.error(error.stack);
  process.exit(1);
}
