
# QQ频道帖子自动化发布 Skill

基于Playwright浏览器自动化技术实现的QQ频道帖子发布工具，支持GitHub Trending自动采集、智能分析和发布。

## 功能特性

- 🤖 **智能分析**：自动分析GitHub Trending项目，选择最有价值的5个
- 📸 **精准截图**：只对选中的项目截图，节省资源
- 🍪 **持久登录**：Cookie/Session持久化，无需重复登录
- 🚀 **自动发布**：一键发布到QQ频道，支持自动点击频道元素
- 🔄 **去重机制**：自动记录已发布项目，避免重复
- ⏱️ **发布间隔**：可配置的发布间隔，避免限流

## 快速开始

### 1. 安装依赖

**Python依赖：**
```bash
pip install -r requirements.txt
```
浏览器地址https://storage.googleapis.com/chrome-for-testing-public/145.0.7632.6/win64/chrome-win64.zip
**Node.js依赖：**
```bash
cd .codebuddy/skills/qq-channel-poster
npm install
```

### 2. 配置

复制 `config.example.json` 为 `config.json` 并填写配置：

```json
{
  "qq_number": "你的QQ号",
  "proxy": "http://127.0.0.1:7897",
  "post_delay": 10
}
```

### 3. 登录（首次）

```bash
# Python登录脚本
python scripts/login.py
```

扫码登录后Cookie会自动保存到 `cookies.json`。

### 4. 使用方式

#### 方式一：GitHub Trending 智能采集发布（推荐）

**新三阶段流程：**

```bash
# 第1步：采集GitHub Trending数据（仅HTTP请求，快速）
node scripts/scraper.js

# 第2步：智能分析选择5个项目并截图
node scripts/analyze-projects.js

# 第3步：发布到QQ频道
node scripts/publish.js
```

#### 方式二：手动发布帖子

```bash
# 文本帖子
python scripts/post.py --content "内容"

# 带图片
python scripts/post.py --content "内容" --images "图片路径"
```

## 文件说明

```
qq-channel-poster/
├── SKILL.md                 # Skill定义文件（详细文档）
├── README.md                # 使用说明（本文档）
├── config.example.json      # 配置示例
├── config.json              # 用户配置（需创建）
├── package.json             # Node.js依赖
├── requirements.txt         # Python依赖
├── cookies.json             # 登录Cookie（自动生成）
├── scripts/
│   ├── login.py             # Python登录脚本
│   ├── post.py              # Python手动发布脚本
│   ├── scraper.js           # 采集脚本（仅采集数据）
│   ├── analyze-projects.js  # 分析选择+截图脚本
│   └── publish.js           # 发布脚本（自动点击频道）
├── output/
│   ├── all-trending-data.json    # 所有项目数据
│   ├── trending-data.json        # 精简数据
│   ├── posts.json                # 选中的5个项目（含截图）
│   ├── published-projects.json   # 已发布记录
│   └── screenshots/              # 项目截图目录
└── references/
    └── usage.md             # 详细使用文档
```

## 新工作流程

```
┌─────────────────┐     ┌─────────────────────────┐     ┌─────────────────┐
│  1. 采集阶段     │     │      2. 分析截图阶段      │     │   3. 发布阶段    │
│                 │     │                         │     │                 │
│  scraper.js     │────▶│  analyze-projects.js    │────▶│   publish.js    │
│                 │     │                         │     │                 │
│ • HTTP请求      │     │ • 多维度评分分析         │     │ • 自动点击频道   │
│ • 采集20个项目  │     │ • 选择最优5个           │     │ • 发布帖子      │
│ • 保存JSON数据  │     │ • 依次截图              │     │ • 自动去重      │
└─────────────────┘     └─────────────────────────┘     └─────────────────┘
         │                         │                          │
         ▼                         ▼                          ▼
all-trending-data.json      posts.json +              发布到QQ频道
                            screenshots/
```

## 智能评分标准

`analyze-projects.js` 根据以下标准自动评分选择最优项目：

| 评分维度 | 说明 | 分值 |
|---------|------|------|
| 排名权重 | 排名越靠前得分越高 | 第1名40分 |
| 今日Star增长 | 每2个star得1分 | 最多20分 |
| 总Star数 | 对数增长计算 | 最多15分 |
| 描述质量 | 描述详细程度 | +5分 |
| 热门语言 | Python/JS/Go/Rust等 | +8分 |
| 关键词匹配 | AI/自动化/框架等 | +2分/个 |

## 配置说明

| 配置项 | 类型 | 说明 | 默认值 |
|--------|------|------|--------|
| qq_number | string | 你的QQ号 | - |
| proxy | string | 代理服务器地址 | http://127.0.0.1:7897 |
| post_delay | number | 发布间隔（秒） | 10 |

## 输出文件

| 文件 | 说明 |
|------|------|
| `all-trending-data.json` | 所有采集的项目完整数据 |
| `trending-data.json` | 精简数据供分析使用 |
| `posts.json` | 选中的5个项目（含文案和截图路径） |
| `published-projects.json` | 已发布项目记录（自动去重） |
| `screenshots/` | 项目截图目录 |

## 注意事项

1. **网络代理**：确保代理配置正确，否则可能无法访问GitHub
2. **Cookie有效期**：约30天，过期需重新运行 `login.py`
3. **发布频率**：默认10秒间隔，避免触发限流
4. **频道元素**：自动点击 `github热门项目交流` 频道，失败会回退到手动模式
5. **去重机制**：已发布项目会自动记录，避免重复发布

## 常见问题

**Q: 采集时提示超时怎么办？**  
A: 检查代理配置是否正确，或稍后重试。

**Q: 如何修改选择的5个项目？**  
A: 手动编辑 `output/posts.json` 文件，或重新运行 `analyze-projects.js`。

**Q: 截图失败怎么办？**  
A: 检查Chrome路径配置，或手动准备截图放到 `output/screenshots/` 目录。

**Q: 如何跳过已发布项目？**  
A: 系统会自动跳过，无需手动操作。如需重新发布，删除 `published-projects.json` 中对应记录。

## 更新日志

### 2026-03-11 流程优化
- ✅ 优化为三阶段流程：采集 → 分析截图 → 发布
- ✅ scraper.js 仅采集数据，不启动浏览器
- ✅ analyze-projects.js 智能选择并截图
- ✅ 添加多维度评分系统
- ✅ 更新文档和说明
