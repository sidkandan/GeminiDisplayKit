/**
 * `gdk deploy --url <https-url> --name <AppName>` —
 *  mint a deep-link + QR for a public HTTPS URL.
 *
 * Use this when you've hosted your bridge somewhere stable (Cloud Run,
 * a paid Cloudflare named tunnel, Vercel, Fly, etc.) and you want a
 * QR that doesn't rotate every restart.
 */
import path from "node:path";
import { promises as fs } from "node:fs";
import { printQrToTerminal, writeQrPng, buildDeepLink } from "../utils/qr.mjs";

export async function run({ flags }) {
  const url = flags.url;
  const name = flags.name || "OmniGlass";
  if (!url) {
    throw new Error("deploy: --url <https-url> is required");
  }
  const deeplink = buildDeepLink(name, url);
  console.log(`[deeplink]  ${deeplink}`);

  const outPath = path.resolve(flags.out || "artifacts/install-qr.png");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const ok = await writeQrPng(deeplink, outPath);
  if (ok) console.log(`[qr]        saved to ${outPath}`);
  console.log("");
  await printQrToTerminal(deeplink);
}
