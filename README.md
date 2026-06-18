# DeepSeek Balance Monitor 🔮

实时监测 DeepSeek API 余额，支持 **iPhone 桌面小组件** 和 **Android 桌面小组件**。

```
┌──────────────────────────────────────┐
│  DS   DeepSeek 余额            ● 在线 │
│  实时余额监控              更新于 14:30 │
│ ┌──────────────────────────────────┐ │
│ │  🇨🇳 CNY · 人民币                  │ │
│ │  1,234.56                        │ │
│ │  💰 充值余额    🎁 赠送余额       │ │
│ │  1,000.00       234.56           │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │  🇺🇸 USD · 美元                   │ │
│ │  50.00                           │ │
│ │  💰 充值余额    🎁 赠送余额       │ │
│ │  40.00          10.00            │ │
│ └──────────────────────────────────┘ │
│            [🔄 刷新余额]              │
│         每 30 秒自动刷新              │
└──────────────────────────────────────┘
```

---

## 🏗️ 项目结构

```
DeepSeek_balance/
├── backend/
│   ├── app.py              # Flask API 服务器
│   ├── requirements.txt    # Python 依赖
│   └── .env.example        # 环境变量模板
├── frontend/
│   ├── index.html          # PWA 前端 (移动端优化)
│   ├── manifest.json       # PWA 清单
│   └── sw.js               # Service Worker
├── widgets/
│   ├── deepseek_balance.js # iOS Scriptable 桌面小组件
│   └── android_widget_guide.md  # Android 小组件指南
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 🚀 快速开始

### 1. 获取 DeepSeek API Key

访问 [platform.deepseek.com](https://platform.deepseek.com) → API Keys → 创建 Key

### 2. 配置环境变量

```bash
cd backend
cp .env.example .env
# 编辑 .env, 填入你的 API Key:
# DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
```

### 3. 启动后端

**方式 A: 直接运行**

```bash
cd backend
pip install -r requirements.txt
python app.py
# → 服务器启动在 http://0.0.0.0:5000
```

**方式 B: Docker**

```bash
# 确保 backend/.env 已配置
docker compose up -d
# → 服务器启动在 http://0.0.0.0:5000
```

### 4. 验证服务

```bash
curl http://localhost:5000/api/balance
# → {"error":null,"is_available":true,"currencies":[...],"fetched_at":"..."}
```

打开浏览器访问 `http://localhost:5000` 即可看到 PWA 页面。

---

## 📱 手机桌面小组件配置

### iPhone (iOS)

1. 下载 **Scriptable** (App Store 免费)
2. 打开 Scriptable → 点右上角 + → 粘贴 `widgets/deepseek_balance.js` 全部内容
3. **修改第 15 行** `API_BASE` 为你的后端地址:
   ```js
   const API_BASE = "http://192.168.1.100:5000";  // 改成你电脑的局域网IP
   ```
4. 点 ▶ 运行测试
5. 回到 iPhone 桌面 → 长按 → 左上角 + → 搜索 Scriptable → 选择小组件尺寸
6. 长按刚添加的小组件 → 编辑小组件 → Script → 选择你的脚本

> 💡 **小号 (small)** 适合只显示一种货币, **中号 (medium)** 适合两种都显示。

### Android

**推荐方案: PWA 添加到桌面**

1. 手机 Chrome 打开 `http://你的电脑IP:5000` (确保连同一 WiFi)
2. Chrome 菜单 → **添加到主屏幕**
3. 安装后桌面出现独立图标，打开即用

**进阶方案: KWGT 实时小组件**

详见 `widgets/android_widget_guide.md`，需配合 Tasker 使用。

---

## 🌐 让手机在外网也能访问

### 方案一: 云服务器部署 (推荐)

将项目上传到云服务器 (阿里云 / Railway / Fly.io 等)，`docker compose up -d` 即可。

### 方案二: Cloudflare Tunnel (免费)

```bash
# 安装 cloudflared
# macOS: brew install cloudflare/cloudflare/cloudflared
# Linux: 从 GitHub Release 下载

# 启动隧道
cloudflared tunnel --url http://localhost:5000
# → 获得一个 *.trycloudflare.com 公网地址
```

### 方案三: ngrok

```bash
ngrok http 5000
# → 获得一个 *.ngrok.io 公网地址
```

---

## 🔧 API 文档

| 端点 | 说明 |
|------|------|
| `GET /api/balance` | 获取缓存余额 (默认 60 秒 TTL) |
| `GET /api/balance?force=true` | 强制刷新余额 |
| `GET /api/health` | 健康检查 |
| `GET /` | PWA 前端页面 |
| `GET /api` | API 信息 |

### 响应示例

```json
{
  "error": null,
  "is_available": true,
  "currencies": [
    {
      "currency": "CNY",
      "total_balance": 1234.56,
      "topped_up_balance": 1000.00,
      "granted_balance": 234.56
    },
    {
      "currency": "USD",
      "total_balance": 50.00,
      "topped_up_balance": 40.00,
      "granted_balance": 10.00
    }
  ],
  "fetched_at": "2026-01-01T12:00:00Z"
}
```

---

## ⚙️ 配置项

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `DEEPSEEK_API_KEY` | (必填) | DeepSeek 平台 API Key |
| `PORT` | `5000` | 服务器端口 |
| `HOST` | `0.0.0.0` | 绑定地址 |
| `CACHE_TTL_SECONDS` | `60` | 余额缓存时间 (秒) |

---

## 🛠️ 技术栈

- **后端**: Python Flask + APScheduler
- **前端**: 纯 HTML/CSS/JS (PWA, 零框架)
- **iOS 小组件**: Scriptable (JavaScript)
- **部署**: Docker / Docker Compose
