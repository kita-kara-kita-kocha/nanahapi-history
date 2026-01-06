#!/usr/bin/env python3
"""
動画URLリンク切れチェックスクリプト
docs/src/archives_*.jsonのitems[].video_urlをチェックして
リンク切れの動画を検出します。
"""

import json
import glob
import requests
import time
from pathlib import Path
from typing import List, Dict, Tuple
import logging
from urllib.parse import urlparse, parse_qs
import sys

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class VideoLinkChecker:
    def __init__(self, archives_dir: str = "docs/src"):
        self.archives_dir = Path(archives_dir)
        self.broken_links = []
        self.checked_count = 0
        self.total_count = 0
        
    def load_archives(self) -> Dict[str, List[Dict]]:
        """
        すべてのarchives_*.jsonファイルを読み込む
        """
        archives = {}
        pattern = self.archives_dir / "archives_*.json"
        
        for file_path in glob.glob(str(pattern)):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    file_name = Path(file_path).name
                    archives[file_name] = data.get('items', [])
                    logger.info(f"読み込み完了: {file_name} ({len(data.get('items', []))} 件)")
            except Exception as e:
                logger.error(f"ファイル読み込みエラー {file_path}: {e}")
                
        return archives
    
    def check_video_url(self, url: str) -> Tuple[bool, int, str]:
        """
        動画URLの有効性をチェック
        YouTubeの削除・非公開動画も検知
        Returns: (is_valid, status_code, error_message)
        """
        try:
            if "youtube.com" in url or "youtu.be" in url:
                return self._check_youtube_video(url)
            else:
                # YouTube以外のURL
                response = requests.head(url, timeout=10, allow_redirects=True)
                if response.status_code < 400:
                    return True, response.status_code, ""
                else:
                    return False, response.status_code, f"HTTP {response.status_code}"
                    
        except requests.exceptions.Timeout:
            return False, 0, "タイムアウト"
        except requests.exceptions.ConnectionError:
            return False, 0, "接続エラー"
        except requests.exceptions.RequestException as e:
            return False, 0, f"リクエストエラー: {str(e)}"
        except Exception as e:
            return False, 0, f"予期しないエラー: {str(e)}"
    
    def _check_youtube_video(self, url: str) -> Tuple[bool, int, str]:
        """
        YouTube動画の詳細チェック
        削除・非公開・地域制限動画を検出
        """
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8'
            }
            
            # まずHEADリクエストで基本チェック
            head_response = requests.head(url, headers=headers, timeout=10, allow_redirects=True)
            
            # 明らかなエラーステータス
            if head_response.status_code == 404:
                return False, head_response.status_code, "動画が見つかりません（削除済み）"
            elif head_response.status_code >= 500:
                return False, head_response.status_code, f"サーバーエラー ({head_response.status_code})"
            
            # GETリクエストでページ内容をチェック
            response = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
            
            if response.status_code != 200:
                return False, response.status_code, f"HTTP {response.status_code}"
            
            # ページ内容から問題を検出
            content = response.text.lower()
            
            # YouTubeのplayabilityStatusを確認（最も確実な方法）
            import re
            playability_pattern = r'"playabilitystatus":\{.*?"status":"([^"]*?)"'
            playability_match = re.search(playability_pattern, content)
            if playability_match:
                status = playability_match.group(1).upper()
                if status in ['LOGIN_REQUIRED', 'UNPLAYABLE', 'ERROR']:
                    # メンバー限定動画かチェック
                    member_patterns = ['members-only', 'membership', 'メンバー限定', 'メンバーシップ']
                    is_member_only = any(pattern in content for pattern in member_patterns)
                    
                    if status == 'LOGIN_REQUIRED':
                        return False, response.status_code, f"非公開動画（ログイン必須）: status={status}"
                    elif status == 'UNPLAYABLE':
                        if is_member_only:
                            return True, response.status_code, ""  # メンバー限定動画は正常とみなす
                        else:
                            return False, response.status_code, f"再生不可能な動画: status={status}"
                    elif status == 'ERROR':
                        return False, response.status_code, f"動画エラー（削除済みの可能性）: status={status}"
            
            # 削除された動画のパターン
            deleted_patterns = [
                'video unavailable',
                'this video is no longer available',
                'this video has been removed',
                'video removed',
                'deleted video'
            ]
            
            # 非公開動画のパターン
            private_patterns = [
                'this video is private',
                'private video',
                'this video is unavailable'
            ]
            
            # 地域制限のパターン
            region_patterns = [
                'not available in your country',
                'video not available',
                'blocked in your country'
            ]
            
            # チェック実行
            for pattern in deleted_patterns:
                if pattern in content:
                    return False, response.status_code, f"動画が削除されています: {pattern}"
            
            for pattern in private_patterns:
                if pattern in content:
                    return False, response.status_code, f"非公開動画: {pattern}"
            
            for pattern in region_patterns:
                if pattern in content:
                    return False, response.status_code, f"地域制限: {pattern}"
            
            # 正常な動画ページの兆候をチェック
            if any(indicator in content for indicator in ['ytd-watch-flexy', 'watch-main-col', 'player-wrap']):
                return True, response.status_code, ""
            
            # 動画プレイヤーが見つからない場合は問題の可能性
            if 'player' not in content and 'video' not in content:
                return False, response.status_code, "動画プレイヤーが見つかりません（問題の可能性）"
            
            return True, response.status_code, ""
            
        except requests.exceptions.Timeout:
            return False, 0, "タイムアウト"
        except requests.exceptions.ConnectionError:
            return False, 0, "接続エラー"
        except Exception as e:
            return False, 0, f"チェックエラー: {str(e)}"
    
    def check_all_links(self, delay: float = 1.0):
        """
        すべての動画URLをチェック
        """
        logger.info("アーカイブファイルを読み込み中...")
        archives = self.load_archives()
        
        if not archives:
            logger.error("アーカイブファイルが見つかりません")
            return
        
        # 総件数を計算
        self.total_count = sum(len(items) for items in archives.values())
        logger.info(f"総チェック対象件数: {self.total_count}")
        
        print("\\n" + "="*80)
        print("動画URLリンク切れチェック開始")
        print("="*80)
        
        for archive_file, items in archives.items():
            print(f"\\n📁 {archive_file}")
            print("-" * 60)
            
            for idx, item in enumerate(items, 1):
                video_url = item.get('video_url', '')
                title = item.get('title', '無題')
                upload_date = item.get('upload_date', '不明')
                
                if not video_url:
                    print(f"  ❌ [{idx:3d}] URLなし: {title[:50]}...")
                    self.broken_links.append({
                        'file': archive_file,
                        'title': title,
                        'video_url': video_url,
                        'upload_date': upload_date,
                        'error': 'URLが空または存在しない'
                    })
                    continue
                
                self.checked_count += 1
                progress = (self.checked_count / self.total_count) * 100
                
                print(f"  🔍 [{idx:3d}] チェック中... ({progress:.1f}%)", end='', flush=True)
                
                is_valid, status_code, error_msg = self.check_video_url(video_url)
                
                if is_valid:
                    print(f"\\r  ✅ [{idx:3d}] OK ({status_code}) - {title[:40]}...")
                else:
                    print(f"\\r  ❌ [{idx:3d}] NG ({error_msg}) - {title[:40]}...")
                    self.broken_links.append({
                        'file': archive_file,
                        'title': title,
                        'video_url': video_url,
                        'upload_date': upload_date,
                        'error': error_msg
                    })
                
                # レート制限対応
                if delay > 0:
                    time.sleep(delay)
        
        self._print_summary()
        self._save_report()
    
    def _print_summary(self):
        """
        チェック結果のサマリーを出力
        """
        print("\\n" + "="*80)
        print("チェック結果サマリー")
        print("="*80)
        
        print(f"総チェック件数: {self.total_count}")
        print(f"正常URL: {self.total_count - len(self.broken_links)}")
        print(f"問題URL: {len(self.broken_links)}")
        
        if self.broken_links:
            print("\\n❌ 問題のあるURL一覧:")
            print("-" * 80)
            for i, link in enumerate(self.broken_links, 1):
                print(f"{i:3d}. [{link['file']}]")
                print(f"     タイトル: {link['title']}")
                print(f"     URL: {link['video_url']}")
                print(f"     アップロード日: {link['upload_date']}")
                print(f"     エラー: {link['error']}")
                print()
        else:
            print("\\n✅ すべてのURLが正常です！")
    
    def _save_report(self):
        """
        チェック結果をJSONファイルに保存
        """
        if self.broken_links:
            report = {
                'check_date': time.strftime('%Y-%m-%d %H:%M:%S'),
                'total_checked': self.total_count,
                'broken_count': len(self.broken_links),
                'broken_links': self.broken_links
            }
            
            report_path = 'broken_video_links_report.json'
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
            
            print(f"\\n📊 詳細レポートを保存しました: {report_path}")

def main():
    """
    メイン関数
    """
    print("動画URLリンク切れチェックツール")
    print("=" * 50)
    
    # オプション指定
    delay = 1.0  # リクエスト間隔（秒）
    
    if len(sys.argv) > 1:
        try:
            delay = float(sys.argv[1])
            print(f"リクエスト間隔: {delay}秒")
        except ValueError:
            print("警告: 無効な間隔が指定されました。デフォルト値(1.0秒)を使用します。")
    
    checker = VideoLinkChecker()
    
    try:
        checker.check_all_links(delay=delay)
    except KeyboardInterrupt:
        print("\\n\\n中断されました。")
        if checker.broken_links:
            print("これまでに見つかった問題URL:")
            checker._print_summary()
    except Exception as e:
        logger.error(f"予期しないエラー: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()