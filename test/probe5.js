// Probe 5: replicate exactly what orchestrator sends to Developer.
// key difference: orchestrator uses `this.spec` and `this.design` — full objects returned by prior acts.
// Also note e2e2 run: Design phase also wrote design.md before Developer. The prompt to Developer is:
//   Product spec:\n<spec>\n\nDesign plan:\n<design>
// where spec includes `summary` etc. Full length ~ 4.5k chars. Retry failed 3x → output never contains JSON.
// Suspect: with longer input the proxy model produces prose only. Test same-length input directly.
import { LLMClient } from "../src/llm.js";
import { resolveProvider } from "../src/config.js";
import { ROLES } from "../src/roles.js";
import { readFileSync } from "node:fs";

const provider = resolveProvider({});
const client = new LLMClient(provider);

// Load the exact spec/design from the failed run's transcript if available
let spec, design;
try {
  const t = JSON.parse(readFileSync("/home/ubuntu/ai-team/test-project2/ai-team.transcript.json", "utf8"));
  const ceoEntry = t.entries.find((e) => e.roleKey === "ceo");
  const designerEntry = t.entries.find((e) => e.roleKey === "designer");
  spec = JSON.parse(ceoEntry.text);
  design = JSON.parse(designerEntry.text);
  console.log("loaded from transcript, spec chars:", ceoEntry.text.length, "design chars:", designerEntry.text.length);
} catch (e) {
  console.log("transcript unavailable:", e.message);
  process.exit(1);
}

for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    const res = await client.chatWithRetry({
      model: process.env.E2E_MODEL || "gpt-5.5",
      messages: [
        { role: "user", content: `Product spec:\n${JSON.stringify(spec, null, 1)}\n\nDesign plan:\n${JSON.stringify(design, null, 1)}` },
      ],
      systemPrompt: ROLES.developer.prompt,
      mode: "json",
    });
    console.log(`attempt ${attempt} OK:`, res.json?.files?.map((f) => f.path));
    break;
  } catch (err) {
    console.error(`attempt ${attempt} FAILED:`, err.message.slice(0, 200));
  }
}
