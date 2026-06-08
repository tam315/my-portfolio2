---
title: 'Vercelで特定のブランチにカスタムドメインを紐付ける方法'
date: '2023-06-26'
---

VercelでWebアプリをデプロイする際には、git ブランチごとに自動で固定のURLが生成されます。このブランチごとのURLを、自前で用意したドメインにしたい場合のやり方です。

次にやるときはきっと忘れるのでメモ。

- Project → Settings → Domains からドメインを追加
  - e.g. `staging.my-super-app.com`
- 追加したドメインでEditを押し、Git Branchに紐づけたいブランチ名を入力
  - e.g. `staging`など
- あとは画面の指示にそってDNSを設定するだけ
