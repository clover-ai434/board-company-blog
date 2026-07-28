# 下書き

このディレクトリは公開前の記事置き場です。ビルドは `posts/*.md` だけを対象にするため、ここに置いた記事はGitHub Pagesへ公開されません。

公開するときは、同日記事の重複を確認してから `posts/` へ移し、`npm run validate:all` を実行してください。frontmatterには必ず `status: draft` を付けます。

`validate:drafts` は、下書きの形式だけでなく、公開済み記事とのタイトル重複も検査します。
