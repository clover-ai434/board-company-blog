import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseFrontmatter } from "./frontmatter.mjs";
import { checkPost } from "./guardrails.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = join(__dirname, "..", "posts");
const THEME_LOG_PATH = join(__dirname, "..", "cloud-strategy-notes", "tips-theme-log.md");
// tips-theme-log.mdは2026-08-17の戦略メモで新設され、2026-08-09分から遡って記録されている。
// それより前の記事(業界ウォッチ等、Tips系以外の記事を含む)は対象外とする。
const THEME_LOG_START_DATE = "2026-08-09";
const errors = [];
const titles = new Map();
const files = readdirSync(POSTS_DIR).filter((name) => name.endsWith(".md")).sort();
const themeLog = readFileSync(THEME_LOG_PATH, "utf8");

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

for (const filename of files) {
  const raw = readFileSync(join(POSTS_DIR, filename), "utf8");
  const { meta, body } = parseFrontmatter(raw);
  const problems = checkPost(meta.title || "", body);
  const expectedDate = filename.slice(0, 10);

  if (!meta.title || !meta.title.trim()) {
    errors.push(`${filename}: titleがありません`);
  }
  if (!meta.date || !isIsoDate(meta.date)) {
    errors.push(`${filename}: dateがYYYY-MM-DD形式ではありません (${meta.date || "空"})`);
  }
  if (isIsoDate(meta.date) && meta.date !== expectedDate) {
    errors.push(`${filename}: ファイル名の日付(${expectedDate})とfrontmatterの日付(${meta.date})が不一致です`);
  }
  if (expectedDate >= THEME_LOG_START_DATE && !themeLog.includes(`| ${expectedDate} |`)) {
    errors.push(`${filename}: cloud-strategy-notes/tips-theme-log.mdに${expectedDate}の行がありません(テーマ重複チェック表への追記漏れ。次回の戦略メモ作成セッションで追記・解消される想定のため、それまでの一時的な赤は緊急のバグではない)`);
  }
  for (const problem of problems) {
    errors.push(`${filename}: ${problem}`);
  }
  if (meta.title) {
    const previous = titles.get(meta.title);
    if (previous) {
      errors.push(`${filename}: titleが${previous}と重複しています`);
    }
    titles.set(meta.title, filename);
  }
}

if (errors.length > 0) {
  console.error(`記事コンテンツ検査失敗 (${errors.length}件)`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log(`記事コンテンツ検査OK: ${files.length}件のfrontmatter・本文・重複を確認しました。`);
