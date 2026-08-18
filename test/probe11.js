// Probe 11: see raw BugFixer output
import { TeamOrchestrator } from "../src/orchestrator.js";
import { resolveProvider } from "../src/config.js";
import { ROLES } from "../src/roles.js";

const provider = resolveProvider({});
const orchestrator = new TeamOrchestrator({ provider, model: "gpt-5-mini", workDir: "/home/ubuntu/ai-team/test-project-mini", interactive: false });

const failingReports = [
  { command: "node index.js --to-f 100", stdout: "", stderr: "Error: timed out", exitCode: 0, timedOut: true },
  { command: "echo 32 | node index.js --to-c", stdout: "", stderr: "Ambiguous input\n", exitCode: 1, timedOut: false },
];

const dump = await orchestrator.dumpProject();
const raw = await orchestrator.client.chat({
  model: "gpt-5-mini",
  messages: [
    {
      role: "user",
      content: `Project files:\n${dump}\n\nIntended behavior: non-interactive CLI\n\nReal failure:\n${failingReports.map((r) => `$ ${r.command}\nexit=${r.exitCode} ${r.stderr}`).join("\n")}`,
    },
  ],
  systemPrompt: ROLES.bugfixer.prompt,
  mode: "text",
});
console.log("RAW length:", raw.text.length);
console.log(raw.text.slice(0, 1500));
