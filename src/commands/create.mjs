/**
 * `gdk create <name> --template <t>`
 *
 * Copies the named template from <framework>/templates/<t>/ into ./<name>/
 * and rewrites the project name in package.json + README.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { FRAMEWORK_ROOT } from "../cli.mjs";

const KNOWN_TEMPLATES = ["adventure", "arena", "scanner", "rhythm", "quest"];

export async function run({ positional, flags }) {
  const name = positional[0];
  if (!name) {
    throw new Error("create: missing project name\nUsage: gdk create <name> --template <t>");
  }
  const template = flags.template || "adventure";
  if (!KNOWN_TEMPLATES.includes(template)) {
    throw new Error(`unknown template "${template}". Pick one of: ${KNOWN_TEMPLATES.join(", ")}`);
  }
  const parentDir = path.resolve(flags.dir || process.cwd());
  const dest = path.join(parentDir, name);

  try {
    await fs.access(dest);
    throw new Error(`directory already exists: ${dest}`);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  const srcDir = path.join(FRAMEWORK_ROOT, "templates", template);
  try { await fs.access(srcDir); }
  catch { throw new Error(`template not found at ${srcDir} — this is a framework bug`); }

  await copyDir(srcDir, dest);
  await rewriteProjectName(dest, name);

  console.log(`✓ Created ${dest} from template "${template}"\n`);
  console.log(`Next:`);
  console.log(`  cd ${path.relative(process.cwd(), dest) || name}`);
  console.log(`  cp .env.example .env   # then set GEMINI_API_KEY`);
  console.log(`  npm install`);
  console.log(`  npx gdk dev`);
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else await fs.copyFile(s, d);
  }
}

async function rewriteProjectName(dir, name) {
  // package.json — also rewrite the parsed name field for safety
  const pkgPath = path.join(dir, "package.json");
  try {
    const raw = await fs.readFile(pkgPath, "utf8");
    const pkg = JSON.parse(raw.replace(/\{\{NAME\}\}/g, name));
    pkg.name = name;
    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  } catch {
    // Template may not have a package.json; that's fine.
  }

  // Walk the rest of the tree, substituting in every text file.
  const TEXT_EXT = new Set([".md", ".mjs", ".js", ".cjs", ".html", ".css", ".json", ".txt"]);
  await walk(dir, async (filePath) => {
    if (filePath.endsWith("package.json")) return;       // already handled
    const ext = path.extname(filePath).toLowerCase();
    if (!TEXT_EXT.has(ext)) return;
    try {
      const text = await fs.readFile(filePath, "utf8");
      if (!text.includes("{{NAME}}")) return;
      await fs.writeFile(filePath, text.replace(/\{\{NAME\}\}/g, name));
    } catch { /* binary or unreadable — skip */ }
  });
}

async function walk(dir, visit) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, visit);
    else await visit(full);
  }
}
