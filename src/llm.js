// llm.js — minimal, dependency-free LLM client (OpenAI chat completions format)

export class LLMClient {
  constructor(provider, { timeoutMs = 300_000 } = {}) {
    this.provider = provider;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Chat completion with automatic JSON extraction.
   * Returns { text } (raw assistant text) or { json } (parsed object when mode=json).
   */
  async chat({ model, messages, systemPrompt, temperature = 0.7, mode = "text" }) {
    const allMessages = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;

    const payload = {
      model,
      messages: allMessages,
      temperature: mode === "json" ? 0.3 : temperature,
      stream: false,
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.provider.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.provider.apiKey}`,
          ...this.provider.headers,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
          `LLM API error ${res.status} (provider=${this.provider.name}, model=${model}): ${body.slice(0, 500)}`
        );
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content ?? "";
      if (mode === "json") {
        return { json: extractJson(content) };
      }
      return { text: content.trim() };
    } finally {
      clearTimeout(timer);
    }
  }

  /** chat() with automatic retries for transient failures (throttling, timeouts, parse errors). */
  async chatWithRetry(opts, { retries = 2 } = {}) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.chat(opts);
      } catch (err) {
        lastErr = err;
        const transient =
          /HTTP|fetch|abort|timeout|No JSON found|Unbalanced|Malformed/i.test(err.message);
        if (!transient || attempt === retries) throw err;
        const wait = 2000 * (attempt + 1);
        console.error(`\x1b[90m  ⚠ retrying LLM call after ${wait / 1000}s (${err.message.slice(0, 150)})\x1b[0m`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    throw lastErr;
  }
}

/** Best-effort repair: strip incomplete trailing elements so the JSON parses. */
function repairJson(s) {
  // Repeatedly try trimming from the last incomplete element boundary
  let cur = s.trim();
  for (let pass = 0; pass < 3; pass++) {
    try {
      return JSON.parse(cur);
    } catch {
      const lastColon = Math.max(cur.lastIndexOf(","), cur.lastIndexOf(":"));
      if (lastColon === -1) return null;
      cur = cur.slice(0, lastColon).trim();
      if (cur.endsWith("{") || cur.endsWith("[")) cur = cur.slice(0, -1).trim();
    }
  }
  return null;
}

/** Robustly extract a JSON object/array from model output (handles fences + prose). */
export function extractJson(raw) {
  const text = raw ?? "";
  // Try fenced blocks first (may appear multiple times)
  let candidate = "";
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) candidate = fenceMatch[1];
  else candidate = text;
  // Find outermost { or [
  const startBrace = candidate.indexOf("{");
  const startBracket = candidate.indexOf("[");
  let objStart = -1;
  if (startBrace === -1 && startBracket === -1) throw new Error("No JSON found in model output");
  if (startBrace === -1) objStart = startBracket;
  else if (startBracket === -1) objStart = startBrace;
  else objStart = Math.min(startBrace, startBracket);
  const open = candidate[objStart];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let matched = false;
  for (let i = objStart; i < candidate.length; i++) {
    const ch = candidate[i];
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        const slice = candidate.slice(objStart, i + 1);
        try {
          return JSON.parse(slice);
        } catch {
          // malformed — fall through to repair attempts below
          candidate = slice;
        }
        matched = true;
        break;
      }
    }
  }
  // Repair attempts for truncated or slightly malformed JSON
  if (!matched || depth !== 0) {
    // If braces never balanced, try trimming trailing incomplete content
    const repaired = repairJson(candidate);
    if (repaired) return repaired;
    throw new Error("Unbalanced JSON in model output");
  }
  throw new Error(`Malformed JSON in model output: ${candidate.slice(0, 120)}`);
}
