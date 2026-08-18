# ai-team — Your AI Software Company in the Terminal

`ai-team` is a model-agnostic, multi-agent AI coding system. Give it a single sentence describing your idea, and a team of specialized AI agents builds the software for you:

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

1. **Real execution loop** — ChatDev only *talked* about code; `ai-team`'s Tester actually runs the generated code in a sandbox and feeds real error output to the BugFixer. Bugs are fixed against real failures, not guesses.
2. **Model-agnostic** — works with **GPT / Codex (OpenAI), GLM (Zhipu), Gemini (Google), DeepSeek, Qwen, Claude, OpenRouter (hundreds of models), and local Ollama models**. Any OpenAI-compatible API works — usually a one-line env change.
3. **Per-role model mixing** — use a powerful model for planning/review and a cheap model for coding/testing: `--planner-model gpt-5 --model gpt-5-nano`.
4. **Zero-install npx usage** — `npx ai-team "your idea"` builds software with nothing installed.
5. **Full transparency** — every agent conversation is logged to `ai-team.session.log` and `ai-team.transcript.json`, and a `review.md` + `test-report.md` ship with the project.
6. **Sandboxed execution** — dangerous commands (rm -rf, network downloads, etc.) are blocked; runs are timed out.

## Quick Start

```bash
# Run once without installing
npx ai-team build "a todo app with dark mode saved to localStorage"

# Or install globally
npm install -g ai-team
ai-team build "snake game with score tracking"
```

## Setup for your preferred AI model

`ai-team` needs an API key for one provider:

```bash
# OpenAI GPT / Codex (default)
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

# Local Ollama (e.g. qwen3-coder)
export AI_TEAM_PROVIDER=ollama
export AI_TEAM_MODEL=qwen3-coder

# Any custom OpenAI-compatible endpoint (Azure, LM Studio, vLLM, litellm...)
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_API_KEY=ollama
```

See all presets: `ai-team models`

## CLI Reference

```
ai-team build "<idea>"     Build software from an idea (default command)
ai-team "<idea>"           Same as build
ai-team models             Show provider presets and configured keys
ai-team help               Show help

Options:
  --name <dir>             Output directory (default: auto-generated)
  --provider <preset>      openai | codex | glm | gemini | deepseek | qwen | openrouter | anthropic | ollama
  --model <model>          Model name, e.g. gpt-5.5, glm-4.7, gemini-2.5-pro
  --planner-model <m>      Different model for CEO/Reviewer roles
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

**Which models work best?** Frontier models (GPT-5.x, Claude Sonnet/Opus, GLM-4.7+, Gemini 2.5 Pro) give the best code quality. Smaller/cheaper models work for planning and simple projects.

**Why is this better than one-shot "write me code" prompts?** Specialization + a real test-fix loop. Each agent has a focused role prompt, and generated code is executed and debugged against real errors — the two biggest weaknesses of single-prompt code generation.

**Is it safe?** Commands execute in the output directory only, with a 30–60s timeout, and a blocklist of destructive operations (rm -rf /, curl, wget, interactive shells, etc.).

**License:** MIT.
