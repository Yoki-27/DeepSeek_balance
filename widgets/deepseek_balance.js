/**
 * DeepSeek Balance — iOS 桌面小组件 (Scriptable)
 * ================================================
 * Apple Liquid Glass 风格
 *
 * 使用方式:
 *   1. App Store 下载 Scriptable (免费)
 *   2. 新建脚本, 粘贴此文件全部内容
 *   3. 修改 API_BASE 为你的后端地址
 *   4. 长按桌面 → 添加小组件 → 搜索 Scriptable → 选择本脚本
 */

// ===================================================================
// 配置
// ===================================================================
const API_BASE = "http://192.168.128.135:5000";
// 如果用了 serveo 公网隧道, 改成:
// const API_BASE = "https://1838ea4270ddd4c0-182-143-176-219.serveousercontent.com";

// ===================================================================
// 颜色 — Liquid Glass 暗色调色板
// ===================================================================
const COLORS = {
  bg:       new Color("#000000"),
  cardBg:   new Color("#ffffff", 0.10),    // 10% 透明白
  text:     new Color("#ffffff"),
  textDim:  new Color("#ffffff", 0.45),
  textSoft: new Color("#ffffff", 0.70),
  accent:   new Color("#818cf8"),           // indigo-400
  accentBg: new Color("#6366f1", 0.18),
  success:  new Color("#34c759"),
  danger:   new Color("#ff453a"),
  border:   new Color("#ffffff", 0.10),
  highlight: new Color("#ffffff", 0.06),    // card highlight
};

// ===================================================================
// 数据获取
// ===================================================================
async function fetchBalance() {
  const req = new Request(`${API_BASE}/api/balance`);
  req.method = "GET";
  req.headers = { "Accept": "application/json" };
  req.timeoutInterval = 10;

  try {
    const json = await req.loadJSON();
    return json;
  } catch (e) {
    return { error: `连接失败: ${e.message}`, currencies: [] };
  }
}

// ===================================================================
// 辅助
// ===================================================================
function fmtAmount(val) {
  const num = Number(val);
  if (isNaN(num)) return "—";
  const [whole, frac = ""] = num.toFixed(2).split(".");
  return Number(whole).toLocaleString() + "." + frac;
}

// ===================================================================
// 渲染小组件
// ===================================================================
async function createWidget() {
  const data = await fetchBalance();
  const widget = new ListWidget();
  widget.backgroundColor = COLORS.bg;
  widget.setPadding(16, 16, 16, 16);

  // --- 标题行 ---
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  header.bottomAlignContent();

  // Logo
  const logoStack = header.addStack();
  logoStack.size = new Size(36, 36);
  logoStack.centerAlignContent();
  logoStack.backgroundColor = new Color("#6366f1", 0.6);
  logoStack.cornerRadius = 10;
  const logoText = logoStack.addText("DS");
  logoText.font = Font.boldSystemFont(16);
  logoText.textColor = Color.white();
  logoText.centerAlignText();

  header.addSpacer(10);

  // Title
  const titleStack = header.addStack();
  titleStack.layoutVertically();
  const title = titleStack.addText("DeepSeek");
  title.font = Font.boldSystemFont(16);
  title.textColor = COLORS.text;
  const sub = titleStack.addText("余额监控");
  sub.font = Font.systemFont(11);
  sub.textColor = COLORS.textDim;

  header.addSpacer();

  // Status dot
  const dot = header.addText("●");
  dot.font = Font.systemFont(7);
  dot.textColor = data.error ? COLORS.danger : COLORS.success;

  widget.addSpacer(14);

  // --- 余额卡片 ---
  const currencies = data.currencies || [];
  if (currencies.length === 0) {
    const msgStack = widget.addStack();
    msgStack.setPadding(20, 0, 20, 0);
    const msg = msgStack.addText(data.error || "暂无余额数据");
    msg.font = Font.systemFont(13);
    msg.textColor = COLORS.textDim;
    msg.centerAlignText();
  } else {
    for (const c of currencies) {
      // Card container with glass background
      const card = widget.addStack();
      card.layoutVertically();
      card.setPadding(14, 16, 14, 16);
      card.backgroundColor = COLORS.cardBg;
      card.cornerRadius = 18;
      card.borderWidth = 1;
      card.borderColor = COLORS.border;

      // Currency badge row
      const badgeRow = card.addStack();
      badgeRow.layoutHorizontally();
      const badge = badgeRow.addStack();
      badge.setPadding(3, 10, 3, 10);
      badge.backgroundColor = COLORS.accentBg;
      badge.cornerRadius = 12;
      const badgeText = badge.addText(`● ${c.currency}`);
      badgeText.font = Font.systemFont(10);
      badgeText.textColor = COLORS.accent;

      card.addSpacer(10);

      // Total balance
      const balRow = card.addStack();
      balRow.layoutHorizontally();
      balRow.bottomAlignContent();

      const symbol = balRow.addText("¥");
      symbol.font = Font.lightSystemFont(28);
      symbol.textColor = COLORS.textDim;

      balRow.addSpacer(4);

      const amountParts = fmtAmount(c.total_balance).split(".");
      const whole = balRow.addText(amountParts[0]);
      whole.font = Font.lightSystemFont(42);
      whole.textColor = COLORS.text;

      const frac = balRow.addText("." + (amountParts[1] || "00"));
      frac.font = Font.lightSystemFont(22);
      frac.textColor = COLORS.textDim;

      card.addSpacer(12);

      // Divider
      const div = card.addStack();
      div.backgroundColor = new Color("#ffffff", 0.06);
      div.size = new Size(-1, 1);

      card.addSpacer(10);

      // Detail row
      const detail = card.addStack();
      detail.layoutHorizontally();
      detail.spacing = 24;

      // Topped up
      const tStack = detail.addStack();
      tStack.layoutVertically();
      tStack.spacing = 1;
      const tLabel = tStack.addText("充值余额");
      tLabel.font = Font.systemFont(9);
      tLabel.textColor = COLORS.textDim;
      const tVal = tStack.addText(fmtAmount(c.topped_up_balance));
      tVal.font = Font.mediumSystemFont(13);
      tVal.textColor = COLORS.textSoft;

      // Granted
      const gStack = detail.addStack();
      gStack.layoutVertically();
      gStack.spacing = 1;
      const gLabel = gStack.addText("赠送余额");
      gLabel.font = Font.systemFont(9);
      gLabel.textColor = COLORS.textDim;
      const gVal = gStack.addText(fmtAmount(c.granted_balance));
      gVal.font = Font.mediumSystemFont(13);
      gVal.textColor = COLORS.textSoft;

      widget.addSpacer(10);
    }
  }

  // --- 更新时间 ---
  widget.addSpacer(8);
  const ts = widget.addText(
    "更新 " + new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
  );
  ts.font = Font.systemFont(10);
  ts.textColor = COLORS.textDim;
  ts.centerAlignText();

  return widget;
}

// ===================================================================
// 入口
// ===================================================================
const widget = await createWidget();

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentSmall();
}

Script.complete();
