#!/usr/bin/env node
/**
 * scripts/smoke.mjs — `npm test` entry point.
 *
 * Smoke-tests the framework without making any network calls. Verifies:
 *   - CLI dispatches every documented subcommand
 *   - `gfmd create` scaffolds a template into a temp dir
 *   - Tool modules export the expected functions (no Gemini calls)
 *   - The bridge `defineGame` shape validates
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
    passed += 1;
  } catch (error) {
    console.error(`  ✗ ${label}\n    ${error.message}`);
    failed += 1;
  }
}

function cli(...args) {
  return spawnSync("node", [path.join(root, "bin/gfmd.mjs"), ...args], {
    encoding: "utf8",
    cwd: root,
  });
}

console.log("\nCLI dispatch:");
test("--help prints usage", () => {
  const r = cli("--help");
  if (r.status !== 0) throw new Error(`exit ${r.status}`);
  if (!r.stdout.includes("Commands:")) throw new Error("missing Commands: header");
});
test("--version prints semver", () => {
  const r = cli("--version");
  if (r.status !== 0) throw new Error(`exit ${r.status}`);
  if (!/^\d+\.\d+\.\d+/.test(r.stdout.trim())) throw new Error(`unexpected version: ${r.stdout.trim()}`);
});
test("unknown command exits non-zero", () => {
  const r = cli("nope");
  if (r.status === 0) throw new Error("should have failed");
});
test("create with no name errors", () => {
  const r = cli("create");
  if (r.status === 0) throw new Error("should have failed");
});

console.log("\nScaffold:");
const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "gfmd-smoke-"));
try {
  test("create adventure template into temp dir", () => {
    const r = cli("create", "myproj", "--template", "adventure", "--dir", tmpRoot);
    if (r.status !== 0) throw new Error(`exit ${r.status}: ${r.stderr || r.stdout}`);
    const projDir = path.join(tmpRoot, "myproj");
    for (const f of ["omni.config.mjs", "package.json", "display/index.html", "display/app.js", "display/styles.css", "README.md", ".env.example"]) {
      if (!existsSync(path.join(projDir, f))) throw new Error(`missing ${f}`);
    }
  });
  test("scaffold substitutes {{NAME}} everywhere", () => {
    const projDir = path.join(tmpRoot, "myproj");
    for (const f of ["omni.config.mjs", "package.json", "README.md", "display/index.html"]) {
      const content = readFileSync(path.join(projDir, f), "utf8");
      if (content.includes("{{NAME}}")) throw new Error(`${f} still contains {{NAME}}`);
      if (!content.includes("myproj")) throw new Error(`${f} doesn't contain project name`);
    }
  });
  test("scaffolded package.json declares omni-glass-compatible dep", () => {
    const projDir = path.join(tmpRoot, "myproj");
    const pkg = JSON.parse(readFileSync(path.join(projDir, "package.json"), "utf8"));
    if (!pkg.dependencies?.["gemini-flash-meta-displays"]) {
      throw new Error("scaffolded package.json missing dependency on gemini-flash-meta-displays");
    }
  });
} finally {
  try { rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* */ }
}

console.log("\nModule shape:");
test("framework SDK exports defineGame", async () => {
  const mod = await import(path.join(root, "src/index.mjs"));
  if (typeof mod.defineGame !== "function") throw new Error("defineGame is not a function");
  if (!mod.tools) throw new Error("tools is not exported");
  if (typeof mod.startBridge !== "function") throw new Error("startBridge is not a function");
});
test("defineGame rejects missing name", async () => {
  const mod = await import(path.join(root, "src/index.mjs"));
  let threw = false;
  try { mod.defineGame({}); } catch { threw = true; }
  if (!threw) throw new Error("defineGame should reject empty config");
});
test("tools barrel exports every wrapper", async () => {
  const tools = await import(path.join(root, "src/tools/index.mjs"));
  for (const name of ["runManagedAgent", "generateScene", "scenePrompt", "runLyriaClip", "generateTTS", "generateCinematic", "requestStructured", "getClient"]) {
    if (typeof tools[name] !== "function") throw new Error(`tools.${name} is not a function`);
  }
});

console.log("\nResults:");
console.log(`  ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
