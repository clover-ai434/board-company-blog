import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildFrontmatter } from "./frontmatter.mjs";
import { checkPost } from "./guardrails.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function nextSlug(date) {
  mkdirSync(POSTS_DIR, { recursive: true });
  let n = 1;
  while (existsSync(join(POSTS_DIR, `${date}-${n}.md`))) n++;
  return `${date}-${n}`;
}

async function main() {
  const title = process.argv[2];

  if (!title) {
    console.error('使い方: node scripts/new-post.mjs "タイトル" <<\'EOF\'\n本文...\nEOF');
    process.exit(1);
  }

  const body = (await readStdin()).trim();
  const problems = checkPost(title, body);

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

main();
