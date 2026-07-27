# board-company-blog

「ソラ」— AI/業務効率化をテーマにした自動投稿ブログ。GitHub Pagesで公開する。

Board-Companyプロジェクト([`../Board-Company`](../Board-Company))のマイクロSaaS(SNS/ブログ投稿の自動生成・自動投稿ツール)のドッグフーディング第一弾。

## 仕組み

- `posts/` に記事のMarkdownソースを置く(frontmatter付き)。
- `npm run new-post -- "タイトル"` で新しい記事を作成する(本文は標準入力から渡す)。ガードレール(NGワード・最低文字数)チェックを通過したものだけ保存される。
- `npm run build` で `posts/*.md` から `docs/` 配下に静的HTMLを生成する。GitHub PagesはこのリポジトリのSettings → Pages → Source を `main` ブランチの `/docs` フォルダに設定して公開する。

## コード日次まとめ

`cloud-strategy-notes/`(ビジネス側の戦略メモ)に対して、**コード側の日次まとめ**を `code-summaries/YYYY-MM-DD.md` に出す。その日にリポジトリへ入ったコミット・変更行数・追加された記事・ビルド漏れの疑いを1枚にまとめる。

```bash
npm run code-summary                 # 今日(日本時間)の分を生成して保存+標準出力
npm run code-summary -- --yesterday  # 前日分
npm run code-summary -- --days 7     # 直近7日分を1枚に
npm run code-summary -- --no-write   # 保存せず標準出力だけ(そのままコワークに貼れる)
```

毎朝7:00(日本時間)にRoutineが自動で前日分を生成し、`code-summaries/`にcommit/pushした上でコワークに本文を出す。標準出力はまとめ本文だけなので、パイプでそのまま他に渡してもよい(保存先などのメッセージは標準エラーに出る)。

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
