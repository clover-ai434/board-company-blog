# はてなブログ 自動転載

`board-company-blog`の記事を、はてなブログ(`aiftr.hatenablog.com`)にも自動で転載する仕組み。AtomPub APIを使用(完全無料)。

## セットアップ

1. `.env.example` を `.env` にコピーし、はてなID・ブログID・APIキー・ルートエンドポイントを設定する(`.env`は`.gitignore`済みでコミットされない)。
2. APIキーは、[アカウント設定](https://blog.hatena.ne.jp/-/config)の「APIキー」欄で確認できる(投稿用メールアドレスの発行が必要)。
3. ルートエンドポイントは、ブログの「設定」→「詳細設定」→「AtomPub」欄に記載されている。

## 使い方

```bash
node crosspost.mjs <記事のslug>
# 例: node crosspost.mjs 2026-07-21-1
```

`../posts/<slug>.md` を読み込み、はてなブログへHTML形式で投稿する。末尾に公式ブログへのリンクを自動で付与する。同じ記事を二重投稿しないよう、`crosspost-log.json`に投稿済み記録を残す。

`board-company-blog-daily-post`タスクから、記事公開のたびに自動で呼び出される(2026-07-21設定)。
