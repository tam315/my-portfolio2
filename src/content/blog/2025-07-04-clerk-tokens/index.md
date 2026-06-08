---
title: 'Clerkにおけるトークンの扱いが面白い'
date: '2025-07-04'
---

ClerkってStripeの認証バージョンみたいなもので、個人開発では活用必須なんだろうなーと思いながらも使ったことなかったのでドキュメントを斜め読みしていたところ、たまたま見つけた以下の公式ページの解説が面白かったのでペタリ。

Clerkの認証システムがどのように動作するのかを解説しているページだが、トークンの扱いが面白い。

[How Clerk works](https://clerk.com/docs/how-clerk-works/overview)

## Stateful vs Stateless

そもそも認証の枠組みには大きくStatefulな方法とStatelessな方法に大別され、どちらも一長一短がある。

個人的にはサーバー実装がシンプルになるStatelessが好みなのだが、例えばRevokeを即時に反映できない点は不満に思っていた。Firebaseなんかは「別に1時間待てばええやん」という割り切りになっていたはずで、自分もこれまではそれに乗っかってきた。

あとはカスタムクレームをJWTに乗せたとしても、それが反映されるのは再ログインしたときもしくは1時間後というのも不満だった（どういうユースケースなら使えるねんと）。

## いいとこ取り

Clerkではこれらの問題を解消するために、StatefulとStatelessのいいとこ取りをするハイブリッドなアプローチを取っている。

具体的にはClient TokenとSession Tokenという2種類のトークンを用意し、後者を60秒で期限切れにするというエクストリームな設定にしたうえで、フロントエンドSDKにより50秒ごとに更新し続けるという力技になっているようだ。

### Client token

- is JWT
- has the same expiration time as the session lifetime, which is 7 days by default
- is stored as a Cookie on your Clerk's Frontend API domain, i.e. `https://clerk.yourdomain.com`, which is **NOT** blocked by `SameSite=Lax` restriction when refreshing the **session** token using **client** token on your application site.
- is **NOT** accessible from JavaScript code as it's `HttpOnly`
- is set to `SameSite=Lax`

### Session token

- is JWT
- expires after 60 seconds, which is decoupled from session lifetime
- is stored as a Cookie on your application domain (i.e. `https://yourdomain.com`)
- is accessible from your application code via JavaScript as it's **NOT** `HttpOnly`
- contains user data like user ID and other claims
- is set to `SameSite=Lax`
- You have to send Authorization header manually if the API domain is not the same with the frontend domain.
  - [https://clerk.com/docs/backend-requests/making-requests](https://clerk.com/docs/backend-requests/making-requests)

さらにこれら一連の動作がサーバーサイドレンダリングとも調和するように、[`Handshake`](https://clerk.com/docs/how-clerk-works/overview#the-handshake)という仕組みも用意されているようだ。

## ハイブリッドな仕組みで実現されること

- 速い（Session Tokenはユーザー情報を含むJWTであり、DBへのクエリを必要としない）
- ほぼ即時にRevokeが可能
- ほぼ即時にカスタムクレームのセットが可能

なお、よく見るとSession Tokenには`HttpOnly`がセットされていない。これをセキュリティ的なリスクと見る向きもあるが、Clerkでは極端に短い有効期限をもたせることで、攻撃を受けた際のリスクを極小化しているそうだ。そもそも、HttpOnlyだろうがそうでなかろうがセキュリティリスクに差はないとする説もあるが。

## 所感

自分で同じような仕組みを作ろうと思うと死んでしまうことは容易に想像がついたので、次にサービス作るときは選択肢に入れてみようと思う。toBサービスに組み込むなら料金もタダみたいなもんだし。
