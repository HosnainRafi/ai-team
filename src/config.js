// config.js — model provider resolution for ai-team
// Model-agnostic: works with any OpenAI-compatible chat completions endpoint
// (OpenAI GPT/Codex, Z.AI GLM, Google Gemini, DeepSeek, Qwen, OpenRouter, Ollama, local proxies)

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

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

/** Resolve the effective provider config from preset name or env. */
export function resolveProvider(cfg = {}) {
  const presetName = cfg.provider || process.env.AI_TEAM_PROVIDER || "openai";
  const preset = PRESETS[presetName] || PRESETS.openai;

  const baseUrl =
    cfg.baseUrl ||
    process.env.AI_TEAM_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    preset.baseUrl;

  const apiKey =
    cfg.apiKey ||
    process.env.AI_TEAM_API_KEY ||
    process.env.OPENAI_API_KEY ||
    (preset.envKey ? process.env[preset.envKey] : undefined);

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
