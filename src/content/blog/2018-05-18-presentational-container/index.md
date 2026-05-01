---
title: "presentational-componentとcontainer-component"
date: "2018-05-18"
---

2019.02.18 更新　 Dan Abramov さんによって元記事が更新されました。いまは[Hook](https://reactjs.org/docs/hooks-overview.html)が使えるので、この記事にこだわりすぎるな、とのことです。

---

Redux を使うにあたって、どのようにコンポーネントの使い分けるかということについて、下記のサイトが非常にわかりやすかったので、忘れないようにメモしておきます。 

[https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0)

## コンポーネントにおける 2 つの分類

### Presentational Component

- 見た目に関する責任を負う。
- 子要素として、Presentational Component、Container Component のどちらも持ちうる。
- DOM マークアップやスタイルを持つ。
- this.props.children を受け取る。
- 自分のコンポーネント以外のことについて依存しない。（例：Flux アクションや Store など）
- データを自身で勝手に読み込んだり、改変しない。
- データやコールバックは、親から Props として受け取る。
- State を持つことは少ない（持ったとしても、自身の UI に関する状態だけ）。
- Functional Component として書かれる。Component State や Lifecycle Hook、パフォーマンス調整の必要がなければ。
- 主な使用例：Page, Sidebar, Story, Userinfo, List

### Container Component

- アプリケーションの動作に関する責任を負う。
- 子要素として、Presentational Component、Container Component のどちらも持ちうる。
- DOM マークアップやスタイルを持たない。
- データ及びデータを扱うためのファンクションを Presentational Component に提供する。
- Flux Action を発火する。また、発火するためのファンクションを子要素に提供する。
- State を持つ。データソースとして機能する。
- react-redux.connect()などの HOC を使って生成される。
- 主な使用例：UserPage, FollowersSidebar, StoryContainer, FollowedUserList

## 比較

以下、[redux 公式サイト](https://redux.js.org/basics/usage-with-react)より。

|  | Presentational Components | Container Components |
| --- | --- | --- |
| 目的 | 見た目(markup, styles) | 働き(データ取得、state のアップデート) |
| Redux | 関係なし | 関係あり |
| データの取得 | props | Redux state を subscribe |
| データの変更 | props から取得した Callback を使う | Redux の actions を Dispatch する |
| 作成方法 | 手動 | React-Redux の connect() |

## この分け方にするメリット

- アプリケーション部分と UI 部分を分離できる
- 再利用性が高い
- Container に重複したレイアウトを記載しなくなる。（Sidebar や Page といったレイアウトを Presentational Component として抽出することを強制される。Container から、レイアウトコンポーネントに対して children を渡してやるスタイル。）

## どのように Container を使い始めるか

Presentational Component だけでアプリを作り始めるのがおすすめ。そのうち、データを親から受け取って子供に渡しているだけの、無駄に大きい中間コンポーネントが発生する。それを Container にするとよい。とのこと。