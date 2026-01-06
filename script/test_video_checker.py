#!/usr/bin/env python3
"""
動画URLリンク切れチェックのテストスクリプト
既知の問題があるURLでテストして機能を検証
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from check_video_links_fast import FastVideoLinkChecker

def test_video_links():
    """
    様々なパターンのYouTube URLをテスト
    """
    print("動画URLリンク切れチェック機能テスト")
    print("=" * 50)
    
    checker = FastVideoLinkChecker()
    
    # テスト用URL（実際に問題のあるものと正常なもの）
    test_urls = [
        # 正常な動画（存在する可能性が高い）
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "正常動画（Rick Roll）"),
        
        # 削除された動画（存在しないID）
        ("https://www.youtube.com/watch?v=XXXXXXXXXX", "存在しない動画ID"),
        
        # 非常に古いID（削除されている可能性）
        ("https://www.youtube.com/watch?v=AAAAAAAAAAAA", "削除済み可能性"),
        
        # 不正なフォーマット
        ("https://www.youtube.com/watch?v=invalid", "無効なフォーマット"),
    ]
    
    for i, (url, description) in enumerate(test_urls, 1):
        print(f"\n🔍 テスト {i}: {description}")
        print(f"URL: {url}")
        print("-" * 60)
        
        is_valid, status_code, error_msg = checker._check_youtube_video(url)
        
        if is_valid:
            print(f"✅ 結果: 正常 (ステータス: {status_code})")
        else:
            print(f"❌ 結果: 問題あり (ステータス: {status_code})")
            print(f"   エラー詳細: {error_msg}")
    
    print("\n" + "=" * 50)
    print("テスト完了")

def main():
    try:
        test_video_links()
    except KeyboardInterrupt:
        print("\n\nテストが中断されました。")
    except Exception as e:
        print(f"\nテスト中にエラーが発生しました: {e}")

if __name__ == "__main__":
    main()