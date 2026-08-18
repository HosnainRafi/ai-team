// Probe 7: get raw text of the failing Developer call on gpt-5-mini with retries disabled, save to file.
import { LLMClient } from "../src/llm.js";
import { resolveProvider } from "../src/config.js";
import { ROLES } from "../src/roles.js";
import { writeFileSync } from "node:fs";

const provider = resolveProvider({});
const client = new LLMClient(provider, { timeoutMs: 600_000 });

const spec = {
  product_name: "TempConvert CLI",
  summary: "A lightweight Node.js CLI converter.",
  features: ["menu", "validation"],
  non_goals: [],
  tech_stack_suggestion: "Node.js",
  idea: "a node CLI script that converts temperatures between Celsius and Fahrenheit with a simple menu",
};

const design = {
  tech_stack: "Node.js 20+ CLI with readline/promises, no dependencies.",
  files: [
    { path: "temp-convert.js", purpose: "main CLI script", key_contents: "readline menu, celsiusToFahrenheit, fahrenheitToCelsius, isValidNumberInput, formatNumber, mainLoop" },
    { path: "README.md", purpose: "docs", key_contents: "usage, formulas" },
  ],
  run_instructions: "node temp-convert.js",
  dependencies: ["Node.js"],
};

// gpt-5-mini is fast; see what it actually returns
const raw = await client.chat({
  model: "gpt-5-mini",
  messages: [
    { role: "user", content: `Product spec:\n${JSON.stringify(spec, null, 1)}\n\nDesign plan:\n${JSON.stringify(design, null, 1)}` },
  ],
  systemPrompt: ROLES.developer.prompt,
  mode: "text",
});
writeFileSync("/home/ubuntu/ai-team/test/raw_dev_output.txt", raw.text);
console.log("length:", raw.text.length);
console.log(raw.text.slice(0, 2000));
