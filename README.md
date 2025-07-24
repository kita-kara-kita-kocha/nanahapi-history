# 🌸 ななはぴアーカイブ タイムライン

ななはぴメンバーのYouTube動画アーカイブを収集・表示するプロジェクトです。
https://kita-kara-kita-kocha.github.io/nanahapi-history/

## 📋 概要

このプロジェクトは以下の機能を提供します：
- ななはぴメンバーのYouTube動画情報を自動収集
- 時系列でのアーカイブ表示
- カレンダー形式での動画表示
- タレント別フィルタリング機能

## 🛠️ セットアップ

### 前提条件
- Python 3.7以上
- Git

### インストール手順

1. リポジトリをクローン
```bash
git clone https://github.com/kita-kara-kita-kocha/nanahapi-history.git
cd nanahapi-history
```

2. Python仮想環境を作成
```bash
python -m venv venv
source venv/bin/activate  # Linuxの場合
# venv\Scripts\activate  # Windowsの場合
```

3. 依存関係をインストール
```bash
make setup
```

## 🚀 使用方法

### Makefileコマンド

| コマンド | 説明 |
|---------|-----|
| `make help` | 利用可能なコマンド一覧を表示 |
| `make all` | 全タレントの全アーカイブを取得 |
| `make 30` | 全タレントの最新30件のアーカイブを取得 |
| `make get-archives-all` | 全タレントの全アーカイブを取得 |
| `make get-archives-30` | 全タレントの最新30件のアーカイブを取得 |
| `make setup` | 依存関係をインストール |
| `make check-venv` | 仮想環境の状態を確認 |
| `make show-talents` | 登録されているタレント一覧を表示 |
| `make get-single-all TALENT="@ユーザー名"` | 特定タレントの全アーカイブを取得 |
| `make get-single-30 TALENT="@ユーザー名"` | 特定タレントの最新30件のアーカイブを取得 |

### 基本的な使用例

1. 全タレントの最新アーカイブを取得
```bash
make get-archives-30
```

2. 特定のタレントのアーカイブを取得
```bash
make get-single-30 TALENT="@koyuchan_"
```

3. タレント一覧を確認
```bash
make show-talents
```

4. 自動更新スクリプトの実行
```bash
# 全アーカイブ更新
./run.sh

# 最新30件のみ更新
./run30.sh
```

### 自動更新スクリプト

プロジェクトには2つの自動更新スクリプトが用意されています：

#### run.sh（全アーカイブ更新）
`run.sh`は以下の処理を自動で実行するスクリプトです：

1. **仮想環境の確認**: `make check-venv`でPython環境をチェック
2. **アーカイブ取得**: `make all`で全タレントの全アーカイブを更新
3. **変更検出**: `docs/src/archives_@*.json`ファイルの変更を確認
4. **Git操作**: 変更されたファイルを自動でコミット&プッシュ

#### run30.sh（最新30件更新）
`run30.sh`は軽量版の更新スクリプトです：

1. **仮想環境の確認**: `make check-venv`でPython環境をチェック
2. **アーカイブ取得**: `make 30`で全タレントの最新30件のみ更新
3. **変更検出**: `docs/src/archives_@*.json`ファイルの変更を確認
4. **Git操作**: 変更されたファイルを自動でコミット&プッシュ

**使用方法:**
```bash
# スクリプトを実行可能にする（初回のみ）
chmod +x run.sh run30.sh

# 全アーカイブ更新（時間がかかる）
./run.sh

# 最新30件のみ更新（高速）
./run30.sh
```

**特徴:**
- 📝 詳細なログを`/tmp/nanahapi-update-YYYYMMDD-HHMMSS.log`（run.sh）または`/tmp/nanahapi-update30-YYYYMMDD-HHMMSS.log`（run30.sh）に保存
- 🔍 変更されたファイルがない場合は何もコミットしない
- 📊 統計情報付きのコミットメッセージを自動生成
- ⚠️ エラー時は適切なメッセージを表示して終了
- ⚡ run30.shは高速で、定期実行に適している

### Webページの表示

アーカイブ取得後、`docs/index.html`をブラウザで開くことで、時系列表示のタイムラインを閲覧できます。

## ⏰ Cron自動実行設定

### 概要
`make all`を定期的に実行することで、ななはぴメンバーのアーカイブを自動更新できます。

### Cron設定手順

1. **事前準備**
   ```bash
   # プロジェクトの絶対パスを確認
   pwd
   # 例: /home/username/nanahapi-history
   
   # 仮想環境が正しく設定されているか確認
   make check-venv
   ```

2. **Cronジョブの編集**
   ```bash
   crontab -e
   ```

3. **Cronエントリの追加**
   
   以下のいずれかの設定を追加してください：

   **run30.shスクリプトを使用する場合（推奨・高速）:**
   ```cron
   0 */3 * * * cd /home/username/nanahapi-history && ./run30.sh >> /tmp/nanahapi-cron.log 2>&1
   ```

   **run.shスクリプトを使用する場合（全アーカイブ更新）:**
   ```cron
   0 6 * * * cd /home/username/nanahapi-history && ./run.sh >> /tmp/nanahapi-cron.log 2>&1
   ```

   **make 30のみを実行する場合:**
   ```cron
   0 */3 * * * cd /home/username/nanahapi-history && make 30 >> /tmp/nanahapi-cron.log 2>&1
   ```

   **その他のスケジュール例:**

   **平日の午前6時にrun30.shを実行する場合：**
   ```cron
   0 6 * * 1-5 cd /home/username/nanahapi-history && ./run30.sh >> /tmp/nanahapi-cron.log 2>&1
   ```

   **1日2回run30.shを実行する場合：**
   ```cron
   0 9,21 * * * cd /home/username/nanahapi-history && ./run30.sh >> /tmp/nanahapi-cron.log 2>&1
   ```

   **週1回全アーカイブ更新 + 毎日軽量更新の組み合わせ：**
   ```cron
   # 日曜日午前2時に全アーカイブ更新
   0 2 * * 0 cd /home/username/nanahapi-history && ./run.sh >> /tmp/nanahapi-cron.log 2>&1
   # 平日午前6時に最新30件更新
   0 6 * * 1-6 cd /home/username/nanahapi-history && ./run30.sh >> /tmp/nanahapi-cron.log 2>&1
   ```

### Cron設定の注意点

- **絶対パスの使用**: `/home/username/nanahapi-history`は実際のプロジェクトパスに置き換えてください
- **ログの保存**: `>> /tmp/nanahapi-cron.log 2>&1`でログをファイルに保存します
- **環境変数**: cronは限られた環境変数しか持たないため、スクリプト内で絶対パスを使用しています

### Cronジョブの確認

```bash
# 現在のcronジョブを確認
crontab -l

# cronサービスの状態確認
systemctl status cron    # Ubuntu/Debian
systemctl status crond   # CentOS/RHEL
```

### ログの確認

```bash
# Cronジョブの実行ログを確認
tail -f /tmp/nanahapi-cron.log

# システムログでcronの動作を確認
sudo tail -f /var/log/syslog | grep CRON    # Ubuntu/Debian
sudo tail -f /var/log/cron                  # CentOS/RHEL
```

### トラブルシューティング

**よくある問題と解決方法：**

1. **権限エラー**
   ```bash
   # プロジェクトディレクトリの権限確認
   ls -la /home/username/nanahapi-history
   
   # 必要に応じて権限修正
   chmod +x /home/username/nanahapi-history/venv/bin/python
   ```

2. **Python仮想環境の問題**
   ```bash
   # 仮想環境の再作成
   rm -rf venv
   python -m venv venv
   source venv/bin/activate
   make setup
   ```

3. **ネットワークエラー**
   - YouTube APIの制限やネットワーク問題が発生する場合があります
   - ログを確認して適切な間隔で実行するよう調整してください

### 推奨設定

**本番環境での推奨設定：**
- **頻度**: 1日1〜2回（YouTube動画の更新頻度を考慮）
- **時間帯**: 早朝（6:00）や深夜（22:00）など、負荷の少ない時間
- **ログ管理**: ログファイルの定期的なローテーション
- **エラー通知**: 重要なエラーの場合はメール通知を設定

**ログローテーション設定例：**
```bash
# /etc/logrotate.d/nanahapi-cron
/tmp/nanahapi-cron.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
```

## 📁 プロジェクト構造

```
nanahapi-history/
├── README.md              # プロジェクトの説明
├── Makefile              # ビルド・実行用のMakefile
├── run.sh                # 自動更新スクリプト（全アーカイブ取得→Git操作）
├── run30.sh              # 自動更新スクリプト（最新30件取得→Git操作）
├── script/               # スクリプトディレクトリ
│   └── get_archives.py   # アーカイブ取得スクリプト
├── docs/                 # Webページディレクトリ
│   ├── index.html        # タイムライン表示ページ
│   ├── calendar.html     # カレンダー表示ページ
│   ├── style.css         # スタイルシート
│   ├── index.js          # タイムライン表示用JavaScript
│   ├── calendar.js       # カレンダー表示用JavaScript
│   └── src/              # データディレクトリ
│       ├── talent_info.json        # タレント情報
│       └── archives_@*.json        # 各タレントのアーカイブデータ
├── debug_entries.json    # デバッグ用ファイル
└── debug_videos.json     # デバッグ用ファイル
```

## 👥 登録タレント
- まどろみ姉さん (@amanosakatu)
- みみっく＝わんだぁぼっくす (@mimic_teionvo)
- ココロニ・ノンノ (@kokoroninonno)
- 星降こゆ (@koyuchan_)
- ルシア・アラモード (@pieceofpudding3)
- 楠木トヲル (@Toworu_)
- めもあ (@memoa_923)
- 猫野ちゆる (@nekono_chiyuru)
- 蛇火 (@JabiDevi)
- 花鹿める (@mel_samui)
- 切札アタル (@kirihuda_ataru)
- リンカ=エンジェルズシェア (@rinka__angel)

タレント一覧は `make show-talents` で確認できます。

## 🔧 技術仕様

### 使用技術
- **Python**: アーカイブ取得スクリプト
- **yt-dlp**: YouTube動画情報取得
- **HTML/CSS/JavaScript**: フロントエンド
- **Make**: ビルドシステム

### データ形式
各タレントのアーカイブデータは以下の形式で保存されます：
```json
{
  "video_title": "動画タイトル",
  "video_url": "YouTube動画URL",
  "thumbnail_url": "サムネイルURL", 
  "upload_date": "アップロード日(YYYYMMDD)"
}
```

## 🤝 貢献

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトは[MIT License](LICENSE)の下で公開されています。

## 🙏 謝辞

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - YouTube動画情報取得ライブラリ。最高のツールです！
- ななはぴメンバーの皆様 - 素晴らしいコンテンツの提供をありがとうございます！

## 📞 サポート

問題や質問がある場合は、[Issues](https://github.com/kita-kara-kita-kocha/nanahapi-history/issues)でお気軽にお問い合わせください。
