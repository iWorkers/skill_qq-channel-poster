#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
QQ频道登录脚本 - 支持Cookie持久化
"""

import json
import os
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

# 配置路径
SCRIPT_DIR = Path(__file__).parent
CONFIG_FILE = SCRIPT_DIR.parent / "config.json"
COOKIES_FILE = SCRIPT_DIR.parent / "cookies.json"


def load_config():
    """加载配置文件"""
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def save_cookies(context):
    """保存浏览器Cookie到文件"""
    cookies = context.cookies()
    with open(COOKIES_FILE, 'w', encoding='utf-8') as f:
        json.dump(cookies, f, ensure_ascii=False, indent=2)
    print(f"[OK] Cookie已保存到: {COOKIES_FILE}")


def main():
    """主函数"""
    config = load_config()
    
    print("=" * 50)
    print("QQ频道自动化登录工具")
    print("=" * 50)
    
    with sync_playwright() as p:
        # 启动浏览器 - 使用本地Chrome
        browser = p.chromium.launch(
            headless=False,  # 需要显示二维码
            executable_path='C:/Users/Administrator/CodeBuddy/20260311125320/.codebuddy/skills/qq-channel-poster/chrome-win64/chrome.exe',
            args=[
                '--disable-blink-features=AutomationControlled',
                '--proxy-server=http://127.0.0.1:7897',
                '--start-maximized'
            ]
        )
        
        # 创建新的浏览器上下文
        context = browser.new_context(
            viewport={'width': 1280, 'height': 800},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ignore_https_errors=True
        )
        
        page = context.new_page()
        
        # 访问QQ频道网页版
        qq_channel_url = "https://pd.qq.com/"
        print(f"正在访问: {qq_channel_url}")
        
        try:
            page.goto(qq_channel_url, timeout=120000, wait_until='domcontentloaded')
        except Exception as e:
            print(f"页面加载提示: {e}")
        
        # 等待30秒让用户扫码登录
        print("\n" + "=" * 50)
        print("请在新打开的浏览器窗口中扫码登录QQ频道")
        print("等待30秒...")
        print("=" * 50)
        
        for i in range(30, 0, -1):
            print(f"\r倒计时: {i}秒  ", end='', flush=True)
            time.sleep(1)
        
        print("\n\n正在保存Cookie...")
        
        # 保存Cookie
        save_cookies(context)
        
        print("\n登录完成！Cookie已保存。")
        print("浏览器将在3秒后关闭...")
        time.sleep(3)
        
        browser.close()


if __name__ == "__main__":
    main()
