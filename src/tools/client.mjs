/**
 * src/tools/client.mjs — lazy, cached Gemini client.
 *
 * Imported by every other tool wrapper. Throws a clear error if
 * GEMINI_API_KEY is missing so games fail fast on misconfiguration.
 */
import { GoogleGenAI } from "@google/genai";

let cachedClient = null;
let cachedKey = null;

export function getClient() {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to your project's .env (see .env.example) " +
        "or export it before running. Get a key at https://aistudio.google.com/."
    );
  }
  if (cachedClient && cachedKey === key) return cachedClient;
  cachedClient = new GoogleGenAI({ apiKey: key });
  cachedKey = key;
  return cachedClient;
}
