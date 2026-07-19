# board-company-blog

「AIでラクする研究所」— AI/業務効率化をテーマにした自動投稿ブログ。GitHub Pagesで公開する。

Board-Companyプロジェクト([`../Board-Company`](../Board-Company))のマイクロSaaS(SNS/ブログ投稿の自動生成・自動投稿ツール)のドッグフーディング第一弾。

## 仕組み

- `posts/` に記事のMarkdownソースを置く(frontmatter付き)。
- `npm run new-post -- "タイトル"` で新しい記事を作成する(本文は標準入力から渡す)。ガードレール(NGワード・最低文字数)チェックを通過したものだけ保存される。
- `npm run build` で `posts/*.md` から `docs/` 配下に静的HTMLを生成する。GitHub PagesはこのリポジトリのSettings → Pages → Source を `main` ブランチの `/docs` フォルダに設定して公開する。

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
