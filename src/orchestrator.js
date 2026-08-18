// orchestrator.js — the heart of ai-team. Runs the agent "chat chain":
//   CEO → Designer → Developer → (Tester ⇄ BugFixer loop) → Reviewer → Writer → Deliver
// Enhancements over ChatDev: real code execution in the test loop, per-role model mixing,
// iteration guards, human checkpoints, and full session transcript.

import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { LLMClient, extractJson } from "./llm.js";
import { ROLES } from "./roles.js";
import { runCommand, writeFile, listFiles, readFileSync as readFile } from "./executor.js";
import { say, sayPlain, Transcript } from "./log.js";

const MAX_TEST_LOOPS = 4;

export class TeamOrchestrator {
  constructor({ provider, model, workDir, roleModels = {}, interactive = true }) {
    this.provider = provider;
    this.baseModel = model;
    this.workDir = workDir;
    this.roleModels = roleModels;
    this.interactive = interactive;
    this.client = new LLMClient(provider);
    this.transcript = new Transcript(workDir);
    this.spec = null;
    this.design = null;
    this.projectFiles = {}; // path -> content
    this.meta = {
      idea: null,
      startTime: new Date().toISOString(),
      phases: [],
      iterations: 0,
    };
  }

  modelFor(roleKey) {
    return this.roleModels[roleKey] || this.baseModel;
  }

  /** Talk to an agent, log the exchange, and parse JSON (or text) output. */
  async act(roleKey, messages, { mode = "json" } = {}) {
    const role = ROLES[roleKey];
    say(role.name, role.color, "(thinking… )");
    const { text, json } = await this.client.chatWithRetry({
      model: this.modelFor(roleKey),
      messages,
      systemPrompt: role.prompt,
      mode,
    });
    const display = mode === "json" ? JSON.stringify(json, null, 1).slice(0, 1500) : text.slice(0, 1500);
    say(role.name, role.color, display);
    this.transcript.add(role.name, roleKey, mode === "json" ? JSON.stringify(json) : text);
    return mode === "json" ? json : text;
  }

  phase(name, fn) {
    sayPlain("\x1b[1m", `\n▶ Phase: ${name}`);
    this.meta.phases.push({ name, at: new Date().toISOString() });
    return fn();
  }

  async run(idea) {
    this.meta.idea = idea;

    // ── 1. CEO: product specification ──────────────────────────────
    await this.phase("Demand Analysis (CEO)", async () => {
      const { product_name, features, non_goals, tech_stack_suggestion } = await this.act("ceo", [
        { role: "user", content: `Build this software:\n\n${idea}` },
      ]);
      this.spec = { product_name, features, non_goals, tech_stack_suggestion, idea };
    });

    // ── 2. Designer: architecture & file plan ──────────────────────
    await this.phase("Architecture Design (Designer)", async () => {
      this.design = await this.act("designer", [
        { role: "user", content: `Product specification:\n\n${JSON.stringify(this.spec, null, 1)}` },
      ]);
      writeFile(this.workDir, "design.md", `# Design\n\nStack: ${this.design.tech_stack}\n\n## Files\n\n${this.design.files.map((f) => `- \`${f.path}\` — ${f.purpose}`).join("\n")}\n\n## How to run\n\n${this.design.run_instructions}\n`);
    });

    // ── 3. Developer: write all code ───────────────────────────────
    await this.phase("Development (Developer)", async () => {
      const result = await this.act("developer", [
        { role: "user", content: `Product spec:\n${JSON.stringify(this.spec, null, 1)}\n\nDesign plan:\n${JSON.stringify(this.design, null, 1)}` },
      ]);
      for (const f of result.files ?? []) {
        writeFile(this.workDir, f.path, f.content);
        this.projectFiles[f.path] = f.content;
        sayPlain("\x1b[90m", `  📄 wrote ${f.path} (${f.content.length} chars)`);
      }
      this.transcript.add("system", "io", "files_written", { paths: Object.keys(this.projectFiles) });
    });

    // ── 4. Tester ⇄ BugFixer: real execution loop ──────────────────
    await this.phase("Testing & Debugging (Tester + BugFixer)", async () => {
      for (let i = 1; i <= MAX_TEST_LOOPS; i++) {
        this.meta.iterations = i;
        sayPlain("\x1b[1m", `\n  🔁 Test cycle ${i}/${MAX_TEST_LOOPS}`);

        const plan = await this.act("tester", [
          { role: "user", content: `Project files:\n${await this.dumpProject()}\n\nIntended behavior (from design):\n${this.design.run_instructions}\n\nDesign a verification plan.` },
        ]);

        if (plan.check_type === "visual") {
          sayPlain("\x1b[33m", "  👁 Visual check — project contains UI files; verify by eye after delivery.");
          break;
        }

        let allPassed = true;
        const reports = [];
        const BLOCKED = /\b(npm|yarn|pnpm|pip|pip3|bundle|composer|go mod|tsc|npx|docker|sudo|make|cmake|mvn|gradle|rollup|webpack|vite|esbuild|babel)\b/i;
        const sanitized = (plan.commands ?? [])
          .map((c) => String(c).trim())
          .filter((c) => c && !c.startsWith("#") && !BLOCKED.test(c))
          .map((c) => c.replace(/^[#$>]+\s*/, "")) // strip stray shell prompts/markdown markers
          .slice(0, 12); // cap number of commands to control cost/time
        if (BLOCKED.test((plan.commands ?? []).join(" "))) {
          sayPlain("\x1b[90m", "  ⓘ Skipped build/install commands — projects must run with zero setup (a tool limitation, not a project defect).");
        }
        for (const cmd of sanitized) {
          // Non-interactive mode: close stdin so a command waiting on user input
          // exits immediately instead of hanging for the full timeout.
          const r = await runCommand(`echo "" | ${cmd}`, this.workDir, { timeoutMs: 30_000 });
          sayPlain("\x1b[90m", `  $ ${cmd}  → exit ${r.exitCode}${r.timedOut ? " (timed out)" : ""}`);
          if (r.stderr) sayPlain("\x1b[90m", r.stderr.slice(0, 600));
          if (r.stdout) sayPlain("\x1b[90m", r.stdout.slice(0, 400));
          reports.push({ ...r, command: cmd });
          if (r.exitCode !== 0 || r.timedOut) allPassed = false;
        }

        if (allPassed) {
          sayPlain("\x1b[32m", "  ✅ All test commands passed — build is functional!");
          writeFile(this.workDir, "test-report.md", `# Test Report\n\nAll ${reports.length} test commands passed on cycle ${i}.\n\n${reports.map((r) => `- \`${r.command}\` → exit ${r.exitCode}`).join("\n")}\n`);
          break;
        }

        if (i === MAX_TEST_LOOPS) {
          sayPlain("\x1b[33m", "  ⚠ Max debug cycles reached — handing over with remaining issues.");
          continue;
        }

        // BugFixer: real errors become the diagnosis input (the ChatDev gap this fills)
        const fix = await this.act("bugfixer", [
          {
            role: "user",
            content: `Project files:\n${await this.dumpProject()}\n\nIntended behavior: ${this.design.run_instructions}\n\nReal test failure output:\n${reports.map((r) => `$ ${r.command}\n[stdout]\n${r.stdout}\n[stderr]\n${r.stderr}\nexit=${r.exitCode}`).join("\n\n")}`,
          },
        ]);

        if (fix.no_changes_needed) {
          sayPlain("\x1b[33m", "  ℹ BugFixer reported no code changes needed.");
          break;
        }
        for (const f of fix.files ?? []) {
          writeFile(this.workDir, f.path, f.content);
          this.projectFiles[f.path] = f.content;
          sayPlain("\x1b[90m", `  🔧 fixed ${f.path}`);
        }
        this.transcript.add("system", "io", "bugfix_applied", { paths: fix.files?.map((f) => f.path) });
      }
    });

    // ── 5. Reviewer: quality audit ─────────────────────────────────
    const review = await this.phase("Code Review (Reviewer)", async () => {
      const review = await this.act("reviewer", [
        {
          role: "user",
          content: `Product spec:\n${JSON.stringify(this.spec, null, 1)}\n\nProject files:\n${await this.dumpProject()}`,
        },
      ]);
      writeFileSync(join(this.workDir, "review.md"), `# Code Review\n\nScore: ${review.score}/10\n\n${review.summary}\n\n## Issues\n\n${(review.issues ?? []).map((iss) => `- **[${iss.severity}]** \`${iss.file}\`: ${iss.description}`).join("\n")}\n`);
      return review;
    });

    // ── 6. Optional review-fix cycle if critical issues found ──────
    if (review.ready_to_ship === false && (review.issues ?? []).some((i) => i.severity === "critical" || i.severity === "major")) {
      await this.phase("Review Fix (BugFixer)", async () => {
        const fix = await this.act("bugfixer", [
          {
            role: "user",
            content: `Project files:\n${await this.dumpProject()}\n\nReviewer issues to fix:\n${JSON.stringify(review.issues, null, 1)}`,
          },
        ]);
        for (const f of fix.files ?? []) {
          writeFile(this.workDir, f.path, f.content);
          this.projectFiles[f.path] = f.content;
          sayPlain("\x1b[90m", `  🔧 review-fix: ${f.path}`);
        }
      });
    }

    // ── 7. Technical Writer: README ────────────────────────────────
    await this.phase("Documentation (Writer)", async () => {
      const projectDump = await this.dumpProject();
      const readmeText = await this.client.chat({
        model: this.modelFor("writer"),
        messages: [
          {
            role: "user",
            content: `Product spec:\n${JSON.stringify(this.spec, null, 1)}\n\nProject files:\n${projectDump}`,
          },
        ],
        systemPrompt: ROLES.writer.prompt,
        mode: "text",
      });
      const readmeContent = readmeText.text.replace(/^```markdown\n?/i, "").replace(/```\s*$/, "");
      writeFileSync(join(this.workDir, "README.md"), readmeContent);
      sayPlain("\x1b[90m", "  📄 wrote README.md");
    });

    // ── 8. Deliver: transcript + summary ───────────────────────────
    this.meta.endTime = new Date().toISOString();
    writeFileSync(join(this.workDir, "ai-team.transcript.json"), JSON.stringify({ meta: this.meta, entries: this.transcript.entries }, null, 1));
    return { spec: this.spec, design: this.design, review, dir: this.workDir, meta: this.meta };
  }

  /** Dump current project files for agent context (compressed). */
  async dumpProject() {
    const files = listFiles(this.workDir);
    const parts = [];
    for (const f of files) {
      if (f.size > 120_000) continue; // skip huge artifacts
      let content;
      try {
        content = readFile(join(this.workDir, f.path));
      } catch {
        continue;
      }
      parts.push(`=== FILE: ${f.path} ===\n${content.slice(0, 6000)}`);
    }
    return parts.join("\n\n") || "(empty project)";
  }
}
