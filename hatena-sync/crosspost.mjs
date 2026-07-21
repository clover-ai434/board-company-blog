import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadEnv } from "./env.mjs";
import { postEntry } from "./hatena-client.mjs";
import { parseFrontmatter } from "../scripts/frontmatter.mjs";
import { markdownToHtml } from "../scripts/markdown.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const POSTS_DIR = join(ROOT, "posts");
const ENV_PATH = join(__dirname, ".env");
const LOG_PATH = join(__dirname, "crosspost-log.json");

const NG_WORDS = ["死ね", "殺す", "馬鹿", "アホ", "クソ", "fuck", "shit"];

function checkContent(title, body) {
  const problems = [];
  if (!title || !title.trim()) problems.push("タイトルが空です。");
  if (!body || body.trim().length < 30) problems.push("本文が短すぎます。");
  const combined = `${title}\n${body}`;
  for (const word of NG_WORDS) {
    if (combined.includes(word)) problems.push(`NGワードを含んでいます: "${word}"`);
  }
  return problems;
}

function readLog() {
  if (!existsSync(LOG_PATH)) return {};
  return JSON.parse(readFileSync(LOG_PATH, "utf8"));
}

function writeLog(log) {
  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), "utf8");
}

async function main() {
  const slug = process.argv[2];

  if (!slug) {
    console.error("使い方: node hatena-sync/crosspost.mjs <投稿slug、例: 2026-07-21-1>");
    process.exit(1);
  }

  const postPath = join(POSTS_DIR, `${slug}.md`);
  if (!existsSync(postPath)) {
    console.error(`記事が見つかりません: ${postPath}`);
    process.exit(1);
  }

  const log = readLog();
  if (log[slug]) {
    console.error(`この記事は既にはてなブログへ投稿済みです(${log[slug].postedAt})。`);
    process.exit(1);
  }

  const raw = readFileSync(postPath, "utf8");
  const { meta, body } = parseFrontmatter(raw);
  const title = meta.title || slug;

  const problems = checkContent(title, body);
  if (problems.length > 0) {
    console.error("投稿をブロックしました:");
    for (const p of problems) console.error(" - " + p);
    process.exit(1);
  }

  const env = loadEnv(ENV_PATH);
  const credentials = {
    hatenaId: env.HATENA_ID,
    apiKey: env.HATENA_API_KEY,
    rootEndpoint: env.HATENA_ROOT_ENDPOINT,
  };

  for (const [key, value] of Object.entries(credentials)) {
    if (!value) {
      console.error(`hatena-sync/.env に ${key} が設定されていません。`);
      process.exit(1);
    }
  }

  const contentHtml = markdownToHtml(body) + `\n<p><a href="https://clover-ai434.github.io/board-company-blog/posts/${slug}.html">元記事(公式ブログ)はこちら</a></p>`;

  const result = await postEntry(credentials, { title, contentHtml, draft: false });

  log[slug] = { postedAt: new Date().toISOString(), title, publicUrl: result.publicUrl };
  writeLog(log);

  console.log("はてなブログへの投稿に成功しました。");
  console.log("公開URL:", result.publicUrl);
}

main().catch((err) => {
  console.error("投稿に失敗しました:", err.message);
  if (err.body) console.error(err.body);
  process.exit(1);
});
