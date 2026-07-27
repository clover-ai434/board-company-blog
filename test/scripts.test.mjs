import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  const fixtureDir = mkdtempSync(join(tmpdir(), "board-company-blog-test-"));
  try {
    writeFileSync(
      join(fixtureDir, "existing.md"),
      "---\ntitle: 既存記事\ndate: 2026-07-27\n---\n本文です。\n",
      "utf8"
    );
    assert.equal(findExistingTitle("既存記事", fixtureDir), "existing.md");
    assert.equal(findExistingTitle("存在しないテスト記事", fixtureDir), null);
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});
