// config.js — model provider resolution for ai-team
// Model-agnostic: works with any OpenAI-compatible chat completions endpoint
// (OpenAI GPT/Codex, Z.AI GLM, Google Gemini, DeepSeek, Qwen, OpenRouter, Ollama, local proxies)

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { URL } from "node:url";

export const PRESETS = {
  openai: {
    label: "OpenAI (GPT / Codex)",
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-5.6-sol", "gpt-5.5", "gpt-4.1", "gpt-4o", "o3", "o4-mini"],
    envKey: "OPENAI_API_KEY",
  },
  codex: {
    label: "OpenAI Codex CLI backend",
    baseUrl: "https://api.openai.com/v1",
    models: ["o3-codex", "o4-mini-codex", "gpt-5.6-sol"],
    envKey: "OPENAI_API_KEY",
  },
  glm: {
    label: "Z.AI GLM (Zhipu)",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    models: ["glm-4.7", "glm-4.5", "glm-4-flash", "glm-5"],
    envKey: "GLM_API_KEY",
  },
  gemini: {
    label: "Google Gemini (OpenAI-compatible mode)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-3-pro"],
    envKey: "GEMINI_API_KEY",
  },
  deepseek: {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-coder"],
    envKey: "DEEPSEEK_API_KEY",
  },
  qwen: {
    label: "Alibaba Qwen (DashScope)",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: ["qwen3.5-plus", "qwen3-coder", "qwen-max"],
    envKey: "QWEN_API_KEY",
  },
  openrouter: {
    label: "OpenRouter (hundreds of models)",
    baseUrl: "https://openrouter.ai/api/v1",
    models: ["openai/gpt-5", "anthropic/claude-sonnet-4.5", "z-ai/glm-5", "google/gemini-2.5-pro"],
    envKey: "OPENROUTER_API_KEY",
  },
  anthropic: {
    label: "Anthropic (Claude, OpenAI-compatible proxy)",
    baseUrl: "https://api.anthropic.com/v1",
    models: ["claude-sonnet-4.5", "claude-opus-4.6"],
    envKey: "ANTHROPIC_API_KEY",
    headers: { "anthropic-version": "2023-06-01" },
  },
  ollama: {
    label: "Local Ollama",
    baseUrl: "http://localhost:11434/v1",
    models: ["qwen2.5-coder:32b", "qwen3-coder", "llama3.1"],
    envKey: "OPENAI_API_KEY",
  },
  builtin: {
    label: "Built-in (free local Ollama — no API key, no quota, no internet needed)",
    baseUrl: "http://localhost:11434/v1",
    // Free open models you run locally with Ollama (https://ollama.com).
    // Truly keyless: your machine is the provider. No rate limits, no cost.
    models: [
      "qwen3-coder:30b",
      "qwen3-coder",
      "qwen2.5-coder:32b",
      "llama3.1",
      "gemma3",
    ],
    model: "qwen3-coder:30b",
    envKey: null, // intentionally: no key required
  },
};

/** Load .aiteam.json from cwd (optional per-project config) */
export function loadProjectConfig(cwd) {
  const file = join(cwd, ".aiteam.json");
  if (existsSync(file)) {
    try {
      return JSON.parse(readFileSync(file, "utf8"));
    } catch {
      return {};
    }
  }
  return {};
}

/** Check whether an Ollama server is actually reachable on localhost. */
function isOllamaReachable(baseUrl) {
  try {
    const url = new URL(baseUrl);
    if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return true; // remote = assume reachable
    const r = spawnSync("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "3", `${url.origin}/api/tags`]);
    return r.status === 0 && r.stdout?.toString().trim() === "200";
  } catch {
    return false;
  }
}

/** Resolve provider with an optional pre-obtained free key (from --free flow). */
export function resolveProviderWithKey(key, cfg = {}) {
  const resolved = resolveProvider(cfg);
  if (key) {
    const merged = { ...resolved, apiKey: key };
    if (merged.name === "builtin") {
      merged.name = "gemini";
      merged.label = "Google Gemini (free key via AI Studio)";
      merged.baseUrl = PRESETS.gemini.baseUrl;
    }
    return merged;
  }
  return resolved;
}

/** Resolve the effective provider config from preset name or env. */
export function resolveProvider(cfg = {}) {
  const presetName = cfg.provider || process.env.AI_TEAM_PROVIDER || "openai";
  const preset = PRESETS[presetName] || PRESETS.openai;

  // Built-in mode: free OpenRouter free-tier models, no API key required.
  if (presetName === "builtin" || preset.envKey === null) {
    return {
      name: "builtin",
      label: preset.label,
      baseUrl: preset.baseUrl,
      apiKey: "x-sk-free", // OpenRouter free tier accepts any string
      headers: {},
      builtinModel: cfg.model || preset.model,
    };
  }

  const baseUrl =
    cfg.baseUrl ||
    process.env.AI_TEAM_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    preset.baseUrl;

  let apiKey =
    cfg.apiKey ||
    process.env.AI_TEAM_API_KEY ||
    process.env.OPENAI_API_KEY ||
    (preset.envKey ? process.env[preset.envKey] : undefined);

  // Fall back to built-in free mode when no key is available at all:
  // no external API account is needed — ai-team can run entirely free with
  // local Ollama. If Ollama isn't installed, the user gets a clear pointer.
  if (!apiKey && !cfg.baseUrl && !process.env.AI_TEAM_BASE_URL && !process.env.OPENAI_BASE_URL) {
    const builtinCfg = {
      name: "builtin",
      label: "Built-in (local Ollama — free, no API key needed)",
      baseUrl: PRESETS.builtin.baseUrl,
      apiKey: "ollama",
      headers: {},
      builtinModel: process.env.AI_TEAM_MODEL || PRESETS.builtin.model,
    };
    if (!isOllamaReachable(builtinCfg.baseUrl)) {
      throw new Error(
        "ⓘ No API key found, and Ollama is not running locally.\n\n" +
          "To use ai-team-builder for FREE with no API key at all:\n" +
          "  1. Install Ollama: https://ollama.com\n" +
          "  2. Start Ollama, then run:  ollama pull qwen3-coder:30b\n" +
          "  3. Run ai-team-builder again — it uses your local models (100% free, no quota, no internet).\n\n" +
          "OR provide an API key for cloud models (faster, no setup needed):\n" +
          "  export OPENAI_API_KEY=sk-...    (GPT / Codex)\n" +
          "  export GLM_API_KEY=...          (GLM)\n" +
          "  export GEMINI_API_KEY=...       (Gemini)\n" +
          "  export OPENROUTER_API_KEY=...   (hundreds of models)"
      );
    }
    console.warn(
      "\x1b[33mⓘ No API key found — using built-in free mode (local Ollama, no key, no quota).\x1b[0m"
    );
    return builtinCfg;
  }

  return {
    name: presetName,
    label: preset.label,
    baseUrl,
    apiKey,
    headers: preset.headers || {},
  };
}

export function printProviders() {
  console.log("\n\x1b[1mAvailable provider presets\x1b[0m\n");
  for (const [name, p] of Object.entries(PRESETS)) {
    const hasKey = !!process.env[p.envKey] || !!process.env.OPENAI_API_KEY;
    console.log(`  ${hasKey ? "\x1b[32m✔\x1b[0m" : "\x1b[90m✘\x1b[0m"} ${name.padEnd(12)} ${p.label}`);
  }
  console.log(
    "\nSet a key for your provider, e.g.:" +
      "\n  export OPENAI_API_KEY=sk-...          (GPT / Codex)" +
      "\n  export GLM_API_KEY=... && AI_TEAM_PROVIDER=glm   (Zhipu GLM)" +
      "\n  export GEMINI_API_KEY=... && AI_TEAM_PROVIDER=gemini  (Gemini)" +
      "\n  export OPENROUTER_API_KEY=... && AI_TEAM_PROVIDER=openrouter\n"
  );
}
