# board-company-blog

「ソラ」— AI/業務効率化をテーマにした自動投稿ブログ。GitHub Pagesで公開する。

Board-Companyプロジェクト([`../Board-Company`](../Board-Company))のマイクロSaaS(SNS/ブログ投稿の自動生成・自動投稿ツール)のドッグフーディング第一弾。

## 仕組み

- `posts/` に記事のMarkdownソースを置く(frontmatter付き)。
- `npm run new-post -- "タイトル"` で新しい記事を作成する(本文は標準入力から渡す)。ガードレール(NGワード・最低文字数)チェックを通過したものだけ保存される。
- `npm run build` で `posts/*.md` から `docs/` 配下に静的HTMLを生成する。GitHub PagesはこのリポジトリのSettings → Pages → Source を `main` ブランチの `/docs` フォルダに設定して公開する。
- ビルド時に `docs/search.html` も生成され、記事のタイトル・概要・カテゴリをブラウザ内で検索できる。検索語は `?q=` としてURLに反映されるため、検索結果を共有・再訪できる。
- ビルド時に `docs/feed.xml` も生成され、RSSリーダーから新着記事を購読できる。

## 公開までの流れ

```bash
npm run new-post -- "記事タイトル" <<'EOF'
本文をここに書く。
EOF

npm run build
git add -A
git commit -m "記事を追加"
git push
```

## 検証

記事追加やサイトの変更後は、次の順番で検査する。

```bash
npm test
npm run validate:drafts
npm run validate:content
npm run build
npm run validate:site
```

- `validate:content`: frontmatter、本文のガードレール、日付、タイトル重複を検査する。
- `validate:drafts`: 公開前の `drafts/` にある記事のfrontmatterと本文を検査する。
- `validate:site`: sitemap、robots.txt、生成ページ、記事内リンクを検査する。
- `validate:all`: 上記の検査とビルドを一括実行する。
- `new-post` の日付は日本時間(Asia/Tokyo)で決まる。
