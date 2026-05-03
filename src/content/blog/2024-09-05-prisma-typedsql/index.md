---
title: "prismaのTypedSQLの凄さと課題"
date: "2024-09-05"
---

## TypedSQLとは

2024/08/27にリリースされて話題沸騰中のprismaの新機能である「TypedSQL」を試してみる。ちょうど自社サービスをprismaで再構築しているところなので都合が良かった。

[Announcing TypedSQL: Make your raw SQL queries type-safe with Prisma ORM](https://www.prisma.io/blog/announcing-typedsql-make-your-raw-sql-queries-type-safe-with-prisma-orm)

これを使ってできることは「生SQLを書いたら型情報が生成される」というものだ。文字で書くとサラッとしているが、端的に言って神である。

(遠い東のGolandでは既にそういうライブラリがあると聞くが、私はTS教の信者なのでGoは使ってはならないという戒律があるのだ。無念)

## 設定

TypedSQLの機能はまだPreview Featureなので、まずは`shema.prisma`に以下の一文を追加して、機能を有効化にする。

```json
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["typedSql"] # この一文を追加
}
```

次に`prisma/sql/`フォルダの配下に好きな名前でSQLファイルを書く。

```sql
-- 例えば`prisma/sql/getAllTableNames.sql`として
SELECT tablename FROM pg_tables
```

そしてprisma clientを再生成する。sqlオプションを忘れずに。この時、データベースサーバーが立ち上がっていることが必須なので注意。

```bash
npx prisma generate --sql
```

あとはランタイムで使えば型がついている。

```bash
# これがnode_modules内に生成されたprisma client
import { getAllTableNames } from '@prisma/client/sql'

# resultの型は`{tablename: string | null}[]`になっている！
const result = await prisma.$queryRawTyped(getAllTableNames())
```

やばい。簡単すぎる。神である。

## 課題

ただ、いざプロダクションで使おうとすると課題が見つかった。

prisma clientを生成するときにDBサーバーが立ち上がっていることが必須なので、CIを含む多くの場面でDBサーバーを立ち上げて置かないとprisma clientが生成できず、結果的に型エラーが発生して処理がコケてしまうのである。

ちなみにTypedSQLを使わない普通のprisma clientの生成時には、DBサーバーは不要である。単に`prisma.schema`を元に生成される。

DBサーバーをそこかしこで立ち上げておくのは、現実的ではない。Issueは既に上がっているようなので推移を見守りたい。

[https://github.com/prisma/prisma/issues/25124](https://github.com/prisma/prisma/issues/25124)

回避策として、prisma clientの生成先をデフォルトの`node_modules`から別の場所に変更し、git管理に含めてしまうという手もありそうだ。

[Generating Prisma Client](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/generating-prisma-client#using-a-custom-output-path)

ただ、clientのgit管理はやめといてねと公式が言っているので、やはり素直に時が満ちるのを待ったほうが良さそう。

> When using a custom `output` path for the generated Prisma Client, it is advised to exclude it from your version control. For Git, this means adding the `output` path to your `.gitignore` file.
> 

型情報の生成にリアルDBを使っているのならば、それを不要にするのはとても難しいチャレンジのように感じるが、そこは天才たちがなにか考えてくれるだろう🙏ナムナム

## 所管

まだプロダクションでは使えなかったけど、これは革命的な機能だと感じた。エスケープハッチとしてSQLが使えるというのは、開発者にとっては安心感があるし、型まで保証してくれるなら開発体験も大きく向上するだろう。

ありがとう、prismaさん、いい薬です。

[https://www.youtube.com/watch?v=Gd_htAjLU9Q](https://www.youtube.com/watch?v=Gd_htAjLU9Q)

## 追記(2025/11/20)

prisma v7のリリースにより、prismaの生成するコードがRustではなく純JavaScriptになったことで、生成ファイルをgitにコミットすることが可能になった。これにより、結果的にTypedSQLを使うためにCI環境でDBを用意しなくて良くなったため、TypedSQLの本番での運用がついに可能となった。嬉しい🎉