import { readFileSync, existsSync } from "node:fs";

export function loadEnv(path) {
  if (!existsSync(path)) {
    throw new Error(`.env not found at ${path}`);
  }
  const content = readFileSync(path, "utf8");
  const env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) env[key] = value;
  }
  return env;
}
