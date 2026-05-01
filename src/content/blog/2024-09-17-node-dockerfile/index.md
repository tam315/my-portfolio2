---
title: "孤高の Node.js 用 Dockerfile を求めて"
date: "2024-09-17"
---

以下を満たす Node.js 用の Dockerfile を作りたい、と思ったときに結構いろいろ手間だったので、屍をここに Dump しておく。

## 条件

- プロダクションでは distroless を使って軽量・安全にしたい
- プロダクションのコンテナには devDeps を含めたくない
- プロダクションのコードは非ルートユーザーで実行されるようにしたい
- prisma を使いたい
- pnpm(via corepack)を使いたい
- SIGTERM を受け取って Graceful Shutdown したい
- Dockerfile は一つで済ませたい (prod/dev/test で分けたくない)
- ソースマップを有効化して、エラー発生時には元コード上の場所を特定できるようにしたい
- 情報源や互換性を重視しているので、bun などは使わずあくまで Node.js を使いたい

## できあがったもの

Dockerfile

```docker
#### images ####
# - トラブル回避のため、開発と本番でdebianのバージョンを揃えておくとよい。
#   以下は12(bookworm)で統一している例。
# - distrolessでdebugしたいときはタグを`debug-nonroot`にするとよい。
# - nodeをslimにするとprisma clientのビルドに失敗するので注意。
#   準備段階ではslimにする必要もないので、あえてノーマルを使用している。
FROM node:20.17.0-bookworm AS my_node
FROM gcr.io/distroless/nodejs20-debian12:nonroot AS my_distroless

#### base ####
# - プロダクション用のnode_modulesとtiniのバイナリを用意するステージ
FROM my_node AS base
WORKDIR /app

ENV PATH /app/node_modules/.bin:$PATH

# pnpm(corepack)を使えるようにする
# <https://pnpm.io/ja/docker>
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY . .

RUN apt-get update && \\
    apt-get install -y --no-install-recommends tini && \\
    pnpm install --production && \\
    # prisma clientもnode_modules配下に生成されるので忘れずに
    npx prisma generate

# Node.jsがSIGTERM等のシグナルを受け取るために必要なお作法。開発環境やテスト環境でも有効にしておく。
ENTRYPOINT ["/usr/bin/tini", "--"]

#### build ####
# - tscでコンパイルしてdistに出力するステージ
# - ビルド時にはdepsだけでなくdevDepsまで必要なため、最終イメージの容量を増やさないようにステージを分けている
FROM base AS build
RUN pnpm install && pnpm build

#### dev ####
# - ローカル開発時や統合テスト時に使用するためのステージ
# - docker compose 実行時に volume mount したり command を設定することを想定しているため、これ以上何も書かない。
FROM build as dev
ENV NODE_ENV=development

#### prod ####
FROM my_distroless AS prod
WORKDIR /app

ENV NODE_ENV=production
# - Node.jsでESMを有効にするには`--experimental-default-type=module`のオプションが必要。
#   package.jsonに`"type": "module"`が書いてあれば自動的に有効になるのだが、
#   本番イメージにはpackage.jsonまで入れ込まないので、手動で指定が必要。
# - 実行時にフラグ渡せばいいはずなのだが、なぜかDockerfileのCMDに書くと
#   ソースマップのほうが有効にならなかったので、環境変数で指定した。
ENV NODE_OPTIONS="--enable-source-maps --experimental-default-type=module"
ENV PATH /app/node_modules/.bin:$PATH

COPY --from=base --chown=nonroot:nonroot /usr/bin/tini /usr/bin/tini
COPY --from=base --chown=nonroot:nonroot /app/node_modules /app/node_modules
COPY --from=build --chown=nonroot:nonroot /app/dist /app/dist

EXPOSE 12345

ENTRYPOINT ["/usr/bin/tini", "--"]

CMD ["/nodejs/bin/node", "/app/dist/src/index.js"]

```

ソースマップの出力には `tsconfig.json` の設定も必要なので忘れずに。

```json
{
  "compilerOptions": {
    "sourceMap": true,
    "sourceRoot": "/" // コンソール出力されたパスの頭の`/app`を取り除く
  }
}

```

## その他

- イメージサイズは、素のdistrolessのサイズが130MBくらい、自前のコードベース(ほぼnode_modulesの容量)が130MBで合計260MB位になった。スクリプト言語ではこれくらいが限界か。