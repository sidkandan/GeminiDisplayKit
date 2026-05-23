/**
 * src/utils/qr.mjs — QR code generation.
 *
 * Uses the `qrcode` npm dep (declared in package.json) for PNG output.
 * Falls back to a UTF-8 terminal QR if `qrcode` isn't available, so the
 * dev tunnel command always prints SOMETHING you can point your phone at.
 */
import { existsSync, writeFileSync } from "node:fs";

let qrcodeMod = null;
async function loadQr() {
  if (qrcodeMod) return qrcodeMod;
  try {
    qrcodeMod = await import("qrcode");
    return qrcodeMod;
  } catch {
    return null;
  }
}

/** Render a QR to the terminal as Unicode block characters. */
export async function printQrToTerminal(text) {
  const mod = await loadQr();
  if (mod?.default?.toString) {
    const ascii = await mod.default.toString(text, { type: "terminal", small: true });
    process.stdout.write(ascii + "\n");
    return;
  }
  console.log(`[qr] (install qrcode dep for terminal QR) URL: ${text}`);
}

/** Write a PNG to disk. Returns true on success, false if dep missing. */
export async function writeQrPng(text, outPath) {
  const mod = await loadQr();
  if (!mod?.default?.toFile) {
    console.warn(`[qr] qrcode dep not available — skipping PNG write (${outPath})`);
    return false;
  }
  await mod.default.toFile(outPath, text, {
    type: "png",
    width: 640,
    margin: 2,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
  return existsSync(outPath);
}

/** Build the Meta deep-link URL. */
export function buildDeepLink(appName, appUrl) {
  if (!/^https:\/\//.test(appUrl)) {
    throw new Error(`Meta Web Apps require https:// URLs (got: ${appUrl})`);
  }
  return `fb-viewapp://web_app_deep_link?appName=${encodeURIComponent(appName)}&appUrl=${encodeURIComponent(appUrl)}`;
}
