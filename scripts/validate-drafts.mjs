import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseFrontmatter } from "./frontmatter.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DRAFTS_DIR = join(ROOT, "drafts");
const errors = [];

const draftFiles = existsSync(DRAFTS_DIR)
  ? readdirSync(DRAFTS_DIR).filter((name) => name.endsWith(".md") && name !== "README.md")
  : [];

if (existsSync(DRAFTS_DIR)) {
  for (const filename of draftFiles) {
    const path = join(DRAFTS_DIR, filename);
    const { meta, body } = parseFrontmatter(readFileSync(path, "utf8"));
    if (!meta.title?.trim()) errors.push(`${filename}: titleがありません`);
    if (meta.status !== "draft") errors.push(`${filename}: status: draftが必要です`);
    if (meta.date && !/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) errors.push(`${filename}: dateがYYYY-MM-DDではありません`);
    if (body.trim().length < 30) errors.push(`${filename}: 本文が短すぎます`);
  }
}

if (errors.length > 0) {
  console.error(`下書き検査失敗 (${errors.length}件)`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log(`下書き検査OK: ${draftFiles.length}件を確認しました。`);
