import test from "node:test";
import assert from "node:assert/strict";
import { parseFrontmatter } from "../scripts/frontmatter.mjs";
import { markdownToHtml } from "../scripts/markdown.mjs";
import { findExistingTitle, todayIso } from "../scripts/new-post.mjs";

test("parseFrontmatter accepts CRLF and a UTF-8 BOM", () => {
  const raw = "\uFEFF---\r\ntitle: テスト記事\r\ndate: 2026-07-27\r\n---\r\n本文です。";
  assert.deepEqual(parseFrontmatter(raw), {
    meta: { title: "テスト記事", date: "2026-07-27" },
    body: "本文です。",
  });
});

test("parseFrontmatter leaves non-frontmatter content usable", () => {
  assert.deepEqual(parseFrontmatter("本文だけ\r\n"), {
    meta: {},
    body: "本文だけ\n",
  });
});

test("markdown escapes HTML and blocks unsafe link protocols", () => {
  const html = markdownToHtml(
    '[安全なリンク](https://example.com/?a=1&b=2) [危険なリンク](javascript:alert(1)) <script>alert(1)</script>'
  );
  assert.match(html, /href="https:\/\/example\.com\/\?a=1&amp;b=2"/);
  assert.match(html, /href="#">危険なリンク<\/a>/);
  assert.doesNotMatch(html, /<script>/);
});

test("todayIso uses Japan time after UTC day rollover", () => {
  assert.equal(todayIso(new Date("2026-07-27T15:30:00Z")), "2026-07-28");
});

test("findExistingTitle detects an already published title", () => {
  assert.equal(
    findExistingTitle("会社名をGoogle検索だけで決めたら、1週間で4回改名する羽目になった"),
    "2026-07-27-1.md"
  );
  assert.equal(findExistingTitle("存在しないテスト記事"), null);
});
