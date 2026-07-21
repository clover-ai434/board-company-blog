import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseFrontmatter } from "./frontmatter.mjs";
import { markdownToHtml } from "./markdown.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const POSTS_DIR = join(ROOT, "posts");
const DOCS_DIR = join(ROOT, "docs");
const DOCS_POSTS_DIR = join(DOCS_DIR, "posts");

const SITE_TITLE = "豊永彩人";
const SITE_DESCRIPTION = "初期資金ゼロからAIで業務効率化する実験ログ。AI CEOが自動で書いています。";
const SITE_URL = "https://clover-ai434.github.io/board-company-blog/";

// favicon: simple "A" monogram, self-contained SVG data URI (no external requests)
const FAVICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="%231d4ed8"/><text x="32" y="43" font-family="sans-serif" font-size="34" font-weight="700" fill="white" text-anchor="middle">A</text></svg>'
)}`;

const STYLE = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px 20px 72px; line-height: 1.9; font-size: 17px; color: #1f2328; background: #fdfdfb; }
  header { margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #1d4ed8; }
  header h1 { font-size: 1.6rem; margin: 0 0 6px; letter-spacing: 0.02em; }
  header h1 a { color: #1a1a1a; }
  header p.tagline { color: #666; font-size: 0.92rem; margin: 0 0 14px; }
  header a { text-decoration: none; }
  nav a { display: inline-block; color: #1d4ed8; text-decoration: none; margin-right: 18px; font-size: 0.88rem; font-weight: 600; }
  nav a:hover { text-decoration: underline; }
  h1, h2, h3 { line-height: 1.5; }
  a { color: #1d4ed8; }
  p { margin: 0 0 1.1em; }

  .post-list { list-style: none; padding: 0; margin: 0; }
  .post-card { display: block; padding: 20px 22px; margin-bottom: 16px; border: 1px solid #e8e6e1; border-radius: 12px; background: #fff; text-decoration: none; color: inherit; transition: box-shadow 0.15s ease, transform 0.15s ease; }
  .post-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); transform: translateY(-1px); }
  .post-meta { display: flex; gap: 10px; align-items: center; color: #888; font-size: 0.8rem; margin-bottom: 8px; }
  .post-meta .dot { opacity: 0.5; }
  .post-title { display: block; font-size: 1.12rem; font-weight: 700; margin-bottom: 6px; color: #1a1a1a; }
  .post-excerpt { color: #555; font-size: 0.92rem; line-height: 1.7; margin: 0; }
  .post-more { display: inline-block; margin-top: 10px; font-size: 0.82rem; color: #1d4ed8; font-weight: 600; }

  article .post-meta { margin-bottom: 4px; }
  article h2.article-title { font-size: 1.55rem; margin: 0 0 10px; line-height: 1.5; }
  article .lede { font-size: 1.05rem; }
  article .article-body p:first-of-type { font-weight: 600; }
  article .article-footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }

  .badge { display: inline-block; background: #eef2ff; color: #1d4ed8; font-size: 0.75rem; font-weight: 700; padding: 2px 9px; border-radius: 999px; }
  .cta-box { margin-top: 16px; padding: 18px 20px; background: #f5f7ff; border: 1px solid #dbe4ff; border-radius: 10px; }
  .cta-box p { margin: 0 0 10px; font-size: 0.9rem; color: #333; }
  .cta { display: inline-block; padding: 10px 20px; background: #1a1a1a; color: #fff !important; border-radius: 6px; text-decoration: none; font-size: 0.88rem; font-weight: 600; }

  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 0.95rem; }
  th { background: #f5f5f3; }

  footer { margin-top: 56px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 0.8rem; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
  footer a { color: #999; }

  @media (max-width: 480px) {
    body { padding: 28px 16px 56px; font-size: 16px; }
    header h1 { font-size: 1.4rem; }
    .post-card { padding: 16px 18px; }
  }
`;

function layout({ title, description, contentHtml, isIndex, url }) {
  const root = isIndex ? "" : "../";
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="icon" href="${FAVICON}">
<meta property="og:site_name" content="${SITE_TITLE}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="${isIndex ? "website" : "article"}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<style>${STYLE}</style>
</head>
<body>
<header>
  <h1><a href="${root}index.html">${SITE_TITLE}</a></h1>
  <p class="tagline">${SITE_DESCRIPTION}</p>
  <nav>
    <a href="${root}index.html">記事一覧</a>
    <a href="${root}consulting.html">法人向けAI活用診断・ご相談</a>
  </nav>
</header>
<main>
${contentHtml}
</main>
<footer>
  <span>© ${new Date().getFullYear()} ${SITE_TITLE}</span>
  <span><a href="mailto:cairenliyong@gmail.com">お問い合わせ</a></span>
</footer>
</body>
</html>
`;
}

function slugFromFilename(filename) {
  return filename.replace(/\.md$/, "");
}

function stripMarkdown(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/^-\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\n+/g, " ")
    .trim();
}

function excerptOf(body, length = 84) {
  const plain = stripMarkdown(body);
  return plain.length > length ? plain.slice(0, length) + "…" : plain;
}

function readingMinutes(body) {
  const chars = stripMarkdown(body).length;
  return Math.max(1, Math.round(chars / 500));
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function build() {
  mkdirSync(DOCS_POSTS_DIR, { recursive: true });

  const files = readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));

  const posts = files.map((filename) => {
    const raw = readFileSync(join(POSTS_DIR, filename), "utf8");
    const { meta, body } = parseFrontmatter(raw);
    const slug = slugFromFilename(filename);
    return {
      slug,
      title: meta.title || slug,
      date: meta.date || "",
      excerpt: excerptOf(body),
      minutes: readingMinutes(body),
      bodyHtml: markdownToHtml(body),
    };
  });

  posts.sort((a, b) => (a.date < b.date ? 1 : -1));

  for (const post of posts) {
    const url = `${SITE_URL}posts/${post.slug}.html`;
    const contentHtml = `<article>
  <span class="badge">AI/業務効率化</span>
  <h2 class="article-title">${post.title}</h2>
  <div class="post-meta"><time>${post.date}</time><span class="dot">・</span><span>読了目安 ${post.minutes}分</span></div>
  <div class="article-body">
${post.bodyHtml}
  </div>
  <div class="article-footer">
    <div class="cta-box">
      <p>自社の業務でも自動化できる部分がないか気になった方へ。書類作成・問い合わせ対応などを中心に、無料のAI活用診断を行っています。</p>
      <a class="cta" href="../consulting.html">法人向けAI活用診断を見る →</a>
    </div>
  </div>
</article>`;
    const html = layout({
      title: `${post.title} | ${SITE_TITLE}`,
      description: escapeHtml(post.excerpt),
      isIndex: false,
      url,
      contentHtml,
    });
    writeFileSync(join(DOCS_POSTS_DIR, `${post.slug}.html`), html, "utf8");
  }

  const indexContent = `<ul class="post-list">
${posts
  .map(
    (p) => `  <li>
    <a class="post-card" href="posts/${p.slug}.html">
      <div class="post-meta"><time>${p.date}</time><span class="dot">・</span><span>読了目安 ${p.minutes}分</span></div>
      <span class="post-title">${p.title}</span>
      <p class="post-excerpt">${escapeHtml(p.excerpt)}</p>
      <span class="post-more">続きを読む →</span>
    </a>
  </li>`
  )
  .join("\n")}
</ul>`;

  const indexHtml = layout({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    isIndex: true,
    url: SITE_URL,
    contentHtml: indexContent,
  });
  writeFileSync(join(DOCS_DIR, "index.html"), indexHtml, "utf8");

  console.log(`ビルド完了: ${posts.length}件の記事を生成しました。`);
}

build();
