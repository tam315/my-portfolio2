---
title: "Search Paramsを手軽に扱うためのhooksを作りました"
date: "2023-04-24"
---

一覧表示画面などでフィルタ条件を設定したときに、URLのSearch Params(Query String)に状態を保持しておき、画面をリロードしたり別の画面から戻ってきたときに、UIの状態を維持できるようにするみたいな要件って、結構よくありますよね。

今の仕事でもそういったコードが必要になったので、Search Paramsを扱うためのいい感じのhooksがどこかに転がっているだろうと色々探してみたのですが、絶妙にProduction Readyなコードが見つかりませんでした。

なので、自前で書きました。誰かの役に立てば幸いです。

Search Paramsを`useLocation()`で取得しようとするとうまく動作しないけど`hostory.location`で取得するとうまくいくというのが最大の罠でした。

本体コード

```tsx
import * as qs from 'qs'
import { IParseOptions, IStringifyOptions } from 'qs'
import { useCallback } from 'react'
import { useHistory } from 'react-router-dom'

const parseOptions: IParseOptions = {
  ignoreQueryPrefix: true,
} as const

const stringifyOptions: IStringifyOptions = {
  skipNulls: true,
  encode: false,
} as const

type SetParamsOptions = {
  /**
   * 既存のSearch Paramsを全て削除した上で新しい値に置き換えるか
   */
  replace?: boolean
}

/**
 * Search Paramsを取得したりセットしたりするためのカスタムフック
 */
export const useSearchParams = () => {
  const history = useHistory()

  const params = qs.parse(history.location.search, parseOptions)

  const setParams = useCallback(
    (newParams, options?: SetParamsOptions) => {
      const existingParams = qs.parse(history.location.search, parseOptions)
      const isMergeRequired = !options?.replace
      const updatedSearchParams = qs.stringify(
        { ...(isMergeRequired && existingParams), ...newParams },
        stringifyOptions,
      )

      history.push({
        pathname: history.location.pathname,
        search: updatedSearchParams,
      })
    },
    [history],
  )

  return [params, setParams] as const
}
```

テストコード

```tsx
import { renderHook } from '@testing-library/react-hooks'
import { createMemoryHistory } from 'history'
import { FC } from 'react'
import { Router } from 'react-router-dom'
import { useSearchParams } from './useSearchParams'

const history = createMemoryHistory()

const Wrapper: FC = ({ children }) => {
  return <Router history={history}>{children}</Router>
}

beforeEach(() => {
  history.push('/')
})

test('URLから値を読み取れる(値が存在しない場合)', () => {
  const { result } = renderHook(() => useSearchParams(), {
    wrapper: Wrapper,
  })
  const [params] = result.current

  expect(params).toEqual({})
})

test('URLから値を読み取れる(値が存在する場合)', () => {
  history.location.search =
    '?name=jack' +
    '&age=22' +
    '&tags[0]=fishing' +
    '&tags[1]=car' +
    '&tags[2]=1985'
  const { result } = renderHook(() => useSearchParams(), {
    wrapper: Wrapper,
  })
  const [params] = result.current

  expect(params['name']).toEqual('jack')
  expect(params['age']).toEqual('22')
  expect(params['tags']).toEqual(['fishing', 'car', '1985'])
})

test('値をセットするとURLが更新される', async () => {
  history.location.search = '?existingKey=existingValue'

  const { result } = renderHook(() => useSearchParams(), {
    wrapper: Wrapper,
  })
  const [, setParams] = result.current

  setParams({ name: 'john', age: '18' })
  expect(history.location.search).toEqual(
    '?existingKey=existingValue&name=john&age=18',
  )

  setParams({ name: 'kevin' })
  expect(history.location.search).toEqual(
    '?existingKey=existingValue&name=kevin&age=18',
  )

  setParams({ gender: 'male' })
  expect(history.location.search).toEqual(
    '?existingKey=existingValue&name=kevin&age=18&gender=male',
  )

  setParams({ iam: 'god' }, { replace: true })
  expect(history.location.search).toEqual('?iam=god')
})
```