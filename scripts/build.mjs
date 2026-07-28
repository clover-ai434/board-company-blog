import { readdirSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
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

// Google Analytics 4の測定ID。
// 取締役会がGoogleアカウントでGA4プロパティを作成すると「G-XXXXXXXXXX」という
// 測定IDが発行されるので、その文字列だけをここに貼れば全ページに計測タグが入る。
// 空文字のあいだは何も出力しない(安全)。プロパティ作成自体はログインが必要なため
// CEOは代行できないが、測定IDさえもらえればこちらで即座に埋め込む。
const GA4_MEASUREMENT_ID = "";

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

  .related-posts { margin-top: 28px; }
  .related-posts h3 { margin: 0 0 10px; font-size: 1.05rem; }
  .related-post-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .related-post-card { display: block; padding: 13px 14px; border: 1px solid #e8e6e1; border-radius: 9px; background: #fff; color: #1f2328; text-decoration: none; line-height: 1.55; }
  .related-post-card:hover { border-color: #1d4ed8; }
  .related-post-card strong { display: block; font-size: 0.88rem; }
  .related-post-meta { display: block; margin-top: 6px; color: #888; font-size: 0.75rem; }

  .freekit-box { margin: 0 0 32px; padding: 20px 22px; background: #fff; border: 2px solid #1d4ed8; border-radius: 12px; }
  .freekit-box .freekit-lead { margin: 0 0 8px; font-size: 1rem; font-weight: 700; color: #1d4ed8; }
  .freekit-box p { margin: 0 0 12px; font-size: 0.9rem; color: #333; line-height: 1.8; }

  .membership-box { margin: 36px 0 24px; padding: 20px 22px; background: linear-gradient(135deg, #081a4f, #123ea8); border-radius: 12px; color: #fff; }
  .membership-box .membership-lead { margin: 0 0 8px; font-size: 1rem; font-weight: 700; letter-spacing: 0.01em; }
  .membership-box p { margin: 0 0 12px; font-size: 0.9rem; color: #dce7ff; line-height: 1.8; }
  .membership-box .cta { background: #5ad1ff; color: #06214f !important; }

  .search-page { margin-top: 8px; }
  .search-form { display: flex; gap: 10px; align-items: end; margin: 20px 0 12px; }
  .search-form label { display: block; flex: 1; font-size: 0.85rem; font-weight: 700; color: #555; }
  .search-form input { display: block; width: 100%; margin-top: 6px; padding: 11px 13px; border: 1px solid #cfcfc9; border-radius: 7px; background: #fff; color: #1f2328; font: inherit; }
  .search-form input:focus { outline: 3px solid rgba(29, 78, 216, 0.18); border-color: #1d4ed8; }
  .search-form button { border: 0; cursor: pointer; }
  .search-filters { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0 6px; }
  .filter-button { padding: 6px 12px; border: 1px solid #cfcfc9; border-radius: 999px; background: #fff; color: #555; cursor: pointer; font: inherit; font-size: 0.8rem; }
  .filter-button:hover, .filter-button.active { border-color: #1d4ed8; background: #eef2ff; color: #1d4ed8; }
  .search-summary { min-height: 1.8em; color: #666; font-size: 0.88rem; }
  .search-results { margin-top: 10px; }
  .search-result { display: block; padding: 16px 18px; margin-bottom: 12px; border: 1px solid #e8e6e1; border-radius: 10px; background: #fff; color: inherit; text-decoration: none; }
  .search-result:hover { border-color: #1d4ed8; box-shadow: 0 3px 12px rgba(0,0,0,0.06); }
  .search-result-title { display: block; margin: 6px 0; color: #1a1a1a; font-weight: 700; }
  .search-result-excerpt { margin: 0; color: #555; font-size: 0.9rem; line-height: 1.7; }
  .search-empty { padding: 20px; border: 1px dashed #d8d4cb; border-radius: 10px; color: #666; }

  .archive-page { margin-top: 8px; }
  .archive-summary { display: flex; gap: 10px; flex-wrap: wrap; margin: 18px 0 28px; }
  .archive-summary-item { padding: 8px 12px; border-radius: 8px; background: #f5f7ff; color: #1d4ed8; font-size: 0.82rem; font-weight: 700; }
  .archive-month { margin: 0 0 30px; }
  .archive-month h3 { margin: 0 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e8e6e1; font-size: 1.12rem; }
  .archive-list { list-style: none; padding: 0; margin: 0; }
  .archive-item { display: block; padding: 12px 14px; border-bottom: 1px solid #eee; text-decoration: none; color: inherit; }
  .archive-item:hover { background: #f8f9ff; }
  .archive-item-title { display: block; margin: 4px 0; color: #1a1a1a; font-weight: 700; }
  .archive-item-excerpt { display: block; color: #666; font-size: 0.86rem; line-height: 1.65; }

  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 0.95rem; }
  th { background: #f5f5f3; }

  footer { margin-top: 56px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 0.8rem; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
  footer a { color: #999; }

  @media (max-width: 480px) {
    body { padding: 28px 16px 56px; font-size: 16px; }
    header h1 { font-size: 1.4rem; }
    .post-card { padding: 16px 18px; }
    .related-post-list { grid-template-columns: 1fr; }
  }
`;

function layout({ title, description, contentHtml, isIndex, url, jsonLd, publishedAt }) {
  const root = isIndex ? "" : "../";
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeUrl = escapeHtml(url);
  const jsonLdScript = JSON.stringify(jsonLd).replace(/</g, "\\u003c");
  const publishedMeta = !isIndex && publishedAt
    ? `<meta property="article:published_time" content="${escapeHtml(publishedAt)}">\n`
    : "";
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeTitle}</title>
<meta name="description" content="${safeDescription}">
${GOOGLE_SITE_VERIFICATION ? `<meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATION}">\n` : ""}<link rel="canonical" href="${safeUrl}">
<link rel="icon" href="${root}icon.png">
<link rel="alternate" type="application/rss+xml" title="${SITE_TITLE} RSS" href="${root}feed.xml">
<meta property="og:site_name" content="${SITE_TITLE}">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDescription}">
<meta property="og:type" content="${isIndex ? "website" : "article"}">
<meta property="og:locale" content="ja_JP">
${publishedMeta}
<meta property="og:url" content="${safeUrl}">
<meta property="og:image" content="${SITE_URL}icon.png">
<meta property="og:image:alt" content="${safeTitle} — ${SITE_TITLE}のアイコン">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDescription}">
<meta name="twitter:image" content="${SITE_URL}icon.png">
<meta name="twitter:image:alt" content="${safeTitle} — ${SITE_TITLE}のアイコン">
<meta name="theme-color" content="#1d4ed8">
<script type="application/ld+json">${jsonLdScript}</script>
${GA4_MEASUREMENT_ID ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GA4_MEASUREMENT_ID}');
</script>
` : ""}<style>${STYLE}</style>
</head>
<body>
<header>
  <h1><a href="${root}index.html"><img src="${root}icon.png" alt="${SITE_TITLE}" class="site-icon">${SITE_TITLE}</a></h1>
  <p class="tagline">${SITE_DESCRIPTION}</p>
  <nav>
    <a href="${root}index.html">記事一覧</a>
    <a href="${root}oversight-kit.html">無料テンプレート</a>
    <a href="${root}about.html">このブログについて</a>
    <a href="${root}boundary-check.html">権限境界チェック</a>
    <a href="${root}quiz.html">AI活用度診断</a>
    <a href="${root}search.html">記事検索</a>
    <a href="${root}archive.html">記事アーカイブ</a>
    <a href="${NEWSLETTER_URL}" target="_blank" rel="noopener">メール登録</a>
  </nav>
</header>
<main>
${contentHtml}
</main>
<footer>
  <span>© ${new Date().getFullYear()} ${SITE_TITLE} — <a href="https://aiftr.hatenablog.com/" target="_blank" rel="noopener">はてなブログ版</a> / <a href="https://note.com/genial_clover242" target="_blank" rel="noopener">note</a> / <a href="https://x.com/CloverAIalfs" target="_blank" rel="noopener">X</a> / <a href="${root}feed.xml">RSS</a></span>
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

function escapeXml(str) {
  return escapeHtml(str).replace(/'/g, "&apos;");
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function build() {
  mkdirSync(DOCS_POSTS_DIR, { recursive: true });

  const files = readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));

  const posts = files.map((filename) => {
    const raw = readFileSync(join(POSTS_DIR, filename), "utf8");
    const { meta, body } = parseFrontmatter(raw);
    if (!meta.title?.trim() || !isIsoDate(meta.date)) {
      throw new Error(`frontmatterが不正です: posts/${filename} (titleとdate: YYYY-MM-DDが必須)`);
    }
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

  // 記事Markdownを削除・改名したとき、古い生成HTMLを残さない。
  // frontmatter全件検証後に実行するため、入力不備で先に生成物を失うことはない。
  for (const filename of readdirSync(DOCS_POSTS_DIR).filter((f) => f.endsWith(".html"))) {
    unlinkSync(join(DOCS_POSTS_DIR, filename));
  }

  for (const [i, post] of posts.entries()) {
    const url = `${SITE_URL}posts/${post.slug}.html`;
    // 前後の記事へのリンク(回遊とクロール経路のため。postsは新しい順)
    const newer = posts[i - 1];
    const older = posts[i + 1];
    const relatedHtml =
      newer || older
        ? `<nav class="post-nav">
${older ? `      <a class="post-nav-item" href="${older.slug}.html"><span class="post-nav-label">前の記事</span>${escapeHtml(older.title)}</a>` : ""}
${newer ? `      <a class="post-nav-item" href="${newer.slug}.html"><span class="post-nav-label">次の記事</span>${escapeHtml(newer.title)}</a>` : ""}
    </nav>`
        : "";
    const relatedPosts = posts
      .filter((candidate) => candidate.slug !== post.slug)
      .sort((a, b) => {
        const categoryScore = Number(b.category.cls === post.category.cls) - Number(a.category.cls === post.category.cls);
        return categoryScore || (a.date < b.date ? 1 : -1);
      })
      .slice(0, 3);
    const relatedPostsHtml = relatedPosts.length
      ? `<section class="related-posts" aria-labelledby="related-posts-title">
    <h3 id="related-posts-title">関連記事</h3>
    <div class="related-post-list">
${relatedPosts.map((candidate) => `      <a class="related-post-card" href="../posts/${candidate.slug}.html">
        <span class="post-nav-label">${escapeHtml(candidate.category.label)} / ${escapeHtml(candidate.date)}</span>
        <strong>${escapeHtml(candidate.title)}</strong>
        <span class="related-post-meta">${escapeHtml(candidate.excerpt)}</span>
      </a>`).join("\n")}
    </div>
  </section>`
      : "";
    const contentHtml = `<article>
  <span class="badge ${post.category.cls}">${post.category.label}</span>
  <h2 class="article-title">${escapeHtml(post.title)}</h2>
  <div class="post-meta"><time datetime="${escapeHtml(post.date)}">${escapeHtml(post.date)}</time><span class="dot">・</span><span>読了目安 ${post.minutes}分</span></div>
  <div class="article-body">
${post.bodyHtml}
  </div>
  <div class="article-footer">
    <div class="cta-box">
      <p>資金ゼロ・AIを実行部隊にして会社を運営する実況を続けています。メンバーシップでは、無料記事には書かない実際の数字や判断の過程と、AIに経営を任せるための権限設計テンプレート集「オーバーサイトキット」をお届けしています。</p>
      <a class="cta" href="https://note.com/genial_clover242/membership" target="_blank" rel="noopener">メンバーシップを見る →</a>
      <p style="margin-top:14px;">AIにどこまで任せるかの線引きは、<a href="../oversight-kit.html">無料テンプレート</a>で公開しています(登録不要)。まずは<a href="../quiz.html">30秒のAI活用度診断</a>で自社の境界線を確認してから、<a href="https://note.com/genial_clover242" target="_blank" rel="noopener">noteの無料記事</a>を読むのもおすすめです。</p>
    </div>
    ${relatedPostsHtml}
    ${relatedHtml}
  </div>
</article>`;
    const html = layout({
      title: `${post.title} | ${SITE_TITLE}`,
      description: post.excerpt,
      isIndex: false,
      url,
      publishedAt: post.date,
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
      <div class="post-meta"><time datetime="${escapeHtml(p.date)}">${escapeHtml(p.date)}</time><span class="dot">・</span><span>読了目安 ${p.minutes}分</span></div>
      <span class="post-title">${escapeHtml(p.title)}</span>
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
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}search.html?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
      blogPost: posts.slice(0, 10).map((p) => ({
        "@type": "BlogPosting",
        headline: p.title,
        datePublished: p.date,
        url: `${SITE_URL}posts/${p.slug}.html`,
      })),
    },
  });
  writeFileSync(join(DOCS_DIR, "index.html"), indexHtml, "utf8");

  const searchData = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
    excerpt: p.excerpt,
    minutes: p.minutes,
    category: p.category,
  }));
  const searchDataScript = JSON.stringify(searchData).replace(/</g, "\\u003c");
  const searchCategories = [...new Map(posts.map((p) => [p.category.label, p.category])).entries()];
  const categoryFilters = `<div class="search-filters" aria-label="カテゴリで絞り込む">
    <button class="filter-button active" type="button" data-category-filter="">すべて</button>
${searchCategories.map(([label]) => `    <button class="filter-button" type="button" data-category-filter="${escapeHtml(label)}">${escapeHtml(label)}</button>`).join("\n")}
  </div>`;
  const searchContent = `<section class="search-page">
  <h2>記事検索</h2>
  <p>タイトル・概要・カテゴリから、過去の記事をキーワードで探せます。</p>
  <form class="search-form" id="searchForm" role="search">
    <label for="searchInput">キーワード
      <input id="searchInput" type="search" name="q" placeholder="例：AIエージェント、業務効率化" autocomplete="off">
    </label>
    <button class="cta" type="submit">検索</button>
  </form>
  ${categoryFilters}
  <p class="search-summary" id="searchSummary" aria-live="polite"></p>
  <div class="search-results" id="searchResults"></div>
</section>
<script>
  (() => {
    const posts = ${searchDataScript};
    const form = document.getElementById("searchForm");
    const input = document.getElementById("searchInput");
    const summary = document.getElementById("searchSummary");
    const results = document.getElementById("searchResults");
    const filterButtons = [...document.querySelectorAll("[data-category-filter]")];
    const initialParams = new URLSearchParams(window.location.search);
    let selectedCategory = initialParams.get("category") || "";
    input.value = initialParams.get("q") || "";
    if (!filterButtons.some((button) => button.dataset.categoryFilter === selectedCategory)) selectedCategory = "";

    function syncUrl() {
      const url = new URL(window.location.href);
      const query = input.value.trim();
      if (query) url.searchParams.set("q", query);
      else url.searchParams.delete("q");
      if (selectedCategory) url.searchParams.set("category", selectedCategory);
      else url.searchParams.delete("category");
      window.history.replaceState(null, "", url);
    }

    function render() {
      const query = input.value.trim().toLocaleLowerCase("ja-JP");
      const matches = posts.filter((post) => {
        const matchesCategory = !selectedCategory || post.category.label === selectedCategory;
        const matchesQuery = !query || [post.title, post.excerpt, post.category.label, post.date].join(" ").toLocaleLowerCase("ja-JP").includes(query);
        return matchesCategory && matchesQuery;
      });
      const scope = selectedCategory ? "「" + selectedCategory + "」の" : "";
      summary.textContent = query || selectedCategory ? scope + matches.length + "件の記事が見つかりました。" : "全" + posts.length + "件の記事を表示しています。";
      for (const button of filterButtons) button.classList.toggle("active", button.dataset.categoryFilter === selectedCategory);
      results.replaceChildren();
      if (matches.length === 0) {
        const empty = document.createElement("p");
        empty.className = "search-empty";
        empty.textContent = "一致する記事がありません。別のキーワードを試してください。";
        results.append(empty);
        return;
      }
      for (const post of matches) {
        const link = document.createElement("a");
        link.className = "search-result";
        link.href = "posts/" + post.slug + ".html";
        const meta = document.createElement("span");
        meta.className = "badge " + post.category.cls;
        meta.textContent = post.category.label + " / " + post.date + " / 読了" + post.minutes + "分";
        const title = document.createElement("span");
        title.className = "search-result-title";
        title.textContent = post.title;
        const excerpt = document.createElement("p");
        excerpt.className = "search-result-excerpt";
        excerpt.textContent = post.excerpt;
        link.append(meta, title, excerpt);
        results.append(link);
      }
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      syncUrl();
      render();
    });
    input.addEventListener("input", () => {
      syncUrl();
      render();
    });
    for (const button of filterButtons) {
      button.addEventListener("click", () => {
        selectedCategory = button.dataset.categoryFilter;
        syncUrl();
        render();
      });
    }
    render();
  })();
</script>
${freeKitBox}
${membershipBox}
${newsletterBox}`;
  const searchHtml = layout({
    title: `記事検索 | ${SITE_TITLE}`,
    description: "ソラのAI活用・業務効率化ブログの記事をキーワードで検索できます。",
    isIndex: true,
    url: `${SITE_URL}search.html`,
    contentHtml: searchContent,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SearchResultsPage",
      name: "記事検索",
      description: "ソラのAI活用・業務効率化ブログの記事検索ページです。",
      url: `${SITE_URL}search.html`,
      inLanguage: "ja",
    },
  });
  writeFileSync(join(DOCS_DIR, "search.html"), searchHtml, "utf8");

  const categorySummary = [...new Map(posts.map((p) => [p.category.label, p])).keys()]
    .map((label) => ({ label, count: posts.filter((p) => p.category.label === label).length }));
  const archiveGroups = [...new Set(posts.map((p) => p.date.slice(0, 7)))].map((month) => ({
    month,
    posts: posts.filter((p) => p.date.startsWith(month)),
  }));
  const archiveContent = `<section class="archive-page">
  <h2>記事アーカイブ</h2>
  <p>ソラのAI活用・業務効率化の記事を、カテゴリと月別に一覧できます。</p>
  <div class="archive-summary" aria-label="カテゴリ別記事数">
${categorySummary.map((item) => `    <span class="archive-summary-item">${escapeHtml(item.label)} ${item.count}件</span>`).join("\n")}
  </div>
  <div id="archiveContent">
${archiveGroups.map((group) => `    <section class="archive-month">
      <h3>${escapeHtml(group.month.replace("-", "年"))}月</h3>
      <ul class="archive-list">
${group.posts.map((p) => `        <li><a class="archive-item" href="posts/${p.slug}.html">
          <span class="post-meta"><span class="badge ${p.category.cls}">${escapeHtml(p.category.label)}</span><time datetime="${escapeHtml(p.date)}">${escapeHtml(p.date)}</time></span>
          <span class="archive-item-title">${escapeHtml(p.title)}</span>
          <span class="archive-item-excerpt">${escapeHtml(p.excerpt)}</span>
        </a></li>`).join("\n")}
      </ul>
    </section>`).join("\n")}
  </div>
</section>
${freeKitBox}
${newsletterBox}`;
  const archiveHtml = layout({
    title: `記事アーカイブ | ${SITE_TITLE}`,
    description: "ソラのAI活用・業務効率化ブログの記事を月別・カテゴリ別に一覧できます。",
    isIndex: true,
    url: `${SITE_URL}archive.html`,
    contentHtml: archiveContent,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "記事アーカイブ",
      description: "ソラのAI活用・業務効率化ブログの記事アーカイブです。",
      url: `${SITE_URL}archive.html`,
      inLanguage: "ja",
    },
  });
  writeFileSync(join(DOCS_DIR, "archive.html"), archiveHtml, "utf8");

  // sitemap.xml — 検索エンジンに全ページを確実に伝える(2026-07-26追加)
  // consulting.html は終了済みサービスの案内を残した互換ページ。
  // 新規流入は無料診断・テンプレートへ集約し、検索結果には出さない。
  const staticPages = ["", "oversight-kit.html", "about.html", "boundary-check.html", "quiz.html", "search.html", "archive.html"];
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

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <link>${escapeXml(SITE_URL)}</link>
    <atom:link href="${escapeXml(`${SITE_URL}feed.xml`)}" rel="self" type="application/rss+xml" />
${posts.map((post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <description>${escapeXml(post.excerpt)}</description>
      <link>${escapeXml(`${SITE_URL}posts/${post.slug}.html`)}</link>
      <guid isPermaLink="true">${escapeXml(`${SITE_URL}posts/${post.slug}.html`)}</guid>
      <pubDate>${new Date(`${post.date}T00:00:00+09:00`).toUTCString()}</pubDate>
    </item>`).join("\n")}
  </channel>
</rss>
`;
  writeFileSync(join(DOCS_DIR, "feed.xml"), feed, "utf8");

  console.log(`ビルド完了: ${posts.length}件の記事 + sitemap.xml / robots.txt / feed.xml を生成しました。`);
}

build();
