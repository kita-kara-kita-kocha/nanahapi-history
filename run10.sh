#!/bin/bash

# ななはぴアーカイブ自動更新スクリプト（最新10件版）
# make 10を実行し、変更されたアーカイブファイルをGitでコミット&プッシュします

set -e  # エラーが発生したら即座に終了

# スクリプトの実行ディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ログファイルの設定
LOG_FILE="/tmp/nanahapi-update10-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_FILE")
exec 2>&1

echo "🌸 ななはぴアーカイブ自動更新開始（最新10件）: $(date)"
echo "📁 作業ディレクトリ: $SCRIPT_DIR"
echo "📝 ログファイル: $LOG_FILE"
echo "=================================================="

# 仮想環境の確認
echo "🔍 仮想環境の状態確認中..."
if ! make setup; then
    echo "❌ 仮想環境の確認に失敗しました"
    exit 1
fi
echo "✅ 仮想環境確認完了"

# Gitの状態確認
echo "🔍 Gitリポジトリの状態確認中..."
if ! git status >/dev/null 2>&1; then
    echo "❌ Gitリポジトリではありません"
    exit 1
fi

# 現在のブランチを確認
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 現在のブランチ: $CURRENT_BRANCH"

# リモートから最新の変更を取得
echo "📡 リモートから最新の変更を取得中..."
if ! git fetch origin; then
    echo "⚠️  リモートからの取得に失敗しました（ネットワーク問題の可能性）"
fi

# アーカイブ取得前の状態を記録
echo "📊 アーカイブ取得前の状態を記録中..."
BEFORE_FILES=$(find docs/src -name "archives_@*.json" -type f | wc -l)
echo "📄 既存のアーカイブファイル数: $BEFORE_FILES"

# make 10を実行
echo "🎬 アーカイブ取得開始（最新10件）: $(date)"
if ! make 10; then
    echo "❌ make 10の実行に失敗しました"
    exit 1
fi
echo "✅ アーカイブ取得完了（最新10件）: $(date)"

# アーカイブ取得後の状態を記録
AFTER_FILES=$(find docs/src -name "archives_@*.json" -type f | wc -l)
echo "📄 更新後のアーカイブファイル数: $AFTER_FILES"

# 変更されたファイルを確認
echo "🔍 変更されたファイルを確認中..."
CHANGED_FILES=$(git status --porcelain docs/src/archives_@*.json | wc -l)
NEW_FILES=$(git status --porcelain docs/src/archives_@*.json | grep "^??" | wc -l)
MODIFIED_FILES=$(git status --porcelain docs/src/archives_@*.json | grep "^ M" | wc -l)

echo "📈 変更されたアーカイブファイル: $CHANGED_FILES個"
echo "  - 新規ファイル: $NEW_FILES個"
echo "  - 修正ファイル: $MODIFIED_FILES個"

if [ "$CHANGED_FILES" -eq 0 ]; then
    echo "ℹ️  変更されたアーカイブファイルがありません"
    echo "🎉 処理完了: $(date)"
    exit 0
fi

# 変更されたファイルの詳細を表示
echo "📋 変更されたファイル一覧:"
git status --porcelain docs/src/archives_@*.json | while IFS= read -r line; do
    echo "  $line"
done

# アーカイブファイルをステージング
echo "📦 アーカイブファイルをステージング中..."
if ! git add docs/src/archives_@*.json; then
    echo "❌ ファイルのステージングに失敗しました"
    exit 1
fi

# コミットメッセージの生成
COMMIT_DATE=$(date "+%Y-%m-%d %H:%M:%S")
COMMIT_MSG="🤖 自動更新: アーカイブデータ更新（最新10件）($COMMIT_DATE)

📊 統計:
- 変更ファイル数: ${CHANGED_FILES}個
- 新規ファイル: ${NEW_FILES}個  
- 修正ファイル: ${MODIFIED_FILES}個
- 総アーカイブ数: ${AFTER_FILES}個

🎬 実行コマンド: make 10 (最新10件更新)
⏰ 実行時刻: $COMMIT_DATE"

# コミット実行
echo "💾 変更をコミット中..."
if ! git commit -m "$COMMIT_MSG"; then
    echo "❌ コミットに失敗しました"
    exit 1
fi
echo "✅ コミット完了"

# プッシュ実行
echo "📤 リモートリポジトリにプッシュ中..."
if ! git push origin "$CURRENT_BRANCH"; then
    echo "❌ プッシュに失敗しました"
    echo "💡 手動でプッシュを実行してください: git push origin $CURRENT_BRANCH"
    exit 1
fi
echo "✅ プッシュ完了"

# 完了メッセージ
echo "=================================================="
echo "🎉 ななはぴアーカイブ自動更新完了（最新10件）: $(date)"
echo "📊 処理結果:"
echo "  - アーカイブファイル: $BEFORE_FILES → $AFTER_FILES個"
echo "  - 変更ファイル: ${CHANGED_FILES}個をコミット&プッシュ"
echo "  - ブランチ: $CURRENT_BRANCH"
echo "  - 更新モード: 最新10件更新"
echo "📝 ログファイル: $LOG_FILE"
echo "🌸 ななはぴメンバーのアーカイブが更新されました！"

# ログファイルの場所を最後に表示
echo ""
echo "💡 詳細なログは以下のファイルで確認できます:"
echo "   $LOG_FILE"
