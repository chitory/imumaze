# imumaze

HTML5 と Canvas で動くスマホ向け迷路ゲームの MVP です。

## Features

- ランダム迷路生成
- ボールをスタートからゴールまで移動
- `DeviceOrientation` による傾き操作
- タッチ / ドラッグ操作のフォールバック
- 壁衝突判定
- ゴール到達時のクリア表示
- 新しい迷路の再生成

## Run

静的ファイルなので、`index.html` を GitHub Pages で公開すればそのまま動きます。

ローカル確認は、任意の静的ファイルサーバーで `index.html` を開いてください。

## GitHub Pages の確認方法

1. GitHub リポジトリの `Settings` を開きます。
2. `Pages` を選びます。
3. `Build and deployment` で `Deploy from a branch` を選択します。
4. `Branch` を `main`、フォルダを `/ (root)` にします。
5. 保存後、公開 URL が `https://chitory.github.io/imumaze/` になっていることを確認します。
6. 公開後にその URL をスマホで開き、傾き操作とドラッグ操作、`新しい迷路` ボタンを確認します。

## Notes

- iPhone など一部環境では、傾き操作の許可ボタンを押す必要があります。
- 端末の向きやブラウザによって `DeviceOrientation` の値は変わるため、動きが強すぎる場合は `app.js` の感度を調整してください。
