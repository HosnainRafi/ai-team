// log.js — colored terminal output + session transcript

import { writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { join } from "node:path";

const RESET = "\x1b[0m";

export function say(roleName, color, text) {
  const wrapped = text
    .split("\n")
    .map((l) => `${color}${roleName}${RESET}  ${l}`)
    .join("\n");
  console.log(wrapped);
}

export function sayPlain(color, text) {
  console.log(`${color}${text}${RESET}`);
}

export class Transcript {
  constructor(projectDir) {
    this.projectDir = projectDir;
    this.entries = [];
  }

  add(role, roleKey, text, meta = {}) {
    const entry = { role, roleKey, text, ts: new Date().toISOString(), ...meta };
    this.entries.push(entry);
    // Append to a replay log in the project dir
    try {
      const logFile = join(this.projectDir, "ai-team.session.log");
      const line = `[${entry.ts}] ${role}: ${text.slice(0, 2000)}\n${"─".repeat(60)}\n`;
      appendFileSync(logFile, line);
    } catch {
      // project dir may not exist yet
    }
  }
}
