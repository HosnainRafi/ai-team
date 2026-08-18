// executor.js — safely run shell commands inside the generated project directory

import { execFile } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_TIMEOUT_MS = 60_000;
const BANNED = ["rm -rf /", "mkfs", ":(){:|:&};:", "curl ", "wget ", "bash -i", " nc ", "ncat", "> /dev/"];

export function isCommandAllowed(cmd) {
  const lower = cmd.toLowerCase();
  for (const b of BANNED) if (lower.includes(b)) return false;
  return true;
}

/**
 * Run a shell command in projectDir, capturing stdout/stderr/exitCode.
 */
export function runCommand(cmd, projectDir, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    if (!isCommandAllowed(cmd)) {
      return resolve({
        command: cmd,
        stdout: "",
        stderr: "Command blocked: potentially unsafe operation is not allowed in the AI sandbox.",
        exitCode: -1,
        timedOut: false,
      });
    }
    execFile(
      "bash",
      ["-c", cmd],
      { cwd: projectDir, timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        resolve({
          command: cmd,
          stdout: String(stdout ?? "").slice(0, 8000),
          stderr: String(stderr ?? "").slice(0, 8000),
          exitCode: err?.code ?? 0,
          timedOut: err?.killed === true || err?.signal === "SIGTERM",
          rawError: err?.message?.slice(0, 500),
        });
      }
    );
  });
}

/** Write a file inside the project dir (creates dirs as needed). Returns absolute path. */
export function writeFile(projectDir, filePath, content) {
  const abs = join(projectDir, filePath);
  const dir = abs.slice(0, abs.lastIndexOf("/"));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(abs, content);
  return abs;
}

/** List all files in the project dir (relative paths, skips noise). */
export function listFiles(projectDir) {
  const out = [];
  walk(projectDir, projectDir, out);
  return out;
}

function walk(root, dir, out) {
  const skip = new Set(["node_modules", ".git", "ai-team.session.log", "ai-team.transcript.json"]);
  for (const entry of readdirSync(dir)) {
    if (skip.has(entry)) continue;
    const abs = join(dir, entry);
    const rel = abs.slice(root.length + 1);
    const st = statSync(abs);
    if (st.isDirectory()) walk(root, abs, out);
    else out.push({ path: rel, size: st.size });
  }
}

export { readFileSync, existsSync };
