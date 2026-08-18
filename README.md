# ai-team-builder — Your AI Software Company in the Terminal

`ai-team-builder` is a model-agnostic, multi-agent AI coding system. Give it a single sentence describing your idea, and a team of specialized AI agents builds the software for you:

| Agent | Role |
| --- | --- |
| **CEO (Planner)** | Analyzes your idea and writes a full product specification |
| **Designer (Architect)** | Picks the tech stack and designs the file structure |
| **Developer** | Writes complete, production-quality code |
| **Tester** | Actually **runs** your code and captures real errors |
| **BugFixer** | Diagnoses real test failures and fixes the code |
| **Reviewer** | Audits quality, security, and spec compliance, scores 0–10 |
| **Writer** | Produces a complete README manual |

This is inspired by [ChatDev](https://github.com/OpenBMB/ChatDev) (the famous "virtual software company") but **enhanced in the ways that matter**:

1. **Real execution loop** — ChatDev only *talked* about code; `ai-team-builder`'s Tester actually runs the generated code and feeds real error output to the BugFixer. Bugs are fixed against real failures, not guesses.
2. **Model-agnostic** — works with **GPT / Codex (OpenAI), GLM (Zhipu), Gemini (Google), DeepSeek, Qwen, Claude, OpenRouter (hundreds of models), and local Ollama models**. Any OpenAI-compatible API works — usually a one-line env change.
3. **No API key required** — run it 100% free with local [Ollama](https://ollama.com) models: no account, no quota, no internet. Just install Ollama, pull a model, and go.
4. **Per-role model mixing** — use a powerful model for planning/review and a cheap model for coding/testing: `--planner-model gpt-5 --model gpt-5-nano`.
5. **Zero-install npx usage** — `npx ai-team-builder "your idea"` builds software with nothing installed.
6. **Full transparency** — every agent conversation is logged to `ai-team.session.log` and `ai-team.transcript.json`, and a `review.md` + `test-report.md` ship with the project.
7. **Sandboxed execution** — dangerous commands are blocked; runs are timed out.

## Quick Start

```bash
# Run once without installing
npx ai-team-builder build "a todo app with dark mode saved to localStorage"

# Or install globally
npm install -g ai-team-builder
ai-team-builder build "snake game with score tracking"
```

### Use it completely free — no API key, no account

```bash
# 1. Install Ollama: https://ollama.com
# 2. Pull a coder model
ollama pull qwen3-coder:30b
# 3. That's it — ai-team-builder detects Ollama automatically and uses it
ai-team-builder build "a markdown-to-HTML converter CLI"
```

If no API key is set, `ai-team-builder` automatically falls back to your local Ollama. Bring your own key whenever you want cloud models.

### Setup for your preferred cloud AI model (optional)

```bash
# OpenAI GPT / Codex (default when a key is present)
export OPENAI_API_KEY=sk-...

# Zhipu GLM
export GLM_API_KEY=...
export AI_TEAM_PROVIDER=glm

# Google Gemini (OpenAI-compatible mode)
export GEMINI_API_KEY=...
export AI_TEAM_PROVIDER=gemini

# DeepSeek
export DEEPSEEK_API_KEY=...
export AI_TEAM_PROVIDER=deepseek

# Alibaba Qwen
export QWEN_API_KEY=...
export AI_TEAM_PROVIDER=qwen

# OpenRouter (choose from 100+ models incl. Claude, GLM, Gemini, Llama)
export OPENROUTER_API_KEY=...
export AI_TEAM_PROVIDER=openrouter

# Local Ollama (explicit, e.g. a smaller model)
export AI_TEAM_PROVIDER=ollama
export AI_TEAM_MODEL=qwen3-coder

# Any custom OpenAI-compatible endpoint (Azure, LM Studio, vLLM, litellm...)
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_API_KEY=ollama
```

See all presets and which keys are set: `ai-team-builder models`

## CLI Reference

```
ai-team-builder build "<idea>"     Build software from an idea (default command)
ai-team-builder "<idea>"           Same as build
ai-team-builder models             Show provider presets and configured keys
ai-team-builder help               Show help

Options:
  --name <dir>             Output directory (default: auto-generated)
  --provider <preset>      openai | codex | glm | gemini | deepseek | qwen | openrouter | anthropic | ollama | builtin
  --model <model>          Model name, e.g. gpt-5.5, glm-4.7, gemini-2.5-pro, qwen3-coder
  --planner-model <m>      Different model for CEO/Reviewer roles
  --max-loops <n>          Max test-fix cycles (default 4)
  --yes                    Skip interactive confirmations
  --quiet                  Only show the final summary
```

## What you get

After a run, your project directory contains:

```
my-project/
├── <generated source files>
├── README.md              # usage manual written by the Writer agent
├── design.md              # the Designer's architecture plan
├── review.md              # Reviewer's score + issues
├── test-report.md         # which test commands passed
├── ai-team.session.log    # full agent chat replay
└── ai-team.transcript.json # structured session transcript
```

## How the pipeline works

1. **CEO** turns your idea into a spec → 2. **Designer** plans stack + files → 3. **Developer** writes all code → 4. **Tester** runs real commands; on failure the **BugFixer** diagnoses from the actual error output and patches the files → (repeat up to 4 cycles) → 5. **Reviewer** audits everything and grades it → 6. **Writer** documents the project.

## Per-project config

Drop a `.aiteam.json` in your project folder:

```json
{
  "provider": "glm",
  "apiKey": "...",
  "model": "glm-4.7",
  "roleModels": { "ceo": "glm-4.7", "developer": "glm-4-flash" }
}
```

## FAQ

**Can it run without any API key?** Yes. Install Ollama (free, open source), pull any coder model, and `ai-team-builder` uses your local models automatically — no account, no quota, no internet connection required after pulling the model.

**Which models work best?** Frontier models (GPT-5.x, Claude Sonnet/Opus, GLM-4.7+, Gemini 2.5 Pro) give the best code quality. Smaller/cheaper models (including local Ollama models) work for planning and simple projects.

**Why is this better than one-shot "write me code" prompts?** Specialization + a real test-fix loop. Each agent has a focused role prompt, and generated code is executed and debugged against real errors — the two biggest weaknesses of single-prompt code generation.

**Why does this tool use API keys at all?** The AI models themselves run on other companies' servers (OpenAI, Google, Zhipu…), so each user normally brings their own key. `ai-team-builder` minimizes this friction: any OpenAI-compatible provider works, keys are picked up from env vars, and the Ollama path removes the need entirely.

**Is it safe?** Commands execute in the output directory only, with a 30–60s timeout, and a blocklist of destructive operations (rm -rf /, curl, wget, package installs, interactive shells, etc.).

**License:** MIT.
