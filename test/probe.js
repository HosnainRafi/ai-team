// Probe: reproduce Designer call raw to inspect output
import { LLMClient } from "../src/llm.js";
import { resolveProvider } from "../src/config.js";
import { ROLES } from "../src/roles.js";

const provider = resolveProvider({});
const client = new LLMClient(provider);

const spec = {
  product_name: "TempConvert CLI",
  features: ["menu with C->F and F->C", "input validation"],
  non_goals: [],
  tech_stack_suggestion: "Node.js CLI",
  idea: "temperature converter CLI",
};

const res = await client.chat({
  model: process.env.E2E_MODEL || "gpt-5.5",
  messages: [{ role: "user", content: `Product specification:\n\n${JSON.stringify(spec, null, 1)}` }],
  systemPrompt: ROLES.designer.prompt,
  mode: "json",
});
console.log("RESULT:", JSON.stringify(res, null, 1).slice(0, 3000));
