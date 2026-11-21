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
      await setSetting(env, "GW_COOKIE", cookieHeaderFromState(body.state) || ""); // fresh cookie se fast-lane reset
      delete body.state;
    }
    if (body.error) {
      if (body.shot) await setSetting(env, "last_error_shot", JSON.stringify({ ts: Date.now(), img: body.shot }));
      await recordFailure(env, "ingest", body.error_code || "ERROR", body.error);
      return Response.json({ ok: false });
    }
    return Response.json(await processSnapshot(env, body, "ingest"));
  }

  if (p === "/manifest.webmanifest")
    return new Response(JSON.stringify({
      name: "Kirana Club Tracker", short_name: "KC Tracker", start_url: "/", display: "standalone",
      background_color: "#F6F3EE", theme_color: "#C4623A",
      icons: [{ src: "/icon.png", sizes: "180x180", type: "image/png" }, { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
    }), { headers: { "content-type": "application/manifest+json" } });
  if (p === "/icon.png")
    return new Response(Uint8Array.from(atob(ICON_PNG), (c) => c.charCodeAt(0)),
      { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
  if (p === "/icon.svg")
    return new Response(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#C4623A"/><text x="256" y="320" font-size="210" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-weight="700">KC</text></svg>`,
      { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" } });

  if (p === "/sw.js")
    return new Response(SW_JS, { headers: { "content-type": "application/javascript", "cache-control": "no-cache" } });

  if (p === "/api/cleanup-log" && post) {
    if (!env.INGEST_KEY || req.headers.get("authorization") !== `Bearer ${env.INGEST_KEY}`)
      return new Response("unauthorized", { status: 401 });
    await ensureCleanupTable(env);
    const { items = [] } = await req.json();
    const now = Date.now();
    const st = items.slice(0, 500).map((it) =>
      env.DB.prepare("INSERT OR IGNORE INTO cleanup_log(msg_id,ts,mail_ts,subject) VALUES(?,?,?,?)")
        .bind(String(it.msgId), now, Number(it.date) || null, String(it.subject || "").slice(0, 200)));
    for (let i = 0; i < st.length; i += 50) await env.DB.batch(st.slice(i, i + 50));
    await setSetting(env, "last_cleanup", String(now));
    return Response.json({ ok: true, logged: st.length });
  }

  if (p === "/api/state") {
    if (!env.INGEST_KEY || req.headers.get("authorization") !== `Bearer ${env.INGEST_KEY}`)
      return new Response("unauthorized", { status: 401 });
    return Response.json({ state: await getSetting(env, "KC_STATE") });
  }

  if (p === "/login" && post) {
    const f = await req.formData();
    if (env.DASH_PASSWORD && f.get("password") === env.DASH_PASSWORD) {
      const exp = Date.now() + 365 * 864e5;
      const tok = `${exp}.${await sign(env, String(exp))}`;
      return new Response(null, {
        status: 303,
        headers: {
          location: "/",
          "set-cookie": `kc=${tok}; Path=/; Max-Age=${365 * 86400}; HttpOnly; Secure; SameSite=Lax`,
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
      await setSetting(env, "GW_COOKIE", cookieHeaderFromState(t) || "");
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
  if (p === "/error-shot") {
    const j = JSON.parse((await getSetting(env, "last_error_shot")) || "null");
    if (!j) return new Response("Koi screenshot nahi", { status: 404 });
    return new Response(Uint8Array.from(atob(j.img), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/jpeg" } });
  }
  if (p === "/api/push/key") return Response.json({ key: (await vapid(env)).pub });
  if (p === "/api/push/subscribe" && post) {
    const sub = await req.json();
    if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint)) return new Response("bad", { status: 400 });
    await env.DB.prepare("INSERT INTO push_subs(endpoint,sub,ua,created) VALUES(?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET sub=excluded.sub")
      .bind(sub.endpoint, JSON.stringify(sub), (req.headers.get("user-agent") || "").slice(0, 200), Date.now()).run();
    return Response.json({ ok: true });
  }
  if (p === "/api/push/test" && post)
    return Response.json(await pushNotify(env, "order", "🆕 Test: New order #123456 · ₹960", "Ramesh Kirana, Patna · COD\nNotifications sahi chal rahe hain ✅"));
  if (p === "/api/notify/latest")
    return Response.json(await env.DB.prepare("SELECT id,ts,kind,title,body FROM notifications ORDER BY id DESC LIMIT 1").first());
  if (p === "/api/fastpoll" && post) return Response.json(await directNewOrderPoll(env));
  if (p === "/api/login/start" && post) {
    const { email } = await req.json().catch(() => ({}));
    if (!email || !/@/.test(email)) return Response.json({ ok: false, error: "Sahi email daaliye" });
    return Response.json(await loginStart(env, String(email).trim()).catch((e) => ({ ok: false, error: String(e).slice(0, 120) })));
  }
  if (p === "/api/login/verify" && post) {
    const { email, code } = await req.json().catch(() => ({}));
    if (!email || !code) return Response.json({ ok: false, error: "Email aur OTP dono daaliye" });
    return Response.json(await loginVerify(env, String(email).trim(), String(code).trim()).catch((e) => ({ ok: false, error: String(e).slice(0, 120) })));
  }
  if (p === "/api/ask" && post) {
    const { q } = await req.json().catch(() => ({}));
    return Response.json({ answer: await askBot(env, q || "").catch(() => "Abhi jawab nahi de paya.") });
  }
  if (p === "/api/order") {
    const id = url.searchParams.get("id");
    if (!id) return new Response("no id", { status: 400 });
    await ensureDetailCol(env);
    const row = await env.DB.prepare("SELECT id,status,amount,customer,city,payment,placed_at,history,detail FROM orders WHERE id=?").bind(id).first();
    if (!row) return Response.json({ error: "not-found" });
    let extra = null;
    try { extra = await fetchOrderExtra(env, id); } catch (_) {}
    return Response.json({
      id: row.id, status: row.status, amount: row.amount, customer: row.customer, city: row.city,
      payment: row.payment, placed_at: row.placed_at,
      history: row.history ? JSON.parse(row.history) : [],
      detail: row.detail ? JSON.parse(row.detail) : null, extra,
    });
  }
  if (p === "/api/stock/set" && post) {
    const b = await req.json().catch(() => ({}));
    if (!b.product_id) return new Response("no product", { status: 400 });
    await ensureInventory(env);
    const cur = await env.DB.prepare("SELECT * FROM inventory WHERE product_id=?").bind(String(b.product_id)).first();
    if (!cur) return Response.json({ ok: false, error: "not-found" });
    const per_bundle = b.per_bundle != null ? Math.max(0, Math.round(Number(b.per_bundle))) : cur.per_bundle;
    // units bundles+loose se ya seedha units se
    let units;
    if (b.bundles != null || b.loose != null) {
      const pb = per_bundle || 1;
      units = Math.max(0, Math.round((Number(b.bundles) || 0) * pb + (Number(b.loose) || 0)));
    } else units = b.units != null ? Math.round(Number(b.units)) : cur.units;
    const min_qty = b.min_qty != null ? Math.max(1, Math.round(Number(b.min_qty))) : cur.min_qty;
    const threshold = b.threshold != null ? Math.max(0, Math.round(Number(b.threshold))) : cur.threshold;
    const tracking = b.tracking != null ? (b.tracking ? 1 : 0) : cur.tracking;
    const auto_oos = b.auto_oos != null ? (b.auto_oos ? 1 : 0) : cur.auto_oos;
    const newStatus = invStatus(units, threshold);
    await env.DB.prepare("UPDATE inventory SET units=?, min_qty=?, threshold=?, tracking=?, auto_oos=?, per_bundle=?, status=?, updated_at=? WHERE product_id=?")
      .bind(units, min_qty, threshold, tracking, auto_oos, per_bundle, newStatus, Date.now(), String(b.product_id)).run();
    // Auto-sync ON + stock aa gaya (0→+) + portal par OOS hai → portal par wapas IN STOCK
    let portal = null;
    if (tracking && auto_oos && units > 0 && Number(cur.portal_oos) === 1) portal = await updateProductOOS(env, b.product_id, false).catch(() => null);
    // Auto-sync ON + stock 0 ho gaya + portal in-stock hai → portal OOS
    if (tracking && auto_oos && units <= 0 && Number(cur.portal_oos) === 0) portal = await updateProductOOS(env, b.product_id, true).catch(() => null);
    return Response.json({ ok: true, portal });
  }
  if (p === "/api/notif/seen" && post) {
    const b = await req.json().catch(() => ({}));
    if (b.id != null) await setSetting(env, "notif_seen_id", String(Math.round(Number(b.id)) || 0));
    return Response.json({ ok: true });
  }
  if (p === "/api/stock/instock" && post) {
    const b = await req.json().catch(() => ({}));
    if (!b.product_id) return new Response("no product", { status: 400 });
    await ensureInventory(env);
    const portal = await updateProductOOS(env, b.product_id, false);
    return Response.json({ ok: true, portal });
  }
  if (p === "/api/stock/oos" && post) {
    const b = await req.json().catch(() => ({}));
    if (!b.product_id) return new Response("no product", { status: 400 });
    await ensureInventory(env);
    const inv = await env.DB.prepare("SELECT * FROM inventory WHERE product_id=?").bind(String(b.product_id)).first();
    if (!inv) return Response.json({ ok: false });
    if (b.when === "now" || !b.when) {
      await env.DB.prepare("UPDATE inventory SET units=0, status='oos', oos_at=NULL, updated_at=? WHERE product_id=?").bind(Date.now(), String(b.product_id)).run();
      await alertInventory(env, [{ ...inv, units: 0, after: 0, to: "oos" }]);
      const portal = await markOOSOnPortal(env, inv);
      return Response.json({ ok: true, portal });
    }
    const when = Number(b.when);
    await env.DB.prepare("UPDATE inventory SET oos_at=?, updated_at=? WHERE product_id=?").bind(when > 0 ? when : null, Date.now(), String(b.product_id)).run();
    return Response.json({ ok: true, scheduled: when });
  }
  if (p === "/api/stock/discover" && post) {
    await ensureInventory(env);
    const cat = await fetchCatalog(env).catch(() => []);
    if (!cat.length) {
      // fallback: recent orders ke items se
      const ords = (await env.DB.prepare("SELECT id FROM orders ORDER BY CAST(id AS INTEGER) DESC LIMIT 25").all()).results;
      let f2 = 0;
      for (const o of ords) {
        const lines = await fetchOrderLines(env, o.id).catch(() => []);
        for (const ln of lines) {
          const r = await env.DB.prepare("INSERT OR IGNORE INTO inventory(product_id,sku,name,units,min_qty,threshold,status,tracking,updated_at) VALUES(?,?,?,?,?,?,?,?,?)")
            .bind(ln.product_id, ln.product_id, ln.name || "", 0, 1, 5, "in_stock", 0, Date.now()).run();
          if (r.meta && r.meta.changes) f2++;
        }
      }
      if (!f2) return Response.json({ ok: false, found: 0, total: 0, reason: "Portal se product list nahi mili — cookie/login shayad expire ho gaya. Settings me dubara Gmail login kijiye, phir try." });
      return Response.json({ ok: true, found: f2, total: f2 });
    }
    // Seller ne portal par jo min-order-qty (pack_size) set kiya wo auto laao
    const meta = await fetchEditMeta(env, cat.map((c) => c.product_id)).catch(() => ({}));
    let found = 0, updated = 0;
    for (const c of cat) {
      const moq = meta[c.product_id]?.pack_size || 1;
      const r = await env.DB.prepare("INSERT OR IGNORE INTO inventory(product_id,sku,name,units,min_qty,threshold,status,tracking,portal_oos,portal_seen,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
        .bind(c.product_id, c.sku, c.name, 0, moq, 5, "in_stock", 0, c.is_oos ? 1 : 0, 1, Date.now()).run();
      if (r.meta && r.meta.changes) found++;
      else { await env.DB.prepare("UPDATE inventory SET sku=CASE WHEN sku='' OR sku IS NULL THEN ? ELSE sku END, name=?, min_qty=?, portal_oos=?, portal_seen=1 WHERE product_id=?").bind(c.sku, c.name, moq, c.is_oos ? 1 : 0, c.product_id).run(); updated++; }
    }
    return Response.json({ ok: true, found, updated, total: cat.length });
  }
  if (p === "/api/data") return Response.json(await loadDashboard(env));
  if (p === "/api/latest") {
    const after = Number(url.searchParams.get("after") || 0);
    const r = await env.DB.prepare("SELECT id,ts,type,title FROM events WHERE id > ? ORDER BY id ASC LIMIT 20").bind(after).all();
    return Response.json({ events: r.results });
  }
  if (p === "/lang") {
    const l = url.searchParams.get("set") === "en" ? "en" : "hi";
    return new Response(null, { status: 303, headers: { location: "/", "set-cookie": `lang=${l}; Path=/; Max-Age=${365 * 86400}; SameSite=Lax` } });
  }
  if (p === "/") {
    const lang = /(?:^|;\s*)lang=en/.test(req.headers.get("cookie") || "") ? "en" : "hi";
    return html(dashboardPage({ ...(await loadDashboard(env)), queued: url.searchParams.has("queued") }, env, lang));
  }
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
    await sendMail(env, subject, emailHtml({ kind: "error", code, message, env, now }), "alert");
    await pushNotify(env, "alert", code === "SESSION" ? "⚠️ Kirana Club login expire" : "⚠️ Monitor error",
      code === "SESSION" ? "Dashboard kholiye aur naya cookie paste kariye" : String(message).slice(0, 140));
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

  const prev = await env.DB.prepare("SELECT metrics,status_counts,order_count FROM runs WHERE ok=1 ORDER BY ts DESC LIMIT 1").first();
  const firstRun = !prev;
  const prevMetrics = prev ? JSON.parse(prev.metrics || "{}") : {};
  const prevCounts = prev ? JSON.parse(prev.status_counts || "{}") : {};
  const prevOrderCount = prev ? prev.order_count || 0 : 0;

  // Glitch guard: orders/counts kabhi ek saath 0 par nahi aate agar pehle data tha.
  // Aisa tabhi hota hai jab page theek se load na ho. Reject: na diff, na notification,
  // na purana data overwrite. Pichhle good numbers carry-forward, dashboard green rehta hai.
  const allNow = Number(statusCounts["All"] || 0);
  const collapsed = orders.length === 0 && allNow === 0;
  const hadData = prevOrderCount > 0 || Number(prevCounts["All"] || 0) > 0;
  if (!firstRun && collapsed && hadData) {
    await env.DB.prepare(
      "INSERT INTO runs(ts,source,ok,metrics,status_counts,changes,order_count) VALUES(?,?,1,?,?,?,?)"
    ).bind(now, source, JSON.stringify(prevMetrics), JSON.stringify(prevCounts), "[]", prevOrderCount).run();
    return { ok: true, skipped: true, reason: "partial-load glitch, carried forward" };
  }
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

  // Inventory: naye orders se stock ghatao (idempotent), cancel par units wapas
  const invNewIds = changes.filter((c) => c.type === "new_order").map((c) => c.id);
  if (invNewIds.length) await applyInventoryForNewOrders(env, invNewIds).catch(() => {});
  for (const c of changes) if (c.type === "status" && /cancel/i.test(c.to || "")) await restoreInventory(env, c.id).catch(() => {});

  await setSetting(env, "stale_alerted", "");
  const wasFailing = await getSetting(env, "failing");
  if (wasFailing) {
    await setSetting(env, "failing", "");
    await env.DB.prepare("INSERT INTO events(ts,type,title) VALUES(?,?,?)").bind(now, "info", "Monitoring wapas chalu").run();
  }

  // Rules: mail sirf zaroori cheezon par; baaki sab sirf app notification
  const mailStatus = new RegExp((env.MAIL_STATUSES || "deliver").split(",").map((x) => x.trim()).filter(Boolean).join("|") || "^$", "i");
  const isSaleUp = (c) => c.type === "metric" && /^(this month sales|today's sales)$/i.test(c.label) &&
    typeof c.from === "number" && typeof c.to === "number" && c.to > c.from;
  const mailWorthy = changes.filter((c) => c.type === "new_order" || (c.type === "status" && mailStatus.test(c.to)) || isSaleUp(c));
  const newOnes = changes.filter((c) => c.type === "new_order");
  const time = new Date(now).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true });

  if (firstRun || mailWorthy.length || wasFailing) {
    const delivered = mailWorthy.filter((c) => c.type === "status");
    const sales = mailWorthy.filter(isSaleUp);
    const short = [
      ...newOnes.map((c) => `New order #${c.id}${c.amount != null ? " ₹" + c.amount.toLocaleString("en-IN") : ""}`),
      ...delivered.map((c) => `#${c.id} ${c.to}`),
      ...(!newOnes.length ? sales.map((c) => describe(c, true)) : []),
    ].slice(0, 3).join(", ");
    const subject = firstRun
      ? `[Kirana Club] Monitoring started – ${time}`
      : newOnes.length
      ? `[Kirana Club] 🆕 NEW ORDER: ${short} – ${time}`
      : delivered.length
      ? `[Kirana Club] ✅ ${short} – ${time}`
      : sales.length
      ? `[Kirana Club] 💰 Sale update: ${short} – ${time}`
      : `[Kirana Club] ✅ Monitoring wapas chalu – ${time}`;
    // Mail mein saare changes dikhte hain (context ke liye), trigger sirf zaroori wale
    await sendMail(env, subject, emailHtml({ kind: "report", firstRun, changes, metrics, prevMetrics, statusCounts, env, now }), newOnes.length ? "order" : "change");
  }

  if (changes.length) {
    const n = buildNotice(changes, metrics);
    await pushNotify(env, n.kind, n.title, n.body);
  } else if (!firstRun) {
    // Kuch nahi badla: bina sound ka notification, purane ko replace karta hai
    const today = metrics["Today's Sales"];
    const transit = statusCounts["In Transit"];
    await pushNotify(env, "quiet", `✓ Koi change nahi · ${time}`,
      [today != null ? `Aaj ki sale ${inr(today)}` : "", transit != null ? `In Transit ${transit}` : ""].filter(Boolean).join(" · "));
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
    q("SELECT id,ts,type,title FROM events ORDER BY id DESC LIMIT 150").all(),
    q("SELECT id,status,amount,customer,city,placed_at,payment,first_seen,updated_at FROM orders ORDER BY CAST(id AS INTEGER) DESC LIMIT 300").all(),
    q("SELECT placed_at, first_seen FROM orders ORDER BY first_seen DESC LIMIT 3000").all(),
    q("SELECT ok FROM runs WHERE ts > ?", now - 864e5).all(),
    getSetting(env, "failing"),
    getSetting(env, "KC_STATE"),
  ]);
  await ensureCleanupTable(env);
  const cleanup = (await q("SELECT msg_id,ts,mail_ts,subject FROM cleanup_log WHERE ts > ? ORDER BY ts DESC LIMIT 2000", now - 30 * 864e5).all()).results;
  const lastEvent = d_lastEvent(events.results);
  const [cur, prv] = okRuns.results;
  // Daily average orders — pehle mahine (jab Anagh shuru hua) first-order wale din se; aage har mahine 1st se
  const istN = new Date(now + 5.5 * 3600000);
  const monthStart = Date.UTC(istN.getUTCFullYear(), istN.getUTCMonth(), 1);
  const todayStart = Date.UTC(istN.getUTCFullYear(), istN.getUTCMonth(), istN.getUTCDate());
  const ots = recentOrders.results.map((r) => placedTs(r.placed_at, now)).filter((x) => x != null);
  const firstEver = ots.length ? Math.min(...ots) : monthStart;
  const periodStart = Math.max(monthStart, firstEver);
  const ordersInPeriod = ots.filter((x) => x >= periodStart && x <= todayStart).length;
  const avgDays = Math.max(1, Math.round((todayStart - periodStart) / 864e5) + 1);
  const dailyAvg = { avg: Math.round((ordersInPeriod / avgDays) * 10) / 10, orders: ordersInPeriod, days: avgDays, since: periodStart };
  return {
    now,
    dailyAvg,
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
    cleanup,
    lastEvent,
    pushDevices: (await env.DB.prepare("SELECT COUNT(*) n FROM push_subs").first())?.n || 0,
    fast: JSON.parse((await getSetting(env, "fast_status")) || "null"),
    insights: JSON.parse((await getSetting(env, "insights")) || "null"),
    ratings: JSON.parse((await getSetting(env, "ratings")) || "null"),
    lastCleanup: Number(await getSetting(env, "last_cleanup")) || null,
    errorShotTs: JSON.parse((await getSetting(env, "last_error_shot")) || "null")?.ts || null,
    inventory: await inventoryList(env),
    stockAlert: JSON.parse((await getSetting(env, "stock_alert")) || "null"),
    notifSeenId: Number(await getSetting(env, "notif_seen_id")) || 0,
  };
}

// ================= INVENTORY — apna stock, apne app me (source of truth) =================
async function ensureInventory(env) {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS inventory (product_id TEXT PRIMARY KEY, sku TEXT, name TEXT, units INTEGER DEFAULT 0, min_qty INTEGER DEFAULT 1, threshold INTEGER DEFAULT 5, status TEXT DEFAULT 'in_stock', oos_at INTEGER, auto_oos INTEGER DEFAULT 0, tracking INTEGER DEFAULT 0, per_bundle INTEGER DEFAULT 0, portal_oos INTEGER DEFAULT 0, portal_seen INTEGER DEFAULT 0, updated_at INTEGER)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS inv_ledger (order_id TEXT, product_id TEXT, qty INTEGER, ts INTEGER, kind TEXT, PRIMARY KEY(order_id, product_id))`),
  ]);
  for (const col of ["per_bundle INTEGER DEFAULT 0", "portal_oos INTEGER DEFAULT 0", "portal_seen INTEGER DEFAULT 0"]) {
    await env.DB.prepare(`ALTER TABLE inventory ADD COLUMN ${col}`).run().catch(() => {});
  }
}
// Portal par product ko OOS (true) ya in-stock (false) mark karo — captured endpoint
async function updateProductOOS(env, productID, isOos) {
  const email = (await getSetting(env, "seller_email")) || env.SELLER_EMAIL || "anaghmasala@gmail.com";
  const j = await gwPost(env, "/dlg/auth/v1/b2b/update_product_details", {
    updated_by: email, request_source: "B2B_EXTERNAL",
    data: { seller: env.SELLER_ID || "anagh", productID: Number(productID), updates: [{ key: "is_oos", value: !!isOos }], warehouse_id: Number(env.WAREHOUSE_ID) || 1534 },
  });
  const ok = !!j && !/error/i.test(j.status || "");
  await env.DB.prepare("INSERT INTO events(ts,type,title) VALUES(?,?,?)")
    .bind(Date.now(), ok ? "info" : "error", `${ok ? "✅ Portal updated" : "❌ Portal update fail"}: ${productID} → ${isOos ? "OUT OF STOCK" : "IN STOCK"}`).run();
  if (ok) await env.DB.prepare("UPDATE inventory SET portal_oos=?, portal_seen=1 WHERE product_id=?").bind(isOos ? 1 : 0, String(productID)).run();
  return { ok };
}
// Two-way sync: portal ka is_oos padho, app me reflect karo, manual change + mismatch detect karo
async function syncPortalStatus(env) {
  await ensureInventory(env);
  const cat = await fetchCatalog(env).catch(() => []);
  if (!cat.length) return;
  const meta = await fetchEditMeta(env, cat.map((c) => c.product_id)).catch(() => ({}));
  const rows = new Map((await env.DB.prepare("SELECT * FROM inventory").all()).results.map((r) => [String(r.product_id), r]));
  const now = Date.now();
  const notes = [], declareNeed = [];
  for (const c of cat) {
    const po = c.is_oos ? 1 : 0;
    const inv = rows.get(c.product_id);
    if (!inv) continue;
    // portal ka min-order-qty (pack_size) yahan auto sync
    const moq = meta[c.product_id]?.pack_size;
    if (moq && Number(inv.min_qty) !== Number(moq)) await env.DB.prepare("UPDATE inventory SET min_qty=? WHERE product_id=?").bind(Number(moq), c.product_id).run();
    if (inv.portal_seen && Number(inv.portal_oos) !== po) {
      notes.push(`Portal: ${inv.name || c.name} ab ${po ? "OUT OF STOCK" : "IN STOCK"}`);
      if (!po && (!inv.tracking || Number(inv.units) <= 0)) declareNeed.push(inv.name || c.name);
    }
    await env.DB.prepare("UPDATE inventory SET portal_oos=?, portal_seen=1, name=CASE WHEN name='' OR name IS NULL THEN ? ELSE name END WHERE product_id=?").bind(po, c.name, c.product_id).run();
  }
  if (notes.length) await env.DB.batch(notes.map((t) => env.DB.prepare("INSERT INTO events(ts,type,title) VALUES(?,?,?)").bind(now, "info", t)));
  if (declareNeed.length) {
    const body = declareNeed.map((n) => `• ${n}`).join("\n");
    await env.DB.prepare("INSERT INTO events(ts,type,title) VALUES(?,?,?)").bind(now, "error", `⚠️ Portal IN STOCK par app me stock declare nahi: ${declareNeed.length}`).run();
    await pushNotify(env, "alert", `⚠️ Stock declare karo (${declareNeed.length})`, body);
    await sendMail(env, `[Anagh Stock] Portal in-stock par app me declare nahi (${declareNeed.length})`, emailHtml({ kind: "error", code: "DECLARE", message: body, env, now }), "alert");
  }
}
function invStatus(units, threshold) {
  if (units <= 0) return "oos";
  if (units <= (Number(threshold) || 0)) return "low";
  return "in_stock";
}
// order ke line items: [{product_id, name, qty}]
async function fetchOrderLines(env, id) {
  const cookie = (await getSetting(env, "GW_COOKIE")) || cookieHeaderFromState(await getSetting(env, "KC_STATE"));
  if (!cookie) return [];
  const base = env.GW_BASE || "https://gateway.kirana.club";
  const res = await fetch(base + "/dlg/auth/v1/b2b/orders", {
    method: "POST", headers: { ...GW_HEADERS, cookie },
    body: JSON.stringify({ data: { order_id: String(id), warehouse: [] }, request_source: "B2B_EXTERNAL" }),
  }).catch(() => null);
  if (!res) return [];
  const j = await res.json().catch(() => null);
  const d = j && (Array.isArray(j.data) ? j.data[0] : j.data);
  const od = (d && d.order_details) || {};
  const cart = Array.isArray(od.cart) ? od.cart : [];
  const nameById = {};
  for (const c of cart) if (c && c.product_id != null) nameById[String(c.product_id)] = c.name;
  const pp = (od.bill_breakup && od.bill_breakup.products_pricing) || [];
  const lines = [];
  if (Array.isArray(pp) && pp.length) {
    for (const p of pp) {
      if (!p || p.id == null) continue;
      // asli pcs = pack_size × quantity (packet count × packets-per-order)
      const pcs = (Number(p.pack_size) || 1) * (Number(p.quantity) || 1);
      lines.push({ product_id: String(p.id), name: nameById[String(p.id)] || p.key || p.product_name || "", qty: pcs });
    }
  } else {
    for (const c of cart) if (c && c.product_id != null) lines.push({ product_id: String(c.product_id), name: c.name || "", qty: Number(c.quantity) || 1 });
  }
  return lines;
}
// Naye orders aane par: product discover + (agar tracked ho to) stock ghatao
async function applyInventoryForNewOrders(env, ids) {
  if (!ids || !ids.length) return [];
  await ensureInventory(env);
  const already = new Set((await env.DB.prepare("SELECT DISTINCT order_id FROM inv_ledger").all()).results.map((r) => String(r.order_id)));
  const now = Date.now();
  const transitions = [];
  for (const id of ids) {
    if (already.has(String(id))) continue;
    const lines = await fetchOrderLines(env, id).catch(() => []);
    for (const ln of lines) {
      let inv = await env.DB.prepare("SELECT * FROM inventory WHERE product_id=?").bind(ln.product_id).first();
      if (!inv) {
        // naya product discover — bina tracking ke (user pehle units set karega), koi false OOS nahi
        await env.DB.prepare("INSERT OR IGNORE INTO inventory(product_id,sku,name,units,min_qty,threshold,status,tracking,updated_at) VALUES(?,?,?,?,?,?,?,?,?)")
          .bind(ln.product_id, ln.product_id, ln.name || "", 0, 1, 5, "in_stock", 0, now).run();
        continue;
      }
      if (inv.name !== ln.name && ln.name)
        await env.DB.prepare("UPDATE inventory SET name=? WHERE product_id=?").bind(ln.name, ln.product_id).run();
      if (!inv.tracking) continue; // jab tak user units set na kare, ghatao mat
      const before = Number(inv.units) || 0;
      const after = before - (Number(ln.qty) || 0);
      const os = invStatus(before, inv.threshold), ns = invStatus(after, inv.threshold);
      await env.DB.prepare("UPDATE inventory SET units=?, status=?, updated_at=? WHERE product_id=?").bind(after, ns, now, ln.product_id).run();
      await env.DB.prepare("INSERT OR IGNORE INTO inv_ledger(order_id,product_id,qty,ts,kind) VALUES(?,?,?,?,'consume')").bind(String(id), ln.product_id, Number(ln.qty) || 0, now).run();
      if (ns !== os && (ns === "low" || ns === "oos")) transitions.push({ ...inv, before, after, to: ns });
    }
  }
  if (transitions.length) await alertInventory(env, transitions);
  return transitions;
}
// Cancel hone par units wapas (maal dispatch nahi hua)
async function restoreInventory(env, id) {
  await ensureInventory(env);
  const rows = (await env.DB.prepare("SELECT product_id,qty FROM inv_ledger WHERE order_id=? AND kind='consume'").bind(String(id)).all()).results;
  for (const r of rows) {
    await env.DB.prepare("UPDATE inventory SET units=units+?, updated_at=? WHERE product_id=?").bind(Number(r.qty) || 0, Date.now(), r.product_id).run();
    await env.DB.prepare("UPDATE inv_ledger SET kind='restored' WHERE order_id=? AND product_id=?").bind(String(id), r.product_id).run();
    const inv = await env.DB.prepare("SELECT units,threshold FROM inventory WHERE product_id=?").bind(r.product_id).first();
    if (inv) await env.DB.prepare("UPDATE inventory SET status=? WHERE product_id=?").bind(invStatus(inv.units, inv.threshold), r.product_id).run();
  }
}
// Scheduled OOS (user ne time set kiya) + threshold cross — cron me check
async function checkScheduledOOS(env) {
  await ensureInventory(env);
  const now = Date.now();
  const due = (await env.DB.prepare("SELECT * FROM inventory WHERE oos_at IS NOT NULL AND oos_at>0 AND oos_at<=? AND status!='oos'").bind(now).all()).results;
  const trans = [];
  for (const inv of due) {
    await env.DB.prepare("UPDATE inventory SET units=0, status='oos', oos_at=NULL, updated_at=? WHERE product_id=?").bind(now, inv.product_id).run();
    trans.push({ ...inv, before: inv.units, after: 0, to: "oos" });
    // scheduled OOS = explicit intent, portal par hamesha mark karo
    await updateProductOOS(env, inv.product_id, true).catch(() => {});
  }
  if (trans.length) await alertInventory(env, trans);
}
// Alert: mail + push + in-app banner + event; aur gated portal auto-OOS
async function alertInventory(env, transitions) {
  if (!transitions || !transitions.length) return;
  const now = Date.now();
  const oos = transitions.filter((t) => t.to === "oos");
  const low = transitions.filter((t) => t.to === "low");
  await env.DB.batch(transitions.map((t) => env.DB.prepare("INSERT INTO events(ts,type,title) VALUES(?,?,?)")
    .bind(now, "error", `${t.to === "oos" ? "⛔ OUT OF STOCK" : "⚠️ Low stock"}: ${t.name || t.sku || t.product_id} (${t.after} bache)`)));
  // Phone push: dono ke liye turant (crossing pe hi aata hai, har order pe nahi)
  const pTitle = oos.length
    ? `⛔ ${oos.length > 1 ? oos.length + " products" : (oos[0].name || oos[0].sku)} OUT OF STOCK`
    : `⚠️ Low stock: ${low.length > 1 ? low.length + " products" : (low[0].name || low[0].sku)}`;
  await pushNotify(env, "alert", pTitle, transitions.slice(0, 6).map((t) => `${t.to === "oos" ? "⛔" : "⚠️"} ${t.name || t.sku}: ${t.after}`).join("\n"));
  // Mail: OOS turant; Low ko digest (din me 2-3 baar) pe chhodo
  if (oos.length) {
    const body = oos.map((t) => `⛔ ${t.name || t.sku}: ${t.after} bache`).join("\n");
    await sendMail(env, `[Anagh Stock] ${pTitle}`, emailHtml({ kind: "error", code: "OOS", message: body, env, now }), "alert");
  }
  await setSetting(env, "stock_alert", JSON.stringify({ ts: now, oos: oos.map((t) => t.name || t.sku), low: low.map((t) => t.name || t.sku) }));
  // Auto-sync ON ho to portal par bhi OOS mark karo (glitch-guard: ye sirf real order-decrement se aata hai)
  for (const t of oos) if (t.auto_oos) await updateProductOOS(env, t.product_id, true).catch(() => {});
}
// Low-stock DIGEST — din me 2-3 baar (10/15/20 IST), har order pe nahi
async function maybeSendLowDigest(env) {
  await ensureInventory(env);
  const istH = Number(new Date(Date.now() + 5.5 * 3600000).getUTCHours());
  const windows = [10, 15, 20];
  if (!windows.includes(istH)) return;
  const dayKey = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10) + "-" + istH;
  if ((await getSetting(env, "low_digest_sent")) === dayKey) return;
  const low = (await env.DB.prepare("SELECT * FROM inventory WHERE tracking=1 AND status IN('low','oos') ORDER BY status,name").all()).results;
  await setSetting(env, "low_digest_sent", dayKey);
  if (!low.length) return;
  const body = low.map((r) => `${r.status === "oos" ? "⛔" : "⚠️"} ${r.name || r.sku}: ${r.units} bache (alert <= ${r.threshold})`).join("\n");
  await sendMail(env, `[Anagh Stock] Stock digest — ${low.length} product dhyaan maangte hain`, emailHtml({ kind: "error", code: "DIGEST", message: body, env, now: Date.now() }), "alert");
}
// Portal par OOS mark (gated: endpoint capture hone tak sirf event; capture ke baad real)
async function markOOSOnPortal(env, product) {
  return updateProductOOS(env, product.product_id, true);
}
// Seller ne portal par jo set kiya (pack_size = min order qty, mrp, rate) — edit/list se
async function fetchEditMeta(env, ids) {
  if (!ids || !ids.length) return {};
  const j = await gwPost(env, "/dlg/auth/v1/b2b/seller-products/edit/list", { data: { product_ids: ids.map(Number) } });
  const edits = j?.data?.edits;
  const map = {};
  if (Array.isArray(edits)) {
    for (const e of edits) {
      const pid = String(e.product_id), m = e.meta || {};
      if (m.pack_size == null) continue;
      // APPROVED ko preference, warna last
      if (!map[pid] || e.status === "APPROVED") map[pid] = { pack_size: Number(m.pack_size) || 1, mrp: Number(m.mrp_number) || null, rate: Number(m.wholesale_rate) || null, grammage: m.grammage, unit: m.grammage_unit };
    }
  }
  return map;
}
// Poora catalog ek call me (seed ke liye best) — get_products
async function fetchCatalog(env) {
  const wid = Number(env.WAREHOUSE_ID) || 1534;
  let j = await gwPost(env, "/dlg/auth/v1/b2b/get_products", { source: "B2B_EXTERNAL", data: { filters: { sellers: [], show_merged: true }, warehouse_id: wid } });
  let prods = j?.data?.products;
  if (!Array.isArray(prods) || !prods.length) {
    // warehouse_id ke bina dubara try
    j = await gwPost(env, "/dlg/auth/v1/b2b/get_products", { source: "B2B_EXTERNAL", data: { filters: { sellers: [], show_merged: true } } });
    prods = j?.data?.products;
  }
  if (!Array.isArray(prods)) return [];
  return prods.filter((p) => p && p.id != null).map((p) => ({
    product_id: String(p.id), sku: p.sku_code || "", name: p.name || p.name_label || "", is_oos: !!p.is_oos,
  }));
}

// Stock page ke liye low+oos count
async function inventoryList(env) {
  await ensureInventory(env);
  const rows = (await env.DB.prepare("SELECT * FROM inventory ORDER BY CASE status WHEN 'oos' THEN 0 WHEN 'low' THEN 1 ELSE 2 END, tracking DESC, name").all()).results;
  const alerts = rows.filter((r) => r.tracking && (r.status === "oos" || r.status === "low")).length;
  return { rows, alerts };
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
// ---------------- Fast lane: seedhe gateway API se real-time new orders ----------------
const GW_ORDERS = "/dlg/auth/v1/b2b/get_orders";

function cookieHeaderFromState(stateStr) {
  if (!stateStr) return null;
  stateStr = stateStr.trim();
  if (stateStr.startsWith("{")) {
    try {
      const st = JSON.parse(stateStr);
      if (Array.isArray(st.cookies))
        return st.cookies
          .filter((c) => (c.domain || "").includes("kirana.club"))
          .map((c) => `${c.name}=${c.value}`)
          .join("; ");
    } catch (_) {}
    return null;
  }
  return stateStr.replace(/^cookie:\s*/i, "").trim();
}

let detailColReady = false;
async function ensureDetailCol(env) {
  if (detailColReady) return;
  try { await env.DB.prepare("ALTER TABLE orders ADD COLUMN detail TEXT").run(); } catch (_) {}
  detailColReady = true;
}

function detailOf(o) {
  const addr = [o.address_line1, o.address_line2].filter(Boolean).join(", ") || o.address_line || "";
  return {
    customer: o.address_name || "",
    store: o.store_name || "",
    address: addr,
    area: [o.neighbourhood, o.village, o.landmark].filter(Boolean).join(", "),
    city: o.address_city || "",
    state: o.state || "",
    pincode: o.postal_code || "",
    district: (o.user && o.user.district) || "",
    amount: num(o.total),
    paid: num(o.paid_amount),
    payment: o.payment_mode === "COD" ? "COD" : o.advance_taken ? "Partially Paid" : o.payment_mode || "",
    processing: o.processing_status || "",
    note: o.note || "",
    courier: o.updated_by || "",
    date: o.order_date || "",
  };
}

async function fetchOrderExtra(env, id) {
  const cookie = (await getSetting(env, "GW_COOKIE")) || cookieHeaderFromState(await getSetting(env, "KC_STATE"));
  if (!cookie) return null;
  const base = env.GW_BASE || "https://gateway.kirana.club";
  const res = await fetch(base + "/dlg/auth/v1/b2b/orders", {
    method: "POST",
    headers: {
      "content-type": "application/json", accept: "application/json, text/plain, */*",
      origin: "https://supplier.kirana.club", referer: "https://supplier.kirana.club/",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      cookie,
    },
    body: JSON.stringify({ data: { order_id: String(id), warehouse: [] }, request_source: "B2B_EXTERNAL" }),
  });
  const j = await res.json().catch(() => null);
  const d = j && (Array.isArray(j.data) ? j.data[0] : j.data);
  if (!d) return null;
  const od = d.order_details || {};
  const cart = Array.isArray(od.cart) ? od.cart : [];
  const nameById = {};
  for (const c of cart) if (c && c.product_id != null) nameById[String(c.product_id)] = c.name; // English naam
  const pp = od.bill_breakup && od.bill_breakup.products_pricing;
  const products = Array.isArray(pp)
    ? pp.filter((p) => p && (p.product_name || p.key)).map((p) => {
        const pcs = (Number(p.pack_size) || 1) * (Number(p.quantity) || 1);
        const en = nameById[String(p.id)];
        const base = en || p.product_name || p.key || "";
        const unit = num(p.offered_value);
        const total = num(p.total_value) ?? num(p.value);
        return { name: base, pcs, unit, total, price: total };
      })
    : [];
  // summary lines (delivery, discount, total) — English names
  const tp = od.bill_breakup && od.bill_breakup.total_pricing;
  const summary = Array.isArray(tp)
    ? tp.filter((r) => r && !r.is_internal).map((r) => ({ label: r.name || r.key || "", value: typeof r.value === "string" ? r.value.replace(/[̀-̶ͯ]/g, "") : r.value, num: num(r.total_value) }))
    : [];
  return { items: d.total_items, amountStr: d.total_amount_string, invoice: d.delivery_invoice, label: d.printing_label, tracking: d.tracking_link, note: d.note, products, summary, grandTotal: d.total_amount_string };
}

function niceStatus(s) {
  if (!s) return "Unknown";
  const map = {
    IN_TRANSIT: "In Transit", DELIVERED: "Delivered", CANCELLED: "Cancelled",
    SHIPMENT_CREATED: "Shipment Created", CONFIRMED: "Confirmed", NDR: "NDR",
    RTO_DELIVERED: "RTO Delivered", RTO_IN_TRANSIT: "RTO In Transit", RTO_OTHERS: "RTO",
    RETURNED: "Returned", OUT_FOR_DELIVERY: "Out For Delivery",
  };
  return map[s] || s.split("_").map((w) => w[0] + w.slice(1).toLowerCase()).join(" ");
}

function mergeSetCookies(header, setCookieArr) {
  const map = new Map();
  (header || "").split(";").forEach((p) => {
    const i = p.indexOf("="); if (i < 1) return;
    map.set(p.slice(0, i).trim(), p.slice(i + 1).trim());
  });
  for (const sc of setCookieArr || []) {
    const first = (sc || "").split(";")[0];
    const i = first.indexOf("="); if (i < 1) continue;
    const name = first.slice(0, i).trim(), val = first.slice(i + 1).trim();
    if (!val || val.toLowerCase() === "deleted") { map.delete(name); continue; }
    map.set(name, val);
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function directNewOrderPoll(env) {
  const now = Date.now();
  // GW_COOKIE: continuously-refreshed gateway cookie; har browser refresh par reset hoti hai
  let cookie = await getSetting(env, "GW_COOKIE");
  if (!cookie) cookie = cookieHeaderFromState(await getSetting(env, "KC_STATE"));
  if (!cookie) return { ok: false, reason: "no-cookie" };
  const cookieNames = cookie.split(";").map((c) => c.split("=")[0].trim()).filter(Boolean);
  const base = env.GW_BASE || "https://gateway.kirana.club";
  let res, text;
  try {
    res = await fetch(base + GW_ORDERS, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/plain, */*",
        origin: "https://supplier.kirana.club",
        referer: "https://supplier.kirana.club/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        cookie,
      },
      body: JSON.stringify({
        status: [], limit: 50, offset: 0, from: now - 3 * 864e5, to: now + 6e5,
        user_id: "", order_amount: { min: 0, max: 10000000 }, courier: [], source: ["KC"], warehouse: [],
      }),
    });
    text = await res.text();
  } catch (e) {
    await setSetting(env, "fast_status", JSON.stringify({ ts: now, ok: false, err: "fetch-fail" }));
    return { ok: false, reason: "fetch-fail" };
  }
  // Rotated cookie capture — token ko continuously taaza rakhta hai
  const setC = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : res.headers.get("set-cookie") ? [res.headers.get("set-cookie")] : [];
  let j = null;
  try { j = JSON.parse(text); } catch (_) {}
  if (res.status !== 200 || !j || j.status !== "OK" || !j.data) {
    // Server se block / login expire — chup-chaap, browser lane cover karega
    const snippet = String(text || "").replace(/eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g, "<jwt>").slice(0, 250);
    await setSetting(env, "fast_status", JSON.stringify({ ts: now, ok: false, status: res.status, body: snippet }));
    return { ok: false, reason: "bad-response", status: res.status, body: snippet, cookieCount: cookieNames.length, cookieNames: cookieNames.slice(0, 25) };
  }
  // kaam karne wali cookie persist karo + rotation merge karo (continuously fresh)
  if (setC.length) cookie = mergeSetCookies(cookie, setC);
  await setSetting(env, "GW_COOKIE", cookie);
  await setSetting(env, "fast_status", JSON.stringify({ ts: now, ok: true }));
  // insights/ratings bhi taaza rakho (har ~25 min) — cookie yahan valid hai
  const insTs = JSON.parse((await getSetting(env, "insights")) || "null")?.ts || 0;
  if (now - insTs > 25 * 60000) { await fetchInsights(env).catch(() => {}); await fetchRatings(env).catch(() => {}); }
  const orders = j.data.data || [];
  // Har order ka detail (address etc.) store/update karo — order details ke liye
  await ensureDetailCol(env);
  const dStmts = orders.filter((o) => o.order_id != null)
    .map((o) => env.DB.prepare("UPDATE orders SET detail=? WHERE id=?").bind(JSON.stringify(detailOf(o)), String(o.order_id)));
  for (let i = 0; i < dStmts.length; i += 50) await env.DB.batch(dStmts.slice(i, i + 50));
  const existing = new Set((await env.DB.prepare("SELECT id FROM orders").all()).results.map((r) => r.id));
  if (existing.size === 0) return { ok: true, seeded: 0 }; // baseline browser lane banayega
  const fresh = orders.filter((o) => o.order_id != null && !existing.has(String(o.order_id)));
  if (!fresh.length) return { ok: true, new: 0 };

  const mk = (o) => {
    const id = String(o.order_id);
    const amount = num(o.total);
    const status = niceStatus(o.display_status || o.delivery_status);
    const customer = o.address_name || o.store_name || "";
    const city = o.address_city || (o.user && o.user.district) || "";
    const payment = o.payment_mode === "COD" ? "COD" : o.advance_taken ? "Partially Paid" : o.payment_mode || "";
    return { id, amount, status, customer, city, payment, placedAt: o.order_date || null, detail: JSON.stringify(detailOf(o)) };
  };
  const items = fresh.map(mk);
  const stmts = [];
  for (const o of items) {
    stmts.push(
      env.DB.prepare(
        "INSERT OR IGNORE INTO orders(id,status,amount,customer,city,placed_at,payment,detail,first_seen,updated_at,history) VALUES(?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(o.id, o.status, o.amount, o.customer || null, o.city || null, o.placedAt, o.payment || null, o.detail, now, now, JSON.stringify([{ s: o.status, t: now }]))
    );
    stmts.push(
      env.DB.prepare("INSERT INTO events(ts,type,title) VALUES(?,?,?)").bind(now, "new_order", describe({ type: "new_order", ...o }))
    );
  }
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));

  // Inventory: fast-lane se mile naye orders par bhi stock ghatao (ledger se double nahi hoga)
  await applyInventoryForNewOrders(env, items.map((o) => o.id)).catch(() => {});

  // Notification + mail (new order = dono, aapke rule ke hisaab se)
  const title = items.length === 1
    ? `🆕 New order #${items[0].id} · ${inr(items[0].amount)}`
    : `🆕 ${items.length} naye orders · ${inr(items.reduce((a, x) => a + (x.amount || 0), 0))}`;
  const body = items.slice(0, 5).map((o) => `#${o.id} ${inr(o.amount)}${o.customer ? " · " + o.customer : ""}${o.payment ? " · " + o.payment : ""}`).join("\n");
  await pushNotify(env, "order", title, body);
  const prev = await env.DB.prepare("SELECT metrics,status_counts FROM runs WHERE ok=1 ORDER BY ts DESC LIMIT 1").first();
  const pm = prev ? JSON.parse(prev.metrics || "{}") : {};
  const pc = prev ? JSON.parse(prev.status_counts || "{}") : {};
  const time = new Date(now).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true });
  const changes = items.map((o) => ({ type: "new_order", ...o }));
  await sendMail(env, `[Kirana Club] 🆕 NEW ORDER: ${items.map((o) => "#" + o.id).slice(0, 3).join(", ")} – ${time}`,
    emailHtml({ kind: "report", firstRun: false, changes, metrics: pm, prevMetrics: pm, statusCounts: pc, env, now }), "order");
  return { ok: true, new: items.length };
}

const GW_HEADERS = {
  "content-type": "application/json", accept: "application/json, text/plain, */*",
  origin: "https://supplier.kirana.club", referer: "https://supplier.kirana.club/",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};
function readSetCookies(res, jar) {
  const sc = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : res.headers.get("set-cookie") ? [res.headers.get("set-cookie")] : [];
  for (const s of sc) {
    const f = (s || "").split(";")[0]; const i = f.indexOf("=");
    if (i > 0) { const n = f.slice(0, i).trim(), v = f.slice(i + 1).trim(); if (v && v.toLowerCase() !== "deleted") jar.set(n, v); }
  }
}
async function jarFetch(jar, url, opts) {
  const cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  const res = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), ...(cookie ? { cookie } : {}) } });
  readSetCookies(res, jar);
  return res;
}

// In-app Gmail+OTP login: OTP bhejta hai
async function loginStart(env, email) {
  const base = env.GW_BASE || "https://gateway.kirana.club";
  const r = await fetch(base + "/dlg/auth/b2b/seller/login", { method: "POST", headers: GW_HEADERS, body: JSON.stringify({ identifier: email, email }) });
  const j = await r.json().catch(() => null);
  if (r.status === 200 && j && j.status) { await setSetting(env, "seller_email", email); return { ok: true, masked: j.data?.masked_phone || "", channel: j.data?.channel || "email" }; }
  return { ok: false, error: (j && j.status) || `HTTP ${r.status}` };
}
// OTP verify karke session cookies capture + store karta hai
async function loginVerify(env, email, code) {
  const base = env.GW_BASE || "https://gateway.kirana.club";
  const sup = env.SUP_BASE || "https://supplier.kirana.club";
  const jar = new Map();
  let csrf = "";
  try { const cr = await jarFetch(jar, sup + "/api/auth/csrf", { headers: { accept: "application/json" } }); csrf = (await cr.json().catch(() => null))?.csrfToken || ""; } catch (_) {}
  const co = await jarFetch(jar, base + "/dlg/auth/b2b/seller/confirm-otp", { method: "POST", headers: GW_HEADERS, body: JSON.stringify({ identifier: email, email, code: String(code) }) });
  const coj = await co.json().catch(() => null);
  if (co.status !== 200 || !coj || !/success/i.test(coj.status || "")) return { ok: false, error: (coj && coj.status) || "OTP galat ya expire ho gaya" };
  const user = coj.data?.user;
  if (user && csrf) {
    try {
      const form = new URLSearchParams({ email, userData: JSON.stringify(user), csrfToken: csrf, callbackUrl: sup + "/login", json: "true" });
      await jarFetch(jar, sup + "/api/auth/callback/credentials", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin: sup, referer: sup + "/login", "user-agent": GW_HEADERS["user-agent"] }, body: form.toString() });
    } catch (_) {}
  }
  const cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  if (!cookie) return { ok: false, error: "Login cookies capture nahi hui" };
  await setSetting(env, "KC_STATE", cookie);
  await setSetting(env, "GW_COOKIE", cookie);
  await setSetting(env, "failing", "");
  await setSetting(env, "seller_email", email);
  const test = await directNewOrderPoll(env).catch(() => ({ ok: false }));
  return { ok: true, working: !!test.ok };
}

// placed_at string ("Nov 19 at 8:11pm") → us din ka UTC-midnight (sirf date compare ke liye)
function placedTs(s, nowTs) {
  if (!s) return null;
  const m = String(s).toLowerCase().match(/([a-z]{3})\s+(\d{1,2})/);
  if (!m || MON[m[1]] == null) return null;
  const mon = MON[m[1]], day = Number(m[2]);
  const istNow = new Date(nowTs + 5.5 * 3600000);
  let year = istNow.getUTCFullYear();
  if (mon > istNow.getUTCMonth()) year -= 1; // Dec jab abhi Jan → pichhla saal
  return Date.UTC(year, mon, day);
}
function istDay(ts) { const d = new Date(ts + 5.5 * 3600000); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); }

// AI assistant — query engine (free, exact, data app me hi rehta hai)
async function askBot(env, q) {
  const raw = String(q || "").trim();
  const text = raw.toLowerCase().replace(/[?.!,]/g, " ").replace(/\s+/g, " ");
  if (!text) return "Poochhiye — jaise \"kal kitne orders aaye\", \"in-transit ki total value\", \"Meat Masala ka stock\", \"aaj ki sale\".";
  const d = await loadDashboard(env);
  const now = d.now || Date.now();
  const counts = d.latest?.counts || {};
  const metrics = d.latest?.metrics || {};
  const orders = d.orders || [];
  const ins = d.insights?.items || [];
  const inv = (d.inventory?.rows || []);
  const rupee = (v) => "₹" + Math.round(Number(v) || 0).toLocaleString("en-IN");
  const has = (...w) => w.some((x) => text.includes(x));
  const DAY = 86400000;

  // ---------- STOCK ----------
  if (has("low stock", "kam stock", "restock", "reorder", "khatam hone")) {
    const low = inv.filter((r) => r.tracking && (r.status === "low" || r.status === "oos"));
    return low.length ? `⚠️ Dhyaan maangte hain (${low.length}):\n` + low.map((r) => `${r.status === "oos" ? "⛔" : "⚠️"} ${r.name || r.sku}: ${r.units} bache`).join("\n") : "✅ Koi tracked product low/OOS nahi.";
  }
  if (has("out of stock", "oos", "stock khatam")) {
    const o = inv.filter((r) => r.tracking && r.status === "oos");
    const po = inv.filter((r) => Number(r.portal_oos) === 1);
    let out = o.length ? `⛔ App me OOS:\n` + o.map((r) => `• ${r.name || r.sku}`).join("\n") : "";
    if (po.length) out += (out ? "\n\n" : "") + `Portal par OOS:\n` + po.map((r) => `• ${r.name || r.sku}`).join("\n");
    return out || "✅ Kuch bhi out of stock nahi.";
  }

  // ---------- Daily average orders ----------
  if (has("per day", "daily", "din ka", "rozana", "prati din", "har din") || (has("average", "avg", "aausat") && has("order") && !has("value", "amount", "rupay", "rupee", "kitne ka"))) {
    const a = d.dailyAvg || {};
    const since = a.since ? new Date(a.since).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }) : "";
    return `📈 Daily average: ${a.avg ?? 0} orders/din\n${a.orders ?? 0} orders ÷ ${a.days ?? 0} din${since ? " (" + since + " se)" : ""}`;
  }

  // ---------- Date range ----------
  const t0 = istDay(now);
  let range = null, rangeLabel = "";
  if (has("aaj", "today")) { range = [t0, t0]; rangeLabel = "Aaj"; }
  else if (has("parso", "day before")) { range = [t0 - 2 * DAY, t0 - 2 * DAY]; rangeLabel = "Parso"; }
  else if (has("kal", "yesterday")) { range = [t0 - DAY, t0 - DAY]; rangeLabel = "Kal"; }
  else if (has("is hafte", "this week", "hafte", "7 din", "week", "saat din")) { range = [t0 - 6 * DAY, t0]; rangeLabel = "Pichhle 7 din"; }
  else { const m = text.match(/(?:last|pichhle|pichle)\s+(\d{1,2})\s*(?:din|days)/); if (m) { const n = Number(m[1]); range = [t0 - (n - 1) * DAY, t0]; rangeLabel = `Pichhle ${n} din`; } }

  // ---------- Status filter ----------
  let stRe = null, stName = "";
  if (/\bndr\b/.test(text)) { stRe = /ndr/; stName = "NDR"; }
  else if (/\brto\b/.test(text)) { stRe = /rto/; stName = "RTO"; }
  else if (has("cancel")) { stRe = /cancel/; stName = "Cancelled"; }
  else if (has("transit", "raaste", "shipment")) { stRe = /transit|shipment/; stName = "In Transit"; }
  else if (has("deliver", "pahunch")) { stRe = /deliver/; stName = "Delivered"; }
  else if (has("confirm", "naya order", "naye order", "new order")) { stRe = /confirm/; stName = "Confirmed"; }

  // ---------- Metric ----------
  const wantValue = has("value", "amount", "total value", "kitne ka", "kitna", "kitne ki", "worth", "rupay", "rupee", "paisa", "revenue", "kamai");
  const wantAvg = has("average", "avg", "aausat", "ausat");
  const wantMax = has("sabse bada", "sabse mehenga", "largest", "biggest", "max", "highest");
  const wantMin = has("sabse chhota", "sabse sasta", "smallest", "min", "lowest");
  const wantList = has("list", "dikhao", "dikha", "kaunse", "konse", "which", "naam");

  // ---------- Order query (date aur/ya status) ----------
  if (range || stRe || wantValue || wantAvg || wantMax || wantMin) {
    let f = orders;
    if (stRe) f = f.filter((o) => stRe.test((o.status || "").toLowerCase()));
    if (range) f = f.filter((o) => { const dd = placedTs(o.placed_at, now); return dd != null && dd >= range[0] && dd <= range[1]; });
    if (has("cod")) f = f.filter((o) => /cod/i.test(o.payment || ""));
    if (has("prepaid", "paid", "online")) f = f.filter((o) => /paid|prepaid/i.test(o.payment || ""));
    const amts = f.map((o) => Number(o.amount) || 0);
    const total = amts.reduce((a, b) => a + b, 0);
    const label = [rangeLabel, stName].filter(Boolean).join(" · ") || "Filter";
    if (wantMax && f.length) { const o = f.reduce((a, b) => ((Number(b.amount) || 0) > (Number(a.amount) || 0) ? b : a)); return `${label} — sabse bada: #${o.id} · ${rupee(o.amount)}${o.customer ? " · " + o.customer : ""}`; }
    if (wantMin && f.length) { const o = f.reduce((a, b) => ((Number(b.amount) || 0) < (Number(a.amount) || 0) ? b : a)); return `${label} — sabse chhota: #${o.id} · ${rupee(o.amount)}${o.customer ? " · " + o.customer : ""}`; }
    if (wantAvg) return `${label}: ${f.length} orders, average ${rupee(f.length ? total / f.length : 0)}`;
    let head = `${label}: ${f.length} order${f.length === 1 ? "" : "s"} · total ${rupee(total)}`;
    if (wantList || (f.length && f.length <= 15)) head += "\n" + f.slice(0, 15).map((o) => `#${o.id}${o.customer ? " · " + o.customer : ""} · ${rupee(o.amount)}`).join("\n");
    return head;
  }

  // ---------- Top products ----------
  if (has("top", "best", "sabse") && has("product", "bik", "sell", "chal")) {
    return ins.length ? `📊 Top products (30 din):\n` + ins.slice(0, 6).map((p) => `${p.rank}. ${p.name} — ${p.units} units, ${p.orders} orders${p.oos ? " ⛔" : ""}`).join("\n") : "Insights abhi load nahi hua.";
  }

  // ---------- Specific product (stock + sales) ----------
  const stop = ["order","orders","stock","kitna","kitne","konsa","kaunsa","kaunse","product","hai","mera","hua","wala","kya","total","value"];
  const words = text.split(" ").filter((w) => w.length > 3 && !stop.includes(w));
  if (words.length) {
    const hit = inv.find((r) => words.some((w) => (r.name || "").toLowerCase().includes(w))) || ins.find((p) => words.some((w) => (p.name || "").toLowerCase().includes(w)));
    if (hit) {
      const name = hit.name || hit.sku;
      const st = inv.find((r) => (r.name || "").toLowerCase() === (name || "").toLowerCase());
      const sale = ins.find((p) => (p.name || "").toLowerCase() === (name || "").toLowerCase());
      const bits = [`📦 ${name}`];
      if (st) { bits.push(`App stock: ${st.units}${st.per_bundle ? ` (${Math.floor(st.units / st.per_bundle)} bundle + ${st.units % st.per_bundle} pcs)` : ""} — ${st.tracking ? st.status : "track off"}`); bits.push(`Portal: ${Number(st.portal_oos) ? "OUT OF STOCK" : "In stock"}`); }
      if (sale) bits.push(`30 din: ${sale.units} units, ${sale.orders} orders`);
      return bits.join("\n");
    }
  }

  // ---------- Fallback: sale/summary ----------
  if (has("sale", "bikri", "mahine", "month")) return Object.entries(metrics).map(([k, v]) => `${k}: ${typeof v === "number" && /sale|value/i.test(k) ? rupee(v) : v}`).join("\n") || "Abhi data nahi.";
  if (has("summary", "status", "kitne order", "saare order")) return Object.entries(counts).filter(([s]) => !/all/i.test(s)).map(([s, n]) => `${s}: ${n}`).join("\n") || "Abhi data nahi.";
  return "Main exact jawab de sakta hoon:\n• \"kal kitne orders aaye\", \"parso ki sale\", \"is hafte kitne order\"\n• \"in-transit ki total value\", \"NDR orders\", \"sabse bada order\"\n• \"Meat Masala ka stock\", \"kya low stock hai\", \"top product\"";
}

async function gwPost(env, path, body) {
  const cookie = (await getSetting(env, "GW_COOKIE")) || cookieHeaderFromState(await getSetting(env, "KC_STATE"));
  if (!cookie) return null;
  const base = env.GW_BASE || "https://gateway.kirana.club";
  try {
    const res = await fetch(base + path, {
      method: "POST",
      headers: {
        "content-type": "application/json", accept: "application/json, text/plain, */*",
        origin: "https://supplier.kirana.club", referer: "https://supplier.kirana.club/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        cookie,
      },
      body: JSON.stringify(body),
    });
    if (res.status !== 200) return null;
    return await res.json();
  } catch (_) { return null; }
}

async function fetchInsights(env) {
  const j = await gwPost(env, "/dlg/auth/v1/b2b/sales-insights/v2/sku-leaderboard",
    { data: { date_range: "30d", order_type: "ALL", seller: [], limit: 50, offset: 0, sort_by: "units_sold", sort_direction: "desc" } });
  const items = j?.data?.sku_leaderboard?.items;
  if (!Array.isArray(items)) return;
  const clean = items.map((p) => ({
    rank: p.rank, code: p.sku_code, name: p.sku_name, qty: p.quantity, mrp: p.mrp,
    units: p.units_sold, orders: p.orders, change: p.change_percent, dir: p.change_type,
    oos: /oos|out/i.test(String(p.product_status || "")),
  }));
  await setSetting(env, "insights", JSON.stringify({ ts: Date.now(), range: "30d", items: clean }));
}

async function fetchRatings(env) {
  const email = (await getSetting(env, "seller_email")) || "";
  const sum = await gwPost(env, "/dlg/auth/v1/b2b/ratings/get_sellers_ratings_summary",
    { seller: [], time_range: 30, updated_by: email, request_source: "B2B_EXTERNAL" });
  const prods = await gwPost(env, "/dlg/auth/v1/b2b/ratings/get_sellers_products_ratings",
    { seller: [], updated_by: email, request_source: "B2B_EXTERNAL" });
  const out = { ts: Date.now(), summary: sum?.data || null, products: (prods?.data?.products || []).map((p) => ({
    name: p.product_name, code: p.product_code, mrp: p.mrp, oos: p.is_oos,
    rating: p.average_rating, ratings: p.total_ratings, reviews: p.total_reviews,
  })) };
  if (out.summary || out.products.length) await setSetting(env, "ratings", JSON.stringify(out));
}

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

// IST mein raat 12:00 se subah 7:30 tak koi check nahi
function istMinutes(ts) {
  const d = new Date(ts + 330 * 60000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}
const isQuiet = (ts) => istMinutes(ts) < 7 * 60 + 30;

async function cronTick(env) {
  const now = Date.now();
  if (isQuiet(now)) return; // raat: silent

  // FAST LANE: har tick (5 min) seedhe API se new order check — real-time alert
  await directNewOrderPoll(env).catch(() => {});

  // HEAVY LANE (browser, full data): sirf har 30 min (:00 aur :30 ke paas)
  if (istMinutes(now) % 30 >= 5) return;

  await env.DB.prepare("DELETE FROM runs WHERE ts < ?").bind(now - 90 * 864e5).run();
  await env.DB.prepare("DELETE FROM events WHERE ts < ? AND type IN ('metric','info')").bind(now - 180 * 864e5).run();
  await ensureCleanupTable(env);
  await env.DB.prepare("DELETE FROM cleanup_log WHERE ts < ?").bind(now - 31 * 864e5).run();
  await env.DB.prepare("DELETE FROM notifications WHERE ts < ?").bind(now - 7 * 864e5).run();
  const last = await env.DB.prepare("SELECT ts FROM runs ORDER BY ts DESC LIMIT 1").first();
  if (istMinutes(now) >= 8 * 60 + 45 && last && now - last.ts > 75 * 60000 && !(await getSetting(env, "stale_alerted"))) {
    await setSetting(env, "stale_alerted", "1");
    const mins = Math.round((now - last.ts) / 60000);
    await env.DB.prepare("INSERT INTO events(ts,type,title) VALUES(?,?,?)").bind(now, "error", `${mins} min se koi check nahi aaya`).run();
    await sendMail(env, "[Kirana Club] ⚠ Monitor ruka hua hai",
      emailHtml({ kind: "error", code: "STALE", message: `Pichhle ${mins} minute se koi check complete nahi hua. GitHub Actions ka run dekhiye.`, env, now }), "alert");
    await pushNotify(env, "alert", "⚠️ Monitor ruka hua hai", `${mins} min se koi check nahi hua`);
  }
  await fetchInsights(env).catch(() => {});
  await fetchRatings(env).catch(() => {});
  await checkScheduledOOS(env).catch(() => {});
  await syncPortalStatus(env).catch(() => {});
  await maybeSendLowDigest(env).catch(() => {});
  await dispatch(env);
}

// ---------------- Push notifications (web app, Android + iPhone) ----------------
const inr = (a) => (a != null ? "₹" + Number(a).toLocaleString("en-IN") : "");
const b64u = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function buildNotice(changes, metrics) {
  const no = changes.filter((c) => c.type === "new_order");
  const st = changes.filter((c) => c.type === "status");
  const ot = changes.filter((c) => c.type !== "new_order" && c.type !== "status");
  const today = metrics["Today's Sales"];
  const tail = today != null ? `Aaj ki sale: ${inr(today)}` : "";
  const icon = (s) => (/rto|return|exception|ndr/i.test(s) ? "🔴" : /cancel/i.test(s) ? "⚪" : /deliver/i.test(s) ? "✅" : "🚚");
  if (no.length) {
    const c = no[0];
    const title = no.length === 1
      ? `🆕 New order #${c.id} · ${inr(c.amount)}`
      : `🆕 ${no.length} naye orders · ${inr(no.reduce((a, x) => a + (x.amount || 0), 0))}`;
    const lines = no.length === 1
      ? [[c.customer, c.city].filter(Boolean).join(", ") + (c.payment ? ` · ${c.payment}` : "")]
      : no.slice(0, 4).map((x) => `#${x.id} ${inr(x.amount)} · ${x.customer || ""}`);
    if (st.length + ot.length) lines.push(`+${st.length + ot.length} aur update`);
    if (tail) lines.push(tail);
    return { kind: "order", title, body: lines.join("\n") };
  }
  if (st.length) {
    const c = st[0];
    const title = st.length === 1 ? `${icon(c.to)} #${c.id}: ${c.to}` : `🚚 ${st.length} orders ka status badla`;
    const lines = st.slice(0, 4).map((x) => `${icon(x.to)} #${x.id}: ${x.from} → ${x.to}`);
    if (st.length === 1 && c.customer) lines[0] += ` · ${c.customer}`;
    if (st.length > 4) lines.push(`…aur ${st.length - 4}`);
    if (ot.length) lines.push(`+${ot.length} aur update`);
    return { kind: "change", title, body: lines.join("\n") };
  }
  return { kind: "change", title: "🔔 Kirana Club update", body: ot.slice(0, 4).map((c) => describe(c)).join("\n") };
}

async function vapid(env) {
  const saved = await getSetting(env, "VAPID");
  if (saved) return JSON.parse(saved);
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const v = { priv: await crypto.subtle.exportKey("jwk", kp.privateKey), pub: b64u(await crypto.subtle.exportKey("raw", kp.publicKey)) };
  await setSetting(env, "VAPID", JSON.stringify(v));
  return v;
}

async function pushOne(env, endpoint, v) {
  const enc = (o) => b64u(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = enc({ typ: "JWT", alg: "ES256" }) + "." +
    enc({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:noreply@anaghmasale.com" });
  const key = await crypto.subtle.importKey("jwk", v.priv, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned));
  return fetch(endpoint, {
    method: "POST",
    headers: { authorization: `vapid t=${unsigned}.${b64u(sig)}, k=${v.pub}`, TTL: "86400", Urgency: "high", "content-length": "0" },
  });
}

// Notification ka text DB mein, phone ko sirf "jago" signal; app ka service worker text yahan se padhta hai
async function pushNotify(env, kind, title, body) {
  try {
    await env.DB.prepare("INSERT INTO notifications(ts,kind,title,body) VALUES(?,?,?,?)").bind(Date.now(), kind, title, body || "").run();
    const subs = (await env.DB.prepare("SELECT endpoint FROM push_subs").all()).results;
    if (!subs.length) return { sent: 0 };
    const v = await vapid(env);
    let sent = 0;
    for (const s of subs) {
      const r = await pushOne(env, s.endpoint, v).catch(() => null);
      if (r && (r.status === 404 || r.status === 410))
        await env.DB.prepare("DELETE FROM push_subs WHERE endpoint=?").bind(s.endpoint).run();
      else if (r && r.status < 300) sent++;
    }
    return { sent, total: subs.length };
  } catch (_) {
    return { sent: 0 };
  }
}

const SW_JS = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("push", (e) => {
  e.waitUntil((async () => {
    let n = { id: Date.now(), kind: "change", title: "Kirana Club update", body: "Dashboard kholiye" };
    try {
      const r = await fetch("/api/notify/latest", { credentials: "include", cache: "no-store" });
      if (r.ok) { const j = await r.json(); if (j && j.title) n = j; }
    } catch (_) {}
    const order = n.kind === "order", quiet = n.kind === "quiet";
    if (quiet) {
      const old = await self.registration.getNotifications({ tag: "kc-quiet" });
      old.forEach((x) => x.close());
    }
    await self.registration.showNotification(n.title, quiet
      ? { body: n.body, tag: "kc-quiet", renotify: false, silent: true, icon: "/icon.png", badge: "/icon.png", data: { url: "/" } }
      : { body: n.body, tag: "kc-" + n.id, renotify: true, icon: "/icon.png", badge: "/icon.png",
          vibrate: order ? [300, 120, 300, 120, 700] : [200, 100, 200], requireInteraction: order, data: { url: "/" } });
    const cs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    cs.forEach((c) => c.postMessage({ type: "kc-notify", n }));
  })());
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const cs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of cs) { if ("focus" in c) { try { await c.navigate("/"); } catch (_) {} return c.focus(); } }
    return self.clients.openWindow("/");
  })());
});`;

let cleanupReady = false;
async function ensureCleanupTable(env) {
  if (cleanupReady) return;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS cleanup_log (msg_id TEXT PRIMARY KEY, ts INTEGER NOT NULL, mail_ts INTEGER, subject TEXT)").run();
  cleanupReady = true;
}
const d_lastEvent = (evs) => (evs[0] ? { id: evs[0].id } : { id: 0 });

// ---------------- helpers ----------------
// Mail type ke hisaab se bhejne wale ka naam + "+tag" address (Gmail filter/label ke liye)
const MAIL_KIND = {
  order: "🆕 KC New Order",
  change: "🔔 KC Update",
  quiet: "KC No Change",
  alert: "⚠️ KC Alert",
};
async function sendMail(env, subject, htmlBody, tag = "change") {
  if (!env.RESEND_API_KEY || !env.MAIL_TO) return;
  const fromAddr = (env.MAIL_FROM.match(/<([^>]+)>/) || [null, env.MAIL_FROM])[1];
  const from = `${MAIL_KIND[tag] || "Kirana Monitor"} <${fromAddr}>`;
  const to = env.MAIL_TO.split(",").map((s) => s.trim()).filter(Boolean)
    .map((a) => (/@gmail\.com$/i.test(a) ? a.replace("@", `+kc-${tag}@`) : a));
  try {
    await fetch(env.RESEND_URL || "https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to, subject, html: htmlBody }),
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

const ICON_PNG = "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";
