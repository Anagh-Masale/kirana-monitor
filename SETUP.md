# Kirana Club Tracker: Final Guide

## Kaise chalta hai
1. **Cloudflare** har 30 min GitHub ko trigger karta hai
2. **GitHub** ka browser aapke login se `orders/overview` aur `orders/list` padhta hai
3. **Cloudflare** pichhle check se compare karta hai, `anaghmasala@gmail.com` par mail bhejta hai aur dashboard update karta hai
4. **Google Apps Script** har 30 min purane "No change" mails Trash mein daalta hai

Dashboard: https://track.anaghmasale.com (phone par "Add to Home screen" karke app ki tarah bhi chala sakte hain)

## Mail types (bhejne wale ka naam)
| Naam | Kab aata hai | Address |
|---|---|---|
| 🆕 KC New Order | Naya order | anaghmasala+kc-order@gmail.com |
| 🔔 KC Update | Status ya sales badli | +kc-change |
| KC No Change | Kuch nahi badla (sirf latest inbox mein rehta hai) | +kc-quiet |
| ⚠️ KC Alert | Login expire, error, ya monitor ruka | +kc-alert |

Saare mails isi `anaghmasala@gmail.com` inbox mein aate hain.

## Phone notifications (app jaisa popup)
1. Dashboard ko phone par install kariye. Android: Chrome ⋮ → Install app. iPhone: Safari → Share → Add to Home Screen.
2. **Install hue app** ko kholiye → password daaliye → **🔔 Notifications on kariye** → Allow
3. **Test bhejiye** dabaiye. 5–10 sec mein popup aana chahiye.
- Naya order: title "🆕 New order #ID · ₹amount", Android par lamba vibration, aur notification tab tak screen par rehta hai jab tak aap use hataate nahi
- Status change, sales change aur alerts: alag title ke saath popup
- App khula ho to naye order par "cha-ching" sound aur hara popup (bas ek baar screen touch kiya hona chahiye)
- App band ho to phone ki notification sound bajti hai. Android par is app ki sound badalne ke liye: Settings → Apps → KC Tracker → Notifications → Sound
- "No change" ka notification nahi aata, wo sirf mail mein aata hai

## Mail cleanup log
Dashboard ke neeche **🧹 Mail cleanup log** mein 30 din tak dikhega ki kaunsa "No change" mail kab Trash mein gaya. Har line par "Gmail mein dekhiye" link hai, jisse mail khol kar "Move to Inbox" kar sakte hain.

## Files
- `src/` = Cloudflare Worker (scheduler, database, mail, dashboard)
- `collector/collect.py` = GitHub par chalne wala browser script
- `.github/workflows/check.yml` = GitHub job
- `gmail-cleanup.gs` = Google Apps Script (script.google.com par paste kariye, upar `INGEST_KEY` daaliye)
- `schema.sql` = database tables

## Update lagana (jab bhi code badle)
```powershell
cd D:\kirana-monitor
npx wrangler deploy
git add .
git commit -m "update"
git push
```

## Maintenance
| Situation | Kya karna hai |
|---|---|
| ⚠️ "Login expired" mail | Chrome → supplier.kirana.club login → F12 → Network → `session` row → Headers → `cookie` value copy → dashboard par paste → Save & check now |
| ⚠️ "Monitor ruka hua hai" mail | GitHub → Actions → last run → `Check portal` step ka screenshot |
| GitHub token delete ya expire hua | Naya token banaiye (Contents: Read and write, sirf kirana-monitor repo) → `npx wrangler secret put GH_TOKEN` |
| Har 30 min ka mail band karna hai | `wrangler.toml` mein `EMAIL_MODE = "changes"` → deploy |

## Secrets (already set)
- Cloudflare: `MAIL_TO`, `RESEND_API_KEY`, `DASH_PASSWORD`, `INGEST_KEY`, `GH_TOKEN`
- GitHub: `WORKER_URL`, `INGEST_KEY`
