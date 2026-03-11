#!/usr/bin/env node
/**
 * QQ频道帖子发布脚本 - 浏览器自动化模拟发布
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  cookiesFile: path.join(__dirname, '..', 'cookies.json'),
  postsFile: path.join(__dirname, '..', 'output', 'posts.json'),
  configFile: path.join(__dirname, '..', 'config.json'),
  publishedFile: path.join(__dirname, '..', 'output', 'published-projects.json'),
  
  // 默认发布间隔（秒）
  defaultPostDelay: 10,
  
  browserOptions: {
    headless: false,  // 需要显示界面
    timeout: 60000,
    executablePath: 'C:/Users/Administrator/CodeBuddy/20260311125320/.codebuddy/skills/qq-channel-poster/chrome-win64/chrome.exe',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--proxy-server=http://127.0.0.1:7897',
      '--start-maximized'
    ]
  }
};

// 加载Cookie
function loadCookies() {
  if (fs.existsSync(CONFIG.cookiesFile)) {
    return JSON.parse(fs.readFileSync(CONFIG.cookiesFile, 'utf-8'));
  }
  return null;
}

// 加载配置
function loadConfig() {
  if (fs.existsSync(CONFIG.configFile)) {
    return JSON.parse(fs.readFileSync(CONFIG.configFile, 'utf-8'));
  }
  return {};
}

// 加载帖子数据
function loadPosts() {
  if (fs.existsSync(CONFIG.postsFile)) {
    return JSON.parse(fs.readFileSync(CONFIG.postsFile, 'utf-8'));
  }
  return [];
}

// 加载已发布项目记录
function loadPublishedProjects() {
  if (fs.existsSync(CONFIG.publishedFile)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG.publishedFile, 'utf-8'));
    } catch (error) {
      console.error('  错误: 无法读取已发布项目记录:', error.message);
      return [];
    }
  }
  return [];
}

// 保存已发布项目记录
function savePublishedProjects(projects) {
  try {
    ensureDir(path.dirname(CONFIG.publishedFile));
    fs.writeFileSync(CONFIG.publishedFile, JSON.stringify(projects, null, 2));
    console.log('  [OK] 已保存发布记录');
  } catch (error) {
    console.error('  错误: 无法保存已发布项目记录:', error.message);
  }
}

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 延时函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 主函数
async function main() {
  console.log('========================================');
  console.log('QQ频道帖子发布工具');
  console.log('========================================\n');

  // 检查Cookie
  const cookies = loadCookies();
  if (!cookies) {
    console.error('错误: 请先运行 login.py 登录QQ频道');
    process.exit(1);
  }
  console.log('[OK] Cookie已加载');

  // 加载配置
  const config = loadConfig();
  const postDelay = config.post_delay || CONFIG.defaultPostDelay;
  console.log(`[配置] 发布间隔: ${postDelay}秒\n`);

  // 加载帖子
  const posts = loadPosts();
  if (posts.length === 0) {
    console.error('错误: 没有找到帖子数据，请先运行 scraper.js 采集');
    process.exit(1);
  }
  console.log(`[OK] 找到 ${posts.length} 个帖子待发布\n`);

  // 加载已发布项目记录
  const publishedProjects = loadPublishedProjects();
  const publishedUrls = new Set(publishedProjects.map(p => p.url));
  console.log(`[记录] 已发布项目数: ${publishedProjects.length}\n`);

  // 启动浏览器
  console.log('正在启动浏览器...');
  const browser = await chromium.launch({
    headless: CONFIG.browserOptions.headless,
    timeout: CONFIG.browserOptions.timeout,
    executablePath: CONFIG.browserOptions.executablePath,
    args: CONFIG.browserOptions.args
  });

  // 创建上下文并加载Cookie
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true
  });

  await context.addCookies(cookies);
  console.log('[OK] Cookie已注入\n');

  const page = await context.newPage();

  // 访问QQ频道主页
  console.log('正在访问QQ频道...');
  await page.goto('https://pd.qq.com/', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await delay(3000);

  // 截图当前页面帮助调试
  const debugScreenshot = path.join(__dirname, '..', 'output', 'debug-page.png');
  await page.screenshot({ path: debugScreenshot, fullPage: false });
  console.log(`[调试] 页面截图已保存: ${debugScreenshot}`);

  console.log('\n正在自动查找并点击频道...');
  
  try {
    // 查找github热门项目交流频道元素
    const channelSelector = 'div.item-name.ellipsis:has-text("github热门项目交流")';
    await page.waitForSelector(channelSelector, { timeout: 5000 });
    
    const channelElement = await page.$(channelSelector);
    if (channelElement) {
      console.log('[OK] 找到频道元素，准备点击...');
      await channelElement.click();
      console.log('[OK] 已点击频道元素');
      await delay(2000);
      
      // 截图确认点击后的页面状态
      const afterClickScreenshot = path.join(__dirname, '..', 'output', 'debug-after-click.png');
      await page.screenshot({ path: afterClickScreenshot, fullPage: false });
      console.log(`[调试] 点击后页面截图: ${afterClickScreenshot}`);
    } else {
      console.log('[警告] 找到选择器但未找到元素，继续手动操作流程');
    }
  } catch (error) {
    console.log(`[警告] 未找到频道元素: ${error.message}`);
    console.log('切换到手动操作流程...');
  }

  console.log('\n========================================');
  console.log('如果自动点击成功，请直接等待自动发帖；');
  console.log('如果自动点击失败，请手动操作:');
  console.log('1. 在浏览器中点击左侧列表，进入你要发布帖子的频道');
  console.log('2. 进入频道后，点击"发帖"或"发布"按钮');
  console.log('3. 等待30秒后将自动填充内容并发布');
  console.log('========================================\n');

  // 倒计时
  for (let i = 30; i > 0; i--) {
    process.stdout.write(`\r倒计时: ${i}秒  `);
    await delay(1000);
  }
  console.log('\n');

  // 开始发布帖子
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    
    // 检查是否已发布过
    if (publishedUrls.has(post.url)) {
      console.log(`\n[${i + 1}/${posts.length}] 跳过已发布项目: ${post.repo}`);
      continue;
    }
    
    console.log(`\n[${i + 1}/${posts.length}] 发布: ${post.repo}`);

    try {
      // 截图当前状态
      const stepScreenshot = path.join(__dirname, '..', 'output', `step-${i + 1}.png`);
      await page.screenshot({ path: stepScreenshot, fullPage: false });
      console.log(`  [调试] 截图: ${stepScreenshot}`);

      // 查找输入框 - 只使用 contenteditable
      let inputBox = null;
      try {
        inputBox = await page.waitForSelector('[contenteditable="true"]', { timeout: 3000 });
        if (inputBox) {
          console.log('  找到输入框');
        }
      } catch (e) {
        // 未找到
      }

      if (!inputBox) {
        console.log('  警告: 未找到输入框');
        console.log('  请确保已进入频道并打开了发帖界面');
        continue;
      }

      // 点击输入框
      await inputBox.click();
      await delay(500);

      // 输入文本
      await inputBox.fill(post.content);
      console.log('  [OK] 已输入文本');
      await delay(500);

      // 上传图片
      if (post.screenshotPath && fs.existsSync(post.screenshotPath)) {
        const fileInputs = await page.$$('input[type="file"]');
        if (fileInputs.length > 0) {
          // 尝试点击图片按钮触发文件选择
          const imageButtons = await page.$$('button[class*="image"], button[class*="picture"], [class*="upload"]');
          if (imageButtons.length > 0) {
            await imageButtons[0].click();
            await delay(500);
          }

          // 上传文件
          const fileInputsAfterClick = await page.$$('input[type="file"]');
          if (fileInputsAfterClick.length > 0) {
            await fileInputsAfterClick[fileInputsAfterClick.length - 1].setInputFiles(post.screenshotPath);
            console.log('  [OK] 已上传截图');
            await delay(2000);
          }
        }
      }

      // 查找发布按钮
      const postButtonSelectors = [
        'button:has-text("发表")',
        'button:has-text("发布")',
        'button:has-text("发送")',
        'button.g-button--primary',
        'button.btn'
      ];

      let postButton = null;
      for (const selector of postButtonSelectors) {
        try {
          postButton = await page.waitForSelector(selector, { timeout: 2000 });
          if (postButton) {
            const text = await postButton.textContent();
            console.log(`  找到发布按钮: "${text}"`);
            break;
          }
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }

      if (postButton) {
        await postButton.click();
        console.log('  [OK] 已点击发表按钮');
        await delay(2000);
      } else {
        console.log('  警告: 未找到发表按钮，请手动点击');
      }

      console.log(`  [OK] 第 ${i + 1} 个帖子发布完成`);

      // 记录已发布项目
      const publishedProject = {
        repo: post.repo,
        url: post.url,
        publishedAt: new Date().toISOString(),
        index: i + 1
      };
      publishedProjects.push(publishedProject);
      publishedUrls.add(post.url);
      savePublishedProjects(publishedProjects);

      // 间隔（使用配置的延迟时间）
      if (i < posts.length - 1) {
        console.log(`  等待${postDelay}秒...`);
        await delay(postDelay * 1000);
      }

    } catch (error) {
      console.error(`  错误: ${error.message}`);
    }
  }

  console.log('\n========================================');
  console.log('发布完成！');
  console.log('浏览器将在10秒后关闭...');
  console.log('========================================');
  await delay(10000);

  await browser.close();
}

main().catch(console.error);
