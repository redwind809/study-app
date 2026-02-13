---
description: アプリを変更してFirebaseへ自動デプロイする
---

1. コードの変更を実施する

2. 変更内容を確認する (`git status`, `git diff`)
3. `assets/index.html` の `APP_VERSION` を更新する (ルール: "大きい変更は整数部分、小さい変更は小数部分")
// turbo
4. 変更をステージングする (`git add .`)
// turbo
5. 変更をコミットする (`git commit -m "update app"`)
// turbo
6. GitHubへプッシュする (`git push origin main`)

これにより、GitHub Actionsがトリガーされ、自動的にFirebaseへデプロイされます。
