// Probe 12: understand why probe10's json extraction returned undefined fields.
// The raw bugfixer output parsed fine in probe11's TEXT mode.
// In probe10, mode=json → extractJson on the same text → got {diagnosis: undefined...}
// meaning it parsed a DIFFERENT (wrong) object. Likely: the file content strings contain
// embedded JSON (require('./package.json'), JSON-like snippets), and our extractor picks
// the FIRST { which may be nested inside the diagnosis or file content.
// Reproduce with mode=json directly.
import { LLMClient } from "../src/llm.js";
import { resolveProvider } from "../src/config.js";
import { ROLES } from "../src/roles.js";

const provider = resolveProvider({});
const client = new LLMClient(provider);

const res = await client.chat({
  model: "gpt-5-mini",
  messages: [
    { role: "user", content: "Project files:\n<files>\nIntended behavior: non-interactive CLI\nReal failure:\n$ node index.js --to-f 100\nexit=0 timedOut\n$ echo 32 | node index.js --to-c\nexit=1 Ambiguous input" },
  ],
  systemPrompt: ROLES.bugfixer.prompt,
  mode: "json",
});
console.log("parsed keys:", Object.keys(res.json ?? {}));
console.log("diagnosis:", res.json?.diagnosis?.slice(0, 200));
