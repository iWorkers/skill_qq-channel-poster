#!/usr/bin/env node
/**
 * GitHub Trending 采集 + 截图 + QQ频道自动发布
 * 完整自动化流程脚本
 */

const { chromium } = require('@playwright/test');
const https = require('https');
const zlib = require('zlib');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  collectN: 20,  // 采集20个项目
  selectN: 5,    // 最终选择5个项目发布
  outputDir: path.join(__dirname, '..', 'output'),
  screenshotsDir: path.join(__dirname, '..', 'output', 'screenshots'),
  dataFile: path.join(__dirname, '..', 'output', 'trending-data.json'),
  allDataFile: path.join(__dirname, '..', 'output', 'all-trending-data.json'),  // 保存所有20个项目数据
  postsFile: path.join(__dirname, '..', 'output', 'posts.json'),
  cookiesFile: path.join(__dirname, '..', 'cookies.json'),
  configFile: path.join(__dirname, '..', 'config.json'),
  trendingUrl: 'https://github.com/trending?since=daily&spoken_language_code=zh',

  // 代理配置
  proxy: 'http://127.0.0.1:7897',

  // HTTP 请求配置
  httpOptions: {
    hostname: 'github.com',
    port: 443,
    path: '/trending?since=daily&spoken_language_code=zh',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    },
    // 代理配置
    agent: new (require('https').Agent)({
      keepAlive: true,
      keepAliveMsecs: 30000
    })
  },

  // 浏览器配置
  browserOptions: {
    headless: false,  // 用于QQ登录需要显示界面
    timeout: 30000,
    // 使用本地Chrome
    executablePath: 'C:/Users/Administrator/CodeBuddy/20260311125320/.codebuddy/skills/qq-channel-poster/chrome-win64/chrome.exe',
    args: [
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--proxy-server=http://127.0.0.1:7897'
    ]
  },

  delays: {
    minDelay: 1000,
    maxDelay: 3000
  }
};

// 确保输出目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 随机延迟
function randomDelay(min = CONFIG.delays.minDelay, max = CONFIG.delays.maxDelay) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// 加载配置
function loadConfig() {
  if (fs.existsSync(CONFIG.configFile)) {
    return JSON.parse(fs.readFileSync(CONFIG.configFile, 'utf-8'));
  }
  return {};
}

// 加载Cookie
function loadCookies() {
  if (fs.existsSync(CONFIG.cookiesFile)) {
    return JSON.parse(fs.readFileSync(CONFIG.cookiesFile, 'utf-8'));
  }
  return null;
}

// HTTP 请求获取 GitHub Trending 页面
function fetchTrendingPage() {
  return new Promise((resolve, reject) => {
    console.log('🌐 发送 HTTP 请求获取 GitHub Trending 页面...');

    const req = https.request(CONFIG.httpOptions, (res) => {
      console.log(`状态码: ${res.statusCode}`);

      let data = [];
      let totalLength = 0;

      const encoding = res.headers['content-encoding'];
      const isGzipped = encoding === 'gzip' || encoding === 'deflate';

      res.on('data', (chunk) => {
        data.push(chunk);
        totalLength += chunk.length;
      });

      res.on('end', () => {
        const buffer = Buffer.concat(data, totalLength);

        if (isGzipped) {
          console.log('检测到 gzip 压缩，解压中...');
          zlib.gunzip(buffer, (err, decompressed) => {
            if (err) {
              console.error('❌ gzip 解压失败:', err.message);
              resolve(buffer.toString('utf-8'));
            } else {
              console.log(`✅ 解压成功，大小: ${decompressed.length} 字节`);
              resolve(decompressed.toString('utf-8'));
            }
          });
        } else {
          console.log(`✅ 获取成功，大小: ${buffer.length} 字节`);
          resolve(buffer.toString('utf-8'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ HTTP 请求失败:', error.message);
      reject(error);
    });

    req.setTimeout(30000, () => {
      console.error('❌ HTTP 请求超时');
      req.destroy();
      reject(new Error('HTTP 请求超时'));
    });

    req.end();
  });
}

// 使用 cheerio 解析 Trending 页面数据
function parseTrendingPageWithCheerio(html) {
  console.log('🔍 使用 cheerio 解析页面数据...');

  const $ = cheerio.load(html);
  const repos = [];

  const repoCards = $('article.Box-row');
  console.log(`找到 ${repoCards.length} 个仓库卡片`);
  console.log(`将采集前 ${CONFIG.collectN} 个项目供Agent分析选择`);

  repoCards.each((index, element) => {
    if (index >= CONFIG.collectN) return;

    const $el = $(element);

    const fullName = $el.find('h2 a').attr('href')?.replace(/^\//, '') || '';
    const displayName = $el.find('h2 a').text().trim();

    if (!fullName) {
      console.log(`⚠️  卡片 ${index + 1} 未找到仓库名称，跳过`);
      return;
    }

    const description = $el.find('p').text().trim();
    const language = $el.find('[itemprop="programmingLanguage"]').text().trim();

    const starsElem = $el.find('a[href*="stargazers"]');
    let stars = '';
    if (starsElem.length) {
      stars = starsElem.text().replace(/\s+/g, ' ').trim();
      const starMatch = stars.match(/([\d,]+)/);
      if (starMatch) stars = starMatch[1];
    }

    const todayStarsElem = $el.find('.float-sm-right');
    let todayStars = '';
    if (todayStarsElem.length) {
      todayStars = todayStarsElem.text().replace(/\s+/g, ' ').trim();
      const todayMatch = todayStars.match(/([\d,]+)/);
      if (todayMatch) todayStars = todayMatch[1];
    }

    repos.push({
      rank: index + 1,
      fullName,
      name: displayName,
      owner: fullName.split('/')[0] || '',
      description,
      language,
      stars: stars || '未知',
      todayStars: todayStars || '未知',
      url: `https://github.com/${fullName}`
    });

    console.log(`   ${index + 1}. ${fullName} - ${description.substring(0, 50)}...`);
  });

  return repos;
}

// 生成帖子文案
function generatePostContent(repo) {
  return `🔥 今日 GitHub 热门项目第 ${repo.rank} 名：${repo.fullName}

📈 今日 Star 增长：${repo.todayStars || '快速增长中'}

项目地址：https://github.com/${repo.fullName}
项目描述：${repo.description || '一个很有潜力的开源项目，解决了实际问题。'}

技术栈：${repo.language || '多种语言'}
当前 Star 数：${repo.stars}

**注意：请将项目描述翻译/总结成中文后再发布**

#GitHub #开源 #编程 #技术趋势 #${repo.language || '开发'}`;
}

// 截图函数
async function takeScreenshots(browser, repos) {
  console.log('\n📸 启动浏览器进行截图...');

  let page = null;

  try {
    page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    // 反检测
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const posts = [];

    // 提示：这里只对前5个项目截图，实际Agent可以选择任意5个最有价值的项目
    console.log(`📸 提示：将对前5个项目进行截图，但Agent可以根据分析结果选择最有价值的5个项目发布`);
    
    for (let i = 0; i < Math.min(repos.length, CONFIG.selectN); i++) {
      const repo = repos[i];
      console.log(`\n  处理项目 ${i + 1}: ${repo.fullName}`);

      try {
        console.log(`  打开项目页面: ${repo.url}`);
        await page.goto(repo.url, {
          waitUntil: 'domcontentloaded',
          timeout: 20000
        });

        await randomDelay(500, 1500);

        const screenshotFile = `repo-${i + 1}-${repo.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
        const screenshotPath = path.join(CONFIG.screenshotsDir, screenshotFile);

        await page.screenshot({
          path: screenshotPath,
          fullPage: false,
          type: 'png'
        });

        console.log(`  ✅ 截图保存: ${screenshotFile}`);

        const content = generatePostContent(repo);

        posts.push({
          index: i + 1,
          repo: repo.fullName,
          screenshot: screenshotFile,
          screenshotPath: screenshotPath,
          content: content,
          url: repo.url,
          data: repo
        });

      } catch (error) {
        console.error(`  ❌ 处理项目 ${repo.fullName} 失败:`, error.message);
      }
    }

    return posts;

  } finally {
    if (page) await page.close().catch(() => {});
  }
}

// 发布到QQ频道
async function postToQQChannel(browser, posts) {
  console.log('\n🚀 开始发布到QQ频道...');

  const cookies = loadCookies();
  if (!cookies) {
    console.error('❌ 请先运行 Python 登录脚本 (scripts/login.py)');
    return false;
  }

  const config = loadConfig();
  const channelId = config.channel_id;

  if (!channelId) {
    console.error('❌ 请在 config.json 中配置 channel_id');
    return false;
  }

  let page = null;

  try {
    // 创建新的浏览器上下文并加载Cookie
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    // 添加保存的Cookie
    await context.addCookies(cookies);

    page = await context.newPage();

    // 访问QQ频道页面
    const qqUrl = channelId ? `https://pd.qq.com/c/${channelId}` : 'https://pd.qq.com/';
    console.log(`正在访问: ${qqUrl}`);
    await page.goto(qqUrl);

    await randomDelay(3000);

    // 检查是否需要重新登录
    if (page.url().includes('login')) {
      console.error('❌ Cookie已过期，请重新运行 login.py 登录');
      return false;
    }

    // 发布每个帖子
    for (const post of posts) {
      console.log(`\n📤 发布第 ${post.index} 个帖子: ${post.repo}`);

      try {
        // 定位输入框
        const inputSelector = '[contenteditable="true"], .ql-editor, textarea';
        await page.waitForSelector(inputSelector, { timeout: 10000 });
        const inputBox = await page.$(inputSelector);

        if (!inputBox) {
          console.error('❌ 未找到输入框');
          continue;
        }

        // 点击输入框并输入内容
        await inputBox.click();
        await randomDelay(300);
        await inputBox.fill(post.content);

        console.log('✅ 已输入文本内容');

        // 如果有截图，上传图片
        if (post.screenshotPath && fs.existsSync(post.screenshotPath)) {
          // 查找文件上传输入框
          const fileInputs = await page.$$('input[type="file"]');
          if (fileInputs.length > 0) {
            await fileInputs[0].setInputFiles(post.screenshotPath);
            console.log('✅ 已上传截图');
            await randomDelay(1000);
          }
        }

        // 查找并点击发布按钮
        const postButtonSelector = 'button:has-text("发布"), button:has-text("发送")';
        const postButton = await page.$(postButtonSelector);

        if (postButton) {
          await postButton.click();
          console.log('✅ 已点击发布按钮');
          await randomDelay(2000);
        } else {
          console.log('⚠️ 未找到发布按钮，请手动点击');
        }

        console.log(`✅ 第 ${post.index} 个帖子发布完成`);

      } catch (error) {
        console.error(`❌ 发布第 ${post.index} 个帖子失败:`, error.message);
      }
    }

    console.log('\n🎉 全部帖子发布完成！');
    return true;

  } catch (error) {
    console.error('❌ 发布到QQ频道失败:', error.message);
    return false;
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

// 主流程 - 仅采集数据，不截图不发布
async function main() {
  console.log('🚀 GitHub Trending 数据采集');
  console.log('=' .repeat(50));

  // 确保输出目录存在
  ensureDir(CONFIG.outputDir);

  try {
    // 1. HTTP 请求获取页面
    const html = await fetchTrendingPage();

    // 2. 使用 cheerio 解析数据
    let repos = parseTrendingPageWithCheerio(html);

    if (repos.length === 0) {
      console.log('⚠️  未找到任何仓库数据');
      return false;
    }

    console.log(`\n✅ 成功解析 ${repos.length} 个项目`);
    
    // 3. 保存精简的数据文件（只包含基本信息，供Agent分析）
    const basicData = repos.map(repo => ({
      rank: repo.rank,
      fullName: repo.fullName,
      description: repo.description,
      language: repo.language,
      stars: repo.stars,
      todayStars: repo.todayStars,
      url: repo.url
    }));
    fs.writeFileSync(CONFIG.dataFile, JSON.stringify(basicData, null, 2));

    // 4. 保存所有采集的数据
    fs.writeFileSync(CONFIG.allDataFile, JSON.stringify(repos, null, 2));
    console.log(`✅ 已保存所有 ${repos.length} 个项目数据到: ${CONFIG.allDataFile}`);
    
    console.log('\n📊 数据保存完成');
    console.log(`   所有项目数据: ${CONFIG.allDataFile}`);
    console.log(`   精简数据: ${CONFIG.dataFile}`);
    console.log('\n📝 **下一步**: 运行 analyze-projects.js 分析并选择最有价值的5个项目');
    console.log('   命令: node scripts/analyze-projects.js');

    console.log('\n🎉 数据采集完成！');
    console.log('=' .repeat(50));

    return true;

  } catch (error) {
    console.error('\n❌ 主流程失败:', error);
    console.error('堆栈:', error.stack);
    return false;
  }
}

// 执行
if (require.main === module) {
  main().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = { main, CONFIG };
