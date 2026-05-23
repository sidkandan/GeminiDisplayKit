/**
 * src/utils/tunnel.mjs — Cloudflare quick-tunnel helper.
 *
 * Spawns `cloudflared tunnel --url http://localhost:<port>` and waits for it
 * to print the assigned https://*.trycloudflare.com URL. Logs to a temp
 * file so the orchestrator can re-scan if the parent process restarts.
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync, openSync } from "node:fs";
import path from "node:path";
import os from "node:os";

export async function startCloudflareTunnel(port, { quiet = false } = {}) {
  if (!commandExists("cloudflared")) {
    throw new Error(
      "cloudflared not found in PATH. Install with `brew install cloudflared` " +
        "(macOS) or see https://github.com/cloudflare/cloudflared/releases."
    );
  }

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "omni-tunnel-"));
  const logPath = path.join(tmpDir, "tunnel.log");
  const logFd = openSync(logPath, "w");

  const child = spawn("cloudflared", ["tunnel", "--url", `http://localhost:${port}`], {
    stdio: ["ignore", logFd, logFd],
    detached: false,
  });

  // Poll the log for the trycloudflare URL.
  const url = await pollForUrl(logPath, 30_000);
  if (!url) {
    try { child.kill(); } catch {}
    throw new Error(`cloudflared did not produce a URL within 30s; check ${logPath}`);
  }
  if (!quiet) console.log(`[tunnel]    ${url}`);

  return {
    url,
    logPath,
    stop: () => { try { child.kill(); } catch {} },
  };
}

function commandExists(cmd) {
  const res = spawnSync("which", [cmd], { stdio: ["ignore", "pipe", "ignore"] });
  return res.status === 0;
}

async function pollForUrl(logPath, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(logPath)) {
      const text = readFileSync(logPath, "utf8");
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match) return match[0];
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}
