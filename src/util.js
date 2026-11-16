export function num(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v == null) return null;
  const s = String(v).replace(/[₹,\s]|Rs\.?/gi, "");
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}

export const isMoney = (label) => /sale|revenue|gmv|amount|payout|value|earning|₹/i.test(label);

export function fmtVal(label, v) {
  if (typeof v !== "number") return String(v ?? "–");
  return isMoney(label) ? "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : v.toLocaleString("en-IN");
}

export function countBy(arr, key) {
  const out = {};
  for (const x of arr) out[x[key]] = (out[x[key]] || 0) + 1;
  return out;
}

export function describe(c, short = false) {
  const rs = (a) => (a != null ? ` · ₹${a.toLocaleString("en-IN")}` : "");
  switch (c.type) {
    case "metric":
      return short ? `${c.label} ${fmtVal(c.label, c.from)}→${fmtVal(c.label, c.to)}` : `${c.label}: ${fmtVal(c.label, c.from)} → ${fmtVal(c.label, c.to)}`;
    case "count":
      return short ? `${c.label} ${c.from}→${c.to}` : `${c.label} orders: ${c.from} → ${c.to}`;
    case "new_order":
      return short ? `New order #${c.id}` : `New order #${c.id} · ${c.status}${rs(c.amount)}${c.payment ? " · " + c.payment : ""}${c.customer ? " · " + c.customer : ""}${c.city ? ", " + c.city : ""}`;
    case "status":
      return short ? `#${c.id} ${c.to}` : `Order #${c.id}: ${c.from} → ${c.to}${c.customer ? " · " + c.customer : ""}`;
    default:
      return c.title || "";
  }
}

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

const IST = "Asia/Kolkata";
export const fmtTime = (ts) =>
  new Date(ts).toLocaleTimeString("en-IN", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: true });
export const fmtDay = (ts) =>
  new Date(ts).toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short", weekday: "short" });
export const dayKey = (ts) => new Date(ts).toLocaleDateString("en-CA", { timeZone: IST });

export function ago(ts, now) {
  const m = Math.round((now - ts) / 60000);
  if (m < 1) return "abhi";
  if (m < 60) return `${m} min pehle`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ghante pehle`;
  return `${Math.floor(h / 24)} din pehle`;
}

export function statusTone(s) {
  const x = String(s).toLowerCase();
  if (/rto|return|fail|undeliver|exception|ndr/.test(x)) return "bad";
  if (/cancel|reject/.test(x)) return "mute";
  if (/deliver/.test(x)) return "good";
  if (/ship|transit|dispatch|out for|pick/.test(x)) return "warn";
  if (/confirm|accept|pack|process/.test(x)) return "info";
  return "new";
}
