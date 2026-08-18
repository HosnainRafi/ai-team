// Probe 2: replicate exact Designer call in orchestrator (act() flow), including transcript add order.
// The e2e failure happened right after "(thinking… )" — meaning the chat() threw.
// Hypothesis: maybe it was the *second* call that failed due to a different model path?
// This script calls chat 3 times sequentially (CEO -> Designer -> Developer) like orchestrator.run would,
// but with dummy spec injected to skip CEO.
import { LLMClient } from "../src/llm.js";
import { resolveProvider } from "../src/config.js";
import { ROLES } from "../src/roles.js";

const provider = resolveProvider({});
const client = new LLMClient(provider);

const spec = {
  product_name: "TempConvert CLI",
  features: ["menu", "validation"],
  non_goals: [],
  tech_stack_suggestion: "Node.js CLI",
  idea: "a node CLI script that converts temperatures",
};

console.log("--- Designer ---");
const design = await client.chat({
  model: process.env.E2E_MODEL || "gpt-5.5",
  messages: [{ role: "user", content: `Product specification:\n\n${JSON.stringify(spec, null, 1)}` }],
  systemPrompt: ROLES.designer.prompt,
  mode: "json",
});
console.log("design ok:", !!design.json);

console.log("--- Developer ---");
const dev = await client.chat({
  model: process.env.E2E_MODEL || "gpt-5.5",
  messages: [
    {
      role: "user",
      content: `Product spec:\n${JSON.stringify(spec, null, 1)}\n\nDesign plan:\n${JSON.stringify(design.json, null, 1)}`,
    },
  ],
  systemPrompt: ROLES.developer.prompt,
  mode: "json",
});
console.log("dev ok:", !!dev.json, "files:", dev.json?.files?.map((f) => f.path));
