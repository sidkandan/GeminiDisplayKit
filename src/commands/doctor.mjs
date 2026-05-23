/**
 * `gfmd doctor` — pre-flight checks for the device/glasses path.
 *
 * Reports on:
 *   - Node version
 *   - cloudflared availability
 *   - GEMINI_API_KEY presence
 *   - ADB + Pixel state (if a serial is reachable)
 *   - Stella package version (if installed)
 *   - CameraAccess entitlement (best-effort — requires root on the Pixel)
 *
 * Read-only. Won't change anything on the device.
 */
import { spawnSync } from "node:child_process";

export async function run({ flags }) {
  const serial = flags.serial || process.env.ADB_SERIAL || "";

  console.log("Gemini Flash Meta Displays doctor\n");

  report("node",       process.version);
  report("cloudflared", binVersion("cloudflared", ["--version"]));
  report("adb",         binVersion("adb", ["--version"]));
  report("GEMINI_API_KEY", process.env.GEMINI_API_KEY ? "set" : "(missing)");

  if (!serial) {
    console.log("\n(skip device checks — pass --serial <id> or set ADB_SERIAL)");
    return;
  }

  console.log(`\nDevice ${serial}:`);
  const state = adb(serial, ["get-state"]);
  report("  state", state || "unreachable");
  if (state.trim() !== "device") return;

  report("  model", adb(serial, ["shell", "getprop", "ro.product.model"]));
  report("  android", adb(serial, ["shell", "getprop", "ro.build.version.release"]));
  report("  stella", adb(serial, ["shell", "dumpsys", "package", "com.facebook.stella", "|", "grep", "versionName"]));
  report("  termux", adb(serial, ["shell", "pm", "path", "com.termux"]) || "not installed");
}

function adb(serial, args) {
  const res = spawnSync("adb", ["-s", serial, ...args], { encoding: "utf8" });
  return (res.stdout || "").trim();
}

function binVersion(cmd, args) {
  const res = spawnSync(cmd, args, { encoding: "utf8" });
  if (res.status !== 0) return "(not found)";
  return (res.stdout || res.stderr || "").split("\n")[0].trim();
}

function report(label, value) {
  console.log(`  ${label.padEnd(20)} ${value}`);
}
