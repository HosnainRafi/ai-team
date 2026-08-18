// free-key.js — obtain a free Gemini API key automatically via browser login.
//
// Flow:
//   1. Launch the user's default browser to Google AI Studio (aistudio.google.com).
//   2. User signs in with their Google account (one-time).
//   3. On the API keys page, the user clicks "Create API Key" (one click;
//      key creation is intentionally a manual confirm — we cannot press
//      the consent button programmatically without breaking ToS/UX).
//   4. The user copies the key into the terminal prompt (or sets it as env).
//   5. The key is saved to ~/.aiteam/.gemini-key for automatic reuse.
//
// Google AI Studio's free tier: https://aistudio.google.com — free Gemini
// API key with generous rate limits, no payment method required.

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import readline from "node:readline";

const KEY_DIR = join(homedir(), ".aiteam");
const KEY_FILE = join(KEY_DIR, ".gemini-key");

const AI_STUDIO_URL = "https://aistudio.google.com/app/apikey";

/** Open a URL in the user's default browser (non-blocking). */
export function openInBrowser(url) {
  const platform = process.platform;
  let cmd = null;
  let shell = true;
  if (platform === "darwin") { cmd = `open "${url}"`; }
  else if (platform === "win32") { cmd = `start "" "${url}"`; }
  else { cmd = `(xdg-open "${url}" >/dev/null 2>&1 || sensible-browser "${url}" >/dev/null 2>&1 || echo "$url") &`; }
  try {
    execSync(cmd, { stdio: "ignore", shell, detached: true });
    return true;
  } catch {
    return false;
  }
}

/** Save a fetched key for future automatic reuse. */
export function saveKey(key) {
  mkdirSync(KEY_DIR, { recursive: true });
  writeFileSync(KEY_FILE, key.trim(), "utf8");
  try { execSync(`chmod 600 "${KEY_FILE}"`, { stdio: "ignore" }); } catch {}
}

/** Read a previously saved key, if any. */
export function loadSavedKey() {
  if (existsSync(KEY_FILE)) {
    try {
      const k = readFileSync(KEY_FILE, "utf8").trim();
      return k || null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Ask the user to paste the key from the clipboard/terminal. */
export function askKey() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question("Paste the API key here (or press Enter to skip): ", (answer) => {
      rl.close();
      resolve((answer || "").trim() || null);
    });
  });
}

/**
 * Guide the user to a free Gemini key in one flow. Returns the key or null.
 */
export async function obtainFreeGeminiKey(interactive = true) {
  const saved = loadSavedKey();
  if (saved) return saved;

  console.log("\n\x1b[1m━━━ Free Google Gemini mode (no payment needed) ━━━\x1b[0m");
  console.log("Opening Google AI Studio in your browser...\n");

  openInBrowser(AI_STUDIO_URL);

  console.log("In the browser:");
  console.log("  1. Sign in with your Google account (if asked)");
  console.log("  2. Click \x1b[1m\"Create API key\"\x1b[0m → choose a project (or let it create one)");
  console.log("  3. Copy the key that appears (starts with \x1b[1mAIza...\x1b[0m)\n");

  if (!interactive) return null;

  const key = await askKey();
  if (key && key.startsWith("AIza")) {
    saveKey(key);
    console.log("\x1b[32m✔ Key saved to ~/.aiteam/.gemini-key — next runs need no setup.\x1b[0m");
    return key;
  }
  return null;
}
