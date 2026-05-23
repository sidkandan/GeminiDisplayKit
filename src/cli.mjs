/**
 * src/cli.mjs — command dispatch + flag parsing.
 *
 * Each command lives behind a lazy import so a `--help` call costs nothing
 * and a missing optional dep (cloudflared, qrcode) only matters if you
 * actually use it.
 */
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const FRAMEWORK_ROOT = path.resolve(__dirname, "..");

const COMMANDS = {
  create: "src/commands/create.mjs",
  dev: "src/commands/dev.mjs",
  deploy: "src/commands/deploy.mjs",
  doctor: "src/commands/doctor.mjs",
  capture: "src/commands/capture.mjs",
  agent: "src/commands/agent.mjs",
};

const USAGE = `gdk <command> [options]

Commands:
  create <name>       scaffold a new game project from a template
                      --template adventure|arena|scanner|rhythm|quest
                      --dir <path>   parent directory (default: cwd)

  dev                 run bridge + cloudflared tunnel + auto-QR
                      --port <n>     bridge port (default: 8787)
                      --no-tunnel    skip cloudflared; localhost only
                      --no-qr        skip QR generation

  deploy              mint a deep-link + QR for a public HTTPS URL
                      --url <https-url>   the public glasses-reachable URL
                      --name <AppName>    Web App display name
                      --out <path>        QR PNG output path

  doctor              check Pixel ADB + Stella + CameraAccess entitlement
                      --serial <id>       ADB device serial

  capture             operator-gated frame capture (for testing your bridge)
                      --source dat|pixel  capture source

  agent run           one-shot managed-agent invocation
                      --prompt <text>
                      --agent <id>        default: antigravity-preview-05-2026

Global options:
  --help, -h          show this message
  --version, -v       show framework version
  OMNI_DEBUG=1        print stack traces

Examples:
  npx gdk create my-game --template adventure
  gdk dev
  gdk deploy --url https://my-tunnel.trycloudflare.com --name MyGame

Docs: https://github.com/sidkandan/GeminiDisplayKit#readme
`;

const VERSION = "0.1.0";

export async function dispatch(command, args) {
  if (!command || command === "--help" || command === "-h" || command === "help") {
    console.log(USAGE);
    return;
  }
  if (command === "--version" || command === "-v" || command === "version") {
    console.log(VERSION);
    return;
  }
  const entry = COMMANDS[command];
  if (!entry) {
    console.error(`unknown command: ${command}\n\n${USAGE}`);
    process.exit(2);
  }
  const mod = await import(path.join(FRAMEWORK_ROOT, entry));
  const opts = parseFlags(args);
  await mod.run(opts);
}

/**
 * Tiny flag parser: --key value, --flag (boolean), positional[].
 * Good enough for our surface; avoids a yargs/commander dep.
 */
export function parseFlags(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i += 1;
      }
    } else if (token.startsWith("-")) {
      flags[token.slice(1)] = true;
    } else {
      positional.push(token);
    }
  }
  return { positional, flags };
}
