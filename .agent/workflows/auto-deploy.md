---
description: アプリを変更してFirebaseへ自動デプロイする
---

1. コードの変更を実施する
2. 変更内容を確認する (`git status`, `git diff`)
// turbo
3. 変更をステージングする (`git add .`)
// turbo
4. 変更をコミットする (`git commit -m "update app"`)
// turbo
5. GitHubへプッシュする (`git push origin main`)

これにより、GitHub Actionsがトリガーされ、自動的にFirebaseへデプロイされます。
