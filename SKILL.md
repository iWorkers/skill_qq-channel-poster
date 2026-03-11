---
name: QQ频道帖子自动化发布
description: 使用浏览器自动化技术实现QQ频道帖子发布功能，支持图片上传、Cookie/Session持久化登录，以及GitHub Trending自动采集发布
---

# QQ频道帖子自动化发布 Skill

## 概述

本Skill提供基于Playwright的QQ频道帖子自动化发布能力，支持：
- 带图片的帖子发布
- Cookie/Session持久化登录
- GitHub Trending自动采集与发布
- 立即发布模式

## 触发条件

当用户请求以下任务时使用此Skill：
- 自动发布QQ频道帖子
- 批量上传图片到QQ频道
- QQ频道内容自动化发布
- GitHub热门项目采集并发布到QQ频道

## 使用前提

### 1. Python依赖安装

```bash
pip install playwright
playwright install chromium
```

### 2. Node.js依赖安装（用于GitHub Trending采集）

```bash
npm install @playwright/test cheerio
```

### 3. 配置文件

使用前需要创建 `config.json` 配置文件：

```json
{
  "qq_number": "你的QQ号",
  "channel_id": "频道ID",
  "cookies_file": "cookies.json",
  "output_dir": "output"
}
```

## 核心脚本

### Python脚本（QQ频道发布）

#### 1. 登录脚本 (scripts/login.py)

负责QQ登录并持久化Cookie：

1. 启动Chromium浏览器（headless=False便于扫码）
2. 访问QQ频道登录页面
3. 如果存在保存的Cookie，直接加载
4. 如果没有Cookie，引导用户扫码登录
5. 登录成功后保存Cookie到JSON文件

#### 2. 发布帖子脚本 (scripts/post.py)

执行帖子发布操作：

1. 加载保存的Cookie
2. 打开QQ频道页面
3. 定位到帖子输入框
4. 输入文本内容
5. 上传图片（支持多张）
6. 点击发布按钮
7. 返回发布结果

### Node.js脚本（GitHub Trending采集发布）

#### 3. GitHub Trending采集脚本 (scripts/scraper.js)

功能：采集GitHub Trending前20个项目，仅采集数据（不截图）
1. HTTP请求获取GitHub Trending页面
2. cheerio解析项目数据（收集20个项目）
3. 保存完整数据到 `all-trending-data.json`
4. 保存精简数据到 `trending-data.json` 供分析使用

#### 4. 项目分析脚本 (scripts/analyze-projects.js)

功能：分析项目并选择最有价值的5个，然后截图
1. 加载所有项目数据
2. 分析项目价值（根据排名、Star增长、语言热度、关键词等评分）
3. 自动选择得分最高的5个项目
4. **启动浏览器对选中的5个项目依次截图**
5. 生成包含截图路径的帖子数据到 `posts.json`

**评分标准：**
- 排名权重：排名越靠前得分越高（第1名40分）
- 今日Star增长：每2个star得1分（最多20分）
- 总Star数：对数增长（最多15分）
- 描述质量：描述详细+5分
- 热门语言：Python/JS/Go等+8分
- 关键词匹配：AI/自动化等关键词+2分/个

#### 5. 发布脚本 (scripts/publish.js)

功能：发布选择的5个项目到QQ频道
1. 加载选择的帖子数据（包含截图）
2. 检查已发布项目避免重复
3. **自动点击频道元素**：自动查找并点击 `github热门项目交流` 频道
4. 浏览器自动化发布帖子（带截图）
5. 记录已发布项目到 `published-projects.json`

**新功能特性：**
- 自动查找并点击频道元素 `<div class="item-name ellipsis">github热门项目交流</div>`
- 如果自动点击失败，会回退到手动操作流程
- 提供页面截图用于调试

## 使用流程

### 第一次使用

1. 运行登录脚本：`python scripts/login.py`
2. 浏览器会自动打开，使用QQ扫码登录
3. 登录成功后Cookie自动保存

### 方式一：手动发布帖子

```bash
python scripts/post.py --content "内容" --images "image1.jpg,image2.jpg"
```

### 方式二：GitHub Trending智能采集发布（新流程）

```bash
# 1. 采集前20个项目（仅采集数据，不截图）
node scripts/scraper.js

# 2. 分析并选择最有价值的5个项目，自动截图
node scripts/analyze-projects.js

# 3. 发布选择的5个项目到QQ频道
node scripts/publish.js
```

**新流程优势：**
- 采集阶段更快（不需要启动浏览器）
- 智能选择：根据多维度评分自动选择最优项目
- 精准截图：只对选中的5个项目截图，节省时间

## 输出文件

- `all-trending-data.json` - 所有20个项目的完整数据
- `trending-data.json` - 20个项目的精简数据（供Agent分析）
- `posts.json` - 选择的5个项目的帖子内容（含文案和截图路径）
- `published-projects.json` - 已发布项目记录（避免重复发布）
- `screenshots/` - 项目截图目录（前5个项目）

## 新工作流程

1. **采集阶段**：`scraper.js` 采集前20个GitHub Trending项目（仅HTTP请求，不启动浏览器）
2. **分析阶段**：`analyze-projects.js` 智能分析并自动选择最有价值的5个项目
3. **截图阶段**：`analyze-projects.js` 对选中的5个项目依次截图
4. **发布阶段**：`publish.js` 发布选择的5个项目到QQ频道，自动去重，10秒间隔

**流程优化：**
- 采集更快：纯HTTP请求，无需浏览器
- 智能选择：多维度评分系统自动选择最优项目
- 精准截图：只对选中的项目截图，避免资源浪费

## 重要提醒

1. **三阶段流程**：采集 → 分析截图 → 发布，每个阶段独立执行
2. **智能选择**：`analyze-projects.js` 根据排名、Star增长、语言热度等自动评分选择
3. **自动截图**：分析脚本会自动对选中的5个项目截图，无需手动操作
4. **自动点击频道**：发布脚本会自动尝试点击 `github热门项目交流` 频道元素
5. **发布间隔**：每个帖子发布后有10秒延迟（可配置）
6. **去重机制**：已发布项目会被记录，避免重复发布
7. **代理配置**：需要配置代理 `http://127.0.0.1:7897`

## 参考资料

详细操作说明请参考 `references/usage.md`