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

### Webページの表示

アーカイブ取得後、`docs/index.html`をブラウザで開くことで、時系列表示のタイムラインを閲覧できます。

## 📁 プロジェクト構造

```
nanahapi-history/
├── README.md              # プロジェクトの説明
├── Makefile              # ビルド・実行用のMakefile
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
