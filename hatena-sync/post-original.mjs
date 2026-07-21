import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadEnv } from "./env.mjs";
import { postEntry } from "./hatena-client.mjs";
import { markdownToHtml } from "../scripts/markdown.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, ".env");
const LOG_PATH = join(__dirname, "original-log.json");

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

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function readLog() {
  if (!existsSync(LOG_PATH)) return [];
  return JSON.parse(readFileSync(LOG_PATH, "utf8"));
}

function writeLog(log) {
  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), "utf8");
}

async function main() {
  const title = process.argv[2];

  if (!title) {
    console.error("使い方: node hatena-sync/post-original.mjs \"タイトル\" <<'EOF'\n本文(Markdown)...\nEOF");
    process.exit(1);
  }

  const body = (await readStdin()).trim();
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

  const contentHtml = markdownToHtml(body);
  const result = await postEntry(credentials, { title, contentHtml, draft: false });

  const log = readLog();
  log.push({ postedAt: new Date().toISOString(), title, publicUrl: result.publicUrl });
  writeLog(log);

  console.log("はてなブログ(独自記事)への投稿に成功しました。");
  console.log("公開URL:", result.publicUrl);
}

main().catch((err) => {
  console.error("投稿に失敗しました:", err.message);
  if (err.body) console.error(err.body);
  process.exit(1);
});
