import { collect } from "./kirana.js";
import { dashboardPage, loginPage, emailHtml } from "./ui.js";
import { num, describe, countBy } from "./util.js";

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(env.GH_REPO ? cronTick(env) : runCheck(env, "auto"));
  },
  async fetch(req, env) {
    try {
      return await route(req, env);
    } catch (e) {
      return new Response("Error: " + e.message, { status: 500 });
    }
  },
};

// ---------------- routing ----------------
async function route(req, env) {
  const url = new URL(req.url);
  const p = url.pathname;
  const post = req.method === "POST";

  // Fallback collector (GitHub Actions / script) yahan data bhej sakta hai
  if (p === "/api/ingest" && post) {
    if (!env.INGEST_KEY || req.headers.get("authorization") !== `Bearer ${env.INGEST_KEY}`)
      return new Response("unauthorized", { status: 401 });
    const body = await req.json();
    if (body.state) {
      await setSetting(env, "KC_STATE", body.state);
      delete body.state;
    }
    if (body.error) {
      await recordFailure(env, "ingest", body.error_code || "ERROR", body.error);
      return Response.json({ ok: false });
    }
    return Response.json(await processSnapshot(env, body, "ingest"));
  }

  if (p === "/manifest.webmanifest")
    return new Response(JSON.stringify({
      name: "Kirana Club Tracker", short_name: "KC Tracker", start_url: "/", display: "standalone",
      background_color: "#F6F3EE", theme_color: "#C4623A",
      icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
    }), { headers: { "content-type": "application/manifest+json" } });
  if (p === "/icon.svg")
    return new Response(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#C4623A"/><text x="256" y="320" font-size="210" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-weight="700">KC</text></svg>`,
      { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" } });

  if (p === "/api/state") {
    if (!env.INGEST_KEY || req.headers.get("authorization") !== `Bearer ${env.INGEST_KEY}`)
      return new Response("unauthorized", { status: 401 });
    return Response.json({ state: await getSetting(env, "KC_STATE") });
  }

  if (p === "/login" && post) {
    const f = await req.formData();
    if (env.DASH_PASSWORD && f.get("password") === env.DASH_PASSWORD) {
      const exp = Date.now() + 30 * 864e5;
      const tok = `${exp}.${await sign(env, String(exp))}`;
      return new Response(null, {
        status: 303,
        headers: {
          location: "/",
          "set-cookie": `kc=${tok}; Path=/; Max-Age=${30 * 86400}; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }
    return redirect("/?e=1");
  }

  if (!(await authed(req, env))) return html(loginPage(url.searchParams.has("e")), 401);

  if (p === "/logout")
    return new Response(null, { status: 303, headers: { location: "/", "set-cookie": "kc=; Path=/; Max-Age=0" } });
  if (p === "/run" && post) {
    if (env.GH_REPO) await dispatch(env);
    else await runCheck(env, "manual");
    return redirect(env.GH_REPO ? "/?queued=1" : "/");
  }
  if (p === "/session" && post) {
    const f = await req.formData();
    const t = String(f.get("token") || "").trim();
    if (t) {
      await setSetting(env, "KC_STATE", t);
      await setSetting(env, "failing", "");
      if (env.GH_REPO) await dispatch(env);
      else await runCheck(env, "manual");
    }
    return redirect(env.GH_REPO ? "/?queued=1" : "/");
  }
  if (p === "/reset" && post) {
    await env.DB.batch(["runs", "orders", "events"].map((t) => env.DB.prepare(`DELETE FROM ${t}`)));
    await env.DB.prepare("DELETE FROM settings WHERE k IN ('demo_state','failing')").run();
    return redirect("/");
  }
  if (p === "/api/data") return Response.json(await loadDashboard(env));
  if (p === "/") return html(dashboardPage({ ...(await loadDashboard(env)), queued: url.searchParams.has("queued") }, env));
  return new Response("Not found", { status: 404 });
}

// ---------------- core ----------------
export async function runCheck(env, source) {
  let snap;
  try {
    snap = await collect(env, { get: (k) => getSetting(env, k), set: (k, v) => setSetting(env, k, v) });
  } catch (e) {
    return recordFailure(env, source, e.code || "ERROR", e.message || String(e));
  }
  return processSnapshot(env, snap, source);
}

async function recordFailure(env, source, code, message) {
  const now = Date.now();
  await env.DB.prepare("INSERT INTO runs(ts,source,ok,error_code,error) VALUES(?,?,0,?,?)")
    .bind(now, source, code, message)
    .run();
  const failing = await getSetting(env, "failing");
  if (failing !== code) {
    // Har failure streak par sirf ek mail, spam nahi
    await setSetting(env, "failing", code);
    await env.DB.prepare("INSERT INTO events(ts,type,title) VALUES(?,?,?)")
      .bind(now, "error", code === "SESSION" ? "Portal login expire ho gaya" : `Check fail: ${message}`)
      .run();
    const subject =
      code === "SESSION"
        ? "[Kirana Club] ⚠ Login expired – action needed"
        : code === "CONFIG"
        ? "[Kirana Club] ⚠ Portal connection set nahi hai"
        : "[Kirana Club] ⚠ Monitor error";
    await sendMail(env, subject, emailHtml({ kind: "error", code, message, env, now }));
  }
  return { ok: false, code, message };
}

async function processSnapshot(env, snap, source) {
  const now = Date.now();
  const metrics = {};
  for (const [k, v] of Object.entries(snap.metrics || {})) metrics[k] = num(v) ?? String(v);
  const orders = (snap.orders || [])
    .filter((o) => o && o.id != null)
    .map((o) => ({ ...o, id: String(o.id), status: String(o.status || "Unknown") }));
  const statusCounts = snap.statusCounts || (orders.length ? countBy(orders, "status") : {});

  const prev = await env.DB.prepare("SELECT metrics,status_counts FROM runs WHERE ok=1 ORDER BY ts DESC LIMIT 1").first();
  const firstRun = !prev;
  const prevMetrics = prev ? JSON.parse(prev.metrics || "{}") : {};
  const prevCounts = prev ? JSON.parse(prev.status_counts || "{}") : {};
  const existing = new Map(
    (await env.DB.prepare("SELECT id,status,history FROM orders").all()).results.map((r) => [r.id, r])
  );

  const changes = [];
  const stmts = [];

  if (!firstRun) {
    for (const [k, v] of Object.entries(metrics))
      if (k in prevMetrics && prevMetrics[k] !== v) changes.push({ type: "metric", label: k, from: prevMetrics[k], to: v });
    if (!orders.length) {
      // Sirf counts mile (orders list nahi) to counts compare karo
      const keys = new Set([...Object.keys(statusCounts), ...Object.keys(prevCounts)]);
      for (const k of keys)
        if ((prevCounts[k] || 0) !== (statusCounts[k] || 0))
          changes.push({ type: "count", label: k, from: prevCounts[k] || 0, to: statusCounts[k] || 0 });
    }
  }

  for (const o of orders) {
    const ex = existing.get(o.id);
    const items = typeof o.items === "string" ? o.items : o.items ? JSON.stringify(o.items) : null;
    if (!ex) {
      stmts.push(
        env.DB.prepare(
          "INSERT INTO orders(id,status,amount,customer,city,placed_at,items,payment,first_seen,updated_at,history) VALUES(?,?,?,?,?,?,?,?,?,?,?)"
        ).bind(o.id, o.status, num(o.amount), o.customer || null, o.city || null, o.placedAt || null, items, o.payment || null, now, now,
          JSON.stringify([{ s: o.status, t: now }]))
      );
      if (!firstRun)
        changes.push({ type: "new_order", id: o.id, status: o.status, amount: num(o.amount), customer: o.customer, city: o.city, payment: o.payment });
    } else if (ex.status !== o.status) {
      const h = JSON.parse(ex.history || "[]");
      h.push({ s: o.status, t: now });
      stmts.push(
        env.DB.prepare("UPDATE orders SET status=?, amount=?, updated_at=?, history=? WHERE id=?")
          .bind(o.status, num(o.amount), now, JSON.stringify(h), o.id)
      );
      changes.push({ type: "status", id: o.id, from: ex.status, to: o.status, customer: o.customer, amount: num(o.amount) });
    }
  }

  stmts.push(
    env.DB.prepare(
      "INSERT INTO runs(ts,source,ok,metrics,status_counts,changes,order_count) VALUES(?,?,1,?,?,?,?)"
    ).bind(now, source, JSON.stringify(metrics), JSON.stringify(statusCounts), JSON.stringify(changes), orders.length)
  );
  if (firstRun) stmts.push(env.DB.prepare("INSERT INTO events(ts,type,title) VALUES(?,?,?)").bind(now, "info", "Monitoring shuru – baseline snapshot liya"));
  for (const c of changes)
    stmts.push(env.DB.prepare("INSERT INTO events(ts,type,title) VALUES(?,?,?)").bind(now, c.type, describe(c)));

  // D1 batch limit se bachne ke liye chunks
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));

  await setSetting(env, "stale_alerted", "");
  const wasFailing = await getSetting(env, "failing");
  if (wasFailing) {
    await setSetting(env, "failing", "");
    await env.DB.prepare("INSERT INTO events(ts,type,title) VALUES(?,?,?)").bind(now, "info", "Monitoring wapas chalu").run();
  }

  if (env.EMAIL_MODE !== "changes" || changes.length || firstRun || wasFailing) {
    const newOnes = changes.filter((c) => c.type === "new_order");
    const ordered = [...newOnes, ...changes.filter((c) => c.type === "status"), ...changes.filter((c) => c.type !== "new_order" && c.type !== "status")];
    const short = ordered.slice(0, 3).map((c) => (c.type === "new_order" ? `New order #${c.id}${c.amount != null ? " ₹" + c.amount.toLocaleString("en-IN") : ""}` : describe(c, true))).join(", ");
    const time = new Date(now).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true });
    const subject = firstRun
      ? `[Kirana Club] Monitoring started – ${time}`
      : newOnes.length
      ? `[Kirana Club] 🆕 NEW ORDER: ${short} – ${time}`
      : changes.length
      ? `[Kirana Club] 🔔 ${changes.length} change${changes.length > 1 ? "s" : ""}: ${short} – ${time}`
      : `[Kirana Club] No change – ${time}`;
    await sendMail(env, subject, emailHtml({ kind: "report", firstRun, changes, metrics, prevMetrics, statusCounts, env, now }));
  }
  return { ok: true, changes: changes.length };
}

// ---------------- dashboard data ----------------
async function loadDashboard(env) {
  const now = Date.now();
  const q = (sql, ...b) => env.DB.prepare(sql).bind(...b);
  const [lastRun, okRuns, events, orders, recentOrders, day, failing, hasToken] = await Promise.all([
    q("SELECT * FROM runs ORDER BY ts DESC LIMIT 1").first(),
    q("SELECT ts,metrics,status_counts FROM runs WHERE ok=1 ORDER BY ts DESC LIMIT 2").all(),
    q("SELECT ts,type,title FROM events ORDER BY ts DESC LIMIT 150").all(),
    q("SELECT id,status,amount,customer,city,placed_at,payment,first_seen,updated_at FROM orders ORDER BY updated_at DESC, CAST(id AS INTEGER) DESC LIMIT 300").all(),
    q("SELECT placed_at, first_seen FROM orders ORDER BY first_seen DESC LIMIT 3000").all(),
    q("SELECT ok FROM runs WHERE ts > ?", now - 864e5).all(),
    getSetting(env, "failing"),
    getSetting(env, "KC_STATE"),
  ]);
  const [cur, prv] = okRuns.results;
  return {
    now,
    lastRun,
    latest: cur ? { ts: cur.ts, metrics: JSON.parse(cur.metrics || "{}"), counts: JSON.parse(cur.status_counts || "{}") } : null,
    previous: prv ? { metrics: JSON.parse(prv.metrics || "{}") } : null,
    events: events.results,
    orders: orders.results,
    orderDays: recentOrders.results.map((r) => placedDay(r.placed_at, now) || dayKeyIST(r.first_seen)),
    runs24h: { total: day.results.length, ok: day.results.filter((r) => r.ok).length },
    failing,
    demo: env.DEMO === "1",
    hasToken: !!hasToken,
  };
}

const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const dayKeyIST = (ts) => new Date(ts).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
// "Nov 14 at 2:12pm" -> "2026-11-14"
function placedDay(s, now) {
  const m = /([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})/.exec(s || "");
  if (!m || !(m[1].toLowerCase() in MON)) return null;
  let y = Number(dayKeyIST(now).slice(0, 4));
  const mo = MON[m[1].toLowerCase()], d = Number(m[2]);
  if (Date.UTC(y, mo, d) > now + 2 * 864e5) y -= 1;
  return `${y}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ---------------- GitHub collector trigger + watchdog ----------------
async function dispatch(env) {
  const r = await fetch(`https://api.github.com/repos/${env.GH_REPO}/dispatches`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.GH_TOKEN}`,
      accept: "application/vnd.github+json",
      "user-agent": "kirana-monitor",
      "content-type": "application/json",
    },
    body: JSON.stringify({ event_type: "kc-check" }),
  });
  if (r.status >= 300) await recordFailure(env, "auto", "DISPATCH", `GitHub trigger fail (${r.status}). GH_TOKEN check kariye.`);
}

async function cronTick(env) {
  const now = Date.now();
  await env.DB.prepare("DELETE FROM runs WHERE ts < ?").bind(now - 90 * 864e5).run();
  await env.DB.prepare("DELETE FROM events WHERE ts < ? AND type IN ('metric','info')").bind(now - 180 * 864e5).run();
  const last = await env.DB.prepare("SELECT ts FROM runs ORDER BY ts DESC LIMIT 1").first();
  if (last && now - last.ts > 75 * 60000 && !(await getSetting(env, "stale_alerted"))) {
    await setSetting(env, "stale_alerted", "1");
    const mins = Math.round((now - last.ts) / 60000);
    await env.DB.prepare("INSERT INTO events(ts,type,title) VALUES(?,?,?)").bind(now, "error", `${mins} min se koi check nahi aaya`).run();
    await sendMail(env, "[Kirana Club] ⚠ Monitor ruka hua hai",
      emailHtml({ kind: "error", code: "STALE", message: `Pichhle ${mins} minute se koi check complete nahi hua. GitHub Actions ka run dekhiye.`, env, now }));
  }
  await dispatch(env);
}

// ---------------- helpers ----------------
async function sendMail(env, subject, htmlBody) {
  if (!env.RESEND_API_KEY || !env.MAIL_TO) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: env.MAIL_FROM, to: env.MAIL_TO.split(",").map((s) => s.trim()), subject, html: htmlBody }),
    });
  } catch (_) {}
}

const getSetting = async (env, k) =>
  (await env.DB.prepare("SELECT v FROM settings WHERE k=?").bind(k).first())?.v || null;
const setSetting = (env, k, v) =>
  env.DB.prepare("INSERT INTO settings(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").bind(k, v).run();

async function sign(env, msg) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(env.DASH_PASSWORD + "|kc"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function authed(req, env) {
  const m = (req.headers.get("cookie") || "").match(/(?:^|;\s*)kc=([^;]+)/);
  if (!m || !env.DASH_PASSWORD) return false;
  const [exp, sig] = m[1].split(".");
  if (!exp || Number(exp) < Date.now()) return false;
  return sig === (await sign(env, exp));
}
const html = (body, status = 200) => new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });
const redirect = (to) => new Response(null, { status: 303, headers: { location: to } });
