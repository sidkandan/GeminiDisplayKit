/**
 * bridge/server.mjs — the framework's HTTP + SSE + static spine.
 *
 * Game-agnostic. A game project supplies `routes` (and optionally `display`,
 * `onStart`) via its omni.config.mjs and the bridge mounts them at request
 * time. The bridge owns:
 *
 *   GET  /                serve the display (game's display dir, default ./display)
 *   GET  /events          server-sent events (SSE) — push to the HUD
 *   GET  /api/health      ok / model / agent / last event metadata
 *   GET  /api/replay      last broadcast event (for SSE clients that miss it)
 *   ANY  /<game-route>    every key in config.routes
 *   GET  /*               otherwise serve static files from display dir
 *
 * It does NOT bake in any specific game (no PaletteQuest steps, no Pulseblade
 * level designer, etc.). Those live in templates/examples.
 */
import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Start the bridge.
 *
 * @param {object} config - resolved game config (from omni.config.mjs)
 * @param {object} [options]
 * @param {string} [options.cwd]          project root (defaults to process.cwd())
 * @param {number} [options.port]
 * @param {string} [options.host]
 * @returns {Promise<{server: http.Server, hud: SseBus, stop: () => Promise<void>}>}
 */
export async function startBridge(config, options = {}) {
  const cwd = options.cwd || process.cwd();
  const host = options.host || process.env.HOST || "127.0.0.1";
  const port = Number(options.port || config.port || process.env.PORT || 8787);
  const displayDir = path.resolve(cwd, config.display || "./display");

  loadDotEnv(path.join(cwd, ".env"));

  if (process.env.GEMINI_API_KEY && process.env.GOOGLE_API_KEY) {
    // The SDK warns when both are set and prefers GOOGLE_API_KEY. We standardize
    // on GEMINI_API_KEY so .env files can carry the broader Google project
    // metadata without overriding the model key.
    delete process.env.GOOGLE_API_KEY;
  }

  const clients = new Set();
  let lastEvent = null;

  /** @type {SseBus} */
  const hud = {
    broadcast(payload) {
      lastEvent = payload;
      const line = `data: ${JSON.stringify(payload)}\n\n`;
      for (const res of clients) {
        try { res.write(line); } catch { /* dead connection; cleared on close */ }
      }
    },
    get lastEvent() { return lastEvent; },
    get clientCount() { return clients.size; },
  };

  // Lazy-load tools so a game that doesn't use Gemini still works.
  const toolsMod = await import("../tools/index.mjs");

  const routes = config.routes || {};
  const compiled = compileRoutes(routes);

  if (config.onStart) {
    try { await config.onStart({ hud, tools: toolsMod, cwd }); }
    catch (error) { console.error("[bridge] onStart hook failed:", error.message); }
  }

  const server = http.createServer((req, res) => {
    handleRequest(req, res, { hud, clients, compiled, displayDir, toolsMod, lastEvent: () => lastEvent, config })
      .catch((error) => {
        const payload = { type: "error", message: error.message, ts: Date.now() };
        hud.broadcast(payload);
        sendJson(res, 500, payload);
      });
  });

  await new Promise((resolve) => server.listen(port, host, resolve));
  console.log(`[bridge]    http://${host}:${port}/`);
  console.log(`[display]   ${displayDir}`);
  console.log(`[routes]    ${Object.keys(routes).join(", ") || "(none)"}`);

  return {
    server,
    hud,
    stop: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

async function handleRequest(req, res, ctx) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const method = req.method || "GET";

  if (method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, {
      ok: true,
      framework: "gemini-display-kit",
      version: "0.1.0",
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      geminiModel: process.env.GEMINI_MODEL || "gemini-flash-latest",
      managedAgent: process.env.MANAGED_AGENT_ID || "antigravity-preview-05-2026",
      lastEvent: ctx.lastEvent(),
      routes: Array.from(ctx.compiled.keys()),
    });
  }

  if (method === "GET" && url.pathname === "/api/replay") {
    return sendJson(res, 200, { ok: true, lastEvent: ctx.lastEvent() });
  }

  if (method === "GET" && url.pathname === "/events") {
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    });
    ctx.clients.add(res);
    // Send the last known state so refreshes don't see a blank HUD.
    const initial = ctx.lastEvent() || { type: "status", state: "ready", message: "Gemini Display Kit bridge online.", ts: Date.now() };
    res.write(`data: ${JSON.stringify(initial)}\n\n`);
    req.on("close", () => ctx.clients.delete(res));
    return;
  }

  // Game-defined routes
  const matched = matchRoute(ctx.compiled, method, url.pathname);
  if (matched) {
    const body = method === "POST" || method === "PUT"
      ? await readJsonBody(req).catch(() => ({}))
      : {};
    const result = await matched.handler({
      body,
      url,
      params: matched.params,
      hud: ctx.hud,
      tools: ctx.toolsMod,
      method,
      headers: req.headers,
    });
    if (res.headersSent) return; // handler wrote directly
    return sendResult(res, result);
  }

  if (method === "GET") return serveStatic(req, res, ctx.displayDir);
  return sendJson(res, 405, { type: "error", message: "method not allowed" });
}

function compileRoutes(routes) {
  const map = new Map();
  for (const [key, handler] of Object.entries(routes)) {
    const [method, pattern] = key.split(/\s+/);
    if (!method || !pattern) {
      console.warn(`[bridge] invalid route key: "${key}" — expected "METHOD /path"`);
      continue;
    }
    const { regex, params } = patternToRegex(pattern);
    map.set(key, { method: method.toUpperCase(), pattern, regex, paramNames: params, handler });
  }
  return map;
}

function patternToRegex(pattern) {
  const params = [];
  const re = pattern.replace(/:(\w+)/g, (_, name) => {
    params.push(name);
    return "([^/]+)";
  });
  return { regex: new RegExp(`^${re}$`), params };
}

function matchRoute(compiled, method, pathname) {
  for (const route of compiled.values()) {
    if (route.method !== method.toUpperCase()) continue;
    const m = pathname.match(route.regex);
    if (!m) continue;
    const params = {};
    route.paramNames.forEach((name, i) => { params[name] = m[i + 1]; });
    return { handler: route.handler, params };
  }
  return null;
}

async function readJsonBody(req, limitBytes = 32 * 1024 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) throw new Error(`request too large: ${size} bytes`);
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

async function serveStatic(req, res, displayDir) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const relative = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const requested = path.normalize(relative).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(displayDir, requested);
  if (!filePath.startsWith(displayDir)) {
    return sendJson(res, 403, { type: "error", message: "forbidden" });
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      "content-type": contentTypeFor(filePath),
      "cache-control": "no-store",
    });
    res.end(data);
  } catch {
    sendJson(res, 404, { type: "error", message: "not found" });
  }
}

function contentTypeFor(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".mp4")) return "video/mp4";
  if (filePath.endsWith(".mp3") || filePath.endsWith(".wav")) return "audio/mpeg";
  return "application/octet-stream";
}

function sendJson(res, status, payload) {
  if (res.headersSent) return;
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

/**
 * sendResult — universal route-handler response writer.
 *
 * - Buffer return → raw bytes with `result.__contentType` (or
 *   "application/octet-stream"). Useful for images, video, HTML.
 * - undefined return → 200 with `{ ok: true }`.
 * - Any other object → JSON-encode. `result.__status` (if present)
 *   sets the HTTP status; both `__status` and `__contentType` are
 *   stripped from the JSON body.
 */
function sendResult(res, result) {
  if (res.headersSent) return;
  if (result === undefined || result === null) {
    return sendJson(res, 200, { ok: true });
  }
  if (Buffer.isBuffer(result)) {
    const status = result.__status || 200;
    const contentType = result.__contentType || "application/octet-stream";
    res.writeHead(status, {
      "content-type": contentType,
      "cache-control": "no-store",
      "content-length": result.length,
    });
    return res.end(result);
  }
  // Plain object — JSON
  const status = result.__status || 200;
  const body = { ...result };
  delete body.__status;
  delete body.__contentType;
  delete body.__headers;
  return sendJson(res, status, body);
}

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return;
  try {
    const text = readFileSync(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const eq = trimmed.indexOf("=");
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env is optional
  }
}
