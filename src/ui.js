import { esc, fmtVal, fmtTime, fmtDay, dayKey, ago, statusTone, describe, isMoney } from "./util.js";

const CSS = `
:root{--bg:#F6F3EE;--card:#fff;--ink:#1E1914;--muted:#7B7168;--line:#EAE3D9;--accent:#C4623A;--accent-ink:#fff;
--good:#1E7F55;--good-bg:#E5F3EB;--bad:#BF3A2B;--bad-bg:#FBE8E5;--warn:#A86A12;--warn-bg:#FCF1DE;--info:#3756C8;--info-bg:#E8EDFC;
--new:#6A45BE;--new-bg:#EFEAFB;--mute:#6B7280;--mute-bg:#F0F0EF;--r:14px}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1180px;margin:0 auto;padding:20px 16px 48px}
header{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.mark{width:40px;height:40px;border-radius:11px;background:var(--accent);color:#fff;display:grid;place-items:center;font-weight:700;letter-spacing:.5px}
.title h1{font-size:18px;margin:0;line-height:1.2}.title p{margin:0;color:var(--muted);font-size:13px}
.spacer{flex:1}
.pill{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:999px;font-size:13px;font-weight:600}
.pill i{width:8px;height:8px;border-radius:50%;background:currentColor}
.pill.good{color:var(--good);background:var(--good-bg)}.pill.good i{animation:pulse 2s infinite}
.pill.bad{color:var(--bad);background:var(--bad-bg)}.pill.warn{color:var(--warn);background:var(--warn-bg)}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(30,127,85,.5)}70%{box-shadow:0 0 0 7px rgba(30,127,85,0)}100%{box-shadow:0 0 0 0 rgba(30,127,85,0)}}
button,.btn{font:inherit;font-size:14px;font-weight:600;border:0;border-radius:10px;padding:9px 14px;cursor:pointer;background:var(--ink);color:#fff}
button.ghost{background:transparent;color:var(--muted);border:1px solid var(--line)}
button:active{transform:translateY(1px)}
.meta{margin:14px 0 18px;color:var(--muted);font-size:13px;display:flex;gap:6px 16px;flex-wrap:wrap}
.meta b{color:var(--ink);font-weight:600}
.banner{border-radius:var(--r);padding:14px 16px;margin-bottom:16px;font-size:14px}
.banner.demo{background:var(--warn-bg);color:#6E4A0E}
.banner.bad{background:var(--bad-bg);color:#7D2219}
.banner form{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.banner input{flex:1;min-width:220px;font:inherit;padding:9px 12px;border-radius:10px;border:1px solid #E7C8C2;background:#fff}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:16px}
.kpi .l{color:var(--muted);font-size:13px}
.kpi .v{font-size:26px;font-weight:700;letter-spacing:-.5px;margin-top:4px;font-variant-numeric:tabular-nums}
.kpi .d{font-size:12.5px;margin-top:4px;font-weight:600;color:var(--muted)}
.kpi .d.up{color:var(--good)}.kpi .d.down{color:var(--bad)}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
.chip{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:12px;font-size:13.5px;font-weight:600}
.chip b{font-size:16px;font-variant-numeric:tabular-nums}
.t-good{color:var(--good);background:var(--good-bg)}.t-bad{color:var(--bad);background:var(--bad-bg)}.t-warn{color:var(--warn);background:var(--warn-bg)}
.t-info{color:var(--info);background:var(--info-bg)}.t-new{color:var(--new);background:var(--new-bg)}.t-mute{color:var(--mute);background:var(--mute-bg)}
.grid{display:grid;grid-template-columns:1fr;gap:16px}
@media(min-width:960px){.grid{grid-template-columns:380px 1fr}}
h2{font-size:15px;margin:0 0 12px;display:flex;justify-content:space-between;align-items:baseline}
h2 small{color:var(--muted);font-weight:500;font-size:12.5px}
.tl{list-style:none;margin:0;padding:0;max-height:640px;overflow:auto}
.tl .day{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin:14px 0 6px}
.tl .day:first-child{margin-top:0}
.ev{display:grid;grid-template-columns:62px 10px 1fr;gap:10px;padding:7px 0;font-size:14px;align-items:start}
.ev time{color:var(--muted);font-size:12.5px;font-variant-numeric:tabular-nums;padding-top:1px}
.dot{width:9px;height:9px;border-radius:50%;margin-top:6px;background:var(--line)}
.dot.new_order{background:var(--accent)}.dot.status{background:var(--info)}.dot.metric,.dot.count{background:var(--good)}
.dot.error{background:var(--bad)}.dot.info{background:var(--muted)}
.empty{color:var(--muted);font-size:14px;padding:12px 0}
.chart svg{width:100%;height:auto;display:block}
table{width:100%;border-collapse:collapse;font-size:14px}
th{text-align:left;color:var(--muted);font-weight:600;font-size:12.5px;padding:8px 8px;border-bottom:1px solid var(--line)}
td{padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:top}
tr:last-child td{border-bottom:0}
td.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.tag{display:inline-block;padding:3px 9px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap}
.sub{color:var(--muted);font-size:12.5px}
.tablewrap{overflow-x:auto;margin:0 -8px}
.toast{position:fixed;left:50%;top:16px;transform:translateX(-50%) translateY(-140%);transition:transform .35s ease;z-index:50;
background:#1E1914;color:#fff;border-radius:14px;padding:14px 18px;box-shadow:0 10px 30px rgba(0,0,0,.25);width:min(92vw,420px)}
.toast.show{transform:translateX(-50%) translateY(0)}.toast b{display:block;font-size:15px;margin-bottom:3px}.toast span{font-size:13.5px;opacity:.85;white-space:pre-line}
.toast.order{background:#1E7F55}
.pushbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.pushbar .sub{flex:1;min-width:200px}
details.card summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:baseline;font-weight:700;font-size:15px}
details.card summary::-webkit-details-marker{display:none}
.cl{list-style:none;margin:12px 0 0;padding:0;max-height:520px;overflow:auto}
.cl li{display:grid;grid-template-columns:62px 1fr auto;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);font-size:13.5px;align-items:baseline}
.cl a{color:var(--info);font-weight:600;text-decoration:none;white-space:nowrap}
footer{margin-top:28px;display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
@media(max-width:600px){.kpi .v{font-size:22px}.hide-sm{display:none}}
`;

const page = (title, body, refresh = false) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#C4623A">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="KC Tracker"><link rel="apple-touch-icon" href="/icon.png">
${refresh ? '<meta http-equiv="refresh" content="300">' : ""}<title>${title}</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%23C4623A'/><text x='16' y='21' font-size='14' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='700'>KC</text></svg>">
<style>${CSS}</style></head><body>${body}</body></html>`;

export function loginPage(error) {
  return page("Kirana Club Tracker", `<div class="wrap" style="max-width:380px;padding-top:12vh">
  <div class="card" style="padding:28px">
    <div class="mark" style="margin-bottom:16px">KC</div>
    <h1 style="font-size:20px;margin:0 0 4px">Kirana Club Tracker</h1>
    <p class="sub" style="margin:0 0 18px">Dashboard dekhne ke liye password daaliye</p>
    <form method="post" action="/login" style="display:grid;gap:10px">
      <input type="password" name="password" placeholder="Password" autofocus required
        style="font:inherit;padding:11px 12px;border-radius:10px;border:1px solid var(--line)">
      ${error ? '<div style="color:var(--bad);font-size:13px">Password galat hai</div>' : ""}
      <button>Open dashboard</button>
    </form>
  </div></div>`);
}

function health(d) {
  const lr = d.lastRun;
  if (!lr) return { tone: "warn", text: "Pehle check ka intezaar" };
  if (!lr.ok) return { tone: "bad", text: lr.error_code === "SESSION" ? "Login expired" : "Error" };
  if (d.now - lr.ts > 45 * 60000) return { tone: "warn", text: "Check late hai" };
  return { tone: "good", text: "Live" };
}

function delta(label, cur, prev) {
  if (typeof cur !== "number" || typeof prev !== "number") return `<div class="d">&nbsp;</div>`;
  const diff = cur - prev;
  if (!diff) return `<div class="d">Pichhle check jaisa</div>`;
  const s = (diff > 0 ? "+" : "−") + fmtVal(label, Math.abs(diff));
  return `<div class="d ${diff > 0 ? "up" : "down"}">${s} pichhle check se</div>`;
}

function chart(dayList, now) {
  const days = [];
  for (let i = 13; i >= 0; i--) days.push(dayKey(now - i * 864e5));
  const counts = Object.fromEntries(days.map((k) => [k, 0]));
  for (const k of dayList) if (k in counts) counts[k]++;
  const vals = days.map((k) => counts[k]);
  const max = Math.max(1, ...vals);
  const W = 560, H = 150, pad = 22, bw = (W - 8) / 14;
  const bars = vals.map((v, i) => {
    const h = Math.max(v ? 4 : 2, (v / max) * (H - pad - 20));
    const x = 4 + i * bw + 4, y = H - pad - h;
    const today = i === 13;
    return `<rect x="${x}" y="${y}" width="${bw - 8}" height="${h}" rx="4" fill="${today ? "#C4623A" : v ? "#E2B39E" : "#EFE9E1"}"><title>${days[i]}: ${v} orders</title></rect>
      ${v ? `<text x="${x + (bw - 8) / 2}" y="${y - 5}" text-anchor="middle" font-size="11" fill="#5c534a" font-weight="600">${v}</text>` : ""}`;
  }).join("");
  const lbl = (x, anchor, t) => `<text x="${x}" y="${H - 5}" text-anchor="${anchor}" font-size="11" fill="#9a9087">${t}</text>`;
  const total = vals.reduce((a, b) => a + b, 0);
  return { total, svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="New orders per day, last 14 days">${bars}${lbl(8, "start", "14 din pehle")}${lbl(W - 8, "end", "Aaj")}</svg>` };
}

function cleanupSection(d) {
  const rows = d.cleanup || [];
  let html = "", last = "";
  for (const r of rows) {
    const day = fmtDay(r.ts);
    if (day !== last) { html += `<li style="display:block;border:0;padding-top:12px" class="sub"><b>${esc(day)}</b></li>`; last = day; }
    html += `<li><span class="sub">${fmtTime(r.ts)}</span><span>${esc(r.subject || "")}${r.mail_ts ? `<div class="sub">Mail ka time: ${fmtTime(r.mail_ts)}, ${esc(fmtDay(r.mail_ts))}</div>` : ""}</span>
      <a href="https://mail.google.com/mail/u/0/#trash/${encodeURIComponent(r.msg_id)}" target="_blank" rel="noopener">Gmail mein dekhiye</a></li>`;
  }
  const lc = d.lastCleanup ? `Last cleanup ${fmtTime(d.lastCleanup)} (${ago(d.lastCleanup, d.now)})` : "Cleanup script abhi connect nahi hua";
  return `<details class="card" style="margin-top:16px"><summary>🧹 Mail cleanup log <small class="sub" style="font-weight:500">30 din · ${rows.length} mails trash mein gaye</small></summary>
    <div class="sub" style="margin-top:8px">${lc}. Sirf "No change" mails hatate hain. Gmail Trash mein 30 din tak rehte hain, link se khol kar "Move to Inbox" kar sakte hain.</div>
    <ul class="cl">${html || '<li style="display:block;border:0" class="empty">Abhi koi mail trash mein nahi gaya</li>'}</ul></details>`;
}

const CLIENT_JS = `
let AC;
function unlockAudio(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==="suspended")AC.resume();}catch(_){}}
document.addEventListener("click",unlockAudio);document.addEventListener("touchstart",unlockAudio,{passive:true});
function tone(f,t0,d,type,g){const o=AC.createOscillator(),v=AC.createGain();o.type=type||"triangle";o.frequency.value=f;
v.gain.setValueAtTime(0.0001,t0);v.gain.exponentialRampToValueAtTime(g||0.25,t0+0.01);v.gain.exponentialRampToValueAtTime(0.0001,t0+d);
o.connect(v).connect(AC.destination);o.start(t0);o.stop(t0+d+0.05);}
function chaChing(){if(!AC)return;const t=AC.currentTime;tone(1318.5,t,0.16);tone(1975.5,t+0.09,0.55);tone(2637,t+0.09,0.5,"sine",0.12);
[0.22,0.29,0.36,0.43].forEach((d,i)=>tone(2800+i*450,t+d,0.14,"sine",0.06));}
function ding(){if(!AC)return;const t=AC.currentTime;tone(880,t,0.3,"sine",0.2);tone(1320,t+0.13,0.4,"sine",0.15);}
let tTimer;function toast(title,body,order){const el=document.getElementById("toast");document.getElementById("tT").textContent=title;
document.getElementById("tB").textContent=body||"";el.className="toast show"+(order?" order":"");clearTimeout(tTimer);tTimer=setTimeout(()=>el.className="toast",9000);
order?chaChing():ding();}
function u8(b){const p="=".repeat((4-b.length%4)%4);const s=atob((b+p).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(s,c=>c.charCodeAt(0));}
const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone;
const $=id=>document.getElementById(id);
function setOn(){$("pushState").textContent="✅ Is device par notifications on hain"+(KC.devices>1?" ("+KC.devices+" devices)":"");$("pushBtn").style.display="none";$("pushTest").style.display="";}
async function saveSub(sub){await fetch("/api/push/subscribe",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(sub)});}
async function enablePush(){unlockAudio();
 if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window)){
  $("pushState").textContent=isIOS&&!standalone?"iPhone par pehle Safari → Share → Add to Home Screen kariye, phir Home Screen wale app se ye button dabaiye.":"Is browser mein notifications support nahi hain. Chrome/Safari use kariye.";return;}
 try{const perm=await Notification.requestPermission();
  if(perm!=="granted"){$("pushState").textContent="Permission nahi mili. Phone Settings → is app → Notifications → Allow kariye.";return;}
  const reg=await navigator.serviceWorker.ready;const {key}=await (await fetch("/api/push/key")).json();
  let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8(key)});
  await saveSub(sub);KC.devices=Math.max(KC.devices,1);setOn();
 }catch(e){$("pushState").textContent="Notification on nahi hua: "+e.message;}}
async function testPush(){unlockAudio();$("pushState").textContent="Test bhej rahe hain…";
 const r=await (await fetch("/api/push/test",{method:"POST"})).json();
 $("pushState").textContent=r.sent?"Test bheja ("+r.sent+" device). 5–10 sec mein notification aayega.":"Koi device registered nahi. Pehle 'Notifications on kariye' dabaiye.";}
if("serviceWorker" in navigator){navigator.serviceWorker.register("/sw.js").then(async()=>{
 if("Notification" in window&&Notification.permission==="granted"){const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();if(sub){saveSub(sub);setOn();}}
});
 navigator.serviceWorker.addEventListener("message",e=>{if(e.data&&e.data.type==="kc-notify"){const n=e.data.n;if(n.kind!=="quiet")toast(n.title,n.body,n.kind==="order");}});}
let shownByPush=0;
setInterval(async()=>{try{const j=await (await fetch("/api/data",{cache:"no-store"})).json();
 const evId=(j.lastEvent&&j.lastEvent.id)||0, runTs=(j.lastRun&&j.lastRun.ts)||0;
 if(evId>KC.lastEvent){const fresh=j.events.filter(e=>e.id>KC.lastEvent);const isOrder=fresh.some(e=>e.type==="new_order");
  const main=fresh.find(e=>e.type==="new_order")||fresh[0];
  toast(isOrder?"🆕 Naya order aaya!":"🔔 Kirana Club update",main.title+(fresh.length>1?"\\n+"+(fresh.length-1)+" aur":""),isOrder);
  KC.lastEvent=evId;setTimeout(()=>location.reload(),8000);}
 else if(runTs>KC.lastRun){location.reload();}
}catch(_){}},60000);
`;

function sessionForm() {
  return `<form method="post" action="/session" style="display:grid;gap:8px">
    <textarea name="token" rows="3" required placeholder="cookie: __Secure-next-auth.session-token=...; ..."
      style="font:13px ui-monospace,monospace;padding:10px;border-radius:10px;border:1px solid #E7C8C2;width:100%"></textarea>
    <div class="sub" style="color:inherit;opacity:.8">Chrome → portal kholiye → F12 → Network → koi bhi <b>session</b> row → Headers → Request Headers → <b>cookie</b> ki poori value copy karke yahan paste kariye.</div>
    <div><button>Save &amp; check now</button></div></form>`;
}

export function dashboardPage(d, env) {
  const h = health(d);
  const lr = d.lastRun;
  const metrics = d.latest?.metrics || {};
  const prev = d.previous?.metrics || {};
  const counts = d.latest?.counts || {};

  const kpis = Object.keys(metrics).length
    ? Object.entries(metrics).map(([k, v]) => `<div class="card kpi"><div class="l">${esc(k)}</div>
        <div class="v">${esc(fmtVal(k, v))}</div>${delta(k, v, prev[k])}</div>`).join("")
    : `<div class="card kpi"><div class="l">Data</div><div class="v">–</div><div class="d">Pehla successful check hone par yahan numbers aayenge</div></div>`;

  const order = ["new", "info", "warn", "good", "bad", "mute"];
  const chips = Object.entries(counts)
    .filter(([s, n]) => n > 0 && !/^all$/i.test(s))
    .sort((a, b) => order.indexOf(statusTone(a[0])) - order.indexOf(statusTone(b[0])))
    .map(([s, n]) => `<span class="chip t-${statusTone(s)}">${esc(s)} <b>${n}</b></span>`).join("");

  let tl = "", lastDay = "";
  for (const e of d.events) {
    const dk = fmtDay(e.ts);
    if (dk !== lastDay) { tl += `<li class="day">${esc(dk)}</li>`; lastDay = dk; }
    tl += `<li class="ev"><time>${fmtTime(e.ts)}</time><span class="dot ${esc(e.type)}"></span><span>${esc(e.title)}</span></li>`;
  }

  const rows = d.orders.map((o) => `<tr>
      <td><b>#${esc(o.id)}</b><div class="sub">${esc(o.customer || "")}${o.city ? ", " + esc(o.city) : ""}${o.placed_at && !/^\d{4}-/.test(o.placed_at) ? " · " + esc(o.placed_at) : ""}</div></td>
      <td><span class="tag t-${statusTone(o.status)}">${esc(o.status)}</span>${o.payment ? `<div class="sub" style="margin-top:4px">${esc(o.payment)}</div>` : ""}</td>
      <td class="n">${o.amount != null ? "₹" + Number(o.amount).toLocaleString("en-IN") : "–"}</td>
      <td class="n hide-sm sub">${esc(ago(o.updated_at, d.now))}</td></tr>`).join("");

  const c = chart(d.orderDays, d.now);
  const failBanner = d.failing
    ? `<div class="banner bad"><b>${d.failing === "SESSION" ? "Kirana Club login expire ho gaya." : d.failing === "CONFIG" ? "Portal connection abhi set nahi hai." : "Pichhla check fail hua."}</b>
       ${lr && !lr.ok ? `<div class="sub" style="color:inherit;opacity:.85;margin-top:4px;word-break:break-word">${esc(lr.error)}</div>` : ""}
       ${lr && !lr.ok && d.errorShotTs && Math.abs(d.errorShotTs - lr.ts) < 10 * 60000 ? `<div style="margin-top:8px"><a href="/error-shot" target="_blank" style="color:inherit;font-weight:700">📸 Fail ke waqt portal ka screenshot dekhiye</a></div>` : ""}
       ${d.failing === "SESSION" || d.failing === "CONFIG" ? sessionForm() : ""}</div>`
    : "";

  const totalAll = Object.entries(counts).find(([s]) => /^all$/i.test(s));
  const body = `<div class="wrap">
  <header>
    <div class="mark">KC</div>
    <div class="title"><h1>Kirana Club Tracker</h1><p>Anagh Masale · supplier portal</p></div>
    <div class="spacer"></div>
    <span class="pill ${h.tone}"><i></i>${h.text}</span>
    <form method="post" action="/run" style="margin:0"><button>Check now</button></form>
  </header>
  <div class="meta">
    <span>Last check <b>${lr ? `${fmtTime(lr.ts)}` : "–"}</b>${lr ? ` (${ago(lr.ts, d.now)})` : ""}</span>
    <span>Har <b>30 min</b> full check · raat 12–7:30 band</span>
    ${d.fast ? `<span>${d.fast.ok ? "⚡ <b>Real-time</b> new-order on" : "⚡ Real-time: browser lane par"}</span>` : ""}
    <span>24 ghante mein <b>${d.runs24h.ok}/${d.runs24h.total}</b> checks successful</span>
  </div>
  <div class="card pushbar">
    <span style="font-size:20px">🔔</span>
    <div class="sub" id="pushState" style="color:var(--ink)">Phone notifications: is device par on kariye (naya order, status change, alerts)</div>
    <button id="pushBtn" onclick="enablePush()">Notifications on kariye</button>
    <button id="pushTest" class="ghost" style="display:none" onclick="testPush()">Test bhejiye</button>
  </div>
  ${d.demo ? `<div class="banner demo"><b>Demo mode.</b> Ye sample data hai taaki aap system ko chalta hua dekh sakein. Portal adapter lagte hi asli Kirana Club data aayega.</div>` : ""}
  ${d.queued ? `<div class="banner demo"><b>Check shuru ho gaya.</b> 1–2 minute mein naya data aa jayega, page apne aap refresh hoga.</div><script>setTimeout(()=>location.href="/",90000)</script>` : ""}
  ${failBanner}
  ${!d.lastRun && !d.demo ? `<div class="banner demo"><b>Pehla setup:</b> neeche login cookies paste kariye.${sessionForm()}</div>` : ""}
  <div class="kpis">${kpis}</div>
  ${chips ? `<div class="chips">${chips}</div>` : ""}
  <div class="grid">
    <section class="card"><h2>Activity <small>Kya kab badla</small></h2>
      <ul class="tl">${tl || '<li class="empty">Abhi koi activity nahi</li>'}</ul></section>
    <div style="display:grid;gap:16px;align-content:start">
      <section class="card chart"><h2>Orders per day <small>Pichhle 14 din · ${c.total} orders</small></h2>${c.svg}</section>
      <section class="card"><h2>Orders <small>${totalAll ? `Portal par ${totalAll[1]} orders · ` : ""}Latest update upar</small></h2>
        ${rows ? `<div class="tablewrap"><table><thead><tr><th>Order</th><th>Status</th><th style="text-align:right">Amount</th><th class="hide-sm" style="text-align:right">Updated</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty">Abhi koi order nahi</div>'}
      </section>
    </div>
  </div>
  <footer>
    ${d.demo ? `<form method="post" action="/reset" onsubmit="return confirm('Saara stored data delete hoga. Pakka?')" style="margin:0"><button class="ghost">Clear data</button></form>` : ""}
    <a href="/logout"><button class="ghost" type="button">Logout</button></a>
  </footer>
</div>
<div class="toast" id="toast"><b id="tT"></b><span id="tB"></span></div>
<script>window.KC={lastEvent:${Number(d.lastEvent?.id || 0)},lastRun:${Number(d.lastRun?.ts || 0)},devices:${Number(d.pushDevices || 0)}};</script>
<script>${CLIENT_JS}</script>`;
  return page("Kirana Club Tracker", body, false);
}

// ---------------- email ----------------
export function emailHtml({ kind, code, message, firstRun, changes = [], metrics = {}, prevMetrics = {}, statusCounts = {}, env, now }) {
  const url = env.DASHBOARD_URL || "#";
  const when = new Date(now).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
  const btn = `<a href="${url}" style="display:inline-block;background:#1E1914;color:#fff;text-decoration:none;padding:10px 16px;border-radius:9px;font-weight:600;font-size:14px">Dashboard kholiye</a>`;
  const wrap = (inner) => `<div style="background:#F6F3EE;padding:20px 12px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1E1914">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #EAE3D9;border-radius:14px;padding:22px">
    <div style="font-size:12px;color:#7B7168;margin-bottom:4px">Kirana Club Tracker · ${when}</div>${inner}
    <div style="margin-top:20px">${btn}</div></div></div>`;

  if (kind === "error") {
    const fix = code === "SESSION"
      ? "Chrome mein supplier.kirana.club par login kariye, phir dashboard kholiye aur naya cookie paste kariye (steps wahin likhe hain). Monitoring apne aap wapas chalu ho jayegi."
      : code === "CONFIG" ? "Portal adapter set hona baaki hai." : "Agla check 30 minute mein apne aap hoga. Ye error baar baar aaye to dashboard dekhiye.";
    return wrap(`<h2 style="margin:6px 0 10px;font-size:19px;color:#BF3A2B">${code === "SESSION" ? "Login expire ho gaya" : "Check fail hua"}</h2>
      <p style="margin:0 0 8px;font-size:14px">${esc(message)}</p><p style="margin:0;font-size:14px;color:#7B7168">${fix}</p>`);
  }

  const newOrders = changes.filter((c) => c.type === "new_order");
  const statusCh = changes.filter((c) => c.type === "status");
  const otherCh = changes.filter((c) => c.type !== "new_order" && c.type !== "status");
  const headline = firstRun ? "Monitoring shuru ho gayi"
    : newOrders.length ? `🆕 ${newOrders.length} naya order aaya!`
    : changes.length ? `${changes.length} change${changes.length > 1 ? "s" : ""} pichhle check se` : "Pichhle check se kuch nahi badla";
  const rs = (a) => (a != null ? "₹" + Number(a).toLocaleString("en-IN") : "");
  const tone = (s) => ({ bad: ["#BF3A2B", "#FBE8E5"], good: ["#1E7F55", "#E5F3EB"], warn: ["#A86A12", "#FCF1DE"], mute: ["#6B7280", "#F0F0EF"] }[statusTone(s)] || ["#3756C8", "#E8EDFC"]);
  const newBlock = newOrders.map((c) => `<div style="border:2px solid #1E7F55;background:#E5F3EB;border-radius:12px;padding:14px 16px;margin:0 0 10px">
      <div style="font-size:12px;font-weight:700;color:#1E7F55;letter-spacing:.5px">NEW ORDER</div>
      <div style="font-size:20px;font-weight:800;margin:4px 0 2px">#${esc(c.id)} · ${esc(rs(c.amount))}</div>
      <div style="font-size:14px;color:#3d352e">${esc(c.customer || "")}${c.city ? ", " + esc(c.city) : ""}${c.payment ? ` · <b>${esc(c.payment)}</b>` : ""} · ${esc(c.status)}</div></div>`).join("");
  const stBlock = statusCh.length ? `<div style="margin:6px 0 14px">${statusCh.map((c) => { const [fg, bg] = tone(c.to);
      return `<div style="padding:9px 12px;border-radius:10px;background:${bg};margin-bottom:6px;font-size:14px">
        <b>#${esc(c.id)}</b> ${esc(c.from)} → <b style="color:${fg}">${esc(c.to)}</b>${c.customer ? ` · ${esc(c.customer)}` : ""}${c.amount != null ? ` · ${esc(rs(c.amount))}` : ""}</div>`; }).join("")}</div>` : "";
  const otherBlock = otherCh.length ? `<ul style="margin:0 0 16px;padding-left:18px;font-size:14px;line-height:1.7">${otherCh.map((c) => `<li>${esc(describe(c))}</li>`).join("")}</ul>` : "";
  const changeList = newBlock + stBlock + otherBlock;
  const mrows = Object.entries(metrics).map(([k, v]) => {
    const p = prevMetrics[k];
    const diff = typeof v === "number" && typeof p === "number" && v !== p ? v - p : 0;
    return `<tr><td style="padding:7px 0;border-bottom:1px solid #F0EAE1;color:#7B7168;font-size:14px">${esc(k)}</td>
      <td style="padding:7px 0;border-bottom:1px solid #F0EAE1;text-align:right;font-weight:700;font-size:14px">${esc(fmtVal(k, v))}
      ${diff ? `<span style="color:${diff > 0 ? "#1E7F55" : "#BF3A2B"};font-weight:600;font-size:12px"> ${diff > 0 ? "+" : "−"}${esc(fmtVal(k, Math.abs(diff)))}</span>` : ""}</td></tr>`;
  }).join("");
  const crow = Object.entries(statusCounts).map(([s, n]) => `<span style="display:inline-block;margin:0 6px 6px 0;padding:5px 10px;border-radius:8px;background:#F3EFE8;font-size:13px">${esc(s)} <b>${n}</b></span>`).join("");
  return wrap(`<h2 style="margin:6px 0 12px;font-size:19px">${headline}</h2>${changeList}
    <div style="font-size:12px;font-weight:700;color:#7B7168;letter-spacing:.5px;text-transform:uppercase;margin:4px 0 6px">Abhi ka status</div>
    <table style="width:100%;border-collapse:collapse">${mrows}</table>
    ${crow ? `<div style="margin-top:14px">${crow}</div>` : ""}`);
}
