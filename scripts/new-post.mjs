import { writeFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { buildFrontmatter } from "./frontmatter.mjs";
import { parseFrontmatter } from "./frontmatter.mjs";
import { checkPost } from "./guardrails.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");
const POSTS_DIR = join(ROOT, "posts");

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

export function todayIso(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function nextSlug(date) {
  mkdirSync(POSTS_DIR, { recursive: true });
  let n = 1;
  while (existsSync(join(POSTS_DIR, `${date}-${n}.md`))) n++;
  return `${date}-${n}`;
}

export function findExistingTitle(title) {
  const normalizedTitle = title.trim();
  for (const filename of readdirSync(POSTS_DIR).filter((name) => name.endsWith(".md"))) {
    const raw = readFileSync(join(POSTS_DIR, filename), "utf8");
    const { meta } = parseFrontmatter(raw);
    if (meta.title?.trim() === normalizedTitle) return filename;
  }
  return null;
}

async function main() {
  const title = process.argv[2];

  if (!title) {
    console.error('使い方: node scripts/new-post.mjs "タイトル" <<\'EOF\'\n本文...\nEOF');
    process.exit(1);
  }

  const body = (await readStdin()).trim();
  const problems = checkPost(title, body);
  const existingTitleFile = findExistingTitle(title);
  if (existingTitleFile) {
    problems.push(`同じタイトルの記事が既にあります: posts/${existingTitleFile}`);
  }

  if (problems.length > 0) {
    console.error("投稿をブロックしました:");
    for (const p of problems) console.error(" - " + p);
    process.exit(1);
  }

  const date = todayIso();
  const slug = nextSlug(date);
  const frontmatter = buildFrontmatter({ title, date });
  writeFileSync(join(POSTS_DIR, `${slug}.md`), frontmatter + "\n" + body + "\n", "utf8");

  console.log(`記事を作成しました: posts/${slug}.md`);
}

if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  main();
}
