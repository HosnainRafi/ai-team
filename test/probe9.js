// Probe 9: run the orchestrator end-to-end but with gpt-5-mini (fast model) to check
// whether the whole pipeline works. If it does, the earlier failures were
// gpt-5.5 latency/timeout related.
import { TeamOrchestrator } from "../src/orchestrator.js";
import { resolveProvider } from "../src/config.js";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const provider = resolveProvider({});
const workDir = join(process.cwd(), "test-project-mini");
if (!existsSync(workDir)) mkdirSync(workDir, { recursive: true });

const orchestrator = new TeamOrchestrator({
  provider,
  model: "gpt-5-mini",
  workDir,
  interactive: false,
});

const idea = "a node CLI script that converts temperatures between Celsius and Fahrenheit with a simple menu";

try {
  const result = await orchestrator.run(idea);
  console.log("\n=== E2E RESULT ===");
  console.log("Product:", result.spec.product_name);
  console.log("Review score:", result.review.score);
} catch (err) {
  console.error("E2E FAILED:", err.message);
  process.exit(1);
}
