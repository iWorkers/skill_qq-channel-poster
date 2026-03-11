#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
QQ频道帖子发布脚本 - 支持图片上传
"""

import argparse
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


def load_cookies():
    """从文件加载Cookie"""
    if COOKIES_FILE.exists():
        with open(COOKIES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None


def parse_arguments():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(description='QQ频道帖子发布工具')
    parser.add_argument('--content', '-c', type=str, required=True, 
                       help='帖子文本内容')
    parser.add_argument('--images', '-i', type=str, default='',
                       help='图片路径，多个用逗号分隔')
    parser.add_argument('--channel', type=str, default='',
                       help='指定频道ID（可选）')
    return parser.parse_args()


def upload_images(page, image_paths):
    """上传图片到帖子"""
    if not image_paths:
        return
    
    # 点击图片上传按钮 - 需要根据实际页面结构调整选择器
    # 常见的QQ相关上传按钮选择器
    upload_selectors = [
        '[class*="upload"]',
        '[class*="image"]',
        '[class*="picture"]',
        'button[aria-label*="图片"]',
        '.upload-btn',
        '#upload-image'
    ]
    
    upload_button = None
    for selector in upload_selectors:
        try:
            upload_button = page.wait_for_selector(selector, timeout=3000)
            if upload_button:
                break
        except:
            continue
    
    if not upload_button:
        print("警告: 未找到图片上传按钮，请手动操作")
        return
    
    # 点击上传按钮触发文件选择
    upload_button.click()
    time.sleep(0.5)
    
    # 处理文件选择对话框
    # Playwright的set_input_files可以绕过文件对话框
    for img_path in image_paths:
        img_path = img_path.strip()
        if img_path and os.path.exists(img_path):
            # 尝试找到文件输入框
            file_inputs = page.query_selector_all('input[type="file"]')
            for file_input in file_inputs:
                try:
                    file_input.set_input_files(img_path)
                    print(f"✓ 已选择图片: {img_path}")
                    time.sleep(1)
                except:
                    continue
        else:
            print(f"✗ 图片文件不存在: {img_path}")


def post_to_channel(page, content, image_paths):
    """发布帖子到QQ频道"""
    print("=" * 50)
    print("开始发布帖子")
    print("=" * 50)
    
    # 定位到帖子输入框
    # 常见的输入框选择器
    input_selectors = [
        '[contenteditable="true"]',
        '.ql-editor',
        'textarea[class*="message"]',
        '[class*="input"][class*="content"]',
        '#post-content'
    ]
    
    content_input = None
    for selector in input_selectors:
        try:
            content_input = page.wait_for_selector(selector, timeout=3000)
            if content_input:
                break
        except:
            continue
    
    if not content_input:
        print("错误: 未找到帖子输入框")
        print("当前页面内容预览:")
        print(page.content()[:2000])
        return False
    
    # 输入文本内容
    content_input.click()
    time.sleep(0.3)
    content_input.fill(content)
    print(f"✓ 已输入文本内容: {content[:50]}...")
    
    # 上传图片
    if image_paths:
        upload_images(page, image_paths)
        time.sleep(2)
    
    # 查找并点击发布按钮
    post_selectors = [
        'button:has-text("发布")',
        'button:has-text("发送")',
        '[class*="submit"]',
        '[class*="post"]',
        'button[type="submit"]'
    ]
    
    post_button = None
    for selector in post_selectors:
        try:
            post_button = page.wait_for_selector(selector, timeout=3000)
            if post_button:
                break
        except:
            continue
    
    if post_button:
        post_button.click()
        print("✓ 已点击发布按钮")
        time.sleep(2)
        
        # 检查发布结果
        # 可以检查是否有成功提示等
        print("✓ 帖子发布完成！")
        return True
    else:
        print("警告: 未找到发布按钮，请手动点击")
        return False


def main():
    """主函数"""
    args = parse_arguments()
    config = load_config()
    
    # 获取图片列表
    image_list = []
    if args.images:
        image_list = args.images.split(',')
    
    print("=" * 50)
    print("QQ频道帖子发布工具")
    print("=" * 50)
    print(f"内容: {args.content}")
    print(f"图片: {image_list}")
    print("=" * 50)
    
    # 加载Cookie
    cookies = load_cookies()
    if not cookies:
        print("错误: 请先运行 login.py 登录QQ")
        sys.exit(1)
    
    with sync_playwright() as p:
        # 启动浏览器
        browser = p.chromium.launch(
            headless=False,
            args=['--disable-blink-features=AutomationControlled']
        )
        
        # 创建浏览器上下文并加载Cookie
        context = browser.new_context(
            viewport={'width': 1280, 'height': 800},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        
        # 添加保存的Cookie
        context.add_cookies(cookies)
        
        page = context.new_page()
        
        # 访问QQ频道页面
        channel_url = args.channel or config.get('channel_id', '')
        if channel_url:
            qq_url = f"https://pd.qq.com/c/{channel_url}"
        else:
            qq_url = "https://pd.qq.com/"
        
        print(f"正在访问: {qq_url}")
        page.goto(qq_url)
        
        # 等待页面加载
        time.sleep(3)
        
        # 检查是否需要重新登录
        if page.url.find('login') > 0:
            print("错误: Cookie已过期，请重新运行 login.py 登录")
            browser.close()
            sys.exit(1)
        
        # 发布帖子
        success = post_to_channel(page, args.content, image_list)
        
        if success:
            print("\n" + "=" * 50)
            print("✓ 帖子发布成功！")
            print("=" * 50)
        else:
            print("\n" + "=" * 50)
            print("✗ 帖子发布可能失败，请检查页面")
            print("=" * 50)
        
        print("\n按回车键关闭浏览器...")
        input()
        
        browser.close()


if __name__ == "__main__":
    main()
