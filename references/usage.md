
# QQ频道帖子自动化 - 详细使用指南

## 环境要求

### Python依赖安装

```bash
# 安装Playwright
pip install playwright

# 安装浏览器
playwright install chromium
```

## 配置说明

### 1. 创建配置文件

将 `config.example.json` 复制为 `config.json`，并填写配置：

```json
{
  "qq_number": "123456789",
  "channel_id": "123456789",
  "cookies_file": "cookies.json"
}
```

- `qq_number`: 你的QQ号
- `channel_id`: 目标频道ID（在频道设置中查看）
- `cookies_file`: Cookie保存文件（一般不需要修改）

## 使用流程

### 第一步：登录

```bash
cd .codebuddy/skills/qq-channel-poster/scripts
python login.py
```

1. 程序会启动浏览器并打开QQ频道登录页面
2. 使用QQ扫描二维码完成登录
3. 登录成功后，Cookie会自动保存到 `cookies.json`

### 第二步：发布帖子

```bash
# 发布纯文本帖子
python post.py --content "Hello World"

# 发布带图片的帖子
python post.py --content "今天天气真好" --images "D:/photos/sun.jpg"

# 发布多张图片
python post.py --content "旅游照片" --images "D:/photo1.jpg,D:/photo2.jpg,D:/photo3.jpg"
```

## 常见问题

### Q1: 登录后Cookie保存在哪里？
Cookie保存在 `cookies.json` 文件中，位于skill根目录。

### Q2: Cookie有效期多久？
QQ的Cookie通常有效期为30天左右，过期后需要重新登录。

### Q3: 发布失败怎么办？
1. 检查图片路径是否正确（使用绝对路径）
2. 确认QQ是否仍然保持登录状态
3. 尝试重新运行 `login.py` 刷新Cookie
4. 将浏览器设为非无头模式查看实际页面

### Q4: 如何查看页面元素？
修改脚本中的 `headless=False`，可以看到浏览器操作过程。

## 技术细节

### 使用的选择器

由于QQ频道页面可能会更新，以下选择器可能需要根据实际情况调整：

**输入框选择器：**
- `[contenteditable="true"]`
- `.ql-editor`
- `textarea`

**上传按钮选择器：**
- `[class*="upload"]`
- `[class*="image"]`

**发布按钮选择器：**
- `button:has-text("发布")`
- `button:has-text("发送")`

### 注意事项

1. **安全考虑**：Cookie文件包含登录信息，请勿上传到公开仓库
2. **频率限制**：发布过于频繁可能导致限流，建议间隔10秒以上
3. **图片大小**：建议单张图片不超过10MB
