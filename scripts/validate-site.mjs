import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DOCS_DIR = join(ROOT, "docs");
const SITE_URL = "https://clover-ai434.github.io/board-company-blog/";
const errors = [];

function read(path) {
  return readFileSync(join(DOCS_DIR, path), "utf8");
}

function requireFile(path, reason) {
  if (!existsSync(join(DOCS_DIR, path))) {
    errors.push(`${path}: ${reason}`);
  }
}

function checkLiteralLocalLinks(file, html) {
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1];
    // 診断結果のCTAなど、JavaScriptが実行時に組み立てるhrefは除外する。
    if (/[+']/.test(href)) continue;
    if (/^(?:https?:|mailto:|tel:|#)/i.test(href)) continue;
    const targetPath = href.split(/[?#]/, 1)[0];
    if (!targetPath) continue;
    const target = join(DOCS_DIR, dirname(file), targetPath);
    if (!existsSync(target)) {
      errors.push(`${file}: リンク先がありません (${href})`);
    }
  }
}

for (const path of [
  "index.html",
  "oversight-kit.html",
  "about.html",
  "boundary-check.html",
  "quiz.html",
  "robots.txt",
  "sitemap.xml",
]) {
  requireFile(path, "必須ファイルがありません");
}

if (errors.length === 0) {
  const sitemap = read("sitemap.xml");
  const robots = read("robots.txt");
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

  if (locs.length === 0) {
    errors.push("sitemap.xml: locが1件もありません");
  }
  if (sitemap.includes("consulting.html")) {
    errors.push("sitemap.xml: 終了済みconsulting.htmlを含めないでください");
  }
  if (!robots.includes(`${SITE_URL}sitemap.xml`)) {
    errors.push("robots.txt: sitemap.xmlの宣言がありません");
  }

  const sitePath = new URL(SITE_URL).pathname;
  const sitemapPages = new Set();
  for (const loc of locs) {
    let pathname;
    try {
      pathname = new URL(loc).pathname;
    } catch {
      errors.push(`sitemap.xml: 不正なURL ${loc}`);
      continue;
    }
    if (!pathname.startsWith(sitePath)) {
      errors.push(`sitemap.xml: サイト外URL ${loc}`);
      continue;
    }
    const page = decodeURIComponent(pathname.slice(sitePath.length)) || "index.html";
    sitemapPages.add(page);
    requireFile(page, `サイトマップにあるページが存在しません (${loc})`);
  }

  const postFiles = readdirSync(join(DOCS_DIR, "posts")).filter((name) => name.endsWith(".html"));
  if (postFiles.length === 0) {
    errors.push("docs/posts: 生成された記事がありません");
  }
  for (const name of postFiles) {
    if (!sitemapPages.has(`posts/${name}`)) {
      errors.push(`sitemap.xml: 記事${name}がサイトマップにありません`);
    }
    const html = read(`posts/${name}`);
    if (!html.includes('<link rel="canonical"')) {
      errors.push(`posts/${name}: canonicalがありません`);
    }
    if (!html.includes("../quiz.html")) {
      errors.push(`posts/${name}: AI活用度診断への導線がありません`);
    }
    if (html.includes("consulting.html")) {
      errors.push(`posts/${name}: 終了済みconsulting.htmlへの導線が残っています`);
    }
  }

  const staticHtmlFiles = readdirSync(DOCS_DIR)
    .filter((name) => name.endsWith(".html"))
    .map((name) => ({ file: name, html: read(name) }));
  for (const { file, html } of staticHtmlFiles) checkLiteralLocalLinks(file, html);
  for (const name of postFiles) {
    checkLiteralLocalLinks(`posts/${name}`, read(`posts/${name}`));
  }
}

if (errors.length > 0) {
  console.error(`サイト検査失敗 (${errors.length}件)`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log(`サイト検査OK: sitemap、robots、静的ページ、記事${readdirSync(join(DOCS_DIR, "posts")).filter((name) => name.endsWith(".html")).length}件を確認しました。`);
