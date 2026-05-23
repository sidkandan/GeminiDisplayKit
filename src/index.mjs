/**
 * gdk — public SDK surface.
 *
 * Game projects import from here:
 *
 *   import { defineGame, tools, sse } from "gemini-display-kit";
 *
 * Direct sub-imports work too:
 *
 *   import { runManagedAgent } from "gemini-display-kit/tools";
 *   import { startBridge } from "gemini-display-kit/bridge";
 */
export { startBridge } from "./bridge/server.mjs";
export * as tools from "./tools/index.mjs";

/**
 * defineGame — type-checking sugar and the canonical place game projects
 * declare their bridge routes + display directory. Run by `gdk dev`.
 *
 * @param {{
 *   name: string,
 *   display?: string,           // path to 600x600 display files (default: ./display)
 *   port?: number,              // override bridge port
 *   routes?: Record<string, (ctx: HandlerContext) => Promise<unknown>>,
 *   onStart?: (ctx: { hud: SseBus }) => Promise<void>,
 * }} config
 */
export function defineGame(config) {
  if (!config || typeof config !== "object") {
    throw new Error("defineGame: missing config object");
  }
  if (!config.name) throw new Error("defineGame: config.name is required");
  return config;
}

/**
 * @typedef {object} HandlerContext
 * @property {any} body              parsed JSON body (or {})
 * @property {URL} url               request URL
 * @property {Record<string,string>} params
 * @property {SseBus} hud            HUD broadcast handle (.broadcast(payload))
 * @property {object} tools          shorthand for tools.*
 *
 * @typedef {object} SseBus
 * @property {(payload: unknown) => void} broadcast
 */
