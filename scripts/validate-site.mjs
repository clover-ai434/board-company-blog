import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const POSTS_DIR = join(ROOT, "posts");
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

function checkShareMetadata(file, html) {
  for (const marker of [
    '<meta property="og:title"',
    '<meta property="og:description"',
    '<meta property="og:image"',
    '<meta property="og:image:alt"',
    '<meta name="twitter:card"',
    '<meta name="twitter:title"',
    '<meta name="twitter:description"',
    '<meta name="twitter:image"',
    '<meta name="theme-color"',
  ]) {
    if (!html.includes(marker)) errors.push(`${file}: 共有用メタデータがありません (${marker})`);
  }
}

for (const path of [
  "index.html",
  "404.html",
  "oversight-kit.html",
  "about.html",
  "boundary-check.html",
  "quiz.html",
  "search.html",
  "archive.html",
  "robots.txt",
  "sitemap.xml",
  "feed.xml",
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
  const search = read("search.html");
  if (!search.includes('id="searchInput"') || !search.includes('id="searchResults"') || !search.includes('data-category-filter')) {
    errors.push("search.html: 検索フォームまたは検索結果領域がありません");
  }
  const archive = read("archive.html");
  if (!archive.includes('class="archive-page"') || !archive.includes('id="archiveContent"')) {
    errors.push("archive.html: アーカイブ領域がありません");
  }
  const index = read("index.html");
  if (!index.includes('"@type":"SearchAction"') || !index.includes("search.html?q={search_term_string}")) {
    errors.push("index.html: 検索アクションの構造化データがありません");
  }
  const feed = read("feed.xml");
  if (!feed.includes('<rss version="2.0"') || !feed.includes(`<link>${SITE_URL}</link>`)) {
    errors.push("feed.xml: RSSの基本構造がありません");
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
  const sourcePostFiles = readdirSync(POSTS_DIR).filter((name) => name.endsWith(".md"));
  if (postFiles.length === 0) {
    errors.push("docs/posts: 生成された記事がありません");
  }
  if (sourcePostFiles.length !== postFiles.length) {
    errors.push(`postsとdocs/postsの件数が一致しません (${sourcePostFiles.length}件 / ${postFiles.length}件)`);
  }
  for (const sourceName of sourcePostFiles) {
    const generatedName = sourceName.replace(/\.md$/, ".html");
    if (!postFiles.includes(generatedName)) {
      errors.push(`docs/posts/${generatedName}: posts/${sourceName}の生成物がありません`);
    }
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
    if (postFiles.length > 1 && !html.includes('class="related-posts"')) {
      errors.push(`posts/${name}: 関連記事の内部リンク導線がありません`);
    }
    if (html.includes("consulting.html")) {
      errors.push(`posts/${name}: 終了済みconsulting.htmlへの導線が残っています`);
    }
    const slug = name.replace(/\.html$/, "");
    if (!feed.includes(`${SITE_URL}posts/${slug}.html`)) {
      errors.push(`feed.xml: 記事${name}がRSSにありません`);
    }
  }

  const staticHtmlFiles = readdirSync(DOCS_DIR)
    .filter((name) => name.endsWith(".html"))
    .map((name) => ({ file: name, html: read(name) }));
  for (const { file, html } of staticHtmlFiles) {
    checkLiteralLocalLinks(file, html);
    const excludedStaticPage = file === "404.html" || file === "consulting.html" || file.startsWith("google");
    if (!excludedStaticPage) {
      checkShareMetadata(file, html);
      if (!html.includes('href="search.html"')) {
        errors.push(`${file}: 記事検索へのナビゲーションがありません`);
      }
      if (!html.includes('href="archive.html"')) {
        errors.push(`${file}: 記事アーカイブへのナビゲーションがありません`);
      }
      if (!html.includes('href="feed.xml"')) {
        errors.push(`${file}: RSSリンクがありません`);
      }
    }
  }
  for (const name of postFiles) {
    const html = read(`posts/${name}`);
    checkLiteralLocalLinks(`posts/${name}`, html);
    checkShareMetadata(`posts/${name}`, html);
    if (!html.includes('href="../feed.xml"')) {
      errors.push(`posts/${name}: RSSリンクがありません`);
    }
  }
}

if (errors.length > 0) {
  console.error(`サイト検査失敗 (${errors.length}件)`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log(`サイト検査OK: sitemap、robots、静的ページ、記事${readdirSync(join(DOCS_DIR, "posts")).filter((name) => name.endsWith(".html")).length}件を確認しました。`);
