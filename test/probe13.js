// Probe 13: run exactly probe10's code but print raw json and any thrown errors.
import { TeamOrchestrator } from "../src/orchestrator.js";
import { resolveProvider } from "../src/config.js";
import { ROLES } from "../src/roles.js";

const provider = resolveProvider({});
const orchestrator = new TeamOrchestrator({ provider, model: "gpt-5-mini", workDir: "/home/ubuntu/ai-team/test-project-mini", interactive: false });

const failingReports = [
  { command: "node index.js --to-f 100", stdout: "", stderr: "Error: timed out waiting for input", exitCode: 0, timedOut: true },
  { command: "echo 32 | node index.js --to-c", stdout: "", stderr: "Ambiguous input: no unit provided\n", exitCode: 1, timedOut: false },
];

const dump = await orchestrator.dumpProject();
console.log("dump length:", dump.length);
try {
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
  console.log("json keys:", Object.keys(fix.json ?? {}));
  console.log(JSON.stringify(fix.json).slice(0, 500));
} catch (e) {
  console.log("THREW:", e.message.slice(0, 400));
}
