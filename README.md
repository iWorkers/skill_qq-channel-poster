# QQ频道帖子自动化发布 Skill

基于Playwright浏览器自动化技术实现的QQ频道帖子发布工具，支持GitHub Trending自动采集发布。

## 功能特性

- 支持带图片的帖子发布
- Cookie/Session持久化登录
- GitHub Trending自动采集与发布
- 立即发布模式

## 快速开始

### 1. 安装依赖

**Python依赖：**
```bash
pip install -r requirements.txt
```

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
  "channel_id": "频道ID",
  "auto_post": true
}
```

### 3. 登录（首次）

```bash
# Python登录脚本
python scripts/login.py
```

扫码登录后Cookie会自动保存。

### 4. 使用方式

#### 方式一：GitHub Trending 自动采集发布（推荐）

```bash
# 自动采集GitHub Trending并发布到QQ频道
node scripts/scraper.js
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
├── SKILL.md              # Skill定义文件
├── README.md             # 使用说明
├── config.example.json   # 配置示例
├── package.json          # Node.js依赖
├── requirements.txt     # Python依赖
├── scripts/
│   ├── login.py         # Python登录脚本
│   ├── post.py          # Python发布脚本
│   └── scraper.js       # Node.js采集发布脚本
└── references/
    └── usage.md         # 详细使用文档
```

## 工作流程

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  GitHub Trending │ ──▶ │  采集+截图+文案   │ ──▶ │  QQ频道自动发布  │
│     页面抓取      │     │   (scraper.js)   │     │   (post.py)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## 配置说明

| 配置项 | 说明 |
|--------|------|
| qq_number | 你的QQ号 |
| channel_id | QQ频道ID（在频道设置中查看） |
| auto_post | 是否自动发布到QQ频道（默认true） |

## 注意事项

1. QQ频道页面选择器可能因版本更新需调整
2. Cookie有效期约30天，过期需重新登录
3. 发布频率过高可能触发限流
