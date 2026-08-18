// Probe 8: feed the raw dev output through extractJson to reproduce the parse failure.
import { extractJson } from "../src/llm.js";
import { readFileSync } from "node:fs";

const t = readFileSync("/home/ubuntu/ai-team/test/raw_dev_output.txt", "utf8");
try {
  const j = extractJson(t);
  console.log("EXTRACT OK, files:", j.files.map((f) => f.path));
} catch (e) {
  console.log("EXTRACT FAIL:", e.message);
  // find position of unmatched braces
  let depth = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "{") depth++;
    if (t[i] === "}") {
      depth--;
      if (depth === 0) {
        console.log("outermost closing brace at:", i, "of", t.length);
        break;
      }
    }
  }
}
