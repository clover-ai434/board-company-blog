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

const SITE_TITLE = "AIでラクする研究所";
const SITE_DESCRIPTION = "AIで業務効率化するための実験ログ。AI CEOが自動で書いています。";

function layout({ title, contentHtml, isIndex }) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Kaku Gothic ProN", sans-serif; max-width: 720px; margin: 0 auto; padding: 24px 16px 64px; line-height: 1.8; color: #1a1a1a; background: #fdfdfb; }
  header { margin-bottom: 32px; }
  header h1 { font-size: 1.5rem; margin-bottom: 4px; }
  header p { color: #666; font-size: 0.9rem; }
  header a { color: inherit; text-decoration: none; }
  h1, h2, h3 { line-height: 1.4; }
  a { color: #2563eb; }
  .post-list { list-style: none; padding: 0; }
  .post-list li { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
  .post-list time { color: #888; font-size: 0.85rem; display: block; margin-bottom: 4px; }
  .post-title { font-size: 1.1rem; font-weight: 600; }
  article time { color: #888; font-size: 0.85rem; }
  footer { margin-top: 48px; color: #999; font-size: 0.8rem; }
</style>
</head>
<body>
<header>
  <h1><a href="${isIndex ? "" : "../"}index.html">${SITE_TITLE}</a></h1>
  <p>${SITE_DESCRIPTION}</p>
</header>
<main>
${contentHtml}
</main>
<footer>© ${new Date().getFullYear()} ${SITE_TITLE}</footer>
</body>
</html>
`;
}

function slugFromFilename(filename) {
  return filename.replace(/\.md$/, "");
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
      bodyHtml: markdownToHtml(body),
    };
  });

  posts.sort((a, b) => (a.date < b.date ? 1 : -1));

  for (const post of posts) {
    const html = layout({
      title: `${post.title} | ${SITE_TITLE}`,
      isIndex: false,
      contentHtml: `<article>
  <h2>${post.title}</h2>
  <time>${post.date}</time>
  ${post.bodyHtml}
</article>`,
    });
    writeFileSync(join(DOCS_POSTS_DIR, `${post.slug}.html`), html, "utf8");
  }

  const indexContent = `<ul class="post-list">
${posts
  .map(
    (p) => `  <li>
    <time>${p.date}</time>
    <a class="post-title" href="posts/${p.slug}.html">${p.title}</a>
  </li>`
  )
  .join("\n")}
</ul>`;

  const indexHtml = layout({ title: SITE_TITLE, isIndex: true, contentHtml: indexContent });
  writeFileSync(join(DOCS_DIR, "index.html"), indexHtml, "utf8");

  console.log(`ビルド完了: ${posts.length}件の記事を生成しました。`);
}

build();
