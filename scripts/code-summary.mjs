// その日にこのリポジトリのコードへ入った変更を1枚にまとめる。
// cloud-strategy-notes/(戦略メモ)がビジネス側のまとめなのに対して、
// こちらはコード側のまとめ。生成結果はそのままコワークに貼れる形にしてある。
//
// 使い方:
//   node scripts/code-summary.mjs              # 今日(日本時間)の分を生成して保存+標準出力
//   node scripts/code-summary.mjs --yesterday  # 前日分(朝に前日をまとめる定期実行用)
//   node scripts/code-summary.mjs --date 2026-07-26
//   node scripts/code-summary.mjs --days 7     # 直近7日分をまとめて1枚に
//   node scripts/code-summary.mjs --no-write   # 保存せず標準出力だけ

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseFrontmatter } from "./frontmatter.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const POSTS_DIR = join(ROOT, "posts");
const SUMMARY_DIR = join(ROOT, "code-summaries");

// 会社の運用も投稿も日本時間が基準なので、日付の区切りはJSTで揃える。
const TZ_OFFSET = "+09:00";

// ディレクトリごとに「何を触ったか」を日本語で言い換えるための対応表。
const AREAS = [
  { prefix: "posts/", label: "記事ソース" },
  { prefix: "docs/posts/", label: "公開HTML(自動生成)" },
  { prefix: "docs/", label: "公開サイト(自動生成)" },
  { prefix: "scripts/", label: "サイト生成ロジック" },
  { prefix: "hatena-sync/", label: "はてな/note連携" },
  { prefix: "cloud-strategy-notes/", label: "戦略メモ" },
  { prefix: "code-summaries/", label: "コード日次まとめ" },
  { prefix: "context/", label: "引き継ぎ書" },
];

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}

function jstToday() {
  // en-CA ロケールは YYYY-MM-DD 形式で返る。
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
}

function shiftDate(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const opts = { date: jstToday(), days: 1, write: true };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--date") opts.date = argv[++i];
    else if (arg === "--yesterday") opts.date = shiftDate(jstToday(), -1);
    else if (arg === "--days") opts.days = Math.max(1, Number(argv[++i]) || 1);
    else if (arg === "--no-write") opts.write = false;
    else {
      console.error(`不明なオプション: ${arg}`);
      process.exit(1);
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.date)) {
    console.error(`--date は YYYY-MM-DD 形式で指定してください: ${opts.date}`);
    process.exit(1);
  }
  return opts;
}

function collectCommits(since, until) {
  const SEP = "\x1e";
  const raw = git([
    "log",
    `--since=${since}T00:00:00${TZ_OFFSET}`,
    `--until=${until}T23:59:59${TZ_OFFSET}`,
    `--pretty=format:%H${SEP}%h${SEP}%an${SEP}%aI${SEP}%s`,
  ]).trim();

  if (!raw) return [];

  return raw.split("\n").map((line) => {
    const [hash, short, author, date, subject] = line.split(SEP);
    return { hash, short, author, date, subject, files: fileStats(hash) };
  });
}

function fileStats(hash) {
  // マージコミットは差分が出ないので空配列になる(それで問題ない)。
  const raw = git(["show", "--numstat", "--format=", hash]).trim();
  if (!raw) return [];

  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [added, deleted, path] = line.split("\t");
      // バイナリファイルは "-" で返ってくる。
      return {
        path,
        added: added === "-" ? 0 : Number(added),
        deleted: deleted === "-" ? 0 : Number(deleted),
        binary: added === "-",
      };
    });
}

function areaOf(path) {
  const hit = AREAS.find((a) => path.startsWith(a.prefix));
  return hit ? hit.label : "その他";
}

function aggregate(commits) {
  const byArea = new Map();
  const files = new Map();
  let added = 0;
  let deleted = 0;

  for (const commit of commits) {
    for (const file of commit.files) {
      added += file.added;
      deleted += file.deleted;

      const area = areaOf(file.path);
      const areaStat = byArea.get(area) || { added: 0, deleted: 0, files: new Set() };
      areaStat.added += file.added;
      areaStat.deleted += file.deleted;
      areaStat.files.add(file.path);
      byArea.set(area, areaStat);

      const fileStat = files.get(file.path) || { added: 0, deleted: 0 };
      fileStat.added += file.added;
      fileStat.deleted += file.deleted;
      files.set(file.path, fileStat);
    }
  }

  return { byArea, files, added, deleted };
}

// その日に posts/ へ追加された記事のタイトルを拾う(削除済みのものは読めないので飛ばす)。
function newPostTitles(files) {
  const titles = [];
  for (const path of files.keys()) {
    if (!path.startsWith("posts/") || !path.endsWith(".md")) continue;
    const full = join(ROOT, path);
    if (!existsSync(full)) continue;
    const { meta } = parseFrontmatter(readFileSync(full, "utf8"));
    titles.push({ path, title: meta.title || path });
  }
  return titles;
}

// 記事や生成ロジックを触ったのに docs/ が更新されていない = ビルドし忘れの疑い。
function buildWarnings(files) {
  const warnings = [];
  const paths = [...files.keys()];
  const touchedSource = paths.some((p) => p.startsWith("posts/") || p.startsWith("scripts/"));
  const touchedDocs = paths.some((p) => p.startsWith("docs/"));

  if (touchedSource && !touchedDocs) {
    warnings.push("`posts/` か `scripts/` を変更したのに `docs/` が更新されていません。`npm run build` の実行漏れかもしれません。");
  }
  return warnings;
}

function repoSnapshot() {
  const posts = existsSync(POSTS_DIR) ? readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md")) : [];
  const latest = posts.sort().at(-1);
  let latestTitle = null;
  if (latest) {
    const { meta } = parseFrontmatter(readFileSync(join(POSTS_DIR, latest), "utf8"));
    latestTitle = meta.title || latest;
  }
  return { postCount: posts.length, latestPost: latest, latestTitle };
}

function formatArea(byArea) {
  return [...byArea.entries()]
    .sort((a, b) => b[1].added + b[1].deleted - (a[1].added + a[1].deleted))
    .map(([label, s]) => `- ${label}: ${s.files.size}ファイル (+${s.added} / -${s.deleted})`);
}

function render({ opts, since, commits, stats, snapshot }) {
  const range = opts.days === 1 ? opts.date : `${since} 〜 ${opts.date}`;
  const lines = [];

  lines.push(`# コード日次まとめ ${range}`);
  lines.push("");
  lines.push(`リポジトリ: board-company-blog(ブログ生成システム)`);
  lines.push(`集計期間: ${range}(日本時間)/ コミット ${commits.length}件`);
  lines.push("");

  if (commits.length === 0) {
    lines.push("## 変更なし");
    lines.push("");
    lines.push("この期間にコードへの変更はありませんでした。");
    lines.push("");
  } else {
    lines.push("## 変更の要約");
    lines.push("");
    lines.push(`- 変更ファイル: ${stats.files.size}件(+${stats.added} / -${stats.deleted}行)`);
    lines.push(...formatArea(stats.byArea));
    lines.push("");

    const posts = newPostTitles(stats.files);
    if (posts.length > 0) {
      lines.push("## 追加・更新された記事");
      lines.push("");
      for (const p of posts) lines.push(`- ${p.title}(\`${p.path}\`)`);
      lines.push("");
    }

    lines.push("## コミット");
    lines.push("");
    for (const c of commits) {
      const time = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(c.date));
      const churn = c.files.reduce((sum, f) => sum + f.added + f.deleted, 0);
      lines.push(`- \`${c.short}\` ${time} ${c.subject}(${c.files.length}ファイル / ${churn}行)`);
    }
    lines.push("");

    const warnings = buildWarnings(stats.files);
    if (warnings.length > 0) {
      lines.push("## 気になる点");
      lines.push("");
      for (const w of warnings) lines.push(`- ${w}`);
      lines.push("");
    }
  }

  lines.push("## 現在のリポジトリ状態");
  lines.push("");
  lines.push(`- 記事ソース: ${snapshot.postCount}本`);
  if (snapshot.latestPost) {
    lines.push(`- 最新記事: ${snapshot.latestTitle}(\`posts/${snapshot.latestPost}\`)`);
  }
  lines.push("");

  return lines.join("\n");
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const since = shiftDate(opts.date, -(opts.days - 1));
  const commits = collectCommits(since, opts.date);
  const stats = aggregate(commits);
  const snapshot = repoSnapshot();
  const markdown = render({ opts, since, commits, stats, snapshot });

  if (opts.write) {
    mkdirSync(SUMMARY_DIR, { recursive: true });
    const out = join(SUMMARY_DIR, `${opts.date}.md`);
    writeFileSync(out, markdown + "\n", "utf8");
    console.error(`保存しました: code-summaries/${opts.date}.md`);
  }

  // 標準出力にはまとめ本文だけを流す(そのままコワークに貼れるように)。
  console.log(markdown);
}

main();
