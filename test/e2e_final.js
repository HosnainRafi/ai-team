// Final e2e: full orchestrator run with the fixed tester (stdin-closed commands).
import { TeamOrchestrator } from "../src/orchestrator.js";
import { resolveProvider } from "../src/config.js";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const provider = resolveProvider({});
const workDir = join(process.cwd(), "test-project-v2");
if (!existsSync(workDir)) mkdirSync(workDir, { recursive: true });

const orchestrator = new TeamOrchestrator({
  provider,
  model: process.env.E2E_MODEL || "gpt-5-mini",
  workDir,
  interactive: false,
});

const idea = "a node CLI script that converts temperatures between Celsius and Fahrenheit with a simple menu";

try {
  const result = await orchestrator.run(idea);
  console.log("\n=== E2E RESULT ===");
  console.log("Product:", result.spec.product_name);
  console.log("Review score:", result.review.score);
  console.log("Dir:", result.dir);
  console.log("Iterations:", result.meta.iterations);
} catch (err) {
  console.error("E2E FAILED:", err.message);
  process.exit(1);
}
