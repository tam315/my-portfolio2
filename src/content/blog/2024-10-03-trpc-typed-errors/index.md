---
title: "tRPCでエラーを型安全に扱う"
date: "2024-10-03"
---

私は[tRPC](https://trpc.io/)のBig Fanである。

End-to-Endで型安全になる開発体験の良さは一度使うともはや後戻りできない中毒性がある。下手なテストを量産するよりも型をちゃんとする方がずっと予後がいい。

ときに、エラー情報を型をつけたままフロントエンドに返したい場合、tRPCをもってしても少し工夫が必要だったので概要をメモしておく。

## バックエンドの設定

まずはバックエンドでカスタムエラーを定義する。カスタムエラーにはフロントエンドに返す情報（以下、ペイロード）をプロパティに持たせておく。
このとき、ペイロードの型をタグ付きユニオンで定義しておき、フロントエンドにその型情報を公開する最大のポイントだ。

```tsx
import { TRPCError } from '@trpc/server'

/**
 * 最終的にフロントエンドに返したい情報の型。フロントエンドに公開する。
 */
export type CustomErrorPayload =
  | { type: 'blog.too_interesting'; score: number }
  | { type: 'blog.too_funny_title'; suggestion: string }
  | { type: 'product.date_limit_exceeded'; remainingDate: number }
  // ...
  // 以下、アプリケーションで扱うエラーが増えるたびに延々と追記していく。
  // ネームスペースは上記のように文字列のみで表現するのが良いだろう。

export class CustomError extends Error {
  payload: CustomErrorPayload

  constructor(payload: CustomErrorPayload) {
    super(payload.type) // 雑だけどとりあえずヨシ！
    this.name = 'CustomError'
    this.payload = payload
  }
}
```

次にエラーフォーマッターを設定する。フォーマッターはtRPCをイニシャライズする際に設定するようになっている。エラー発生時にどのような形でフロントエンドに情報が送られるかはここで決まる。

```tsx
export const t = initTRPC.create({
  errorFormatter({ error, shape }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // こいつを追加してやる。名前は任意。
        customErrorPayload:
          error.cause instanceof CustomError ? error.cause.payload : null,
      },
    }
  },
})
```

これでバックエンドの設定は完了だ。フロントエンドにエラーを返したいと思った時は、以下のような感じでthrowすれば良い。こうすればtRPCがよしなにフロントエンドに情報を送ってくれる。

```tsx
/**
 * 毎回TRPCErrorでラップするのが面倒なので作成したutil関数
 */
export const throwCustomError = (payload: CustomErrorPayload) => {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    cause: new CustomError(payload),
  })
}
```

## フロントエンドの設定

フロントエンドでは、エラーの中身を検査して、カスタムエラーペイロードを取り出すutil関数を作成しておく。

```tsx
import { TRPCClientError } from '@trpc/client'
import type { CustomErrorPayload } from '<your-type-definition-dir-or-package>'

/**
 * エラーにペイロードが含まれていれば取り出し、型付けして返す
 */
export const unwrapCustomErrorPayload = (error: Error): CustomErrorPayload | null => {
  // そもそもTRPC Clientが投げたエラーなのかチェック
  if (!(error instanceof TRPCClientError)) {
    return null
  }

  // ペイロードの有無をチェックする。
  // なお`TRPCClientError`の形式は、バックエンドのerrorFormatter関数で設定した通りになっている。
  // tRPCさん素敵！
  if (error?.data?.customErrorPayload?.type === undefined) {
    return null
  }

  // 型をつけて返す
  // (ここは責任を持ってキャストするほかない。ひとたび疎通の確認が取れれば問題ないだろう)
  return error.data.customErrorPayload as CustomErrorPayload
}
```

## 使い方

あとはフロントエンドのエラーハンドリングしたい箇所でペイロードを取り出して、型に応じた処理をすれば良い。ちなみに以下の例だと`errorPayload?.type === '`と打った時点で候補が出てくるし、if文の内部では`errorPayload.r`と打ち込んだ時点で候補が出てくる。

めでたくして黒部トンネルの開通である（バックエンドからフロントエンドに型安全にエラーを返すことができている）。fin。

```tsx
const e = new Error('検査したいエラー')

const errorPayload = unwrapCustomErrorPayload(e)
if (errorPayload?.type === 'product.date_limit_exceeded') {
  console.log(errorPayload.remainingDate)
}
```