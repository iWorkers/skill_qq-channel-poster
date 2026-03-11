
#!/usr/bin/env node
/**
 * GitHub Trending 项目分析工具
 * 帮助Agent分析20个项目并选择最有价值的5个进行发布
 * 选择后对5个项目进行截图
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

// 配置
const CONFIG = {
  allDataFile: path.join(__dirname, '..', 'output', 'all-trending-data.json'),
  dataFile: path.join(__dirname, '..', 'output', 'trending-data.json'),
  postsFile: path.join(__dirname, '..', 'output', 'posts.json'),
  screenshotsDir: path.join(__dirname, '..', 'output', 'screenshots'),
  selectN: 5,
  
  // 浏览器配置
  browserOptions: {
    headless: false,
    timeout: 30000,
    executablePath: 'C:/Users/Administrator/CodeBuddy/20260311125320/.codebuddy/skills/qq-channel-poster/chrome-win64/chrome.exe',
    args: [
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--proxy-server=http://127.0.0.1:7897'
    ]
  }
};

// 加载所有项目数据
function loadAllProjects() {
  if (fs.existsSync(CONFIG.allDataFile)) {
    return JSON.parse(fs.readFileSync(CONFIG.allDataFile, 'utf-8'));
  }
  
  if (fs.existsSync(CONFIG.dataFile)) {
    return JSON.parse(fs.readFileSync(CONFIG.dataFile, 'utf-8'));
  }
  
  console.error('错误: 未找到项目数据文件，请先运行 scraper.js');
  process.exit(1);
}

// 显示项目列表
function displayProjects(projects) {
  console.log('📊 GitHub Trending 项目列表:');
  console.log('=' .repeat(80));
  
  projects.forEach((repo, index) => {
    console.log(`\n${index + 1}. ${repo.fullName}`);
    console.log(`   排名: #${repo.rank}`);
    console.log(`   描述: ${repo.description || '无描述'}`);
    console.log(`   语言: ${repo.language || '未知'}`);
    console.log(`   总Star: ${repo.stars} | 今日增长: ${repo.todayStars}`);
    console.log(`   链接: ${repo.url}`);
  });
  
  console.log('\n' + '=' .repeat(80));
}

// 分析项目价值
function analyzeProjectValue(repo) {
  let score = 0;
  const reasons = [];
  
  // 1. 排名权重（改为对数增长，最多15分）
  const rankScore = Math.min(Math.log10(Math.max(1, 21 - repo.rank)) * 8, 15);
  score += rankScore;
  reasons.push(`排名#${repo.rank} (+${rankScore.toFixed(1)}分)`);
  
  // 2. 今日Star增长
  const todayStars = parseInt(repo.todayStars.replace(/,/g, '')) || 0;
  const starScore = Math.min(todayStars * 0.5, 20); // 每2个star得1分，最多20分
  score += starScore;
  reasons.push(`今日增长${repo.todayStars} stars (+${starScore.toFixed(1)}分)`);
  
  // 3. 总Star数（改为排名越靠前得分越高，第1名40分）
  // 根据总Star数排序计算得分，前20名线性递减
  const totalStars = parseInt(repo.stars.replace(/,/g, '')) || 0;
  // 使用对数计算基础分，但给予更高权重
  const totalStarScore = Math.min(Math.log10(totalStars + 1) * 10, 40); 
  score += totalStarScore;
  reasons.push(`总Star数${repo.stars} (+${totalStarScore.toFixed(1)}分)`);
  
  // 4. 描述质量
  const description = repo.description || '';
  if (description.length > 20) {
    score += 5;
    reasons.push('描述详细 (+5分)');
  }
  
  // 5. 热门语言加分
  const popularLanguages = ['Python', 'JavaScript', 'TypeScript', 'Java', 'Go', 'Rust', 'C++'];
  if (popularLanguages.includes(repo.language)) {
    score += 8;
    reasons.push(`热门语言${repo.language} (+8分)`);
  } else if (repo.language) {
    score += 3;
    reasons.push(`语言${repo.language} (+3分)`);
  }
  
  // 6. 关键词匹配
  const keywords = [
    'AI', '人工智能', 'machine learning', 'deep learning', 'LLM', 'GPT',
    'framework', '库', '工具', 'utility', '自动化', 'automation',
    'web', '前端', '后端', 'mobile', 'app', '应用',
    'security', '安全', 'performance', '性能', 'optimization', '优化'
  ];
  
  const descLower = description.toLowerCase();
  let keywordCount = 0;
  keywords.forEach(keyword => {
    if (descLower.includes(keyword.toLowerCase())) {
      keywordCount++;
    }
  });
  
  const keywordScore = Math.min(keywordCount * 2, 10);
  if (keywordScore > 0) {
    score += keywordScore;
    reasons.push(`包含${keywordCount}个热门关键词 (+${keywordScore}分)`);
  }
  
  return { score, reasons };
}

// 选择最有价值的项目
function selectBestProjects(projects, count) {
  console.log('\n🔍 分析项目价值...');
  console.log('=' .repeat(80));
  
  const analyzed = projects.map(repo => {
    const analysis = analyzeProjectValue(repo);
    return {
      ...repo,
      score: analysis.score,
      reasons: analysis.reasons
    };
  });
  
  // 按分数排序
  analyzed.sort((a, b) => b.score - a.score);
  
  // 显示分析结果
  analyzed.forEach((repo, index) => {
    console.log(`\n${index + 1}. ${repo.fullName} - 总分: ${repo.score.toFixed(1)}`);
    console.log(`   理由: ${repo.reasons.join(', ')}`);
  });
  
  console.log('\n' + '=' .repeat(80));
  console.log(`🎯 推荐选择的 ${count} 个项目:`);
  
  const selected = analyzed.slice(0, count);
  selected.forEach((repo, index) => {
    console.log(`\n${index + 1}. ${repo.fullName} (得分: ${repo.score.toFixed(1)})`);
    console.log(`   ${repo.description || '无描述'}`);
    console.log(`   ${repo.language || '未知'} | 总Star: ${repo.stars} | 今日: ${repo.todayStars}`);
  });
  
  return selected;
}

// 生成帖子内容
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

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 随机延迟
function randomDelay(min = 1000, max = 3000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// 截图函数 - 对选中的项目进行截图
async function takeScreenshots(selectedProjects) {
  console.log('\n📸 启动浏览器对选中的项目进行截图...');
  
  ensureDir(CONFIG.screenshotsDir);
  
  const browser = await chromium.launch({
    headless: CONFIG.browserOptions.headless,
    timeout: CONFIG.browserOptions.timeout,
    executablePath: CONFIG.browserOptions.executablePath,
    args: CONFIG.browserOptions.args
  });
  
  let page = null;
  const posts = [];
  
  try {
    page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    // 反检测
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    
    for (let i = 0; i < selectedProjects.length; i++) {
      const repo = selectedProjects[i];
      console.log(`\n  处理项目 ${i + 1}/${selectedProjects.length}: ${repo.fullName}`);
      
      try {
        console.log(`  打开项目页面: ${repo.url}`);
        await page.goto(repo.url, {
          waitUntil: 'domcontentloaded',
          timeout: 20000
        });
        
        await randomDelay(500, 1500);
        
        const screenshotFile = `repo-${i + 1}-${repo.fullName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
        const screenshotPath = path.join(CONFIG.screenshotsDir, screenshotFile);
        
        await page.screenshot({
          path: screenshotPath,
          fullPage: false,
          type: 'png'
        });
        
        console.log(`  ✅ 截图保存: ${screenshotFile}`);
        
        posts.push({
          index: i + 1,
          repo: repo.fullName,
          screenshot: screenshotFile,
          screenshotPath: screenshotPath,
          content: generatePostContent(repo),
          url: repo.url,
          data: repo
        });
        
      } catch (error) {
        console.error(`  ❌ 截图失败 ${repo.fullName}:`, error.message);
        // 即使截图失败也添加帖子数据
        posts.push({
          index: i + 1,
          repo: repo.fullName,
          screenshot: null,
          screenshotPath: null,
          content: generatePostContent(repo),
          url: repo.url,
          data: repo
        });
      }
    }
    
    return posts;
    
  } finally {
    if (page) await page.close().catch(() => {});
    await browser.close();
  }
}

// 主函数
async function main() {
  console.log('🤖 GitHub Trending 项目分析工具');
  console.log('=' .repeat(50));
  console.log('功能: 分析热门项目，选择最有价值的5个并截图');
  console.log('=' .repeat(50));
  
  // 1. 加载数据
  const allProjects = loadAllProjects();
  console.log(`📂 加载了 ${allProjects.length} 个项目数据`);
  
  // 2. 显示项目列表
  displayProjects(allProjects);
  
  // 3. 分析并选择最有价值的项目
  const selectedProjects = selectBestProjects(allProjects, CONFIG.selectN);
  
  // 4. 对选中的项目进行截图并生成帖子数据
  const posts = await takeScreenshots(selectedProjects);
  
  // 5. 保存帖子数据
  fs.writeFileSync(CONFIG.postsFile, JSON.stringify(posts, null, 2));
  console.log(`\n✅ 已保存选择的 ${posts.length} 个项目到: ${CONFIG.postsFile}`);
  
  // 6. 下一步提示
  console.log('\n🎯 下一步:');
  console.log('1. 运行 node scripts/publish.js 发布帖子');
  console.log('2. 或者手动修改 posts.json 调整选择结果');
  console.log('3. 确保已登录QQ频道 (运行 node scripts/login.py 登录)');
  
  console.log('\n📋 选择的项目列表:');
  posts.forEach(post => {
    console.log(`  - ${post.repo}`);
  });
}

// 执行
if (require.main === module) {
  main().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = { analyzeProjectValue, selectBestProjects };
