// Probe 3: exact Developer call, print raw text regardless of JSON failure
import { LLMClient, extractJson } from "../src/llm.js";
import { resolveProvider } from "../src/config.js";
import { ROLES } from "../src/roles.js";

const provider = resolveProvider({});
const client = new LLMClient(provider);

// replay the same spec + design that failed
const spec = {
  product_name: "TempConvert CLI",
  summary: "lightweight Node.js CLI temperature converter",
  target_users: "students",
  features: ["menu", "c2f", "f2c", "decimal inputs", "round to 2 dp", "loop back to menu", "validation", "negative temps"],
  non_goals: [],
  tech_stack_suggestion: "Node.js CLI",
  idea: "a node CLI script that converts temperatures between Celsius and Fahrenheit with a simple menu",
};

const design = {
  tech_stack: "Node.js CLI with readline/promises, no dependencies",
  files: [
    {
      path: "index.js",
      purpose: "main CLI script with menu, validation, conversions",
      key_contents: "celsiusToFahrenheit, fahrenheitToCelsius, parseTemperature, main loop",
    },
    {
      path: "package.json",
      purpose: "metadata and run scripts",
      key_contents: "name, version, main, start script",
    },
  ],
  run_instructions: "node index.js",
  dependencies: ["Node.js"],
};

try {
  const res = await client.chat({
    model: process.env.E2E_MODEL || "gpt-5.5",
    messages: [
      { role: "user", content: `Product spec:\n${JSON.stringify(spec, null, 1)}\n\nDesign plan:\n${JSON.stringify(design, null, 1)}` },
    ],
    systemPrompt: ROLES.developer.prompt,
    mode: "json",
  });
  console.log("OK files:", res.json?.files?.map((f) => f.path));
} catch (err) {
  console.error("FAILED:", err.message);
  // fetch raw text to inspect
  const raw = await client.chat({
    model: process.env.E2E_MODEL || "gpt-5.5",
    messages: [
      { role: "user", content: `Product spec:\n${JSON.stringify(spec, null, 1)}\n\nDesign plan:\n${JSON.stringify(design, null, 1)}` },
    ],
    systemPrompt: ROLES.developer.prompt,
    mode: "text",
  });
  console.log("\n=== RAW OUTPUT (first 3000 chars) ===");
  console.log(raw.text.slice(0, 3000));
}
