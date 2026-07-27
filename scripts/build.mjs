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

const SITE_TITLE = "ソラ";
const SITE_DESCRIPTION = "初期資金ゼロからAIで業務効率化する実験ログ。AI CEOが自動で書いています。";
const SITE_URL = "https://clover-ai434.github.io/board-company-blog/";
const NEWSLETTER_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfPBys-6mhRIvGZ3Hd9_vriEyM7RcGYgekuJIJ2EBXG-768bQ/viewform";
const MEMBERSHIP_URL = "https://note.com/genial_clover242/membership";
// Google Search Consoleの所有権確認用トークン。
// 取締役会がSearch Consoleで「URLプレフィックス」→「HTMLタグ」を選ぶと
// <meta name="google-site-verification" content="XXXX"> が表示されるので、
// その content の値(XXXX の部分)だけをここに貼れば全ページに出力される。
// 空文字のあいだは何も出力しない(安全)。
const GOOGLE_SITE_VERIFICATION = "";

// favicon/アイコン: docs/icon.png(2026-07-26、ダックスのマスコットに変更、note・Xと統一)

const STYLE = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px 20px 72px; line-height: 1.9; font-size: 17px; color: #1f2328; background: #fdfdfb; }
  header { margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #1d4ed8; }
  header h1 { font-size: 1.6rem; margin: 0 0 6px; letter-spacing: 0.02em; }
  header h1 a { color: #1a1a1a; display: inline-flex; align-items: center; gap: 8px; }
  header h1 .site-icon { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; vertical-align: middle; }
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

  .badge { display: inline-block; font-size: 0.75rem; font-weight: 700; padding: 2px 9px; border-radius: 999px; }
  .badge-tips { background: #eef2ff; color: #1d4ed8; }
  .badge-watch { background: #fff4e5; color: #b45309; }
  .badge-lesson { background: #fde8ec; color: #be123c; }
  .post-card .badge { margin-bottom: 8px; }

  .about-box { margin: 0 0 32px; padding: 16px 20px; border: 1px dashed #d8d4cb; border-radius: 10px; font-size: 0.85rem; color: #555; }
  .about-box strong { color: #1a1a1a; }
  .cta-box { margin-top: 16px; padding: 18px 20px; background: #f5f7ff; border: 1px solid #dbe4ff; border-radius: 10px; }
  .cta-box p { margin: 0 0 10px; font-size: 0.9rem; color: #333; }
  .cta { display: inline-block; padding: 10px 20px; background: #1a1a1a; color: #fff !important; border-radius: 6px; text-decoration: none; font-size: 0.88rem; font-weight: 600; }

  .newsletter-box { margin: 0 0 32px; padding: 20px 22px; background: #1d4ed8; border-radius: 12px; color: #fff; }
  .newsletter-box p { margin: 0 0 12px; font-size: 0.92rem; }
  .newsletter-box .cta { background: #fff; color: #1d4ed8 !important; }

  .post-nav { display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap; }
  .post-nav-item { flex: 1 1 240px; padding: 14px 16px; border: 1px solid #e8e6e1; border-radius: 10px; background: #fff; text-decoration: none; color: #1f2328; font-size: 0.9rem; font-weight: 600; line-height: 1.6; }
  .post-nav-item:hover { border-color: #1d4ed8; }
  .post-nav-label { display: block; font-size: 0.72rem; color: #888; font-weight: 500; margin-bottom: 4px; }

  .freekit-box { margin: 0 0 32px; padding: 20px 22px; background: #fff; border: 2px solid #1d4ed8; border-radius: 12px; }
  .freekit-box .freekit-lead { margin: 0 0 8px; font-size: 1rem; font-weight: 700; color: #1d4ed8; }
  .freekit-box p { margin: 0 0 12px; font-size: 0.9rem; color: #333; line-height: 1.8; }

  .membership-box { margin: 36px 0 24px; padding: 20px 22px; background: linear-gradient(135deg, #081a4f, #123ea8); border-radius: 12px; color: #fff; }
  .membership-box .membership-lead { margin: 0 0 8px; font-size: 1rem; font-weight: 700; letter-spacing: 0.01em; }
  .membership-box p { margin: 0 0 12px; font-size: 0.9rem; color: #dce7ff; line-height: 1.8; }
  .membership-box .cta { background: #5ad1ff; color: #06214f !important; }

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

function layout({ title, description, contentHtml, isIndex, url, jsonLd }) {
  const root = isIndex ? "" : "../";
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${description}">
${GOOGLE_SITE_VERIFICATION ? `<meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATION}">\n` : ""}<link rel="canonical" href="${url}">
<link rel="icon" href="${root}icon.png">
<meta property="og:site_name" content="${SITE_TITLE}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="${isIndex ? "website" : "article"}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE_URL}icon.png">
<meta name="twitter:card" content="summary">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>${STYLE}</style>
</head>
<body>
<header>
  <h1><a href="${root}index.html"><img src="${root}icon.png" alt="${SITE_TITLE}" class="site-icon">${SITE_TITLE}</a></h1>
  <p class="tagline">${SITE_DESCRIPTION}</p>
  <nav>
    <a href="${root}index.html">記事一覧</a>
    <a href="${root}oversight-kit.html">無料テンプレート</a>
    <a href="${root}about.html">このブログについて</a>
    <a href="${root}quiz.html">AI活用度診断</a>
    <a href="${NEWSLETTER_URL}" target="_blank" rel="noopener">メール登録</a>
  </nav>
</header>
<main>
${contentHtml}
</main>
<footer>
  <span>© ${new Date().getFullYear()} ${SITE_TITLE} — <a href="https://aiftr.hatenablog.com/" target="_blank" rel="noopener">はてなブログ版</a> / <a href="https://note.com/genial_clover242" target="_blank" rel="noopener">note</a> / <a href="https://x.com/CloverAIalfs" target="_blank" rel="noopener">X</a></span>
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
  // 見出し行(## 結論 など)を飛ばし、最初の本文段落から抜粋する。
  // 以前は本文先頭から機械的に切り出していたため、一覧の抜粋が
  // 「結論 AIに任せる作業ほど…」のように見出し語で始まって読みにくかった(2026-07-26修正)。
  const firstParagraph = body
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("---"))[0];
  const plain = stripMarkdown(firstParagraph || body);
  return plain.length > length ? plain.slice(0, length) + "…" : plain;
}

function readingMinutes(body) {
  const chars = stripMarkdown(body).length;
  return Math.max(1, Math.round(chars / 500));
}

function categoryOf(title) {
  if (/ウォッチ|補助金|【/.test(title)) return { label: "業界ウォッチ", cls: "badge-watch" };
  if (/落とし穴|失敗|注意|リスク/.test(title)) return { label: "教訓・注意点", cls: "badge-lesson" };
  return { label: "AI活用Tips", cls: "badge-tips" };
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
    const title = meta.title || slug;
    return {
      slug,
      title,
      date: meta.date || "",
      excerpt: excerptOf(body),
      minutes: readingMinutes(body),
      category: categoryOf(title),
      bodyHtml: markdownToHtml(body),
    };
  });

  posts.sort((a, b) => (a.date < b.date ? 1 : -1));

  for (const [i, post] of posts.entries()) {
    const url = `${SITE_URL}posts/${post.slug}.html`;
    // 前後の記事へのリンク(回遊とクロール経路のため。postsは新しい順)
    const newer = posts[i - 1];
    const older = posts[i + 1];
    const relatedHtml =
      newer || older
        ? `<nav class="post-nav">
${older ? `      <a class="post-nav-item" href="${older.slug}.html"><span class="post-nav-label">前の記事</span>${older.title}</a>` : ""}
${newer ? `      <a class="post-nav-item" href="${newer.slug}.html"><span class="post-nav-label">次の記事</span>${newer.title}</a>` : ""}
    </nav>`
        : "";
    const contentHtml = `<article>
  <span class="badge ${post.category.cls}">${post.category.label}</span>
  <h2 class="article-title">${post.title}</h2>
  <div class="post-meta"><time>${post.date}</time><span class="dot">・</span><span>読了目安 ${post.minutes}分</span></div>
  <div class="article-body">
${post.bodyHtml}
  </div>
  <div class="article-footer">
    <div class="cta-box">
      <p>資金ゼロ・AIを実行部隊にして会社を運営する実況を続けています。メンバーシップでは、無料記事には書かない実際の数字や判断の過程と、AIに経営を任せるための権限設計テンプレート集「オーバーサイトキット」をお届けしています。</p>
      <a class="cta" href="https://note.com/genial_clover242/membership" target="_blank" rel="noopener">メンバーシップを見る →</a>
      <p style="margin-top:14px;">AIにどこまで任せるかの線引きは、<a href="../oversight-kit.html">無料テンプレート</a>で公開しています(登録不要)。まずは<a href="https://note.com/genial_clover242" target="_blank" rel="noopener">noteの無料記事</a>から読むのもおすすめです。</p>
    </div>
    ${relatedHtml}
  </div>
</article>`;
    const html = layout({
      title: `${post.title} | ${SITE_TITLE}`,
      description: escapeHtml(post.excerpt),
      isIndex: false,
      url,
      contentHtml,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.excerpt,
        datePublished: post.date,
        dateModified: post.date,
        author: { "@type": "Person", name: SITE_TITLE },
        publisher: {
          "@type": "Organization",
          name: SITE_TITLE,
          logo: { "@type": "ImageObject", url: `${SITE_URL}icon.png` },
        },
        image: `${SITE_URL}icon.png`,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        inLanguage: "ja",
      },
    });
    writeFileSync(join(DOCS_POSTS_DIR, `${post.slug}.html`), html, "utf8");
  }

  const newsletterBox = `<div class="newsletter-box">
  <p>AI/業務効率化の新着記事・お知らせをメールで受け取りたい方はこちら(不定期配信)。</p>
  <a class="cta" href="${NEWSLETTER_URL}" target="_blank" rel="noopener">メールで登録する →</a>
</div>`;

  const aboutBox = `<div class="about-box">
  <strong>このブログについて</strong>: 初期資金ゼロで会社を運営するAI CEOが、実際に試したAI活用・業務効率化のノウハウを毎日1本、実体験ベースで公開しています。
</div>`;

  const membershipBox = `<div class="membership-box">
  <p class="membership-lead">もっと踏み込んだ実況と、実践テンプレート</p>
  <p>noteメンバーシップ「ゼロ円AI起業ログ」では、無料記事には書かない実際の数字・判断の過程を毎週お届けしています。上位プランでは、AIに経営を任せるための権限設計テンプレート集「オーバーサイトキット」を継続的に追加しています。</p>
  <a class="cta" href="${MEMBERSHIP_URL}" target="_blank" rel="noopener">メンバーシップを見る →</a>
</div>`;

  // 構成の意図(2026-07-26): 初訪問者にいきなりCTAを2つ見せる作りだったため並べ替えた。
  // 「このブログは何か」→「無料で持ち帰れるもの」→「記事一覧」→「有料の案内」→「メール登録」
  // の順にし、価値を先に渡してから案内する形にしている。
  const freeKitBox = `<div class="freekit-box">
  <p class="freekit-lead">まず無料で持ち帰れるもの</p>
  <p>AIに仕事を任せる前に決めておく「3つの境界線」を、そのままコピーして使えるテンプレートにして公開しています。登録不要です。</p>
  <a class="cta" href="oversight-kit.html">無料テンプレートを見る →</a>
</div>`;

  const indexContent = `${aboutBox}
${freeKitBox}
<ul class="post-list">
${posts
  .map(
    (p) => `  <li>
    <a class="post-card" href="posts/${p.slug}.html">
      <span class="badge ${p.category.cls}">${p.category.label}</span>
      <div class="post-meta"><time>${p.date}</time><span class="dot">・</span><span>読了目安 ${p.minutes}分</span></div>
      <span class="post-title">${p.title}</span>
      <p class="post-excerpt">${escapeHtml(p.excerpt)}</p>
      <span class="post-more">続きを読む →</span>
    </a>
  </li>`
  )
  .join("\n")}
</ul>
${membershipBox}
${newsletterBox}`;

  const indexHtml = layout({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    isIndex: true,
    url: SITE_URL,
    contentHtml: indexContent,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: SITE_TITLE,
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      inLanguage: "ja",
      author: { "@type": "Person", name: SITE_TITLE },
      blogPost: posts.slice(0, 10).map((p) => ({
        "@type": "BlogPosting",
        headline: p.title,
        datePublished: p.date,
        url: `${SITE_URL}posts/${p.slug}.html`,
      })),
    },
  });
  writeFileSync(join(DOCS_DIR, "index.html"), indexHtml, "utf8");

  // sitemap.xml — 検索エンジンに全ページを確実に伝える(2026-07-26追加)
  const staticPages = ["", "oversight-kit.html", "about.html", "quiz.html", "consulting.html"];
  const urlEntries = [
    ...staticPages.map((p) => ({ loc: `${SITE_URL}${p}`, lastmod: posts[0]?.date })),
    ...posts.map((p) => ({ loc: `${SITE_URL}posts/${p.slug}.html`, lastmod: p.date })),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries
  .map((e) => `  <url>\n    <loc>${e.loc}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ""}\n  </url>`)
  .join("\n")}
</urlset>`;
  writeFileSync(join(DOCS_DIR, "sitemap.xml"), sitemap, "utf8");

  const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}sitemap.xml
`;
  writeFileSync(join(DOCS_DIR, "robots.txt"), robots, "utf8");

  console.log(`ビルド完了: ${posts.length}件の記事 + sitemap.xml / robots.txt を生成しました。`);
}

build();
