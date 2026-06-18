# Android 桌面小组件 — 余额直显

两种方案：**方案A 免费简单** / **方案B 更好看**

---

## 方案 A：HTTP Shortcuts 小组件（推荐，免费）

### 1. 安装
Google Play 搜索 **HTTP Shortcuts** 安装（免费）

### 2. 配置快捷方式
- 打开 HTTP Shortcuts → 右上角 + → **Shortcut**
- **Name**: `DeepSeek 余额`
- **URL**: `http://你的后端地址/api/widget`
- **Method**: GET
- **Basic Settings** → Response → 勾选 **Show response in widget**
- 保存

### 3. 添加到桌面
- 返回桌面 → 长按 → 小组件
- 找到 **HTTP Shortcuts** → 选择 1×1 或 2×1 尺寸
- 拖动到桌面 → 选择刚才创建的快捷方式
- 完成！桌面直接显示余额数字

### 4. 设置自动刷新
- HTTP Shortcuts → 点击你的快捷方式 → 编辑
- Advanced → **Auto refresh** → 设置 5 分钟

---

## 方案 B：KWGT 高级小组件（最美观）

需要：**KWGT** (Pro版约$4.99 或 免费版) + **MacroDroid** (免费)

### 1. 安装
- KWGT Kustom Widget Maker
- MacroDroid (用于定时拉取数据)

### 2. MacroDroid 配置（拉数据）
- 新建宏 → Trigger: **定时触发** → 每 5 分钟
- Actions → **HTTP Request**:
  ```
  URL:  http://你的后端地址/api/widget
  Method: GET
  ```
- Actions → **Set Variable**: 变量名 `ds_balance` = `[http_response]`
- Actions → **KWGT Update**: 发送更新

### 3. KWGT 显示（液态玻璃风格）
长按桌面 → 添加 KWGT 小组件 → 点击进入编辑:

**主余额数字:**
```
$tc(reg, br(tasker, ds_balance), ".* (\d+\.\d+) .*", "$1")$
```
字号 48, 字重 Thin, 颜色白色

**状态指示:**
- 添加圆形 → Fill Color 公式:
  ```
  $if(tc(reg, br(tasker, ds_balance), "ok", "") = ok, #34c759, #ff453a)$
  ```

完整 KWGT 液态玻璃效果配方见下页。

---

## KWGT 液态玻璃小组件 — 完整配方

### 背景层
```
Shape: 圆角矩形
Width:  填充
Height: 120
Corners: 28
Color:  #1AFFFFFF    (10% 透明白)
Border: 1px, #1EFFFFFF
FX: Blurred Background (需要 Pro)
```

### 余额文字
```
Text → Formula:
$tc(reg, br(tasker, ds_balance), "CNY (\d+\.\d+).*", "$1")$
Font: Sans Serif Thin, Size 46, Color #FFFFFF
```

### 充值余额
```
Text → Formula:
$tc(reg, br(tasker, ds_balance), "充值 (\d+\.\d+)", "充值: $1")$
Font: Sans Serif, Size 13, Color #99FFFFFF
```

### 赠送余额
```
Text → Formula:
$tc(reg, br(tasker, ds_balance), "赠送 (\d+\.\d+)", "赠送: $1")$
Font: Sans Serif, Size 13, Color #99FFFFFF
```

### 状态点
```
Shape: Circle
Size: 6×6
Color Formula:
$if(tc(reg, br(tasker, ds_balance), "ok", "") = ok, #FF34C759, #FFFF453A)$
```

---

## 方案 C：Termux 脚本小组件（极客玩家，免费）

如果不想装额外 app，用 Termux + Termux:Widget:

### 1. 安装
- Termux (F-Droid / GitHub, 不要用 Play 商店版)
- Termux:Widget

### 2. 创建脚本
```bash
mkdir -p ~/.shortcuts
cat > ~/.shortcuts/deepseek_balance.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
BALANCE=$(curl -s http://你的后端地址/api/widget 2>/dev/null)
echo "$BALANCE" > ~/.shortcuts/balance.txt
termux-notification --title "DeepSeek" --content "$BALANCE" --ongoing
EOF
chmod +x ~/.shortcuts/deepseek_balance.sh
```

### 3. 定时刷新
```bash
crontab -e
# 添加: */5 * * * * ~/.shortcuts/deepseek_balance.sh
```

### 4. 添加到桌面
- 长按桌面 → Termux:Widget → 选择脚本
- 每次点击刷新余额
- 或拉下通知栏即可看到余额（持久通知）

---

## 方案 D：PWA 快捷方式（备选）

虽然不是真正的小组件，但体验接近原生 App：
1. 手机浏览器打开 `https://你的后端地址`
2. Chrome → ⋮ → **添加到主屏幕**
3. 桌面出现 DeepSeek Balance 图标
4. 点击即开，液态玻璃界面，30 秒自动刷新
