// Probe 10: run Tester → BugFixer loop manually on the existing test-project-mini,
// which has real failing commands. Verify BugFixer gets real errors and produces fixes.
import { TeamOrchestrator } from "../src/orchestrator.js";
import { resolveProvider } from "../src/config.js";
import { ROLES } from "../src/roles.js";
import { runCommand } from "../src/executor.js";

const provider = resolveProvider({});
const orchestrator = new TeamOrchestrator({ provider, model: "gpt-5-mini", workDir: "/home/ubuntu/ai-team/test-project-mini", interactive: false });

// Simulate test failure reports from real execution
const failingReports = [
  { command: "node index.js --to-f 100", stdout: "", stderr: "Error: timed out waiting for input", exitCode: 0, timedOut: true },
  { command: "echo 32 | node index.js --to-c", stdout: "", stderr: "Ambiguous input: no unit provided\n", exitCode: 1, timedOut: false },
];

// Feed to BugFixer exactly as orchestrator does
const dump = await orchestrator.dumpProject();
const fix = await orchestrator.client.chatWithRetry({
  model: "gpt-5-mini",
  messages: [
    {
      role: "user",
      content: `Project files:\n${dump}\n\nIntended behavior: non-interactive CLI conversion\n\nReal test failure output:\n${failingReports.map((r) => `$ ${r.command}\n[stdout]\n${r.stdout}\n[stderr]\n${r.stderr}\nexit=${r.exitCode}${r.timedOut ? " timedOut" : ""}`).join("\n\n")}`,
    },
  ],
  systemPrompt: ROLES.bugfixer.prompt,
  mode: "json",
});
console.log("BugFixer diagnosis:", fix.diagnosis?.slice(0, 300));
console.log("Files to fix:", fix.files?.map((f) => f.path));
console.log("no_changes_needed:", fix.no_changes_needed);
