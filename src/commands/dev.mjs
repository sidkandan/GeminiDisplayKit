/**
 * `gfmd dev` — boot the bridge, start a cloudflared quick-tunnel,
 * and print the install QR for the glasses.
 *
 * Order of operations is important: bridge first (so the tunnel has
 * something to proxy to), tunnel second (so we have the public URL),
 * QR last (so it encodes a URL that's already up).
 */
import path from "node:path";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { startBridge } from "../bridge/server.mjs";
import { startCloudflareTunnel } from "../utils/tunnel.mjs";
import { printQrToTerminal, writeQrPng, buildDeepLink } from "../utils/qr.mjs";

export async function run({ flags }) {
  const cwd = process.cwd();
  const configPath = await locateConfig(cwd);
  if (!configPath) {
    throw new Error(
      `no omni.config.mjs (or omni.config.js) found in ${cwd}\n` +
      `run \`gfmd create <name> --template adventure\` first`
    );
  }

  const mod = await import(pathToFileURL(configPath).href);
  const config = mod.default || mod.config;
  if (!config?.name) {
    throw new Error(`${configPath} must export a default config object with at least { name, routes }`);
  }

  const port = Number(flags.port || config.port || process.env.PORT || 8787);

  // 1. Bridge
  const { hud } = await startBridge(config, { cwd, port });

  // 2. Tunnel (optional)
  let publicUrl = null;
  if (!flags["no-tunnel"]) {
    try {
      const tunnel = await startCloudflareTunnel(port);
      publicUrl = tunnel.url;
    } catch (error) {
      console.warn(`[tunnel]    skipped: ${error.message}`);
    }
  } else {
    console.log("[tunnel]    skipped (--no-tunnel)");
  }

  // 3. Deep link + QR
  if (publicUrl && !flags["no-qr"]) {
    const deeplink = buildDeepLink(config.name, publicUrl + "/");
    console.log(`[deeplink]  ${deeplink}`);
    const qrPath = path.join(cwd, "artifacts", "install-qr.png");
    try {
      const { promises: fs } = await import("node:fs");
      await fs.mkdir(path.dirname(qrPath), { recursive: true });
      const ok = await writeQrPng(deeplink, qrPath);
      if (ok) console.log(`[qr]        saved to ${path.relative(cwd, qrPath)}`);
    } catch (error) {
      console.warn(`[qr]        PNG write skipped: ${error.message}`);
    }
    console.log("");
    await printQrToTerminal(deeplink);
    console.log("");
    console.log(`Scan with the Pixel camera → Meta AI → "Add Web App" → Add`);
  } else if (!publicUrl) {
    console.log(`\nOpen http://localhost:${port}/ in your browser to test the HUD locally.`);
  }

  // Keep the process alive; bridge has its own server, but we want a clean SIGINT.
  console.log(`\nPress Ctrl+C to stop.`);
  await new Promise((resolve) => process.on("SIGINT", resolve));
  console.log("\n[bridge]    shutting down…");
  process.exit(0);
}

async function locateConfig(cwd) {
  const candidates = ["omni.config.mjs", "omni.config.js"];
  for (const file of candidates) {
    const full = path.join(cwd, file);
    if (existsSync(full)) return full;
  }
  return null;
}
