/**
 * DeepSeek Balance — iOS 桌面小组件 (Scriptable)  ·  2×2 Medium
 * ================================================================
 * Apple Liquid Glass 风格 — 浅蓝底 / 毛玻璃卡片 / 适配中号尺寸
 */

const DEEPSEEK_KEY = "填写你的 DeepSeek API Key";
const DEEPSEEK_API = "https://api.deepseek.com";
const SYMBOLS = { CNY: "¥", USD: "$", EUR: "€" };

// ===================================================================
// 🎨 配色
// ===================================================================
const white    = new Color("#ffffff");
const white80  = new Color("#ffffff", 0.80);
const white70  = new Color("#ffffff", 0.70);
const white50  = new Color("#ffffff", 0.50);
const white55  = new Color("#ffffff", 0.55);

const glassBg  = new Color("#ffffff", 0.15);
const glassBdr = new Color("#ffffff", 0.30);

const accent   = new Color("#7eb8f4");
const accentBg = new Color("#3b82f6", 0.10);
const green    = new Color("#5eea8b");
const red      = new Color("#ff6b6b");
const hairline = new Color("#ffffff", 0.10);

// ===================================================================
// 数据 — 直接请求 DeepSeek API（国内可访问，无需后端）
// ===================================================================
async function fetchBalance() {
  const req = new Request(`${DEEPSEEK_API}/user/balance`);
  req.method = "GET";
  req.headers = {
    "Accept": "application/json",
    "Authorization": `Bearer ${DEEPSEEK_KEY}`
  };
  req.timeoutInterval = 10;
  try {
    const raw = await req.loadJSON();
    const infos = raw.balance_infos || [];
    const currencies = infos.map(info => ({
      currency: info.currency || "???",
      total_balance: parseFloat(info.total_balance || 0),
      topped_up_balance: parseFloat(info.topped_up_balance || 0),
      granted_balance: parseFloat(info.granted_balance || 0),
    }));
    return {
      error: null,
      is_available: raw.is_available || false,
      currencies,
    };
  } catch (e) {
    return { error: `连接失败: ${e.message}`, currencies: [] };
  }
}

function fmt(n) {
  if (isNaN(n)) return "—";
  const [w, f = ""] = Number(n).toFixed(2).split(".");
  return Number(w).toLocaleString() + "." + f;
}

// ===================================================================
// 🪟 毛玻璃卡片
// ===================================================================
function glassCard(parent, symbol, currency, total, toppedUp, granted) {
  const card = parent.addStack();
  card.layoutVertically();
  card.setPadding(8, 12, 8, 12);
  card.backgroundColor = glassBg;
  card.cornerRadius = 16;
  card.borderWidth = 0.5;
  card.borderColor = glassBdr;

  // 币种标签
  const badge = card.addStack();
  badge.setPadding(3, 8, 3, 8);
  badge.backgroundColor = accentBg;
  badge.cornerRadius = 8;
  const bt = badge.addText(currency);
  bt.font = Font.boldSystemFont(10);
  bt.textColor = accent;

  card.addSpacer(5);

  // 大余额 — 整数小数同字号，符号与数字底部对齐
  const bal = card.addStack();
  bal.layoutHorizontally();
  bal.bottomAlignContent();

  const sy = bal.addText(symbol);
  sy.font = Font.lightSystemFont(24);
  sy.textColor = white70;

  bal.addSpacer(2);

  const amt = bal.addText(fmt(total));
  amt.font = Font.lightSystemFont(24);
  amt.textColor = white;

  card.addSpacer(5);

  // 细线
  const ln = card.addStack();
  ln.backgroundColor = hairline;
  ln.size = new Size(-1, 0.5);

  card.addSpacer(5);

  // 充值 / 赠送
  const rows = card.addStack();
  rows.layoutVertically();
  rows.spacing = 2;

  for (const [label, val] of [["充值", toppedUp], ["赠送", granted]]) {
    const r = rows.addStack();
    r.layoutHorizontally();
    const lb = r.addText(label);
    lb.font = Font.systemFont(9);
    lb.textColor = white55;
    r.addSpacer();
    const vl = r.addText(fmt(val));
    vl.font = Font.mediumSystemFont(10);
    vl.textColor = white80;
  }
}

// ===================================================================
// 🎯 主入口
// ===================================================================
async function createWidget() {
  const data = await fetchBalance();
  const currencies = data.currencies || [];

  const widget = new ListWidget();
  widget.backgroundColor = new Color("#7eb8f4", 0.60);
  widget.setPadding(14, 14, 8, 14);

  // ---- 顶部：单行标题 + 状态 ----
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  const t1 = header.addText("DeepSeek 余额");
  t1.font = Font.boldSystemFont(12);
  t1.textColor = white;

  header.addSpacer();

  const status = header.addStack();
  status.layoutHorizontally();
  status.centerAlignContent();
  status.spacing = 3;
  const dot = status.addText("●");
  dot.font = Font.systemFont(6);
  dot.textColor = data.error ? red : green;
  const st = status.addText(data.error ? "离线" : "在线");
  st.font = Font.systemFont(9);
  st.textColor = white50;

  widget.addSpacer(8);

  // ---- 余额卡片 ----
  if (currencies.length === 0) {
    widget.addSpacer(10);
    const et = widget.addText(data.error || "暂无余额数据");
    et.font = Font.systemFont(12);
    et.textColor = white50;
    et.centerAlignText();
    widget.addSpacer(10);
  } else if (currencies.length === 1) {
    const c = currencies[0];
    glassCard(widget, SYMBOLS[c.currency] || "?", c.currency,
      c.total_balance, c.topped_up_balance, c.granted_balance);
  } else {
    const row = widget.addStack();
    row.layoutHorizontally();
    row.spacing = 8;
    for (const c of currencies) {
      glassCard(row, SYMBOLS[c.currency] || "?", c.currency,
        c.total_balance, c.topped_up_balance, c.granted_balance);
    }
  }

  // ---- 底部 ----
  widget.addSpacer(4);
  const ts = widget.addText(
    "更新 " + new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
  );
  ts.font = Font.systemFont(8);
  ts.textColor = white55;
  ts.centerAlignText();

  return widget;
}

const widget = await createWidget();
if (config.runsInWidget) { Script.setWidget(widget); }
else { widget.presentMedium(); }
Script.complete();
