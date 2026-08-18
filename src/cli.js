// cli.js — command-line interface for ai-team-builder

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { resolveProvider, resolveProviderWithKey, printProviders, PRESETS, loadProjectConfig } from "./config.js";
import { obtainFreeGeminiKey } from "./free-key.js";
import { TeamOrchestrator } from "./orchestrator.js";
import { sayPlain, say } from "./log.js";
import { ROLES } from "./roles.js";

const DEFAULT_MODEL = "gpt-5.5";

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) || "ai-project";
}

function printUsage() {
  console.log(`
\x1b[1mai-team-builder\x1b[0m — your AI software company in the terminal.

\x1b[1mUsage:\x1b[0m
  ai-team-builder build "<idea>"   Build software from an idea (default command)
  ai-team-builder "<idea>"         Same as build
  ai-team-builder models           Show provider presets and configured keys
  ai-team-builder help             Show this help

\x1b[1mExamples:\x1b[0m
  ai-team-builder build "a todo app with dark mode and local storage"
  ai-team-builder build "snake game with score tracking" --name snake-game

\x1b[1mOptions:\x1b[0m
  --name <dir>             Output directory (default: auto-generated from idea)
  --provider <preset>      openai | codex | glm | gemini | deepseek | qwen | openrouter | anthropic | ollama
  --model <model>          Model name, e.g. gpt-5.5, glm-4.7, gemini-2.5-pro
  --planner-model <m>      Use a different model just for planning/review roles
  --max-loops <n>          Max test-fix cycles (default 4)
  --free                   Free mode: open Google AI Studio in your browser, log in
                           with your Google account once, and ai-team uses the free
                           Gemini tier automatically (key saved for next runs)
  --yes                    Skip interactive confirmations
  --quiet                  Only show final summary

\x1b[1mModel setup (pick your provider):\x1b[0m
  export OPENAI_API_KEY=sk-...                     GPT / Codex
  export GLM_API_KEY=... && --provider glm         Zhipu GLM
  export GEMINI_API_KEY=... && --provider gemini   Google Gemini
  export OPENROUTER_API_KEY=... && --provider openrouter

Any OpenAI-compatible endpoint also works via --provider openai plus:
  export OPENAI_BASE_URL=<url> OPENAI_API_KEY=<key>
`);
}

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args.flags[key] = next;
        i++;
      } else {
        args.flags[key] = true;
      }
    } else if (!a.startsWith("-")) {
      args._.push(a);
    }
  }
  return args;
}

export async function main(argv) {
  const args = parseArgs(argv);
  const cmd = args._[0] ?? "build";

  if (cmd === "help" || args.flags.help) {
    return printUsage();
  }
  if (cmd === "models") {
    return printProviders();
  }

  if (cmd !== "build") {
    console.error(`Unknown command: ${cmd}\nRun: ai-team-builder help`);
    process.exit(1);
  }

  const idea = args._.slice(1).join(" ").trim() || args.flags.idea;
  if (!idea) {
    printUsage();
    throw new Error("Missing idea. Usage: ai-team-builder build \"<your idea>\"");
  }

  let freeKey = null;
  if (args.flags.free) {
    freeKey = await obtainFreeGeminiKey(!args.flags.quiet);
    if (!freeKey) {
      throw new Error("No free API key was provided — aborting. Run with --free again or set an API key.");
    }
  }

  const projectCfg = loadProjectConfig(process.cwd());
  const provider = resolveProviderWithKey(freeKey, { ...projectCfg, provider: args.flags.provider });

  if (!provider.apiKey && provider.name !== "builtin") {
    throw new Error(
      `No API key found for provider "${provider.name}".\n` +
        `Set one of: OPENAI_API_KEY, GLM_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, QWEN_API_KEY, DEEPSEEK_API_KEY, ANTHROPIC_API_KEY\n` +
        `Or: AI_TEAM_API_KEY + AI_TEAM_BASE_URL for any OpenAI-compatible endpoint.\n\nSee: ai-team-builder models`
    );
  }

  const model = provider.builtinModel || args.flags.model || process.env.AI_TEAM_MODEL || DEFAULT_MODEL;
  const outName = args.flags.name || slugify(idea.split(".").shift());
  const workDir = join(process.cwd(), outName);

  sayPlain("\x1b[1m", `ai-team-builder — building "${idea}" → ${workDir}`);
  sayPlain("\x1b[90m", `Provider: ${provider.label} (${provider.baseUrl}) · Model: ${model}`);

  if (!existsSync(workDir)) mkdirSync(workDir, { recursive: true });

  const orchestrator = new TeamOrchestrator({
    provider,
    model,
    workDir,
    interactive: !args.flags.yes && !args.flags.quiet,
  });

  const result = await orchestrator.run(idea);

  // ── Final delivery summary ──────────────────────────────────────
  sayPlain("\n\x1b[1m", "╔═══════════════════════════════════════════════╗");
  sayPlain("\x1b[1m", "║  ✅ Software delivered by your AI team!        ║");
  sayPlain("\x1b[1m", "╚═══════════════════════════════════════════════╝");
  sayPlain("\x1b[36m", `Product: ${result.spec.product_name}`);
  sayPlain("\x1b[36m", `Stack:   ${result.design.tech_stack}`);
  sayPlain("\x1b[34m", `Review:  ${result.review.score}/10 — ${result.review.ready_to_ship ? "ready to ship" : "needs attention"}`);
  sayPlain("\x1b[90m", `Output:  ${workDir}`);
  sayPlain("\x1b[90m", `Run:     ${result.design.run_instructions}`);
  if (result.review.issues?.length) {
    sayPlain("\x1b[90m", "\nIssues noted:");
    for (const iss of result.review.issues) sayPlain("\x1b[90m", `  [${iss.severity}] ${iss.file}: ${iss.description}`);
  }
}
