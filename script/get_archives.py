# 引数のyoutubeURLからアーカイブリストを取得
#  - yt-dlpを利用
#  - アーカイブで取得する情報は{video_title, video_url, thumbnail_url, upload_date}

# 動画ごとの情報取得確認用
# yt-dlp https://www.youtube.com/watch?v={video_id} --skip-download --print-json | jq > tmp.json

import sys
import json
import yt_dlp
import re
import time
from pathlib import Path
from datetime import datetime, timedelta, timezone
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

debug_flag = False  # デバッグフラグ
debug_videos = []  # デバッグ用動画情報リスト
class CustomLogger:
    """カスタムロガークラス"""
    def __init__(self, verbose=False):
        self.messages = []
        self.verbose = verbose
        
    def debug(self, message):
        self.messages.append({'logType': 'DEBUG', 'message': message})
        if self.verbose:
            print(f"[DEBUG] {message}")
        
    def warning(self, message):
        self.messages.append({'logType': 'WARNING', 'message': message})
        if self.verbose:
            print(f"[WARNING] {message}")
        
    def error(self, message):
        self.messages.append({'logType': 'ERROR', 'message': message})
        if self.verbose:
            print(f"[ERROR] {message}")
    
    def get_messages(self):
        return self.messages
    
    def get_latest_error(self):
        """
        最新のエラーメッセージを取得
        
        Returns:
            str: 最新のエラーメッセージ、存在しない場合はNone
        """
        for message in reversed(self.messages):
            if message['logType'] == 'ERROR':
                return message['message']
        return None
    
    def clear_messages(self):
        self.messages = []

def get_ydl_options():
    """
    yt-dlpの設定を取得
    
    Returns:
        dict: yt-dlpの設定辞書
    """
    # カスタムロガーのインスタンスを作成（CLI出力オフ）
    custom_logger = CustomLogger(verbose=False)

    return {
        'quiet': True,  # CLI出力を非表示
        'no_warnings': True, # 警告を非表示
        'extract_flat': True,  # 詳細情報も取得
        'ignoreerrors': True,  # エラーが発生しても続行
        'logger': custom_logger,  # カスタムロガーを設定
        'sleep_interval': 5,  # リクエスト間隔を設定(秒)
        'max_sleep_interval': 15,  # 最大スリープ間隔
        'retries': 3,  # リトライ回数
        'fragment_retries': 3,  # フラグメントリトライ回数
        'ignore_no_formats_error': True, # フォーマットが見つからないエラーを無視
    }

def get_detailed_video_info(video_id, ydl_opts):
    """
    個別動画の詳細情報を取得（リトライ機能付き）
    
    Args:
        video_id (str): 動画ID
        ydl_opts (dict): yt-dlpの設定
    
    Returns:
        dict: 動画の詳細情報、失敗時はNone
    """
    # 個別動画用のyt-dlp設定
    video_ydl_opts = ydl_opts.copy()
    video_ydl_opts['extract_flat'] = False  # 詳細情報を取得
    
    video_info = None
    for attempt in range(3):  # 3回まで再試行
        try:
            if attempt > 0:
                print(f"    リトライ中... 試行 {attempt + 1}/3", flush=True)

            with yt_dlp.YoutubeDL(video_ydl_opts) as video_ydl:
                video_info = video_ydl.extract_info(
                    f"https://www.youtube.com/watch?v={video_id}", 
                    download=False
                )
            break  # 成功したらループを抜ける
        except Exception as retry_error:
            print(f"    試行 {attempt + 1}/3 失敗: {str(retry_error)}", flush=True)
            if attempt < 2:  # 最後の試行でなければ待機
                time.sleep(5)  # 5秒待機
            else:
                raise retry_error  # 最後の試行で失敗したら例外を上げる
    
    if video_info is None:
        # ロガーからの情報を取得
        logger = video_ydl_opts['logger']
        # 最新のエラーログメッセージを取得
        latest_error = logger.get_latest_error()
        if latest_error:
            logger.clear_messages()  # エラーメッセージをクリア
            raise Exception(latest_error)  # エラーメッセージを例外として上げる
    
    return video_info

def to_update_timestamp(timestamp):
    """
    タイムスタンプを更新日時形式に変換
    
    Args:
        timestamp (int or str): タイムスタンプ（秒単位またはISO形式）
    Returns:
        str: 更新日時形式の文字列
    """
    if isinstance(timestamp, int):
        # 秒単位のタイムスタンプをISO形式に変換
        convert_timestamp = datetime.fromtimestamp(timestamp).isoformat()
        return convert_timestamp
    elif isinstance(timestamp, str):
        # datetimeに変換
        dt = datetime.fromisoformat(timestamp)
        # タイムゾーン+9の時間に変換
        dt = dt + timedelta(hours=9)
        # strのISO形式に変換
        convert_timestamp = dt.isoformat()
        # 末尾のタイムゾーン情報を削除(末尾に+XX:XXか-XX:XXがある場合)
        if re.search(r"[+-]\d{2}:\d{2}$", convert_timestamp):
            convert_timestamp = convert_timestamp[:-6]
        return convert_timestamp
    else:
        # 無効な形式の場合は空文字列を返す
        return ""

def imprecise_tags(title):
    """
    タイトルからタグを抽出するための正規表現
    タイトルに「#」で始まるタグが含まれている場合、それらを抽出してリストとして返す。
    
    Args:
        title (str): 動画のタイトル
    Returns:
        list: 抽出されたタグのリスト
    """
    # 「#」で始まるタグを抽出
    tags = re.findall(r'#(\w+)', title)
    # タグを重複なく保持
    tags = list(set(tags))
    # タグを「#」付きで整形
    tags = [f"#{tag}" for tag in tags if tag]  # 空でないタグのみ
    # タグのソート
    tags.sort()
    return tags

def get_thumbnail_url(video_info, video_id):
    """
    動画情報からサムネイルURLを取得
    
    Args:
        video_info (dict): 動画の詳細情報
        video_id (str): 動画ID
    Returns:
        str: サムネイルURL
    """
        
    if 'thumbnails' in video_info.keys():
        # サムネイルが存在する場合
        thumbnails = video_info['thumbnails']
        # "resolution": "640x480"のサムネイルを優先的に取得
        for thumbnail in thumbnails:
            if 'resolution' in thumbnail.keys():
                if thumbnail['resolution'] == '640x480':
                    return thumbnail.get('url')
    # サムネイルが存在しない場合や640x480のサムネイルが見つからない場合は、最大解像度のサムネイルを取得
    return thumbnails[-1].get('url', f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg")

def create_video_data_from_detailed_info(video_info, video_id):
    """
    詳細な動画情報から動画データを作成
    
    Args:
        video_info (dict): 詳細な動画情報
        video_id (str): 動画ID
    
    Returns:
        dict: 整形された動画データ
    """
    # タイトルからタグ情報を抽出
    title = video_info.get('title', 'タイトル不明')
    # 「#」で始まるタグを抽出
    tags = imprecise_tags(title)
    upload_date = video_info.get('release_timestamp', None)
    if upload_date is None or upload_date == '':
        print(f"  → △ release_timestamp情報が空なのでtimestamp情報から取得(誤差許容)", flush=True)
        upload_date = video_info.get('timestamp', None)
    if upload_date is None or upload_date == '':
        print(f"  → △ timestamp情報も空", flush=True)
        # print(json.dumps(video_info, ensure_ascii=False, indent=2), flush=True)
        upload_date = get_live_date_info(f"https://www.youtube.com/watch?v={video_id}")
    return {
        "title": title,
        "image": get_thumbnail_url(video_info, video_id),
        "alt": title,
        "description": video_info.get('description', '')[:100] + "..." if video_info.get('description') else "説明なし",
        "videoId": video_id,
        "video_url": f"https://www.youtube.com/watch?v={video_id}",
        "tags": tags,
        "upload_date": to_update_timestamp(upload_date),
    }

def create_video_data_from_basic_info(entry: dict, membership_frag: bool = False):
    """
    基本的な動画情報から動画データを作成（詳細取得失敗時用）
    
    Args:
        entry (dict): 基本的な動画情報
        membership_frag (bool): メン限フラグ

    Returns:
        dict: 整形された動画データ
    """

    video_id = entry['id']
    
    # availability情報の取得を試行
    availability = entry.get('availability', 'unknown')

    title = entry.get('title', 'タイトル不明')

    # 「#」で始まるタグを抽出
    tags = imprecise_tags(title)

    if availability == 'subscriber_only':
        tags.append('#メン限')

    video_url = entry.get('url', f"https://www.youtube.com/watch?v={video_id}")
    if membership_frag:
        # メンバー限定動画の場合、配信開始日時を取得
        print(f"  → ✓ メンバー限定動画", flush=True)
        upload_date = get_live_date_info(video_url)
    else:
        # 通常動画の場合はリリースタイムスタンプを使用
        upload_date = entry.get('release_timestamp', None)
        if not upload_date or upload_date == "":
            print(f"  → △ release_timestamp情報が空", flush=True)
            try:
                upload_date = get_live_date_info(video_url)
            except Exception as e:
                error_message = str(e)
                if error_message == "failed get_live_date_info":
                    print('entry')
                    print(json.dumps(entry, ensure_ascii=False, indent=2), flush=True)
                    sys.exit(1)  # エラーが発生した場合はスクリプトを終了
    return {
        "title": title,
        "image": get_thumbnail_url(entry, video_id),
        "alt": entry.get('title', 'タイトル不明'),
        "description": entry.get('description')[:100] + "..." if entry.get('description') else "説明なし",
        "videoId": video_id,
        "video_url": video_url,
        "tags": tags,
        "upload_date": to_update_timestamp(upload_date),
    }

def process_video_entry(entry, ydl_opts):
    """
    個別の動画エントリを処理
    
    Args:
        entry (dict): 動画エントリ情報
        ydl_opts (dict): yt-dlpの設定
    
    Returns:
        dict: 処理された動画データ
    """
    video_id = entry['id']
    video_info = None  # 詳細情報取得用の変数
    
    try:
        # 個別の動画情報を取得（エラーハンドリング強化）
        print(f"動画ID {video_id} の情報取得", flush=True)

        if entry.get('availability') == 'subscriber_only':
            print(f" → ✓ メンバー限定動画: {entry.get('title', 'タイトル不明')} (ID: {video_id})", flush=True)
            return create_video_data_from_basic_info(entry, membership_frag = True)
        

        elif entry.get('release_timestamp', None) and time.time() < entry.get('release_timestamp'):
            print(f" → ✓ 未放送枠: {entry.get('title', 'タイトル不明')} (ID: {video_id})", flush=True)
            return create_video_data_from_basic_info(entry)
        
        else:
            video_info = get_detailed_video_info(video_id, ydl_opts)
            print(f" → ✓ アーカイブ: {entry.get('title', 'タイトル不明')} (ID: {video_id})", flush=True)
            return create_video_data_from_detailed_info(video_info, video_id)
        
    except Exception as e: 
        # 個別動画の取得に失敗した場合は放送予定枠かメン限枠なので動画情報を整形する
        error_message = str(e)

        # # 年齢認証の場合の特別処理
        # if 'Sign in to confirm your age.' in error_message:
        #     print(f"  → ✗ 年齢認証が必要: {entry.get('title', 'タイトル不明')} (ID: {video_id})")
        #     upload_date = ""
        #     # 特定の動画のアップロード日時
        #     if video_id == 'JTUUYfSXWDg':
        #         upload_date = "2020-08-15T05:00:10-07:00"
        #     return {
        #         "title": entry.get('title', 'タイトル不明'),
        #         "image": get_thumbnail_url(entry, video_id),
        #         "alt": entry.get('title', 'タイトル不明'),
        #         "description": entry.get('description')[:100] + "..." if entry.get('description') else "説明なし",
        #         "videoId": video_id,
        #         "video_url": entry.get('url', f"https://www.youtube.com/watch?v={video_id}"),
        #         "tags": [],
        #         "upload_date": upload_date,
        #     }

        print(f"  → △ 情報取得失敗: {entry.get('title', 'タイトル不明')} (ID: {video_id}) - {error_message}", flush=True)
        try:
            result = create_video_data_from_basic_info(entry, membership_frag = True)
            print(f"   → ✓ 基本情報での動画データを作成", flush=True)
            return result
        except Exception as e:
            print(f"   → ✗ 基本情報での動画データ作成失敗: {str(e)}", flush=True)
            if video_info:
                print("video_info:")
                print(json.dumps(video_info, ensure_ascii=False, indent=2), flush=True)
            else:
                print("entry:")
                print(json.dumps(entry, ensure_ascii=False, indent=2), flush=True)
            sys.exit(1)  # エラーが発生した場合はスクリプトを終了

def get_video_info(channel_url: str, video_type: str, get_length: int):
    """
    YouTubeチャンネルから動画情報を取得
    
    Args:
        channel_url (str): YouTubeチャンネルのURL
        video_type (str): 取得する動画の種類（例: 'streams', 'videos', 'shorts'）
        get_length (int): 取得する動画の最大数
    
    Returns:
        list: 動画情報のリスト
    """
    
    ydl_opts = get_ydl_options()
    
    videos = []
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print(f"'{channel_url}/{video_type}' から動画情報を取得中...", flush=True)

            # チャンネルの動画一覧を取得
            info = ydl.extract_info(f'{channel_url}/{video_type}', download=False)

            if 'entries' in info:
                # 最大{get_length}件までの動画エントリを取得
                entries = info['entries']
                # デバッグ情報としてjson形式で保存
                if debug_flag:
                    print("デバッグモード: 動画エントリ情報を 'debug_entries.json' に保存します", flush=True)
                    with open('debug_entries.json', 'w', encoding='utf-8') as f:
                        json.dump(entries, f, ensure_ascii=False, indent=2)
                print(f"発見された動画数: {len(entries)}", flush=True)
                if get_length is None:
                    print("動画数の制限なしで取得します", flush=True)
                elif get_length <= 0:
                    print("動画数の制限数が無効です。全ての動画を取得します", flush=True)
                elif len(entries) > get_length:
                    print(f"最新の{get_length}件のみを更新します", flush=True)
                    entries = entries[:get_length]
                # 各動画エントリを処理
                print("更新動画数:", len(entries), flush=True)
                cnt = 0
                for entry in entries:
                    if entry and 'id' in entry:
                        cnt = cnt + 1
                        print(f"No. {cnt}", end=' ::: ', flush=True)
                        video_data = process_video_entry(entry, ydl_opts)
                        videos.append(video_data)
            else:
                print("チャンネルに動画が見つかりませんでした。", flush=True)
                
    except Exception as e:
        print(f"エラーが発生しました: {str(e)}", flush=True)
        return []
    
    return videos

def load_json(input_file):
    """
    JSONファイルから動画情報を読み込み
    
    Args:
        input_file (str): 入力ファイルパス
    
    Returns:
        dict: 動画情報 {"items": list(dict), "tags": list(str), "last_updated": str, "total_videos": int}
    """
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if 'items' in data and isinstance(data['items'], list):
                return data
            else:
                print(f"❌ 無効なJSON形式: {input_file} の内容が正しくありません", flush=True)
                return {}
    except json.JSONDecodeError as e:
        print(f"❌ JSONデコードエラー: {str(e)} - {input_file} の内容が正しくありません", flush=True)
        return {}
    except FileNotFoundError:
        print(f"❌ ファイルが見つかりません: {input_file}", flush=True)
        return {}
    except Exception as e:
        print(f"❌ 不明なエラー: {str(e)}", flush=True)
        return {}

def get_live_date_info(video_url: str) -> str:
    """
    メンバー限定配信の開始日時はyt-dlpでは取得できないため、
    youtube動画サイトにブラウジングして、配信開始日時を取得
    どちらかのセレクタから取得
    #watch7-content > span:nth-child(22) > meta:nth-child(2)
    #watch7-content > meta:nth-child(19)
    Args:
        video_url (str): YouTube動画のURL
    Returns:
        str: 配信開始日時
    """
    # youtube動画サイト(video_url)にブラウジングアクセス

    # 想定されるセレクタリストを定義
    selectors = [
        "#watch7-content > span:nth-child(22) > meta:nth-child(2)",
        "#watch7-content > span:nth-child(23) > meta:nth-child(2)",
        "#watch7-content > meta:nth-child(19)",
        "#watch7-content > meta:nth-child(20)",
        "#watch7-content > meta:nth-child(21)",
    ]

    print(f"   → ✓ ブラウジングで開始日時を取得中: {video_url}", flush=True)
    # SeleniumのWebDriverを使用してブラウジング
    options = Options()
    options.add_argument("--headless")  # ヘッドレスモードを使用
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    for attempt in range(3):
        try:
            driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
            driver.get(video_url)

            # セレクタを順に試して配信開始日時を取得
            for sel in selectors:
                try:
                    start_time_element = driver.find_element("css selector", sel)
                    start_time = start_time_element.get_attribute("content")

                    driver.quit()
                    if not start_time:
                        print(f"     ┣ セレクタ '{sel}' で配信開始日時が取得できませんでした。", flush=True)
                        continue
                    print(f"    → ✓ セレクタ '{sel}' で配信開始日時を取得しました。", flush=True)
                    return start_time

                except Exception as e:
                    print(f"     ┣ セレクタ '{sel}' での取得に失敗しました。", flush=True)
            driver.quit()
            print(f"     ┗ ✗ すべてのセレクタで配信開始日時の取得に失敗しました。", flush=True)
        except Exception as e:
            print(f"   → △ ブラウジング試行 {attempt+1}/3 でエラー: {e}", flush=True)
        if attempt < 2:
            print(f"   → リトライします... ({attempt+2}/3)", flush=True)
            time.sleep(2)
    print("❌ 3回試行しても配信開始日時の取得に失敗しました。", flush=True)
    raise Exception("failed get_live_date_info")

def save_to_json(videos, output_file):
    """
    動画情報をJSONファイルに追加保存

    Args:
        videos (list): 動画情報のリスト
        output_file (str): 出力ファイルパス
    """

    origin_data = load_json(output_file)

    if not origin_data:
        origin_data = {"items": []}
    origin_videos = origin_data.get("items", [])
    # 新しい動画情報を追加
    for video in videos:
        # 既存の動画IDと重複していたら更新
        if any(v['videoId'] == video['videoId'] for v in origin_videos):
            for v in origin_videos:
                if v['videoId'] == video['videoId']:
                    v.update(video)
        # 既存の動画IDと重複していない場合は新規追加
        else:
            origin_videos.append(video)
    # upload_dateでソート
    videos = sorted(origin_videos, key=lambda x: x.get('upload_date', ''), reverse=True)

    # 出力ディレクトリを作成（存在しない場合）
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 存在するタグを抽出
    # 頻度の高さでソート
    tags = {}
    for video in videos:
        for tag in video.get('tags', []):
            if tag not in tags:
                tags[tag] = 0
            tags[tag] += 1
    tags = sorted(tags.items(), key=lambda x: x[1], reverse=True)

    # JSON形式でデータを構築
    json_data = {
        "items": videos,
        "tags": [tag[0] for tag in tags],  # タグのリスト
        "last_updated": datetime.now().isoformat(),
        "total_videos": len(videos)
    }
    
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, ensure_ascii=False, indent=2)
        
        print(f"\n✅ 動画情報を {output_file} に保存しました", flush=True)
        print(f"📊 総動画数: {len(videos)}", flush=True)
        
    except Exception as e:
        print(f"❌ ファイル保存エラー: {str(e)}", flush=True)

def check_dependencies():
    """
    必要な依存関係をチェック
    
    Returns:
        bool: 依存関係が満たされている場合True
    """
    try:
        import yt_dlp
        print(f"✅ yt-dlp バージョン: {yt_dlp.version.__version__}", flush=True)
        return True
    except ImportError:
        print("❌ yt-dlpがインストールされていません。", flush=True)
        print("以下のコマンドでインストールしてください:", flush=True)
        print("pip install yt-dlp", flush=True)
        return False

def display_execution_environment():
    """
    実行環境の情報を表示
    """
    import os
    if os.getenv('GITHUB_ACTIONS') == 'true':
        print("🤖 GitHub Actions環境で実行中", flush=True)
        print(f"📁 キャッシュディレクトリ: {os.getenv('YT_DLP_CACHE_DIR', 'デフォルト')}", flush=True)

def display_video_samples(videos, sample_count=3):
    """
    取得した動画のサンプルを表示
    
    Args:
        videos (list): 動画情報のリスト
        sample_count (int): 表示するサンプル数
    """
    print("\n📝 取得した動画の例:")
    for i, video in enumerate(videos[:sample_count]):
        print(f"\n{i+1}. {video['title']}")
        print(f"   ID: {video['videoId']}")
        print(f"   説明: {video['description']}")
        if 'metadata' in video:
            print(f"   メタデータ: {', '.join(video['metadata'])}")
        print(f"   クラス: {video.get('addAdditionalClass', [])}", flush=True)

    if len(videos) > sample_count:
        print(f"\n... 他 {len(videos) - sample_count} 個の動画情報を更新しました", flush=True)

def main():
    """
    メイン実行関数
    """
    global debug_flag
    global debug_videos
    CHANNEL_URL = f"https://www.youtube.com/{sys.argv[1]}"
    OUTPUT_FILE = f"docs/src/archives_{sys.argv[1]}.json"

    get_length = None  # デフォルトの取得動画数
    try:
        if len(sys.argv) >= 3:
            print(f"取得動画数: {sys.argv[2]}")
            get_length = int(sys.argv[2])
    except ValueError:
        print("❌ 引数の取得動画数が無効です。全ての動画を取得します")
    try:
        if len(sys.argv) >= 4:
            print(f"デバッグフラグ: {bool(int(sys.argv[3]))}")
            debug_flag = bool(int(sys.argv[3]))  # デバッグフラグを引数から取得
    except ValueError:
        print("❌ 引数のデバッグフラグが無効です。デフォルトはFalseです")

    # スクリプトの開始時間を記録
    start_time = datetime.now()

    print("🎬 YouTube動画情報取得スクリプト")
    
    # 実行環境の情報を表示
    display_execution_environment()
    
    # yt-dlpがインストールされているかチェック
    if not check_dependencies():
        print("❌ 必要な依存関係が満たされていません。スクリプトを終了します。")
        sys.exit(1)
    
    # 動画情報を取得
    print(f"🔍 チャンネル '{CHANNEL_URL}' から動画情報を取得します...")
    videos = []
    videos.extend(get_video_info(f'{CHANNEL_URL}', 'streams', get_length))
    videos.extend(get_video_info(f'{CHANNEL_URL}', 'videos', get_length))
    videos.extend(get_video_info(f'{CHANNEL_URL}', 'shorts', get_length))

    if videos:
        # JSONファイルに保存
        save_to_json(videos, OUTPUT_FILE)

        # 取得した動画の最初の3つを表示
        display_video_samples(videos)
            
    else:
        print("❌ 動画情報の取得に失敗しました。")
        sys.exit(1)

    # デバッグモードで動画情報を保存
    if debug_flag:
        debug_output_file = 'debug_videos.json'
        print(f"デバッグモード: 動画情報を '{debug_output_file}' に保存します")
        with open(debug_output_file, 'w', encoding='utf-8') as f:
            json.dump(debug_videos, f, ensure_ascii=False, indent=2)
        print(f"デバッグ動画情報を {len(debug_videos)} 件保存しました")

    # 実行時間を表示
    end_time = datetime.now()
    execution_time = end_time - start_time
    print(f"\n⏱ 実行時間: {execution_time}")    
    print("\n🎉 処理が完了しました！")

if __name__ == "__main__":
    print(len(sys.argv))
    main()
