---
title: "Apple Siliconでsharpを動かす"
date: "2020-12-25"
---

Apple Silicon で`sharp`を動作させるには、少々工夫が必要です。(2021/02/10 現在)

## 前提

ARM 版の Node.js, Homebrew, Docker がセットアップ済みであること

## 方法その１ ローカル環境で使う

- 単に brew で`vips`をグローバルにインストールしておけば OK です。
- Command line tools for Xcode を事前に入れておきましょう。そうしないと、インストール時に`gcc`をソースからビルドしようとしてものすごく時間がかかります

```bash
xcode-select --install # CLTが未インストールの場合のみ
brew install vips
```

- 古い情報
    
    Docker を使わずに、ローカル環境で`sharp`を使えるようにする方法です。 この方法を取る場合は、ソースから`libvips`をビルドし、グローバルにインストールして、`sharp`に使用させる必要があります。 ただ、この方法だとランタイムにおいてエラーが出たりしたので、おすすめは後述の Docker を使う方法です。
    
    [参考](https://github.com/lovell/sharp/issues/2460)
    
    ビルドに必要なライブラリを追加
    
    ```
    brew install pkg-config glib zlib
    ```
    
    [`libvips`の optional-dependencies](https://github.com/libvips/libvips#optional-dependencies)をみながら必要なものをインストールする。
    
    ```
    # 例えばjpeg, png, webpを扱うなら
    brew install libjpeg-turbo libpng webp
    
    # うちの環境では途中でコケることがありました。
    # もう一回コマンドを実行すると成功したので、原因がよくわかりませんでした。
    ```
    
    `libvips`のソースを[ダウンロード](https://github.com/libvips/libvips/releases)して解凍したのち、以下を実行する
    
    ```
    PKG_CONFIG_PATH=/opt/homebrew/Cellar/zlib/1.2.11/lib/pkgconfig ./configure
    make
    sudo make install
    ```
    
    なお、近いうちに何も考えずに使えるプレビルトバイナリが準備されるはずなので、 その暁にはグローバルインストールした`libvips`を消しておきましょう。 余計なトラブルを避けるために。
    
    ```bash
    # vipsのソースフォルダで
    sudo make uninsatll
    ```
    

## 方法その２ Docker 環境で使う

Docker 環境ならば何も考えずにいけるかと思いきや、やはりビルドに失敗します。これは、 Node.js の ARM64 版イメージの`glib`が、sharp のビルド環境に適合しないためだそうです。

[参考](https://github.com/lovell/sharp/issues/2482)

解消するためには Debian の最新版である bullseye（未リリース）を使えば良いのですが、Node.js の公式としてはリリースされていません。 そのため、Node.js を使える bullseye の環境を自前で用意する必要があります。 例えば、下記のような Dockerfile を自前で作成します。

```docker
FROM buildpack-deps:bullseye

#
# 下記はNode.jsの公式イメージのDockerfileからコピペしたもの
# https://github.com/nodejs/docker-node/blob/master/15/buster/Dockerfile
#
RUN groupadd --gid 1000 node \
  && useradd --uid 1000 --gid node --shell /bin/bash --create-home node

ENV NODE_VERSION 15.4.0

RUN ARCH= && dpkgArch="$(dpkg --print-architecture)" \
  && case "${dpkgArch##*-}" in \
  amd64) ARCH='x64';; \
  ppc64el) ARCH='ppc64le';; \
  s390x) ARCH='s390x';; \
  arm64) ARCH='arm64';; \
  armhf) ARCH='armv7l';; \
  i386) ARCH='x86';; \
  *) echo "unsupported architecture"; exit 1 ;; \
  esac \
  # gpg keys listed at https://github.com/nodejs/node#release-keys
  && set -ex \
  && for key in \
  4ED778F539E3634C779C87C6D7062848A1AB005C \
  94AE36675C464D64BAFA68DD7434390BDBE9B9C5 \
  1C050899334244A8AF75E53792EF661D867B9DFA \
  71DCFD284A79C3B38668286BC97EC7A07EDE3FC1 \
  8FCCA13FEF1D0C2E91008E09770F7A9A5AE15600 \
  C4F0DFFF4E8C1A8236409D08E73BC641CC11F4C8 \
  C82FA3AE1CBEDC6BE46B9360C43CEC45C17AB93C \
  DD8F2338BAE7501E3DD5AC78C273792F7D83545D \
  A48C2BEE680E841632CD4E44F07496B3EB3C1762 \
  108F52B48DB57BB0CC439B2997B01419BD92F80A \
  B9E2F5981AA6E0CD28160D9FF13993A75599653C \
  ; do \
  gpg --batch --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys "$key" || \
  gpg --batch --keyserver hkp://ipv4.pool.sks-keyservers.net --recv-keys "$key" || \
  gpg --batch --keyserver hkp://pgp.mit.edu:80 --recv-keys "$key" ; \
  done \
  && curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-$ARCH.tar.xz" \
  && curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt.asc" \
  && gpg --batch --decrypt --output SHASUMS256.txt SHASUMS256.txt.asc \
  && grep " node-v$NODE_VERSION-linux-$ARCH.tar.xz\$" SHASUMS256.txt | sha256sum -c - \
  && tar -xJf "node-v$NODE_VERSION-linux-$ARCH.tar.xz" -C /usr/local --strip-components=1 --no-same-owner \
  && rm "node-v$NODE_VERSION-linux-$ARCH.tar.xz" SHASUMS256.txt.asc SHASUMS256.txt \
  && ln -s /usr/local/bin/node /usr/local/bin/nodejs \
  # smoke tests
  && node --version \
  && npm --version

ENV YARN_VERSION 1.22.5

RUN set -ex \
  && for key in \
  6A010C5166006599AA17F08146C2130DFD2497F5 \
  ; do \
  gpg --batch --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys "$key" || \
  gpg --batch --keyserver hkp://ipv4.pool.sks-keyservers.net --recv-keys "$key" || \
  gpg --batch --keyserver hkp://pgp.mit.edu:80 --recv-keys "$key" ; \
  done \
  && curl -fsSLO --compressed "https://yarnpkg.com/downloads/$YARN_VERSION/yarn-v$YARN_VERSION.tar.gz" \
  && curl -fsSLO --compressed "https://yarnpkg.com/downloads/$YARN_VERSION/yarn-v$YARN_VERSION.tar.gz.asc" \
  && gpg --batch --verify yarn-v$YARN_VERSION.tar.gz.asc yarn-v$YARN_VERSION.tar.gz \
  && mkdir -p /opt \
  && tar -xzf yarn-v$YARN_VERSION.tar.gz -C /opt/ \
  && ln -s /opt/yarn-v$YARN_VERSION/bin/yarn /usr/local/bin/yarn \
  && ln -s /opt/yarn-v$YARN_VERSION/bin/yarnpkg /usr/local/bin/yarnpkg \
  && rm yarn-v$YARN_VERSION.tar.gz.asc yarn-v$YARN_VERSION.tar.gz \
  # smoke test
  && yarn --version
#
# Copied from official docker file END
#
```

この Dockerfile の末尾に自分の Dockerfile を追記するか、あるいは上記で作成したイメージを使ってコンテナを走らせれば、プレビルドされた`sharp`がダウンロードされ、スムーズに問題なく動作します。

## 総括

これさえクリアできれば ARM ネイティブで動かせるプロジェクトが結構あって嬉しい！