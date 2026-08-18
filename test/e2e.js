// End-to-end test: run ai-team build against the sandbox's built-in LLM proxy.
// Usage: OPENAI_API_KEY=$OPENAI_API_KEY OPENAI_BASE_URL=$OPENAI_API_BASE node test/e2e.js

import { TeamOrchestrator } from "../src/orchestrator.js";
import { resolveProvider } from "../src/config.js";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const provider = resolveProvider({});
if (!provider.apiKey) {
  console.error("No API key available for e2e test");
  process.exit(1);
}

const workDir = join(process.cwd(), "test-project");
if (!existsSync(workDir)) mkdirSync(workDir, { recursive: true });

const orchestrator = new TeamOrchestrator({
  provider,
  model: process.env.E2E_MODEL || "gpt-5.5",
  workDir,
  interactive: false,
});

const idea = process.argv[2] || "a node CLI script that converts temperatures between Celsius and Fahrenheit with a simple menu";

try {
  const result = await orchestrator.run(idea);
  console.log("\n=== E2E RESULT ===");
  console.log("Product:", result.spec.product_name);
  console.log("Review score:", result.review.score);
  console.log("Dir:", result.dir);
} catch (err) {
  console.error("E2E FAILED:", err.message);
  process.exit(1);
}
