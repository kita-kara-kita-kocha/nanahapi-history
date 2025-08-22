.PHONY: all clean help get-archives setup check-venv show-talents get-single

# デフォルトターゲット
all: get-archives-all
10: get-archives-10

# ヘルプメッセージ
help:
	@echo "利用可能なターゲット:"
	@echo " make all              - 全てのタレントの全アーカイブを取得"
	@echo " make 10               - 全てのタレントの最新10件のアーカイブを取得"
	@echo " make get-archives-all - 全てのタレントの全アーカイブを取得"
	@echo " make get-archives-10  - 全てのタレントの最新10件のアーカイブを取得"
	@echo " make setup            - 依存関係をインストール"
	@echo " make check-venv       - 仮想環境の状態を確認"
	@echo " make show-talents     - 登録されているタレント一覧を表示"
	@echo " make get-single-all   - 特定のタレントの全アーカイブを取得"
	@echo " make get-single-10    - 特定のタレントの最新10件のアーカイブを取得"
	@echo " make help             - このヘルプメッセージを表示"

# Pythonの実行環境を設定
VENV_DIR := venv
PYTHON := $(VENV_DIR)/bin/python
SCRIPT_DIR := script
TALENT_INFO := docs/src/talent_info.json
OUTPUT_DIR := docs/src

# 仮想環境の確認
check-venv:
	@echo "🔍 仮想環境の状態を確認中..."
	@if [ ! -d "$(VENV_DIR)" ]; then \
		echo "❌ 仮想環境が見つかりません: $(VENV_DIR)"; \
		echo "   python -m venv $(VENV_DIR) で仮想環境を作成してください"; \
		exit 1; \
	fi
	@if [ ! -f "$(PYTHON)" ]; then \
		echo "❌ Pythonバイナリが見つかりません: $(PYTHON)"; \
		exit 1; \
	fi
	@echo "✅ 仮想環境: $(VENV_DIR)"
	@$(PYTHON) --version
	@echo "📦 インストール済みパッケージ:"
	@$(PYTHON) -m pip list | grep -E "(yt-dlp|pip)" || echo "   yt-dlpがインストールされていません"
	@echo "⬆️ yt-dlpのアップデートを確認:"
	@$(PYTHON) -m pip install --upgrade yt-dlp

# 依存関係のセットアップ
setup: check-venv
	@echo "📦 依存関係をインストール中..."
	@$(PYTHON) -m pip install --upgrade pip
	@$(PYTHON) -m pip install yt-dlp
	@echo "✅ セットアップ完了"

# デバッグ用：talent_info.jsonの内容を表示
show-talents:
	@echo "📋 登録されているタレント一覧:"
	@python3 -c "import json; talents = json.load(open('$(TALENT_INFO)', 'r', encoding='utf-8')); [print(f'{i:2d}. {talent.get(\"name\", \"不明\")} - {talent.get(\"yt\", \"なし\")}') for i, talent in enumerate(talents, 1)]; print(f'\\n総数: {len(talents)}人')"

# talent_info.jsonから各タレントのYouTubeチャンネル情報を取得してアーカイブを取得
get-archives-10: check-venv
	@echo "🎬 全てのタレントのアーカイブ取得を最新10件更新します..."
	@if [ ! -f "$(TALENT_INFO)" ]; then \
		echo "❌ $(TALENT_INFO) が見つかりません"; \
		exit 1; \
	fi
	@$(PYTHON) -c "import json, subprocess, sys; talents = json.load(open('$(TALENT_INFO)', 'r', encoding='utf-8')); [print(f'📺 {t.get(\"name\", \"不明\")} ({t[\"yt\"]}) のアーカイブを取得中...') or subprocess.run([sys.executable, '$(SCRIPT_DIR)/get_archives.py', t['yt'], '10'], check=False) if t.get('yt') else print(f'⚠️  {t.get(\"name\", \"不明\")}: YouTubeチャンネル情報がありません') for t in talents]; print('🎉 全てのアーカイブ取得が完了しました!')"
get-archives-all: check-venv
	@echo "🎬 全てのタレントのアーカイブ取得を開始します..."
	@if [ ! -f "$(TALENT_INFO)" ]; then \
		echo "❌ $(TALENT_INFO) が見つかりません"; \
		exit 1; \
	fi
	@$(PYTHON) -c "import json, subprocess, sys; talents = json.load(open('$(TALENT_INFO)', 'r', encoding='utf-8')); [print(f'📺 {t.get(\"name\", \"不明\")} ({t[\"yt\"]}) のアーカイブを取得中...') or subprocess.run([sys.executable, '$(SCRIPT_DIR)/get_archives.py', t['yt']], check=False) if t.get('yt') else print(f'⚠️  {t.get(\"name\", \"不明\")}: YouTubeチャンネル情報がありません') for t in talents]; print('🎉 全てのアーカイブ取得が完了しました!')"

# 特定のタレントのアーカイブを取得（例: make get-single TALENT="@koyuchan_"）
get-single-10: check-venv
	@if [ -z "$(TALENT)" ]; then \
		echo "❌ TALENT変数を指定してください。例: make get-single TALENT=\"@koyuchan_\""; \
		exit 1; \
	fi
	@echo "📺 $(TALENT) のアーカイブを取得中..."
	@$(PYTHON) $(SCRIPT_DIR)/get_archives.py $(TALENT) 10
get-single-all: check-venv
	@if [ -z "$(TALENT)" ]; then \
		echo "❌ TALENT変数を指定してください。例: make get-single TALENT=\"@koyuchan_\""; \
		exit 1; \
	fi
	@echo "📺 $(TALENT) のアーカイブを取得中..."
	@$(PYTHON) $(SCRIPT_DIR)/get_archives.py $(TALENT)
