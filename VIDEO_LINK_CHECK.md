# 動画URLリンク切れチェックツール

docs/src/archives_*.jsonファイルに含まれている動画URLのリンク切れをチェックするツールです。

## 機能

- すべてのアーカイブファイルの動画URLをチェック
- リンク切れやアクセス不能な動画を検出
- 詳細なレポートをJSON形式で出力
- 高速版（サンプリング）による事前チェック

## 使用方法

### 通常チェック（全件チェック）
```bash
# Makefileを使用
make check-links

# スクリプト直接実行
python3 script/check_video_links.py [リクエスト間隔(秒)]

# 例: リクエスト間隔を0.5秒に設定
python3 script/check_video_links.py 0.5
```

### 高速チェック（サンプリング）
```bash
# Makefileを使用
make check-links-fast

# スクリプト直接実行
python3 script/check_video_links_fast.py [サンプルサイズ] [リクエスト間隔(秒)]

# 例: 各ファイルから10件サンプリング、0.1秒間隔
python3 script/check_video_links_fast.py 10 0.1
```

## パラメーター

### check_video_links.py
- `リクエスト間隔(秒)`: HTTPリクエスト間の間隔（デフォルト: 1.0秒）
  - YouTubeのレート制限を避けるため、1秒以上を推奨

### check_video_links_fast.py  
- `サンプルサイズ`: 各ファイルからチェックする件数（デフォルト: 20件）
- `リクエスト間隔(秒)`: HTTPリクエスト間の間隔（デフォルト: 0.2秒）

## 出力

### コンソール出力
- リアルタイムで各URLのチェック結果を表示
- 進捗状況とサマリーを表示
- 問題のあるURLの詳細情報

### レポートファイル
問題のあるURLが見つかった場合、以下のファイルが生成されます：
- `broken_video_links_report.json`: 通常チェックの結果
- `broken_video_links_fast_report.json`: 高速チェックの結果

## 使用例

### 1. 事前チェック（高速）
新しいデータを取得した後、問題がないか素早く確認：
```bash
make check-links-fast
```

### 2. 完全チェック
定期的な詳細チェック：
```bash
make check-links
```

### 3. カスタムチェック
特定の設定でチェック：
```bash
# 各ファイル3件ずつ、0.05秒間隔で高速チェック
python3 script/check_video_links_fast.py 3 0.05

# 2秒間隔で完全チェック（レート制限が厳しい場合）
python3 script/check_video_links.py 2.0
```

## 注意事項

- YouTubeのレート制限に注意してください
- ネットワーク接続が必要です
- 大量のリクエストを送信するため、適切な間隔を設定してください
- 一時的なサーバーエラーも「リンク切れ」として報告される場合があります

## トラブルシューティング

### エラー: requests module not found
```bash
pip install requests
# または
python3 -m pip install requests
```

### タイムアウトエラーが多発する場合
リクエスト間隔を長くしてください：
```bash
python3 script/check_video_links.py 2.0
```

### 403/429エラーが多発する場合
YouTubeのレート制限に引っかかっている可能性があります。間隔をより長くしてください：
```bash
python3 script/check_video_links.py 5.0
```