---
title: 'Auth0の資料で認証認可を学び直すなど'
date: '2023-01-23'
---

たまたまSNSの広告にAuth0の作っている[認証サバイバルガイド](https://www.google.com/search?q=auth0+survival+guide)なるPDF資料が出てきたので、読んでみました（検索結果の2件目くらいにPDFが出てくるはず）。

内容は[こちら](https://note.yuuniworks.com/books/auth0-guide)にまとめています。

2017年と少し古い資料ではありますが、私として今までふわっと理解していた内容や疑問が整理できたので、わりとおすすめです。

- 認可と認証の違い(≒OAuth2とOpenID Connectの違い)
- SAMLってなに？
- JWTとCookieの違い
- Access Token, Refresh Token, ID Tokenの違い
  - Refresh Tokenって必要なの？

Auth0の資料を読み切って初めて、[GoogleのOpenID Connectのページ](https://developers.google.com/identity/openid-connect/openid-connect)に書いてある以下の文章を「ふむふむ」と理解することができました。

> Google の OAuth 2.0 API は認証と認可の両方に使用できます。このドキュメントでは、認証用の OAuth 2.0 実装について説明します。この実装は [OpenID Connect](https://openid.net/connect/) 仕様に準拠しており、[OpenID Certified](https://openid.net/certification/) となっています。
