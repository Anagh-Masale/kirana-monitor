import { esc, fmtVal, fmtTime, fmtDay, dayKey, ago, statusTone, describe, isMoney } from "./util.js";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
:root{--bg:#FBF7F0;--card:#FFFDFA;--ink:#2D2016;--muted:#8A7B6B;--line:#ECE2D4;--accent:#C4623A;--accent-dark:#A64E2C;--gold:#B89340;--accent-ink:#fff;
--good:#1E7F55;--good-bg:#E6F2EB;--bad:#BF3A2B;--bad-bg:#FBE8E4;--warn:#A86A12;--warn-bg:#FBF0DB;--info:#3756C8;--info-bg:#E8EDFC;
--new:#6A45BE;--new-bg:#EFEAFB;--mute:#8A7B6B;--mute-bg:#F2ECE2;--r:14px;--serif:'Playfair Display',Georgia,serif}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 'DM Sans',ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
h1,h2,h3,.title h1,.kpi .v{font-family:var(--serif)}
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
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:16px}
.card.kpi{padding:15px 16px}
.kpi .l{color:var(--muted);font-size:12.5px;font-weight:600;line-height:1.25}
.kpi .v{font-size:26px;font-weight:800;letter-spacing:-.5px;margin-top:5px;font-variant-numeric:tabular-nums}
.kpi .d{font-size:12px;margin-top:5px;font-weight:700;color:var(--muted)}
.avgcard{border-color:var(--gold);background:linear-gradient(180deg,#FFFDF8,#FDF8EE)}.avgcard .v{color:var(--accent-dark)}
.sugg{border:1px solid var(--line);border-left:3px solid var(--gold);border-radius:10px;padding:11px 13px;margin-top:10px;background:var(--bg)}
.sugg:first-of-type{margin-top:4px}
.suggt{font-weight:700;font-size:14px;line-height:1.4;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.suggtag{font-size:10.5px;font-weight:800;padding:2px 8px;border-radius:999px;background:var(--mute-bg);color:var(--muted);text-transform:uppercase;letter-spacing:.3px}
.suggtag.high{background:var(--bad-bg);color:var(--bad)}.suggtag.medium{background:var(--warn-bg);color:var(--warn)}
.suggp{font-size:12.5px;font-weight:600;color:var(--accent-dark);margin-top:4px}
.suggd{font-size:12.5px;color:var(--muted);margin-top:3px;line-height:1.45}
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
.orow{cursor:pointer}.orow:hover{background:#faf7f2}
.ovl{position:fixed;inset:0;background:rgba(30,25,20,.45);display:none;align-items:flex-end;justify-content:center;z-index:60}
.ovl.show{display:flex}
@media(min-width:600px){.ovl{align-items:center}}
.sheet{background:#fff;width:min(560px,100%);max-height:88vh;overflow:auto;border-radius:18px 18px 0 0;padding:20px}
@media(min-width:600px){.sheet{border-radius:16px}}
.sheet h3{margin:0 0 2px;font-size:19px}
.sheet .x{position:absolute;right:16px;top:14px;font-size:22px;color:var(--muted);cursor:pointer;background:none;border:0}
.drow{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid var(--line);font-size:14px}
.drow .k{color:var(--muted)}.drow .v{text-align:right;font-weight:600;max-width:65%}
.addr{background:var(--bg);border-radius:10px;padding:12px;font-size:14px;line-height:1.5;margin:10px 0}
.lnk{display:inline-block;margin:4px 8px 0 0;padding:7px 12px;border-radius:9px;background:var(--ink);color:#fff;text-decoration:none;font-size:13px;font-weight:600}
.bkhead{font-size:12px;font-weight:700;color:var(--muted);margin:16px 0 8px;text-transform:uppercase;letter-spacing:.5px}
.bktab{border:1px solid var(--line);border-radius:12px;overflow:hidden}
.bkrow{display:flex;justify-content:space-between;gap:12px;padding:11px 13px;border-bottom:1px solid var(--line);font-size:14px}
.bkrow:last-child{border-bottom:0}
.bknm{color:var(--ink);font-weight:600}.bkq{display:block;color:var(--muted);font-size:12px;font-weight:500;margin-top:2px}
.bkv{text-align:right;font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums}
.bkrow.sum{background:var(--bg)}.bkrow.sum .bknm{font-weight:500;color:var(--muted)}.bkrow.sum .bkv{font-weight:600}
.bkrow.tot{background:var(--mute-bg)}.bkrow.tot .bknm,.bkrow.tot .bkv{font-weight:800;font-size:15px}
.toast{position:fixed;left:50%;top:16px;transform:translateX(-50%) translateY(-16px);opacity:0;visibility:hidden;pointer-events:none;transition:transform .35s ease,opacity .3s ease;z-index:50;
background:#1E1914;color:#fff;border-radius:14px;padding:14px 18px;box-shadow:0 10px 30px rgba(0,0,0,.25);width:min(92vw,420px)}
.toast.show{transform:translateX(-50%) translateY(0);opacity:1;visibility:visible;pointer-events:auto}.toast b{display:block;font-size:15px;margin-bottom:3px}.toast span{font-size:13.5px;opacity:.85;white-space:pre-line}
.toast.order{background:#1E7F55}
.fab{position:fixed;right:18px;bottom:18px;z-index:58;width:58px;height:58px;border-radius:50%;background:var(--accent);color:#fff;font-size:27px;line-height:1;border:0;cursor:pointer;box-shadow:0 10px 26px rgba(196,98,58,.5);display:flex;align-items:center;justify-content:center;transition:transform .15s ease}
.fab:hover{transform:scale(1.06)}.fab:active{transform:scale(.94)}
.fab.open{background:#1E1914;box-shadow:0 10px 26px rgba(0,0,0,.35)}
.fabtip{position:fixed;right:84px;bottom:30px;z-index:57;background:#1E1914;color:#fff;font-size:12.5px;line-height:1.45;padding:10px 13px;border-radius:13px 13px 2px 13px;max-width:230px;box-shadow:0 8px 24px rgba(0,0,0,.28);opacity:0;transform:translateX(8px) scale(.96);transform-origin:bottom right;transition:opacity .25s ease,transform .25s ease;pointer-events:none}
.fabtip.show{opacity:1;transform:none}
.fab:hover ~ .fabtip{opacity:1;transform:none}
.chatpanel{position:fixed;right:18px;bottom:86px;z-index:58;width:min(374px,calc(100vw - 32px));height:min(68vh,540px);background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 20px 56px rgba(0,0,0,.28);display:none;flex-direction:column;overflow:hidden}
.chatpanel.show{display:flex;animation:popin .22s ease}
@keyframes popin{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
.chathead{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid var(--line);font-weight:800;font-size:15px}
.chathead button{background:none;border:0;font-size:24px;line-height:1;color:var(--muted);cursor:pointer;padding:0 2px}
#chatlog{flex:1;overflow:auto;display:flex;flex-direction:column;gap:9px;padding:14px}
#chatlog .msg{max-width:84%;padding:9px 12px;border-radius:13px;font-size:13.5px;line-height:1.5;white-space:pre-line}
#chatlog .msg.bot{background:#F1ECE3;color:var(--ink);align-self:flex-start;border-bottom-left-radius:3px}
#chatlog .msg.me{background:var(--accent);color:#fff;align-self:flex-end;border-bottom-right-radius:3px}
.chatinput{display:flex;gap:8px;border-top:1px solid var(--line);padding:10px}
.chatinput input{flex:1;font:inherit;padding:10px 12px;border-radius:11px;border:1px solid var(--line);outline:none}
.chatinput input:focus{border-color:var(--accent)}
.chatinput button{border:0;background:var(--accent);color:#fff;font-weight:700;padding:0 15px;border-radius:11px;cursor:pointer}
@media(max-width:600px){.chatpanel{width:calc(100vw - 20px);right:10px;height:70vh}.fabtip{max-width:190px}}
.pushbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.pushbar .sub{flex:1;min-width:200px}
details.card summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:baseline;font-weight:700;font-size:15px}
details.card summary::-webkit-details-marker{display:none}
.cl{list-style:none;margin:12px 0 0;padding:0;max-height:520px;overflow:auto}
.cl li{display:grid;grid-template-columns:62px 1fr auto;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);font-size:13.5px;align-items:baseline}
.cl a{color:var(--info);font-weight:600;text-decoration:none;white-space:nowrap}
footer{margin-top:28px;display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
@media(max-width:600px){.wrap{padding:16px 12px 40px}.kpis{grid-template-columns:1fr 1fr;gap:10px}.card.kpi{padding:13px}.kpi .v{font-size:21px;margin-top:3px}.kpi .l{font-size:11.5px}.hide-sm{display:none}.meta{gap:4px 12px;margin:10px 0 14px}.chips{gap:6px;margin-bottom:16px}.chip{padding:6px 10px;font-size:12.5px}.chip b{font-size:14px}}
.topbar{position:sticky;top:0;z-index:40;background:rgba(251,247,240,.94);backdrop-filter:blur(8px);display:flex;align-items:center;gap:9px;padding:11px 14px;border-bottom:1px solid var(--line)}
.topttl{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bell{position:relative;background:none;border:0;font-size:19px;cursor:pointer;padding:4px 6px;flex-shrink:0;line-height:1}
.nbadge{position:absolute;top:-2px;right:-2px;background:var(--bad);color:#fff;font-size:9.5px;font-weight:800;min-width:15px;height:15px;border-radius:999px;display:flex;align-items:center;justify-content:center;padding:0 3px;font-family:'DM Sans',sans-serif}
.langtog{flex-shrink:0}.pill{flex-shrink:0}
.notifpanel{display:none;position:fixed;top:58px;right:12px;z-index:60;width:min(360px,calc(100vw - 24px));max-height:70vh;background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:0 18px 50px rgba(45,32,22,.22);overflow:hidden;flex-direction:column}
.notifpanel.show{display:flex}
.nphead{display:flex;align-items:center;justify-content:space-between;padding:12px 15px;border-bottom:1px solid var(--line)}
.npx{background:none;border:0;font-size:22px;color:var(--muted);cursor:pointer;padding:0 3px}
.nplist{overflow:auto}
.nprow{padding:11px 15px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
.nprow:last-child{border-bottom:0}
.nprow.unseen{background:#FBF4EE}
.nprow.error .npt{color:var(--bad)}
.npt{font-size:13px;line-height:1.4}.npd{font-size:11px;color:var(--muted);white-space:nowrap;flex-shrink:0}
@media(max-width:600px){.topttl span{display:none}.pilltext{display:none}.pill{padding:6px}.pill i{margin:0}}
.burger{background:none;border:0;font-size:22px;cursor:pointer;color:var(--ink);padding:3px 7px;border-radius:8px;line-height:1}
.topttl{font-weight:700;font-size:15px;line-height:1}.topttl span{display:block;color:var(--muted);font-size:11.5px;font-weight:500}
.langtog{display:flex;border:1px solid var(--line);border-radius:999px;overflow:hidden;font-size:12px;font-weight:700;background:#fff}
.langtog a{padding:5px 10px;color:var(--muted);text-decoration:none}.langtog a.on{background:var(--ink);color:#fff}
.menu{position:fixed;inset:0;z-index:70;display:none}.menu.show{display:block}
.menu .bg{position:absolute;inset:0;background:rgba(30,25,20,.4)}
.menu .panel{position:absolute;left:0;top:0;bottom:0;width:min(80vw,290px);background:#fff;padding:16px;transform:translateX(-100%);transition:transform .25s;overflow:auto}
.menu.show .panel{transform:none}
.menu .panel .mh{display:flex;align-items:center;gap:10px;margin:4px 6px 14px}
.menu .panel a{display:flex;align-items:center;gap:12px;padding:12px 10px;border-radius:10px;color:var(--ink);text-decoration:none;font-weight:600;font-size:15px;cursor:pointer}
.menu .panel a.on{background:var(--bg)}.menu .panel a .ic{font-size:18px;width:22px;text-align:center}
.sec{display:none}.sec.on{display:block}
.filters{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px}
.fchip{padding:7px 12px;border-radius:999px;font-size:13px;font-weight:600;border:1px solid var(--line);background:#fff;color:var(--muted);cursor:pointer;white-space:nowrap}
.fchip.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.fchip.fnew{border-color:var(--new);color:var(--new);background:var(--new-bg)}
.fchip.fnew.on{background:var(--new);color:#fff;border-color:var(--new)}
.scrolllist{max-height:68vh;overflow:auto;margin:0 -8px}
.lead{list-style:none;margin:0;padding:0}
.lead li{display:grid;grid-template-columns:26px 1fr auto;gap:10px;padding:11px 2px;border-bottom:1px solid var(--line);align-items:center}
.lead li:last-child{border-bottom:0}
.lead .rk{color:var(--muted);font-weight:700;font-variant-numeric:tabular-nums;text-align:center}
.lead .nm{font-weight:600;font-size:14px;line-height:1.25}.lead .m2{color:var(--muted);font-size:12.5px;margin-top:2px}
.lead .u{text-align:right}.lead .u b{font-size:15px;font-variant-numeric:tabular-nums}
.oosb{display:inline-block;padding:1px 6px;border-radius:5px;font-size:10.5px;font-weight:700;background:var(--bad-bg);color:var(--bad);margin-left:6px;vertical-align:middle}
.ihead{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin:2px 0 12px}
.idiv{height:1px;background:var(--line);margin:18px 0}
.ibars{display:flex;flex-direction:column;gap:11px}
.ibar{display:grid;grid-template-columns:38% 1fr 40px;gap:10px;align-items:center}
.ibl{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ibt{background:var(--mute-bg);border-radius:7px;height:18px;overflow:hidden}
.ibf{height:100%;background:var(--accent);border-radius:7px;min-width:3px;transition:width .5s ease}
.ibf.oos{background:var(--bad)}
.ibv{text-align:right;font-weight:800;font-size:13.5px;font-variant-numeric:tabular-nums}
.oosdot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--bad);vertical-align:middle;margin-left:3px}
@media(max-width:600px){.ibar{grid-template-columns:42% 1fr 34px;gap:8px}.ibl{font-size:12px}}
.mbadge{margin-left:auto;background:var(--bad);color:#fff;font-size:11px;font-weight:800;min-width:20px;height:20px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;padding:0 6px}
.sbadge{display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;font-size:10.5px;font-weight:800;vertical-align:middle}
.sbadge.oos{background:var(--bad-bg);color:var(--bad)}.sbadge.low{background:var(--warn-bg);color:var(--warn)}.sbadge.ok{background:var(--good-bg);color:var(--good)}.sbadge.untr{background:var(--mute-bg);color:var(--mute)}
.srow{border:1px solid var(--line);border-radius:14px;margin-bottom:10px;background:var(--card);max-width:880px;overflow:hidden}
.srow.oos{border-color:#E5C0B9}.srow.low{border-color:#EAD6AE}
.srow.act{border-left:3px solid var(--warn)}
.shead{cursor:pointer;display:flex;flex-direction:column;gap:7px;padding:14px 16px;user-select:none}
.shead:hover{background:#FCFAF6}
.sh-top{display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-size:15px;line-height:1.3}
.sh-top b{font-weight:700}
.sh-sum{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--muted);font-weight:600;flex-wrap:wrap}
.sh-sum .u{color:var(--ink);font-weight:800;font-variant-numeric:tabular-nums}
.actflag{color:var(--warn);font-weight:800}
.chev{margin-left:auto;font-size:13px;color:var(--muted);transition:transform .2s ease;flex-shrink:0}
.srow.open .chev{transform:rotate(180deg)}
.sbody{display:none;padding:0 16px 16px;border-top:1px solid var(--line)}
.srow.open .sbody{display:block;padding-top:14px}
.stocktop{position:sticky;top:54px;z-index:20;background:var(--bg);padding:8px 0 10px;margin-bottom:6px;max-width:880px}
.stocktop:after{content:"";position:absolute;left:0;right:0;bottom:0;height:10px;background:linear-gradient(var(--bg),transparent);pointer-events:none}
.sname{font-size:15px;margin-bottom:13px;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.sctrl{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.sctrl label{display:flex;flex-direction:column;font-size:11px;color:var(--muted);font-weight:700;gap:4px}
.sctrl input{width:100%;font:inherit;font-size:15px;font-weight:600;padding:9px 11px;border:1px solid var(--line);border-radius:10px;background:#fff}
.sctrl input:focus{outline:none;border-color:var(--accent)}
.srow2{display:flex;gap:10px 14px;flex-wrap:wrap;align-items:center;margin-top:14px;padding-top:13px;border-top:1px solid var(--line)}
.chk{display:flex;align-items:center;gap:6px;font-size:13.5px;font-weight:600;cursor:pointer}
.btn.mini{padding:8px 14px;font-size:13px}
.btn.ghost{background:#fff;color:var(--ink);border:1px solid var(--line)}
.sched{display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--muted);font-weight:700}
.sched input{font:inherit;font-size:12.5px;padding:7px 9px;border:1px solid var(--line);border-radius:9px;background:#fff}
.sbadge.warn{background:var(--warn-bg);color:var(--warn)}
.sbadge.disc{background:var(--mute-bg);color:var(--mute)}
.srow.disc{opacity:.6}
.skucode{font-size:11px;font-weight:700;color:var(--muted);background:var(--mute-bg);padding:2px 7px;border-radius:6px;font-family:ui-monospace,monospace}
.stoprow{display:flex;gap:10px;align-items:center;margin-bottom:10px;max-width:880px}
.stoprow .ssearch{flex:1}
.stoprow .btn{white-space:nowrap;flex-shrink:0}
.sfilters{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px;max-width:880px}
.ssearch{flex:1;min-width:180px;font:inherit;font-size:14px;padding:10px 13px;border:1px solid var(--line);border-radius:11px;background:var(--card)}
.ssearch:focus{outline:none;border-color:var(--accent)}
.schips{display:flex;gap:7px;flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:2px}
.schips::-webkit-scrollbar{display:none}
.schip{padding:7px 13px;border-radius:999px;border:1px solid var(--line);background:var(--card);font-size:13px;font-weight:600;color:var(--muted);cursor:pointer;white-space:nowrap;flex-shrink:0}
.schip b{font-variant-numeric:tabular-nums;margin-left:4px;font-weight:800}
.schip.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.srow3{display:flex;gap:10px;align-items:flex-end;margin-top:12px}
.tip{position:relative;display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;background:var(--mute-bg);color:var(--muted);font-size:10px;font-weight:800;font-style:italic;cursor:pointer;vertical-align:middle;margin-left:3px}
.tipbub{display:none;position:absolute;bottom:135%;left:-6px;width:200px;max-width:62vw;background:var(--ink);color:#fff;font-size:12px;font-weight:500;font-style:normal;line-height:1.45;padding:9px 11px;border-radius:10px;z-index:35;box-shadow:0 8px 22px rgba(45,32,22,.28);text-align:left;white-space:normal}
.tip.open .tipbub{display:block}
.in-min[readonly]{background:var(--mute-bg);color:var(--muted);cursor:not-allowed}
.bundlerow{margin-top:7px}.bundleline{font-size:12px;color:var(--accent-dark);font-weight:700;background:var(--mute-bg);padding:3px 9px;border-radius:7px;display:inline-block}
.declare{margin:8px 0 2px;font-size:12px;color:var(--warn);background:var(--warn-bg);padding:7px 10px;border-radius:9px;line-height:1.4}
.linkold{margin:9px 0 2px;font-size:12.5px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#F4EEE4;border:1px dashed var(--line);padding:9px 11px;border-radius:10px}
.linkold select{flex:1;min-width:150px;padding:7px 9px;border:1px solid var(--line);border-radius:8px;background:var(--card);font-size:12.5px}
.srow.combo{border-color:#CBB89A}
.combotag{font-size:9.5px;font-weight:800;letter-spacing:.5px;background:var(--gold);color:#fff;padding:2px 7px;border-radius:5px;margin-right:2px}
.combobd{background:var(--bg);border:1px solid var(--line);border-radius:11px;padding:11px 13px;margin-bottom:12px;font-size:13px}
.cbrow{display:flex;justify-content:space-between;gap:10px;padding:4px 0;color:var(--muted)}
.cbrow b{color:var(--ink);font-weight:700}
.cbrow.blk b,.cbrow.blk span{color:var(--bad)}
.cbrow.untr .cwarn{color:var(--warn);font-weight:700}
.cbtot{margin-top:7px;padding-top:8px;border-top:1px solid var(--line);font-size:13px;color:var(--ink);font-weight:600}
.cbtot b{color:var(--accent-dark);font-weight:800}
.cwarn{color:var(--bad);font-weight:700}
.comboedit{background:#FBF6EC;border:1px dashed var(--gold);border-radius:11px;padding:11px 13px;margin-bottom:12px}
.celabel{font-size:12px;font-weight:700;color:var(--muted);margin-bottom:8px}
.crows{display:flex;flex-direction:column;gap:7px;margin-bottom:9px}
.crow{display:flex;align-items:center;gap:7px;font-size:13px}
.crow .c-comp{flex:1;min-width:0;padding:7px 9px;border:1px solid var(--line);border-radius:8px;background:#fff;font-size:12.5px}
.crow .c-pcs{width:58px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;background:#fff;font-size:13px;text-align:center}
.crow .cx{color:var(--muted);font-weight:700}.crow .cu{color:var(--muted);font-size:11.5px}
.crow .crm{padding:5px 9px;color:var(--bad)}
.incombo{background:var(--info-bg);color:#2A3C8A;border-radius:10px;padding:8px 11px;font-size:12.5px;line-height:1.45;margin-bottom:10px}
.incombochip{font-size:11px;font-weight:700;color:var(--info);background:var(--info-bg);padding:2px 7px;border-radius:999px}
.combotoggle{margin-top:12px;padding-top:12px;border-top:1px dashed var(--line)}
.combotoggle .suggest{border-color:var(--gold);color:var(--accent-dark);background:var(--warn-bg)}
.sctrl.one,.sctrl.two{grid-template-columns:1fr}
@media(min-width:620px){.sctrl.two{grid-template-columns:1fr 1fr}.sctrl.one{max-width:260px}}
.cardgen{max-width:620px}
.ctypes{display:flex;gap:9px;margin-bottom:16px;flex-wrap:wrap}
.ctype{font:inherit;font-size:13.5px;font-weight:600;padding:9px 14px;border-radius:11px;border:1px solid var(--line);background:var(--card);color:var(--muted);cursor:pointer}
.ctype.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.cardform{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:4px}
@media(max-width:560px){.cardform{grid-template-columns:1fr}}
.cfl{display:flex;flex-direction:column;font-size:12px;color:var(--muted);font-weight:700;gap:5px}
.cfl input{font:inherit;font-size:14px;font-weight:500;color:var(--ink);padding:9px 11px;border:1px solid var(--line);border-radius:10px;background:#fff}
.cardblock{border-top:1px solid var(--line);padding-top:14px;margin-top:14px}
.cbh{font-size:13px;font-weight:800;margin-bottom:8px}
.pdfbtns{display:flex;gap:8px;flex-wrap:wrap}
.logorow{display:flex;align-items:center;gap:14px}
.logobox{width:92px;height:92px;border:1px dashed var(--line);border-radius:12px;display:flex;align-items:center;justify-content:center;background:#fff;overflow:hidden;flex:0 0 auto}
.logobox img{max-width:100%;max-height:100%}
.logoacts{display:flex;flex-direction:column;gap:8px}
.btn.mini.danger{color:var(--bad);border-color:var(--bad)}
@media(max-width:620px){.srow{padding:14px}.sctrl{grid-template-columns:1fr 1fr;gap:10px}.sched{margin-left:0;width:100%}.sched input{width:100%}}
.up{color:var(--good)}.down{color:var(--bad)}
.rsum{display:flex;align-items:center;gap:16px;margin-bottom:8px}.rsum .big{font-size:40px;font-weight:800;line-height:1}
.stars{color:#E0A100;font-size:18px;letter-spacing:2px}
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

const TR = {
  sub: { hi: "Anagh Masale · supplier portal", en: "Anagh Masale · supplier portal" },
  home: { hi: "Home", en: "Home" }, orders: { hi: "Orders", en: "Orders" },
  insights: { hi: "Sales Insights", en: "Sales Insights" }, ratings: { hi: "Ratings", en: "Ratings" },
  settings: { hi: "Settings", en: "Settings" }, menu: { hi: "Menu", en: "Menu" },
  live: { hi: "Live", en: "Live" }, checkNow: { hi: "Check karo", en: "Check now" },
  waiting: { hi: "Pehle check ka intezaar", en: "Waiting for first check" },
  loginExp: { hi: "Login expire", en: "Login expired" }, error: { hi: "Error", en: "Error" }, late: { hi: "Check late hai", en: "Check late" },
  lastCheck: { hi: "Last check", en: "Last check" },
  full: { hi: "Har 30 min full check · raat 12–7:30 band", en: "Full check every 30 min · 12am–7:30am off" },
  rtOn: { hi: "⚡ Real-time new-order on", en: "⚡ Real-time new-order on" }, rtOff: { hi: "⚡ Real-time: browser lane par", en: "⚡ Real-time: browser lane" },
  checksOk: { hi: "checks successful (24 ghante)", en: "checks successful (24h)" },
  notifPrompt: { hi: "Is device par phone notifications on karein (naya order, status, alerts)", en: "Turn on phone notifications on this device (new order, status, alerts)" },
  notifOn: { hi: "Notifications on karein", en: "Turn on notifications" }, test: { hi: "Test bhejein", en: "Send test" },
  notifOnState: { hi: "✅ Is device par notifications on hain", en: "✅ Notifications on for this device" },
  activity: { hi: "Activity", en: "Activity" }, activitySub: { hi: "Kya kab badla", en: "What changed when" },
  perDay: { hi: "Orders per day", en: "Orders per day" }, last14: { hi: "Pichhle 14 din", en: "Last 14 days" },
  allOrdersN: { hi: "Portal par", en: "On portal" }, noOrders: { hi: "Abhi koi order nahi", en: "No orders yet" }, noAct: { hi: "Abhi koi activity nahi", en: "No activity yet" },
  tapDetail: { hi: "Order par tap karke poora detail dekhein", en: "Tap an order for full details" },
  insSub: { hi: "Pichhle 30 din · kaunsa product kitna bika", en: "Last 30 days · product performance" },
  units: { hi: "units", en: "units" }, ordLabel: { hi: "orders", en: "orders" }, oos: { hi: "Out of stock", en: "Out of stock" },
  topByUnits: { hi: "Top products — units bike", en: "Top products — units sold" }, allProducts: { hi: "Saare products", en: "All products" },
  stock: { hi: "Stock", en: "Stock" },
  stockSub: { hi: "Stock yahin manage hota hai. Order aate hi units apne aap ghatti hain. 0 hote hi alert, aur armed hone par portal OOS.", en: "Manage stock here. Units auto-decrease as orders arrive. At 0 it alerts, and if armed, marks OOS on the portal." },
  noIns: { hi: "Sales insights abhi load nahi hua — agle 30-min check mein aa jayega.", en: "Sales insights not loaded yet — coming next 30-min check." },
  avgRating: { hi: "Average rating", en: "Average rating" }, reviewsL: { hi: "reviews", en: "reviews" }, ratingsL: { hi: "ratings", en: "ratings" },
  noRatings: { hi: "Abhi tak koi rating nahi aayi. Jaise hi customer rating denge, yahan dikhega.", en: "No ratings yet. They'll show here once customers rate." },
  language: { hi: "Language", en: "Language" }, logout: { hi: "Logout", en: "Logout" },
  colOrder: { hi: "Order", en: "Order" }, colStatus: { hi: "Status", en: "Status" }, colAmount: { hi: "Amount", en: "Amount" }, colUpd: { hi: "Updated", en: "Updated" },
  sameAsLast: { hi: "Pichhle check jaisa", en: "Same as last check" }, fromLast: { hi: "pichhle check se", en: "vs last check" },
  filterAll: { hi: "Sabhi", en: "All" }, noData: { hi: "Pehla check hone par numbers aayenge", en: "Numbers appear after first check" },
  notifTitle: { hi: "Notifications", en: "Notifications" },
};
function tt(lang) { return (k) => (TR[k] ? TR[k][lang] || TR[k].hi : k); }

function health(d, t) {
  const lr = d.lastRun;
  if (!lr) return { tone: "warn", text: t("waiting") };
  if (!lr.ok) return { tone: "bad", text: lr.error_code === "SESSION" ? t("loginExp") : t("error") };
  if (d.now - lr.ts > 45 * 60000) return { tone: "warn", text: t("late") };
  return { tone: "good", text: t("live") };
}

function delta(label, cur, prev, t) {
  if (typeof cur !== "number" || typeof prev !== "number") return "";
  const diff = cur - prev;
  if (!diff) return "";
  const s = (diff > 0 ? "▲ +" : "▼ −") + fmtVal(label, Math.abs(diff));
  return `<div class="d ${diff > 0 ? "up" : "down"}">${s}</div>`;
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
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function rupee(n){return n==null?"–":"₹"+Number(n).toLocaleString("en-IN");}
function closeOrder(){document.getElementById("ovl").classList.remove("show");}
function fmtISO(s){if(!s)return"";var m=/(\\d{4})-(\\d{2})-(\\d{2})T(\\d{2}):(\\d{2})/.exec(s);if(!m)return s;var mon=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m[2]-1];var h=+m[4],ap=h<12?"am":"pm";h=h%12||12;return m[3]+" "+mon+", "+h+":"+m[5]+" "+ap;}
function toggleMenu(open){var m=document.getElementById("menu");if(m)m.classList[open?"add":"remove"]("show");}
function showSec(s){document.querySelectorAll(".sec").forEach(function(e){e.classList.toggle("on",e.id==="sec-"+s);});
  document.querySelectorAll(".menu .panel a").forEach(function(a){a.classList.toggle("on",a.dataset.sec===s);});
  try{localStorage.setItem("kcsec",s);}catch(_){}toggleMenu(0);window.scrollTo(0,0);if(s==="cards"&&typeof loadAssetsForCards==="function")loadAssetsForCards();}
function filterOrders(el,st){document.querySelectorAll("#sec-orders .fchip").forEach(function(c){c.classList.toggle("on",c===el);});
  document.querySelectorAll("#obody tr").forEach(function(r){r.style.display=(!st||r.dataset.st===st)?"":"none";});}
try{var _s=localStorage.getItem("kcsec");if(_s&&document.getElementById("sec-"+_s))showSec(_s);}catch(_){}
async function loginStart(){var e=(document.getElementById("lgEmail").value||"").trim();var m=document.getElementById("lgMsg");var b=document.getElementById("lgBtn1");
 if(!e){m.textContent="Email daaliye";return;}b.disabled=true;m.textContent="OTP bhej rahe hain…";
 try{var r=await (await fetch("/api/login/start",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:e})})).json();
 if(r.ok){document.getElementById("lgStep1").style.display="none";document.getElementById("lgStep2").style.display="block";m.textContent="OTP aapke email"+(r.masked?" / phone "+r.masked:"")+" par bheja gaya. Daaliye.";}
 else{m.textContent="Nahi bheja: "+(r.error||"error");b.disabled=false;}}catch(err){m.textContent="Error: "+err.message;b.disabled=false;}}
async function loginVerify(){var e=(document.getElementById("lgEmail").value||"").trim();var c=(document.getElementById("lgCode").value||"").trim();var m=document.getElementById("lgMsg");var b=document.getElementById("lgBtn2");
 if(!c){m.textContent="OTP daaliye";return;}b.disabled=true;m.textContent="Login kar rahe hain…";
 try{var r=await (await fetch("/api/login/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:e,code:c})})).json();
 if(r.ok){m.textContent="✅ Login ho gaya"+(r.working?", data bhi aa raha hai":"")+". Refresh ho raha hai…";setTimeout(function(){location.href="/";},1500);}
 else{m.textContent="❌ "+(r.error||"login fail");b.disabled=false;}}catch(err){m.textContent="Error: "+err.message;b.disabled=false;}}
function addChat(who,txt){var log=document.getElementById("chatlog");if(!log)return null;var d=document.createElement("div");
 d.style.cssText=who==="me"?"align-self:flex-end;background:#1E1914;color:#fff;padding:9px 13px;border-radius:14px 14px 3px 14px;max-width:85%;white-space:pre-line;font-size:14px":"align-self:flex-start;background:#F0EADF;padding:9px 13px;border-radius:14px 14px 14px 3px;max-width:88%;white-space:pre-line;font-size:14px";
 d.textContent=txt;log.appendChild(d);log.scrollTop=log.scrollHeight;return d;}
async function ask(){var i=document.getElementById("chatin");var q=(i.value||"").trim();if(!q)return;i.value="";addChat("me",q);var ph=addChat("bot","…");
 try{var r=await (await fetch("/api/ask",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({q:q})})).json();if(ph)ph.textContent=r.answer||"—";}
 catch(e){if(ph)ph.textContent="Jawab nahi mila.";}var log=document.getElementById("chatlog");if(log)log.scrollTop=log.scrollHeight;}
var kcChatSeeded=false;
function toggleChat(){var p=document.getElementById("chatpanel"),f=document.getElementById("fab"),tip=document.getElementById("fabtip");
 var open=!p.classList.contains("show");p.classList.toggle("show",open);f.classList.toggle("open",open);f.textContent=open?"×":"🤖";
 if(tip)tip.classList.remove("show");
 if(open&&!kcChatSeeded){kcChatSeeded=true;var h=(window.KC&&window.KC.chatHist)||[];
  if(h.length){h.forEach(function(m){addChat(m.r==="assistant"?"bot":"me",m.c);});}
  else{addChat("bot","Namaste! 🤖 Main aapke business ka poora data dekhkar madad karta hoon — ek cofounder/CMO ki tarah:\\n\\n• Orders, sale, NDR/RTO, return sabse zyada kahan\\n• Kya out of stock, kaunsa product slow\\n• \\"Sale kaise badhaun\\" — concrete plan\\n\\nBaat yaad rehti hai (24 ghante), to aise poochho jaise dost se — \\"wo kaunsa tha\\", \\"aur batao\\" sab chalega.");}}
 if(open)setTimeout(function(){var i=document.getElementById("chatin");if(i)i.focus();},120);}
try{setTimeout(function(){var t=document.getElementById("fabtip"),p=document.getElementById("chatpanel");
 if(t&&p&&!p.classList.contains("show")){t.classList.add("show");setTimeout(function(){t.classList.remove("show");},5500);}},1400);}catch(_){}
function toggleNotif(){var p=document.getElementById("notifpanel");var open=!p.classList.contains("show");p.classList.toggle("show",open);
 if(open){var last=p.dataset.last;var b=document.querySelector(".nbadge");if(b)b.remove();
  p.querySelectorAll(".nprow.unseen").forEach(function(r){r.classList.remove("unseen");});
  fetch("/api/notif/seen",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id:Number(last)||0})}).catch(function(){});}}
function sRow(b){return b.closest(".srow");}
var tipT;function tipToggle(el){document.querySelectorAll(".tip.open").forEach(function(t){if(t!==el)t.classList.remove("open");});
 el.classList.toggle("open");clearTimeout(tipT);if(el.classList.contains("open"))tipT=setTimeout(function(){el.classList.remove("open");},4500);}
var stFilter="all";
function stChip(el,f){stFilter=f;document.querySelectorAll(".schip").forEach(function(c){c.classList.remove("on");});el.classList.add("on");filterStock();}
function filterStock(){var si=document.getElementById("ssearch");var q=(si&&si.value||"").toLowerCase().trim();
 document.querySelectorAll("#stocklist .srow").forEach(function(r){var nm=r.dataset.name||"";var st=r.dataset.st||"";var fo=true;
  if(stFilter==="healthy")fo=(st==="in_stock");
  else if(stFilter==="low")fo=(st==="low");
  else if(stFilter==="oos")fo=(st==="oos");
  else if(stFilter==="mismatch")fo=(r.dataset.mismatch==="1");
  else if(stFilter==="action")fo=(r.dataset.action==="1");
  else if(stFilter==="combo")fo=(r.dataset.combo==="1");
  else if(stFilter==="incombo")fo=(r.dataset.incombo==="1");
  var ok=(!q||nm.indexOf(q)>=0)&&fo;r.style.display=ok?"":"none";});}
function toggleSrow(h){if(h&&h.parentElement)h.parentElement.classList.toggle("open");}
async function saveStock(btn){var r=sRow(btn),o=btn.textContent;btn.textContent="…";
 var g=function(s){return r.querySelector(s);};var body={product_id:r.dataset.pid};
 if(g(".in-units"))body.units=+g(".in-units").value;
 if(g(".in-pb"))body.per_bundle=+g(".in-pb").value;
 if(g(".in-thr"))body.threshold=+g(".in-thr").value;
 if(g(".in-min"))body.min_qty=+g(".in-min").value;
 if(g(".in-track")&&!g(".in-track").disabled)body.tracking=g(".in-track").checked;
 if(g(".in-auto"))body.auto_oos=g(".in-auto").checked;
 try{var j=await (await fetch("/api/stock/set",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)})).json();
  toast("✅ Stock save"+(j&&j.portal&&j.portal.ok?" + portal update":""),"",false);setTimeout(function(){location.reload();},700);}catch(e){btn.textContent=o;}}
function makeCombo(b){var e=b.parentElement.querySelector(".comboedit");if(e)e.style.display=(e.style.display==="none"?"":"none");}
function addCRow(b){var ed=b.closest(".comboedit"),rows=ed.querySelector(".crows");var c=rows.firstElementChild.cloneNode(true);var s=c.querySelector(".c-comp");if(s)s.value="";var p=c.querySelector(".c-pcs");if(p)p.value=1;rows.appendChild(c);}
function rmCRow(b){var rows=b.closest(".crows");if(rows.children.length>1)b.closest(".crow").remove();else{var s=b.closest(".crow").querySelector(".c-comp");if(s)s.value="";}}
async function saveCombo(b){var r=sRow(b),ed=b.closest(".comboedit"),comps=[];
 ed.querySelectorAll(".crow").forEach(function(row){var cid=row.querySelector(".c-comp").value,pcs=+row.querySelector(".c-pcs").value;if(cid&&pcs>0)comps.push({component_id:cid,pcs:pcs});});
 if(!comps.length){alert("Kam se kam ek product add karo");return;}
 var o=b.textContent;b.textContent="…";
 try{var j=await (await fetch("/api/stock/combo",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({combo_id:r.dataset.pid,is_combo:true,components:comps})})).json();
  if(j&&j.ok){toast("🧩 Combo save"+(j.needSetup?" — kuch component ka stock declare karo":" — "+j.avail+" combo ban sakte"),"",false);setTimeout(function(){location.reload();},800);}else{b.textContent=o;toast("Combo save fail","",false);}}catch(e){b.textContent=o;}}
async function unCombo(b){if(!confirm("Is combo ka mapping hata dein? (har product ka apna stock waise hi rahega)"))return;var r=sRow(b);
 try{await fetch("/api/stock/combo",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({combo_id:r.dataset.pid,is_combo:false,components:[]})});toast("Combo hat gaya","",false);setTimeout(function(){location.reload();},700);}catch(e){}}

/* ===== Gift card generator ===== */
var cardCurType="thanks";
function cardType(b,t){cardCurType=t;document.querySelectorAll(".ctype").forEach(function(e){e.classList.toggle("on",e.dataset.ct===t);});}
function cfv(id){var e=document.getElementById(id);return e?e.value.trim():"";}
function buildPrompt(){
 var gift=cfv("cf-gift"),gifthi=cfv("cf-gifthi"),mo=cfv("cf-minorder")||"2000",wa=cfv("cf-wa")||"77399 61284";var p;
 if(cardCurType==="thanks"){
  p='Design a premium, print-ready gift note card for an Indian spice brand "Anagh Masale". Landscape 3:2 (printed on the TOP HALF of an A4 page), single side.\\n\\nSTYLE: warm festive premium Indian look. Deep green (#1f5f3a) main, saffron/orange (#d97a00) + cream accents. Subtle whole spices (cardamom, cinnamon, star anise, red chillies) and light rangoli/mandala at corners; keep centre clean. A small gift box with ribbon and 10 masala sachets as the main illustration. Clean bold highly readable fonts; Hindi in clear Devanagari, NO spelling mistakes, text sharp.\\n\\nTEXT (use exactly, in order):\\nTop heading: Thank You for Your Repeat Order!\\n'+'\\u0926\\u094b\\u092c\\u093e\\u0930\\u093e \\u0911\\u0930\\u094d\\u0921\\u0930 \\u0915\\u0930\\u0928\\u0947 \\u0915\\u0947 \\u0932\\u093f\\u090f \\u0927\\u0928\\u094d\\u092f\\u0935\\u093e\\u0926!\\nMiddle (gift highlight, inside a ribbon/badge, most eye-catching):\\nYour FREE Gift / \\u0906\\u092a\\u0915\\u093e FREE \\u0917\\u093f\\u092b\\u094d\\u091f\\n'+gift+'\\n'+gifthi+'\\nLine below gift: A small thank-you for trusting Anagh Masale and ordering above \\u20b9'+mo+'. / \\u20b9'+mo+' \\u0938\\u0947 \\u090a\\u092a\\u0930 \\u0915\\u093e \\u0911\\u0930\\u094d\\u0921\\u0930 \\u0915\\u0930\\u0928\\u0947 \\u0914\\u0930 \\u0905\\u0928\\u0918 \\u092e\\u0938\\u093e\\u0932\\u0947 \\u092a\\u0930 \\u092d\\u0930\\u094b\\u0938\\u093e \\u0915\\u0930\\u0928\\u0947 \\u0915\\u0947 \\u0932\\u093f\\u090f \\u090f\\u0915 \\u091b\\u094b\\u091f\\u093e \\u0938\\u093e \\u0924\\u094b\\u0939\\u092b\\u093c\\u093e\\u0964\\nBottom: Keep ordering on Kirana Club. More gifts on your next big order! / Kirana Club \\u092a\\u0930 \\u0911\\u0930\\u094d\\u0921\\u0930 \\u0915\\u0930\\u0924\\u0947 \\u0930\\u0939\\u093f\\u090f\\u0964\\nFooter: Anagh Masale | Muzaffarpur, Bihar | WhatsApp: '+wa+'\\n\\nRULES: no other text/logos/watermarks. 8-10mm clean margin all sides. High resolution, print-ready.';
 }else{
  p='Design ONE print-ready landscape thank-you + rating-steps card for an Indian spice brand "Anagh Masale". A5 landscape 210x148mm, keep all text/important elements 10mm inside edges. Single side.\\n\\nSTYLE: warm premium village-friendly flat vector, high contrast, large bold readable text (bold sans supporting Devanagari like Mukta/Hind). Colours deep green #1F5C3A, cream #FFF6E3, turmeric #F5A31A, dark brown text #3B2314. Subtle whole-spice illustrations only along corners/edges, never behind text.\\n\\nLAYOUT:\\n1) Top green band: empty white circle top-left for logo (leave blank). Hindi headline \\u0927\\u0928\\u094d\\u092f\\u0935\\u093e\\u0926! \\u0906\\u092a\\u0928\\u0947 Anagh \\u092e\\u0938\\u093e\\u0932\\u093e \\u091a\\u0941\\u0928\\u093e + small English \"Thank you for choosing Anagh Masala\".\\n2) Turmeric strip: \\u0905\\u0917\\u0932\\u0947 \\u092a\\u093e\\u0930\\u094d\\u0938\\u0932 \\u092e\\u0947\\u0902 \\u092a\\u093e\\u090f\\u0902 FREE \\u0917\\u093f\\u092b\\u094d\\u091f \\u092a\\u0948\\u0915 / Get a FREE gift pack in your next parcel.\\n3) Four step cards (icons star, video, whatsapp, parcel; badges 1-4), Hindi large + English small:\\n 1. Kirana Club \\u0910\\u092a \\u092e\\u0947\\u0902 \\u0938\\u091a\\u094d\\u091a\\u0940 \\u0930\\u0947\\u091f\\u093f\\u0902\\u0917 \\u0926\\u0947\\u0902 / Give an honest rating on Kirana Club\\n 2. Kirana Club \\u092a\\u0930 20-30 \\u0938\\u0947\\u0915\\u0902\\u0921 \\u0915\\u093e \\u0935\\u0940\\u0921\\u093f\\u092f\\u094b \\u0921\\u093e\\u0932\\u0947\\u0902 / Post a 20-30 sec video\\n 3. \\u0938\\u094d\\u0915\\u094d\\u0930\\u0940\\u0928\\u0936\\u0949\\u091f WhatsApp \\u0915\\u0930\\u0947\\u0902: '+wa+' / WhatsApp the screenshot\\n 4. \\u0905\\u0917\\u0932\\u093e \\u0911\\u0930\\u094d\\u0921\\u0930 \\u20b9'+mo+'+ \\u0915\\u0930\\u0947\\u0902, Order ID \\u092d\\u0947\\u091c\\u0947\\u0902 / Next order \\u20b9'+mo+'+, send the Order ID\\n4) Green footer: empty white square bottom-right for QR (leave blank) with \"WhatsApp: '+wa+'\" under it; left cream \"Anagh Masale | Taste the Purity, Feel the Tradition\". Tiny: One gift per order | Valid on \\u20b9'+mo+'+ order within 30 days | While stocks last.\\n\\nRULES: render all quoted text EXACTLY, correct Devanagari, no lorem. Do NOT draw any logo/QR (leave blanks). No photos of people. 300 DPI print quality.';
 }
 var ta=document.getElementById("cf-prompt");ta.value=p;ta.style.display="";document.getElementById("cf-copy").style.display="";}
function copyPrompt(){var ta=document.getElementById("cf-prompt");ta.select();try{navigator.clipboard.writeText(ta.value);toast("📋 Prompt copy ho gaya","ChatGPT me paste karo",false);}catch(e){document.execCommand&&document.execCommand("copy");}}
function setActiveCard(dataUrl,w,h,label){window._cardImg={data:dataUrl,w:w,h:h};var pv=document.getElementById("cf-preview");if(pv){pv.src=dataUrl;pv.style.display="";}var am=document.getElementById("cf-activemsg");if(am)am.textContent="✅ Active: "+(label||"card")+" — ab neeche PDF nikaalo.";}
function loadCardImg(input){var f=input.files&&input.files[0];if(!f)return;var rd=new FileReader();rd.onload=function(e){var im=new Image();im.onload=function(){setActiveCard(e.target.result,im.width,im.height,"ChatGPT image");};im.src=e.target.result;};rd.readAsDataURL(f);}

/* ---- Persistent assets (logo) ---- */
function downscale(dataUrl,maxDim,cb){var im=new Image();im.onload=function(){var w=im.width,h=im.height,s=Math.min(1,maxDim/Math.max(w,h));if(s<1){w=Math.round(w*s);h=Math.round(h*s);}var c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(im,0,0,w,h);var out=c.toDataURL("image/png");cb(out,w,h);};im.src=dataUrl;}
async function uploadAsset(slot,input){var f=input.files&&input.files[0];if(!f)return;var msg=document.getElementById("cf-logomsg");msg.textContent="Upload ho raha…";var rd=new FileReader();rd.onload=function(e){downscale(e.target.result,slot==="logo"?700:1400,async function(data,w,h){try{var r=await fetch("/api/asset/set",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({slot:slot,mime:"image/png",data:data,w:w,h:h})});var j=await r.json();if(!j.ok){msg.textContent=j.error==="too_big"?"⚠️ Image bahut badi — chhoti image try karo.":"⚠️ Save fail.";return;}showLogo(data);msg.textContent="✅ Save ho gaya (hamesha ke liye).";}catch(err){msg.textContent="⚠️ Network error.";}});};rd.readAsDataURL(f);input.value="";}
async function delAsset(slot){if(!confirm("Logo hata dein? Purana DB se delete ho jaayega."))return;var msg=document.getElementById("cf-logomsg");try{await fetch("/api/asset/del",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({slot:slot})});window._logo=null;showLogo(null);msg.textContent="Logo hat gaya.";}catch(e){msg.textContent="⚠️ Fail.";}}
function showLogo(data){window._logo=data||null;var img=document.getElementById("cf-logoimg"),emp=document.getElementById("cf-logoempty"),del=document.getElementById("cf-logodel");if(!img)return;if(data){img.src=data;img.style.display="";emp.style.display="none";del.style.display="";}else{img.style.display="none";emp.style.display="";del.style.display="none";}}
async function loadAssetsForCards(){if(window._assetsLoaded)return;window._assetsLoaded=true;try{var r=await fetch("/api/asset/get?slot=logo");if(r.ok){var j=await r.json();if(j.data)showLogo(j.data);}}catch(e){}}

/* ---- Option A: free canvas template ---- */
function wrapText(ctx,text,x,y,maxW,lh){var words=(text||"").split(" "),line="",yy=y;for(var i=0;i<words.length;i++){var t=line+words[i]+" ";if(ctx.measureText(t).width>maxW&&line){ctx.fillText(line.trim(),x,yy);line=words[i]+" ";yy+=lh;}else line=t;}if(line)ctx.fillText(line.trim(),x,yy);return yy;}
function drawLogoOn(ctx,cx,cy,r,cb){if(window._logo){var im=new Image();im.onload=function(){var s=Math.min(2*r/im.width,2*r/im.height);var w=im.width*s,h=im.height*s;ctx.drawImage(im,cx-w/2,cy-h/2,w,h);cb&&cb();};im.onerror=function(){cb&&cb();};im.src=window._logo;}else{cb&&cb();}}
function renderTemplate(){
 var gift=cfv("cf-gift"),gifthi=cfv("cf-gifthi"),mo=cfv("cf-minorder")||"2000",wa=cfv("cf-wa")||"77399 61284";
 var W=1500,H=1000,c=document.getElementById("cf-canvas");c.width=W;c.height=H;var x=c.getContext("2d");
 x.fillStyle="#1f5c3a";x.fillRect(0,0,W,H);
 x.fillStyle="#fff6e3";x.fillRect(40,40,W-80,H-80);
 x.fillStyle="#1f5c3a";x.fillRect(40,40,W-80,170);
 x.textBaseline="middle";
 var doText=function(){
  x.fillStyle="#fff6e3";x.textAlign="left";x.font="bold 52px 'Mukta',system-ui,sans-serif";
  x.fillText(window._logo?"":"Anagh Masale",window._logo?300:90,125);
  x.textAlign="center";
  if(cardCurType==="thanks"){
   x.fillStyle="#1f5c3a";x.font="bold 60px 'Mukta',system-ui,sans-serif";x.fillText("Thank You for Your Repeat Order!",W/2,290);
   x.font="bold 46px 'Mukta',system-ui,sans-serif";x.fillText("दोबारा ऑर्डर करने के लिए धन्यवाद!",W/2,360);
   x.fillStyle="#f5a31a";x.fillRect(W/2-430,430,860,230);
   x.fillStyle="#3b2314";x.font="bold 40px 'Mukta',system-ui,sans-serif";x.fillText("🎁 Your FREE Gift / आपका FREE गिफ्ट",W/2,480);
   x.fillStyle="#1f5c3a";x.font="bold 46px 'Mukta',system-ui,sans-serif";x.fillText(gift,W/2,545);
   x.font="bold 40px 'Mukta',system-ui,sans-serif";x.fillText(gifthi,W/2,605);
   x.fillStyle="#3b2314";x.font="30px 'Mukta',system-ui,sans-serif";
   wrapText(x,"₹"+mo+" se upar order karne aur Anagh Masale par bharosa karne ke liye ek chhota sa tohfa.",W/2,720,W-260,42);
   x.font="bold 30px 'Mukta',system-ui,sans-serif";x.fillText("Kirana Club par order karte rahiye — next bade order par aur gifts!",W/2,820);
  }else{
   x.fillStyle="#1f5c3a";x.font="bold 52px 'Mukta',system-ui,sans-serif";x.fillText("धन्यवाद! आपने Anagh मसाला चुना",W/2,285);
   x.fillStyle="#f5a31a";x.fillRect(90,335,W-180,70);x.fillStyle="#3b2314";x.font="bold 34px 'Mukta',system-ui,sans-serif";x.fillText("अगले पार्सल में पाएं FREE गिफ्ट पैक 🎁",W/2,370);
   var steps=["1. Kirana Club ऐप में सच्ची रेटिंग दें","2. 20-30 सेकंड का वीडियो डालें","3. स्क्रीनशॉट WhatsApp करें: "+wa,"4. अगला ऑर्डर ₹"+mo+"+ करें, Order ID भेजें"];
   x.textAlign="left";x.fillStyle="#3b2314";x.font="34px 'Mukta',system-ui,sans-serif";
   for(var i=0;i<4;i++){var yy=470+i*95;x.fillStyle="#1f5c3a";x.beginPath();x.arc(130,yy,34,0,7);x.fill();x.fillStyle="#fff6e3";x.textAlign="center";x.font="bold 34px 'Mukta',sans-serif";x.fillText(String(i+1),130,yy+2);x.fillStyle="#3b2314";x.textAlign="left";x.font="34px 'Mukta',sans-serif";x.fillText(steps[i],185,yy+2);}
   x.textAlign="center";x.fillStyle="#6b5"; x.font="22px 'Mukta',sans-serif";x.fillText("One gift per order · ₹"+mo+"+ order · 30 days ke andar · While stocks last",W/2,880);
  }
  x.fillStyle="#1f5c3a";x.fillRect(40,H-110,W-80,70);x.fillStyle="#fff6e3";x.font="bold 30px 'Mukta',sans-serif";x.textAlign="center";x.fillText("Anagh Masale · Muzaffarpur, Bihar · WhatsApp: "+wa,W/2,H-75);
  setActiveCard(c.toDataURL("image/png"),W,H,cardCurType==="thanks"?"Free template (Thank-you)":"Free template (Rating)");
  document.getElementById("cf-pdfmsg").textContent="";
 };
 if(window._logo)drawLogoOn(x,170,125,60,doText);else doText();
}
function loadJsPDF(){return new Promise(function(res,rej){if(window.jspdf&&window.jspdf.jsPDF){res();return;}var s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";s.onload=function(){res();};s.onerror=function(){rej();};document.head.appendChild(s);});}
async function makePdf(mode){
 var msg=document.getElementById("cf-pdfmsg");
 if(!window._cardImg){msg.textContent="⚠️ Pehle image upload karo.";return;}
 msg.textContent="PDF ban raha…";
 try{await loadJsPDF();}catch(e){msg.textContent="⚠️ PDF library load nahi hui (internet check karo).";return;}
 var JS=window.jspdf.jsPDF;var img=window._cardImg;var ar=img.w/img.h;
 var fmt=img.data.indexOf("image/png")>=0?"PNG":"JPEG";
 function fit(cw,ch){var w=cw,h=cw/ar;if(h>ch){h=ch;w=ch*ar;}return{w:w,h:h};}
 var doc=new JS({orientation:"portrait",unit:"mm",format:"a4"}),name;
 function cell(cols,rowsN,pad){var cellW=210/cols,cellH=297/rowsN;for(var r=0;r<rowsN;r++)for(var c=0;c<cols;c++){var x=c*cellW,y=r*cellH;var fp=fit(cellW-2*pad,cellH-2*pad);doc.addImage(img.data,fmt,x+(cellW-fp.w)/2,y+(cellH-fp.h)/2,fp.w,fp.h);}return{cellW:cellW,cellH:cellH};}
 function cutlines(cols,rowsN,cellW,cellH){doc.setDrawColor(170);doc.setLineWidth(0.2);if(doc.setLineDashPattern)doc.setLineDashPattern([2,2],0);for(var c=1;c<cols;c++)doc.line(c*cellW,0,c*cellW,297);for(var r=1;r<rowsN;r++)doc.line(0,r*cellH,210,r*cellH);}
 if(mode==="tophalf"){var m=8,f=fit(210-2*m,148-2*m);doc.addImage(img.data,fmt,(210-f.w)/2,m,f.w,f.h);doc.setDrawColor(200);if(doc.setLineDashPattern)doc.setLineDashPattern([2,2],0);doc.line(0,148.5,210,148.5);name="anagh_card_tophalf.pdf";}
 else if(mode==="8"){var g=cell(2,4,3);cutlines(2,4,g.cellW,g.cellH);name="anagh_card_8up.pdf";}
 else{var g2=cell(2,2,4);cutlines(2,2,g2.cellW,g2.cellH);name="anagh_card_4up.pdf";}
 doc.save(name);msg.textContent="✅ "+name+" download ho gaya.";}
async function linkOld(btn){var r=sRow(btn),sel=r.querySelector(".in-link"),from=sel&&sel.value;
 if(!from){alert("Pehle purana product chuniye");return;}
 var nm=sel.options[sel.selectedIndex].text;
 if(!confirm('"'+nm+'" ka stock aur settings is naye product me le aayein? Purana discontinue ho jayega.'))return;
 var o=btn.textContent;btn.textContent="…";
 try{var j=await (await fetch("/api/stock/link",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({from:from,to:r.dataset.pid})})).json();
  if(j&&j.ok){toast("🔗 Link ho gaya — "+(j.units||0)+" pcs stock aa gaya","",false);setTimeout(function(){location.reload();},800);}
  else{btn.textContent=o;toast("Link fail","Dubara try kijiye",false);}}catch(e){btn.textContent=o;toast("Error","",false);}}
async function markOOSNow(btn){var r=sRow(btn);if(!confirm("Is product ko ABHI portal par OUT OF STOCK karein?"))return;
 var j=await (await fetch("/api/stock/oos",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({product_id:r.dataset.pid,when:"now"})})).json();
 toast(j&&j.portal&&j.portal.ok?"⛔ Portal par OOS ho gaya":"⛔ OOS mark (portal update check karein)","",false);setTimeout(function(){location.reload();},750);}
async function markInStock(btn){var r=sRow(btn);if(!confirm("Is product ko portal par wapas IN STOCK karein?"))return;
 var j=await (await fetch("/api/stock/instock",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({product_id:r.dataset.pid})})).json();
 toast(j&&j.portal&&j.portal.ok?"✅ Portal par IN STOCK ho gaya":"IN STOCK mark (check karein)","",false);setTimeout(function(){location.reload();},750);}
async function scheduleOOS(btn){var r=sRow(btn),v=r.querySelector(".in-when").value;if(!v){alert("Pehle date aur time chuniye");return;}
 await fetch("/api/stock/oos",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({product_id:r.dataset.pid,when:new Date(v).getTime()})});toast("⏰ OOS schedule set","",false);}
async function discoverStock(btn){var o=btn.textContent;btn.textContent="Laa raha hoon…";
 try{var j=await (await fetch("/api/stock/discover",{method:"POST"})).json();
  if(j&&j.ok){toast("✅ "+(j.total||j.found||0)+" product mile ("+(j.found||0)+" naye)","",false);setTimeout(function(){location.reload();},900);}
  else{btn.textContent=o;toast("⚠️ Product nahi mile",(j&&j.reason)||"Portal se data nahi mila.",false);}
 }catch(e){btn.textContent=o;toast("⚠️ Error","Dubara try kijiye",false);}}
async function openOrder(id){
  const sh=document.getElementById("sheet");
  sh.innerHTML='<button class="x" onclick="closeOrder()">&times;</button><div style="padding:30px 0;text-align:center;color:#7B7168">Loading #'+esc(id)+'…</div>';
  document.getElementById("ovl").classList.add("show");
  let o;try{o=await (await fetch('/api/order?id='+encodeURIComponent(id))).json();}catch(e){sh.innerHTML='<button class="x" onclick="closeOrder()">&times;</button><div style="padding:20px">Detail load nahi hua.</div>';return;}
  if(!o||o.error){sh.innerHTML='<button class="x" onclick="closeOrder()">&times;</button><div style="padding:20px">Is order ka detail abhi nahi hai.</div>';return;}
  const d=o.detail||{};const ex=o.extra||{};
  const row=(k,v)=>v?'<div class="drow"><span class="k">'+k+'</span><span class="v">'+esc(v)+'</span></div>':'';
  const addr=[d.store,d.address,d.area,[d.city,d.state,d.pincode].filter(Boolean).join(", ")].filter(Boolean).map(esc).join("<br>");
  let links="";
  if(ex.invoice)links+='<a class="lnk" href="'+esc(ex.invoice)+'" target="_blank">Invoice</a>';
  if(ex.label)links+='<a class="lnk" href="'+esc(ex.label)+'" target="_blank">Label</a>';
  if(ex.tracking)links+='<a class="lnk" href="'+esc(ex.tracking)+'" target="_blank">Track</a>';
  let prods="";
  if(ex.products&&ex.products.length){
    prods='<div class="bkhead">Order breakup</div><div class="bktab">'
      +ex.products.map(p=>'<div class="bkrow"><div class="bknm">'+esc(p.name)+(p.pcs?'<span class="bkq">× '+p.pcs+' pcs'+(p.unit!=null?' @ '+rupee(p.unit):'')+'</span>':'')+'</div><div class="bkv">'+(p.total!=null?rupee(p.total):(p.price!=null?rupee(p.price):""))+'</div></div>').join("")
      +(ex.summary&&ex.summary.length?ex.summary.map(s=>'<div class="bkrow sum"><div class="bknm">'+esc(s.label||"")+'</div><div class="bkv">'+esc(s.value!=null?s.value:(s.num!=null?rupee(s.num):""))+'</div></div>').join(""):"")
      +'<div class="bkrow tot"><div class="bknm">Total</div><div class="bkv">'+esc(ex.grandTotal||rupee(o.amount))+'</div></div>'
      +'</div>';
  }
  sh.innerHTML='<button class="x" onclick="closeOrder()">&times;</button>'
    +'<h3>#'+esc(o.id)+'</h3><div class="sub" style="margin-bottom:12px">'+esc(d.customer||o.customer||"")+'</div>'
    +row("Status",o.status)+row("Payment",o.payment)+row("Courier",d.courier)+row("Order date",fmtISO(d.date))
    +prods
    +(d.note?row("Note",d.note):"")
    +(addr?'<div style="font-size:12px;font-weight:700;color:#7B7168;margin:14px 0 2px;text-transform:uppercase;letter-spacing:.5px">Delivery address</div><div class="addr">'+addr+'</div>':'')
    +(links?'<div style="margin-top:6px">'+links+'</div>':'');
}
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

function loginForm() {
  return `<div id="loginBox" style="display:grid;gap:9px">
    <div class="sub" style="color:var(--ink)">Gmail se login karein — OTP aapke email par aayega. Laptop/cookie ki zaroorat nahi.</div>
    <input id="lgEmail" type="email" inputmode="email" placeholder="aapka@gmail.com"
      style="font:inherit;padding:11px 12px;border-radius:10px;border:1px solid var(--line)">
    <div id="lgStep1"><button onclick="loginStart()" id="lgBtn1">OTP bhejein</button></div>
    <div id="lgStep2" style="display:none;gap:9px">
      <input id="lgCode" inputmode="numeric" autocomplete="one-time-code" placeholder="Email par aaya OTP"
        style="font:inherit;padding:11px 12px;border-radius:10px;border:1px solid var(--line);width:100%;margin-bottom:9px">
      <button onclick="loginVerify()" id="lgBtn2">Verify &amp; login</button>
    </div>
    <div id="lgMsg" class="sub" style="color:var(--ink)"></div>
  </div>`;
}

function chatSection(t) {
  return `<h2 style="margin:0 0 4px">💬 Assistant</h2>
    <div class="sub" style="margin-bottom:12px">Apne orders ke baare mein poochhiye — NDR, aaj ki sale, top product, out of stock, waghairah.</div>
    <div class="card" style="display:flex;flex-direction:column;height:66vh">
      <div id="chatlog" style="flex:1;overflow:auto;display:flex;flex-direction:column;gap:10px;padding-bottom:10px"></div>
      <div style="display:flex;gap:8px;border-top:1px solid var(--line);padding-top:10px">
        <input id="chatin" placeholder="Poochhiye…" onkeydown="if(event.key==='Enter')ask()"
          style="flex:1;font:inherit;padding:10px 12px;border-radius:10px;border:1px solid var(--line)">
        <button onclick="ask()">Send</button>
      </div>
    </div>`;
}

function sessionForm() {
  return `<form method="post" action="/session" style="display:grid;gap:8px">
    <textarea name="token" rows="3" required placeholder="cookie: __Secure-next-auth.session-token=...; ..."
      style="font:13px ui-monospace,monospace;padding:10px;border-radius:10px;border:1px solid #E7C8C2;width:100%"></textarea>
    <div class="sub" style="color:inherit;opacity:.8">Chrome → portal kholiye → F12 → Network → koi bhi <b>session</b> row → Headers → Request Headers → <b>cookie</b> ki poori value copy karke yahan paste kariye.</div>
    <div><button>Save &amp; check now</button></div></form>`;
}

function insightsView(d, t) {
  const ins = d.insights;
  if (!ins || !ins.items || !ins.items.length) return `<div class="empty">${t("noIns")}</div>`;
  const top = ins.items.slice(0, 8);
  const max = Math.max(1, ...top.map((p) => Number(p.units) || 0));
  const bars = `<div class="ibars">${top.map((p) => {
    const u = Number(p.units) || 0;
    const pct = Math.max(3, Math.round((u / max) * 100));
    const nm = p.name || p.code || "";
    return `<div class="ibar"><div class="ibl" title="${esc(nm)}">${esc(nm)}${p.oos ? ` <span class="oosdot" title="Out of stock"></span>` : ""}</div>
      <div class="ibt"><div class="ibf${p.oos ? " oos" : ""}" style="width:${pct}%"></div></div>
      <div class="ibv">${u}</div></div>`;
  }).join("")}</div>`;
  const list = `<ul class="lead">${ins.items.map((p) => {
    const down = p.dir === "down" || (typeof p.change === "number" && p.change < 0);
    const ch = p.change != null && p.change !== 0 ? `<span class="${down ? "down" : "up"}">${p.change > 0 ? "+" : ""}${p.change}%</span>` : "";
    return `<li><span class="rk">${p.rank || ""}</span>
      <div><div class="nm">${esc(p.name || p.code || "")}${p.oos ? `<span class="oosb">${t("oos")}</span>` : ""}</div>
      <div class="m2">${p.orders || 0} ${t("ordLabel")}${p.mrp ? " · ₹" + p.mrp : ""}${ch ? " · " + ch : ""}</div></div>
      <div class="u"><b>${p.units || 0}</b><div class="m2">${t("units")}</div></div></li>`;
  }).join("")}</ul>`;
  return `<div class="ihead">${t("topByUnits")}</div>${bars}<div class="idiv"></div><div class="ihead">${t("allProducts")}</div>${list}`;
}

function suggView(d, lang) {
  const cards = (d.suggestions || []).filter((c) => c && (c.title || c.line));
  if (!cards.length) return "";
  const tagTxt = (t) => t === "high" ? "High impact" : t === "medium" || t === "mid" ? "Medium" : t ? esc(t) : "";
  const items = cards.map((c) => {
    const tag = tagTxt(c.tag);
    const prod = c.product && c.product.name ? esc(c.product.name) : "";
    return `<div class="sugg"><div class="suggt">💡 ${esc(c.title || "")}${tag ? `<span class="suggtag ${esc(c.tag || "")}">${tag}</span>` : ""}</div>${prod ? `<div class="suggp">${prod}</div>` : ""}${c.line ? `<div class="suggd">${esc(c.line)}</div>` : ""}</div>`;
  }).join("");
  return `<section class="card" style="margin-bottom:16px"><h2>${lang === "hi" ? "Kirana ke suggestions" : "Kirana suggestions"} <small>${lang === "hi" ? "activate seller app par hi" : "act on the seller app"}</small></h2>${items}</section>`;
}
function tip(msg) { return `<span class="tip" onclick="tipToggle(this)">i<span class="tipbub">${esc(msg)}</span></span>`; }
function stockView(d, t) {
  const allRows = (d.inventory && d.inventory.rows) || [];
  const rows = allRows.filter((r) => r.status !== "discontinued" && r.status !== "merged");
  const normN = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const activeNames = new Set(rows.map((r) => normN(r.name)));
  // link dropdown: sirf wo discontinued jinka active same-naam version NAHI hai (superseded ko chhupao) (#1)
  const discList = allRows.filter((r) => r.status === "discontinued" && !activeNames.has(normN(r.name)));
  if (!rows.length) return `<div class="empty">Abhi koi product nahi mila. Niche dabaiye — aapke portal catalog se poori product list aa jayegi, phir har product ki units set kar dijiye.</div>
    <button class="btn" style="margin-top:12px" onclick="discoverStock(this)">↺ Portal se products laao</button>`;
  const badge = (s) => s === "oos" ? `<span class="sbadge oos">OUT OF STOCK</span>` : s === "low" ? `<span class="sbadge low">LOW</span>` : `<span class="sbadge ok">In stock</span>`;
  const meta = (r) => {
    const portalOos = Number(r.portal_oos) === 1;
    const effSt = r.tracking ? r.status : (portalOos ? "oos" : "in_stock");
    const mismatch = r.tracking && ((r.status === "oos" && !portalOos) || (r.status !== "oos" && portalOos && Number(r.units) > 0));
    const declareNeed = !portalOos && (!r.tracking || Number(r.units) <= 0);
    return { portalOos, effSt, mismatch, declareNeed, action: declareNeed || mismatch };
  };
  const C = { healthy: 0, low: 0, oos: 0, mismatch: 0, action: 0, combo: 0, incombo: 0 };
  rows.forEach((r) => {
    if (Number(r.is_combo)) {
      C.combo++;
      const ci = r._combo;
      if (ci && !ci.needSetup) { if (ci.avail <= 0) C.oos++; else if (ci.avail <= (Number(r.threshold) || 0)) C.low++; else C.healthy++; }
      if (!ci || ci.needSetup || ci.avail <= 0) C.action++;
    } else {
      const m = meta(r);
      if (m.effSt === "in_stock") C.healthy++; else if (m.effSt === "low") C.low++; else if (m.effSt === "oos") C.oos++;
      if (m.mismatch) C.mismatch++; if (m.action) C.action++;
    }
    if (r._inCombos) C.incombo++;
  });
  const chip = (f, label, n) => `<span class="schip${f === "all" ? " on" : ""}" data-f="${f}" onclick="stChip(this,'${f}')">${label} <b>${n}</b></span>`;
  const header = `<div class="stocktop">
    <div class="stoprow">
      <input class="ssearch" id="ssearch" placeholder="🔍 Product dhoondo…" oninput="filterStock()" autocomplete="off">
      <button class="btn" onclick="discoverStock(this)">↺ Portal se sync</button></div>
    <div class="schips">${chip("all", "Sabhi", rows.length)}${chip("healthy", "✅ Healthy", C.healthy)}${chip("low", "⚠️ Low", C.low)}${chip("oos", "⛔ OOS", C.oos)}${chip("combo", "🧩 Combo", C.combo)}${chip("incombo", "🔗 In-combo", C.incombo)}${chip("mismatch", "🔀 Mismatch", C.mismatch)}${chip("action", "🔔 Action", C.action)}</div></div>`;
  // combo mapping ke liye: components = saare non-combo products
  const comboOpts = rows.filter((x) => !Number(x.is_combo));
  const optTags = (sel) => comboOpts.map((o) => `<option value="${esc(o.product_id)}"${String(sel) === String(o.product_id) ? " selected" : ""}>${esc(o.name || o.sku || o.product_id)}</option>`).join("");
  const compRow = (cid, pcs) => `<div class="crow"><select class="c-comp"><option value="">— product chuno —</option>${optTags(cid)}</select><span class="cx">×</span><input type="number" class="c-pcs" value="${pcs || 1}" min="1" inputmode="numeric"><span class="cu">pcs</span><button class="btn mini ghost crm" onclick="rmCRow(this)">✕</button></div>`;
  const recipeEditor = (comps) => `<div class="comboedit">
      <div class="celabel">Combo me kaunse products — aur per combo kitne pcs:</div>
      <div class="crows">${(comps && comps.length ? comps.map((c) => compRow(c.id, c.pcs)) : [compRow("", 1)]).join("")}</div>
      <div><button class="btn mini ghost" onclick="addCRow(this)">+ product jodo</button>
      <button class="btn mini" onclick="saveCombo(this)">Combo save</button></div></div>`;

  const list = rows.map((r) => {
    const pb = Number(r.per_bundle) || 0;
    // ========== COMBO card ==========
    if (Number(r.is_combo) === 1) {
      const ci = r._combo || { avail: 0, components: [], blockers: [], needSetup: true };
      const need = ci.needSetup, avail = ci.avail;
      const portalOos = Number(r.portal_oos) === 1;
      const effSt = need ? "in_stock" : (avail <= 0 ? "oos" : (avail <= (Number(r.threshold) || 0) ? "low" : "in_stock"));
      const blk = (ci.blockers || []).map((b) => b.name);
      const statusPill = need ? `<span class="sbadge untr">Setup</span>` : badge(effSt);
      const action = need || avail <= 0;
      const sumText = need ? `⚠️ Components set karein` : `<span class="u">${avail}</span> combo ban sakte${avail <= 0 && blk.length ? ` · ${esc(blk[0])} OOS` : ""}`;
      const bd = ci.components.length ? `<div class="combobd">${ci.components.map((c) => `<div class="cbrow${!c.tracked ? " untr" : (avail <= 0 && c.makes <= avail ? " blk" : "")}"><span>${esc(c.name)}</span>${c.tracked ? `<span><b>${c.units}</b> ÷ ${c.pcs} = <b>${c.makes}</b></span>` : `<span class="cwarn">stock declare karein</span>`}</div>`).join("")}<div class="cbtot">${need ? "Kuch component ka stock declare nahi — combo calculate nahi ho paa raha." : `Ban sakte: <b>${avail}</b> combo${avail <= 0 && blk.length ? ` — <span class="cwarn">${esc(blk.join(", "))} OOS, isliye combo OOS</span>` : ""}`}</div></div>` : "";
      return `<div class="srow combo ${effSt}${action ? " act" : ""}" data-pid="${esc(r.product_id)}" data-name="${esc((r.name || r.sku || "").toLowerCase())}" data-st="${effSt}" data-mismatch="0" data-action="${action ? 1 : 0}" data-combo="1">
      <div class="shead" onclick="toggleSrow(this)">
        <div class="sh-top"><span class="combotag">COMBO</span><b>${esc(r.name || r.sku || r.product_id)}</b>${r.sku ? `<span class="skucode">${esc(r.sku)}</span>` : ""}${statusPill}<span class="sbadge ${portalOos ? "oos" : "ok"}">Portal: ${portalOos ? "OOS" : "In stock"}</span></div>
        <div class="sh-sum">${sumText}${action ? `<span class="actflag">🔔 dhyan</span>` : ""}<span class="chev">▾</span></div>
      </div>
      <div class="sbody">
        ${bd}
        ${recipeEditor(ci.components)}
        <div class="sctrl one"><label>Alert ≤ (combos) ${tip("Itne ya kam combo ban sakein to LOW alert.")}<input type="number" class="in-thr" value="${r.threshold}" min="0" inputmode="numeric"></label></div>
        <div class="srow2">
          <label class="chk"><input type="checkbox" class="in-auto" ${r.auto_oos ? "checked" : ""}> Auto-sync ${tip("Component OOS → combo portal par bhi OOS, aur wapas aane par in-stock.")}</label>
          <button class="btn mini" onclick="saveStock(this)">Save</button>
          <button class="btn mini ghost" onclick="unCombo(this)">Combo hatao</button>
        </div>
      </div>
    </div>`;
    }
    // ========== regular product card ==========
    const m = meta(r);
    const bundleInfo = pb ? `<span class="bundleline">= ${Math.floor(r.units / pb)} bundle + ${r.units % pb} pcs</span>` : "";
    const statusPill = r.tracking ? badge(r.status) : `<span class="sbadge untr">Track off</span>`;
    const sum = [];
    if (r.tracking) { sum.push(`<span class="u">${r.units}</span> pcs`); if (pb) sum.push(`${Math.floor(r.units / pb)} bundle`); sum.push(`alert ≤${r.threshold}`); }
    else sum.push(`Track off — set up karein`);
    const nm = (r.name || "").toLowerCase();
    const looksCombo = /combo|pack of \d|\bpack\b/.test(nm);
    return `<div class="srow ${m.effSt}${m.action ? " act" : ""}" data-pid="${esc(r.product_id)}" data-name="${esc((r.name || r.sku || "").toLowerCase())}" data-st="${m.effSt}" data-mismatch="${m.mismatch ? 1 : 0}" data-action="${m.action ? 1 : 0}" data-incombo="${r._inCombos ? 1 : 0}">
    <div class="shead" onclick="toggleSrow(this)">
      <div class="sh-top"><b>${esc(r.name || r.sku || r.product_id)}</b>${r.sku ? `<span class="skucode">${esc(r.sku)}</span>` : ""}${statusPill}<span class="sbadge ${m.portalOos ? "oos" : "ok"}">Portal: ${m.portalOos ? "OOS" : "In stock"}</span>${m.mismatch ? `<span class="sbadge warn">⚠ mismatch</span>` : ""}</div>
      <div class="sh-sum">${sum.join(" · ")}${r._inCombos ? `<span class="incombochip">🧩 combo me</span>` : ""}${m.action ? `<span class="actflag">🔔 action chahiye</span>` : ""}<span class="chev">▾</span></div>
    </div>
    <div class="sbody">
      ${r._inCombos && r._inCombos.length ? `<div class="incombo">🧩 Ye product in combos ka hissa hai: <b>${r._inCombos.map(esc).join(", ")}</b> — iska stock ghate to wo combo bhi update hota hai.</div>` : ""}
      ${m.declareNeed ? `<div class="declare">Portal par IN STOCK hai par yahan stock declare nahi — units bhariye warna order aayega aur track nahi hoga.</div>` : ""}
      ${(!r.tracking && Number(r.units) === 0 && !pb && discList.length) ? `<div class="linkold">🔗 Naya SKU? Purane product ka stock yahan le aao:
        <select class="in-link"><option value="">— purana product chuno —</option>${discList.map((o) => `<option value="${esc(o.product_id)}">${esc(o.name || o.sku || o.product_id)}${o.sku ? ` (${esc(o.sku)})` : ""} · ${Number(o.units) || 0} pcs</option>`).join("")}</select>
        <button class="btn mini" onclick="linkOld(this)">Link karo</button></div>` : ""}
      <div class="sctrl">
        <label>Units bache (pcs) ${tip("Abhi kitne single pieces/sachet bache hain. Order aate hi apne aap ghatega.")}<input type="number" class="in-units" value="${r.units}" min="0" inputmode="numeric"></label>
        <label>Pcs per bundle ${tip("1 packet/bundle me kitne pcs (jaise 20). Bundles isi se dikhega. Khaali/0 = sirf pcs.")}<input type="number" class="in-pb" value="${pb}" min="0" inputmode="numeric"></label>
        <label>Alert &lt;= ${tip("Units itne ya kam hote hi LOW alert jata hai.")}<input type="number" class="in-thr" value="${r.threshold}" min="0" inputmode="numeric"></label>
        <label>Min order qty ${tip("1 order me kitne pcs jaate hain — portal se auto aata hai. Portal pe badlo to yahan apne aap update.")}<input type="number" class="in-min" value="${r.min_qty}" min="1" inputmode="numeric" readonly></label>
      </div>
      ${bundleInfo ? `<div class="bundlerow">${bundleInfo}</div>` : ""}
      <div class="srow2">
        <label class="chk"><input type="checkbox" class="in-track" ${r.tracking ? "checked" : ""}> Track ${tip("On = is product ka stock track karo aur order par ghatao.")}</label>
        <label class="chk"><input type="checkbox" class="in-auto" ${r.auto_oos ? "checked" : ""}> Auto-sync ${tip("On = stock 0 hote hi portal par OOS, aur stock aate hi wapas IN STOCK — apne aap.")}</label>
        <button class="btn mini" onclick="saveStock(this)">Save</button>
        ${m.portalOos ? `<button class="btn mini ghost" onclick="markInStock(this)">Portal IN-STOCK karo</button>` : `<button class="btn mini ghost" onclick="markOOSNow(this)">Portal OOS karo</button>`}
      </div>
      <div class="srow3"><label class="sched">Schedule OOS ${tip("Is date/time par apne aap portal par OOS ho jayega.")}<input type="datetime-local" class="in-when"></label><button class="btn mini ghost" onclick="scheduleOOS(this)">Set</button></div>
      <div class="combotoggle">
        <button class="btn mini ghost ${looksCombo ? "suggest" : ""}" onclick="makeCombo(this)">🧩 ${looksCombo ? "Lagta hai ye combo pack hai — components map karo" : "Ye combo pack hai? Components map karo"}</button>
        <div class="comboedit" style="display:none">
          <div class="celabel">Combo me kaunse products — aur per combo kitne pcs:</div>
          <div class="crows">${compRow("", 1)}</div>
          <div><button class="btn mini ghost" onclick="addCRow(this)">+ product jodo</button>
          <button class="btn mini" onclick="saveCombo(this)">Combo save</button></div>
        </div>
      </div>
    </div>
  </div>`;
  }).join("");
  return `<div class="sub" style="margin-bottom:12px">${t("stockSub")}</div>${header}<div id="stocklist">${list}</div>`;
}

function stars(n) {
  n = Math.round(Number(n) || 0);
  return `<span class="stars">${"★".repeat(n)}${"☆".repeat(5 - n)}</span>`;
}
function cardsView() {
  const f = (id, label, val, type) => `<label class="cfl">${label}<input id="${id}" ${type === "num" ? 'type="number"' : ""} value="${esc(val)}"></label>`;
  return `<div class="card cardgen">
    <div class="cardblock" style="margin-top:0">
      <div class="cbh">🏷️ Brand logo (ek baar upload — hamesha save)</div>
      <div class="sub" style="margin-bottom:8px">Logo template card me apne aap lag jaayega. Replace/remove karne par purana DB se delete ho jaata hai.</div>
      <div class="logorow">
        <div class="logobox" id="cf-logobox"><span id="cf-logoempty" class="sub">No logo</span><img id="cf-logoimg" style="display:none"></div>
        <div class="logoacts">
          <label class="btn mini">⬆️ Upload / Replace<input type="file" accept="image/*" onchange="uploadAsset('logo',this)" style="display:none"></label>
          <button class="btn mini danger" id="cf-logodel" onclick="delAsset('logo')" style="display:none">🗑️ Remove</button>
        </div>
      </div>
      <div class="sub" id="cf-logomsg" style="margin-top:6px"></div>
    </div>

    <div class="ctypes">
      <button class="ctype on" data-ct="thanks" onclick="cardType(this,'thanks')">🙏 Thank-you + Free Gift</button>
      <button class="ctype" data-ct="rating" onclick="cardType(this,'rating')">⭐ Rating steps</button>
    </div>
    <div class="cardform" id="cardform">
      ${f("cf-gift", "Free gift (English)", "10 pcs Anagh Meat Masala (₹10 pack)")}
      ${f("cf-gifthi", "Free gift (हिंदी)", "10 पैकेट अनघ मीट मसाला (₹10 वाला)")}
      ${f("cf-minorder", "Min order ₹", "2000", "num")}
      ${f("cf-wa", "WhatsApp", "77399 61284")}
    </div>

    <div class="cardblock">
      <div class="cbh">Option A — free template (bina ChatGPT, turant)</div>
      <div class="sub" style="margin-bottom:8px">Form bhar ke preview banao — logo + text se card browser me hi ban jaayega. Phir neeche PDF nikaalo.</div>
      <button class="btn mini" onclick="renderTemplate()">🎨 Template preview banao</button>
    </div>

    <div class="cardblock">
      <div class="cbh">Option B — ChatGPT se image banwao (best quality)</div>
      <div class="sub" style="margin-bottom:8px">Prompt bana ke copy karo → ChatGPT me daalo → image download karke neeche upload karo.</div>
      <button class="btn mini" onclick="buildPrompt()">📝 Prompt banao</button>
      <button class="btn mini ghost" id="cf-copy" onclick="copyPrompt()" style="display:none">📋 Copy</button>
      <textarea id="cf-prompt" rows="7" readonly style="display:none;width:100%;margin-top:9px;font:12px ui-monospace,monospace;padding:10px;border:1px solid var(--line);border-radius:10px"></textarea>
      <div style="margin-top:10px"><input type="file" id="cf-img" accept="image/*" onchange="loadCardImg(this)" style="font-size:13px"></div>
    </div>

    <div class="cardblock">
      <div class="cbh">📄 Jo card active hai uska preview</div>
      <img id="cf-preview" style="display:none;max-width:100%;border-radius:10px;margin-top:4px;border:1px solid var(--line)">
      <div class="sub" id="cf-activemsg">Abhi koi card active nahi — Option A ya B se banao.</div>
    </div>

    <div class="cardblock">
      <div class="cbh">Print PDF banao (free — browser me banega)</div>
      <div class="pdfbtns">
        <button class="btn mini" onclick="makePdf('tophalf')">A4 top-half</button>
        <button class="btn mini" onclick="makePdf('8')">8 per sheet</button>
        <button class="btn mini" onclick="makePdf('4')">4 per sheet + cut-lines</button>
      </div>
      <div class="sub" id="cf-pdfmsg" style="margin-top:8px"></div>
    </div>
    <canvas id="cf-canvas" style="display:none"></canvas>
  </div>`;
}

function ratingsView(d, t) {
  const r = d.ratings, sum = r && r.summary, prods = (r && r.products) || [];
  const totalReviews = sum ? sum.total_reviews || 0 : 0;
  const avg = sum ? sum.average_rating || 0 : 0;
  let head = `<div class="rsum"><div class="big">${avg ? Number(avg).toFixed(1) : "–"}</div>
    <div>${stars(avg)}<div class="sub">${sum ? (sum.total_ratings || 0) + " " + t("ratingsL") + " · " + totalReviews + " " + t("reviewsL") : t("noRatings")}</div></div></div>`;
  if (!totalReviews && !prods.some((p) => p.reviews)) head += `<div class="empty">${t("noRatings")}</div>`;
  const plist = prods.length
    ? `<ul class="lead" style="margin-top:12px">${prods.map((p) => `<li><span class="rk">${p.rating ? Number(p.rating).toFixed(1) : "–"}</span>
      <div><div class="nm">${esc(p.name || p.code || "")}${p.oos ? `<span class="oosb">${t("oos")}</span>` : ""}</div>
      <div class="m2">${p.reviews || 0} ${t("reviewsL")}${p.mrp ? " · ₹" + p.mrp : ""}</div></div>
      <div class="u">${p.rating ? stars(p.rating) : ""}</div></li>`).join("")}</ul>`
    : "";
  return head + plist;
}

export function dashboardPage(d, env, lang) {
  lang = lang === "en" ? "en" : "hi";
  const t = tt(lang);
  const h = health(d, t);
  const lr = d.lastRun;
  const metrics = d.latest?.metrics || {};
  const prev = d.previous?.metrics || {};
  const counts = d.latest?.counts || {};

  const da = d.dailyAvg || {};
  const rup = (v) => "₹" + Math.round(Number(v) || 0).toLocaleString("en-IN");
  const avgCard = `<div class="card kpi avgcard"><div class="l">${lang === "hi" ? "Daily average sale" : "Avg sale / day"}</div>
    <div class="v">${da.avgSale != null ? rup(da.avgSale) : "–"}</div>
    <div class="d">${rup(da.totalSale || 0)} · ${da.days || 0} din</div></div>` +
  `<div class="card kpi avgcard"><div class="l">${lang === "hi" ? "Daily average orders" : "Avg orders / day"}</div>
    <div class="v">${da.avg != null ? da.avg : "–"}</div>
    <div class="d">${da.orders || 0} orders · ${da.days || 0} din</div></div>`;
  const kpis = avgCard + (Object.keys(metrics).length
    ? Object.entries(metrics).map(([k, v]) => `<div class="card kpi"><div class="l">${esc(k)}</div>
        <div class="v">${esc(fmtVal(k, v))}</div>${delta(k, v, prev[k], t)}</div>`).join("")
    : `<div class="card kpi"><div class="l">Data</div><div class="v">–</div><div class="d">${t("noData")}</div></div>`);

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

  const rows = d.orders.map((o) => `<tr class="orow" data-st="${esc(o.status)}" onclick="openOrder('${esc(o.id)}')">
      <td><b>#${esc(o.id)}</b><div class="sub">${esc(o.customer || "")}${o.city ? ", " + esc(o.city) : ""}${o.placed_at && !/^\d{4}-/.test(o.placed_at) ? " · " + esc(o.placed_at) : ""}</div></td>
      <td><span class="tag t-${statusTone(o.status)}">${esc(o.status)}</span>${o.payment ? `<div class="sub" style="margin-top:4px">${esc(o.payment)}</div>` : ""}</td>
      <td class="n">${o.amount != null ? "₹" + Number(o.amount).toLocaleString("en-IN") : "–"}</td>
      <td class="n hide-sm sub">${esc(ago(o.updated_at, d.now))}</td></tr>`).join("");

  // filters: Confirmed/new pinned first (always, even 0) so new orders are easy to check, then statuses present
  const present = [...new Set(d.orders.map((o) => o.status).filter(Boolean))];
  const rest = present.filter((s) => !/^confirmed$/i.test(s))
    .sort((a, b) => order.indexOf(statusTone(a)) - order.indexOf(statusTone(b)));
  const stSet = ["Confirmed", ...rest];
  const filters = `<div class="filters"><span class="fchip on" data-f="" onclick="filterOrders(this,'')">${t("filterAll")} ${d.orders.length}</span>${stSet.map((s) => {
    const n = d.orders.filter((o) => o.status === s).length;
    const isNew = /^confirmed$/i.test(s);
    return `<span class="fchip${isNew ? " fnew" : ""}" data-f="${esc(s)}" onclick="filterOrders(this,'${esc(s)}')">${isNew ? "🆕 " : ""}${esc(s)} ${n}</span>`;
  }).join("")}</div>`;

  const c = chart(d.orderDays, d.now);
  const totalAll = Object.entries(counts).find(([s]) => /^all$/i.test(s));
  const failBanner = d.failing
    ? `<div class="banner bad"><b>${d.failing === "SESSION" ? "Kirana Club login expire ho gaya." : d.failing === "CONFIG" ? "Portal connection abhi set nahi hai." : "Pichhla check fail hua."}</b>
       ${lr && !lr.ok ? `<div class="sub" style="color:inherit;opacity:.85;margin-top:4px;word-break:break-word">${esc(lr.error)}</div>` : ""}
       ${lr && !lr.ok && d.errorShotTs && Math.abs(d.errorShotTs - lr.ts) < 10 * 60000 ? `<div style="margin-top:8px"><a href="/error-shot" target="_blank" style="color:inherit;font-weight:700">📸 Fail ke waqt portal ka screenshot dekhiye</a></div>` : ""}
       ${d.failing === "SESSION" || d.failing === "CONFIG" ? `<div style="margin-top:10px">${loginForm()}</div>` : ""}</div>`
    : "";

  const ordersTable = rows
    ? `${filters}<div class="scrolllist"><table><thead><tr><th>${t("colOrder")}</th><th>${t("colStatus")}</th><th style="text-align:right">${t("colAmount")}</th><th class="hide-sm" style="text-align:right">${t("colUpd")}</th></tr></thead><tbody id="obody">${rows}</tbody></table></div>`
    : `<div class="empty">${t("noOrders")}</div>`;

  const menuA = (sec, ic, label, on) => `<a data-sec="${sec}" class="${on ? "on" : ""}" onclick="showSec('${sec}')"><span class="ic">${ic}</span>${label}</a>`;
  const invAlerts = (d.inventory && d.inventory.alerts) || 0;
  const stockMenu = `<a data-sec="stock" onclick="showSec('stock')"><span class="ic">🏷️</span>${t("stock")}${invAlerts ? `<span class="mbadge">${invAlerts}</span>` : ""}</a>`;

  const evs = d.events || [];
  const unseen = evs.filter((e) => e.id > (d.notifSeenId || 0)).length;
  const body = `<div class="topbar">
    <button class="burger" onclick="toggleMenu(1)" aria-label="Menu">☰</button>
    <div class="mark" style="width:32px;height:32px;border-radius:9px;font-size:12px">KC</div>
    <div class="topttl">Kirana Club Tracker<span>${t("sub")}</span></div>
    <button class="bell" onclick="toggleNotif()" aria-label="Notifications">🔔${unseen ? `<span class="nbadge">${unseen > 9 ? "9+" : unseen}</span>` : ""}</button>
    <div class="langtog"><a href="/lang?set=hi" class="${lang === "hi" ? "on" : ""}">HI</a><a href="/lang?set=en" class="${lang === "en" ? "on" : ""}">EN</a></div>
    <span class="pill ${h.tone}"><i></i><span class="pilltext">${h.text}</span></span>
  </div>
  <div class="notifpanel" id="notifpanel" data-last="${evs[0] ? evs[0].id : 0}">
    <div class="nphead"><b>🔔 Notifications</b><button onclick="toggleNotif()" class="npx">×</button></div>
    <div class="nplist">${evs.slice(0, 40).map((e) => `<div class="nprow ${e.id > (d.notifSeenId || 0) ? "unseen" : ""} ${e.type}"><div class="npt">${esc(e.title)}</div><div class="npd">${fmtTime(e.ts)}</div></div>`).join("") || `<div class="empty" style="padding:20px">Abhi koi notification nahi.</div>`}</div>
  </div>
  <div class="menu" id="menu"><div class="bg" onclick="toggleMenu(0)"></div><div class="panel">
    <div class="mh"><div class="mark" style="width:30px;height:30px;border-radius:8px;font-size:11px">KC</div><b>${t("menu")}</b></div>
    ${menuA("home", "🏠", t("home"), true)}${menuA("orders", "📦", t("orders"))}${stockMenu}${menuA("insights", "📊", t("insights"))}${menuA("ratings", "⭐", t("ratings"))}${menuA("cards", "🎁", "Gift Cards")}${menuA("settings", "⚙️", t("settings"))}
  </div></div>
  <div class="wrap">
  ${d.queued ? `<div class="banner demo"><b>Check shuru ho gaya.</b> 1–2 min mein naya data aayega.</div><script>setTimeout(()=>location.href="/",90000)</script>` : ""}
  ${failBanner}
  ${invAlerts ? `<div class="banner bad" onclick="showSec('stock')" style="cursor:pointer"><b>⚠️ ${invAlerts} product dhyaan maangte hain</b> — low ya out of stock. Tap karke Stock kholiye.</div>` : ""}
  ${!d.lastRun ? `<div class="banner demo"><b>Pehla setup — Gmail se login kariye:</b><div style="margin-top:10px">${loginForm()}</div></div>` : ""}

  <div class="sec on" id="sec-home">
    <div class="meta">
      <span>${t("lastCheck")} <b>${lr ? fmtTime(lr.ts) : "–"}</b>${lr ? ` (${ago(lr.ts, d.now)})` : ""}</span>
      <span>${t("full")}</span>
      ${d.fast ? `<span>${d.fast.ok ? t("rtOn") : t("rtOff")}</span>` : ""}
      <span><b>${d.runs24h.ok}/${d.runs24h.total}</b> ${t("checksOk")}</span>
    </div>
    <div class="kpis">${kpis}</div>
    ${chips ? `<div class="chips">${chips}</div>` : ""}
    ${suggView(d, lang)}
    <section class="card chart" style="margin-bottom:16px"><h2>${t("perDay")} <small>${t("last14")} · ${c.total} orders</small></h2>${c.svg}</section>
    <section class="card"><h2>${t("activity")} <small>${t("activitySub")}</small></h2>
      <ul class="tl">${tl || `<li class="empty">${t("noAct")}</li>`}</ul></section>
  </div>

  <div class="sec" id="sec-orders">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <h2 style="margin:0">${t("orders")} <small>${totalAll ? `${t("allOrdersN")} ${totalAll[1]}` : ""}</small></h2>
      <form method="post" action="/run" style="margin:0"><button>${t("checkNow")}</button></form>
    </div>
    <div class="card">${ordersTable}</div>
  </div>

  <div class="sec" id="sec-stock">
    <h2 style="margin:0 0 14px">🏷️ ${t("stock")}</h2>
    ${stockView(d, t)}
  </div>

  <div class="sec" id="sec-insights">
    <h2 style="margin:0 0 4px">${t("insights")}</h2><div class="sub" style="margin-bottom:14px">${t("insSub")}</div>
    <div class="card">${insightsView(d, t)}</div>
  </div>

  <div class="sec" id="sec-ratings">
    <h2 style="margin:0 0 14px">${t("ratings")}</h2>
    <div class="card">${ratingsView(d, t)}</div>
  </div>

  <div class="sec" id="sec-cards">
    <h2 style="margin:0 0 4px">🎁 Gift Cards</h2>
    <div class="sub" style="margin-bottom:14px">Parcel me daalne wale thank-you / rating card — form bharo, PDF (top-half, 8-per-sheet, cut-lines) turant download.</div>
    ${cardsView()}
  </div>

  <div class="sec" id="sec-settings">
    <h2 style="margin:0 0 14px">${t("settings")}</h2>
    <div class="card pushbar" style="margin-bottom:14px">
      <span style="font-size:20px">🔔</span>
      <div class="sub" id="pushState" style="color:var(--ink)">${t("notifPrompt")}</div>
      <button id="pushBtn" onclick="enablePush()">${t("notifOn")}</button>
      <button id="pushTest" class="ghost" style="display:none" onclick="testPush()">${t("test")}</button>
    </div>
    <div class="card" style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:center">
      <b>${t("language")}</b>
      <div class="langtog"><a href="/lang?set=hi" class="${lang === "hi" ? "on" : ""}">Hinglish</a><a href="/lang?set=en" class="${lang === "en" ? "on" : ""}">English</a></div></div></div>
    <div class="card"><div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">Login</div>${loginForm()}
      <details style="margin-top:14px"><summary class="sub" style="cursor:pointer">Advanced: cookie se login (laptop)</summary><div style="margin-top:10px">${sessionForm()}</div></details></div>
    <footer><a href="/logout"><button class="ghost" type="button">${t("logout")}</button></a></footer>
  </div>

  </div>
<div class="fabtip" id="fabtip">🤖 ${lang === "hi" ? "Poochhiye: kaunse order NDR/RTO hue, aaj ki sale, top product, kya out of stock hai" : "Ask: which orders are NDR/RTO, today's sale, top product, what's out of stock"}</div>
<button class="fab" id="fab" onclick="toggleChat()" aria-label="Assistant">🤖</button>
<div class="chatpanel" id="chatpanel">
  <div class="chathead"><span>🤖 ${lang === "hi" ? "AI Assistant" : "AI Assistant"}</span><button type="button" onclick="toggleChat()" aria-label="Close">×</button></div>
  <div id="chatlog"></div>
  <div class="chatinput"><input id="chatin" autocomplete="off" placeholder="${lang === "hi" ? "Poochhiye…" : "Ask…"}" onkeydown="if(event.key==='Enter')ask()"><button type="button" onclick="ask()">${lang === "hi" ? "Bhejo" : "Send"}</button></div>
</div>
<div class="toast" id="toast"><b id="tT"></b><span id="tB"></span></div>
<div class="ovl" id="ovl" onclick="if(event.target===this)closeOrder()"><div class="sheet" style="position:relative" id="sheet"></div></div>
<script>window.KC={lastEvent:${Number(d.lastEvent?.id || 0)},lastRun:${Number(d.lastRun?.ts || 0)},devices:${Number(d.pushDevices || 0)},chatHist:${JSON.stringify((d.chatHistory || []).map((h) => ({ r: h.role, c: String(h.content || "") })))}};</script>
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
    // Stock alerts — error nahi, stock reminder
    const stock = { DIGEST: ["⚠️ Stock digest", "#A86A12", "Ye low/out-of-stock products hain. Stock page par units update kijiye. Ye digest din me kuch baar aata hai, har order par nahi."],
      OOS: ["⛔ Out of stock", "#BF3A2B", "Ye product khatam ho gaye. Restock karke Stock page par units bhariye."],
      DECLARE: ["⚠️ Stock declare karo", "#A86A12", "Ye products portal par IN STOCK hain par app me unki units set nahi. Stock page par bhariye warna order track nahi hoga."] };
    if (stock[code]) {
      const [h, col, foot] = stock[code];
      return wrap(`<h2 style="margin:6px 0 10px;font-size:19px;color:${col}">${h}</h2>
        <p style="margin:0 0 8px;font-size:14px;white-space:pre-line">${esc(message)}</p><p style="margin:0;font-size:14px;color:#7B7168">${foot}</p>`);
    }
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
