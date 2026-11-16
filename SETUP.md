# Kirana Club Tracker: Final Guide

## Kaise chalta hai
1. **Cloudflare** har 30 min GitHub ko trigger karta hai
2. **GitHub** ka browser aapke login se `orders/overview` aur `orders/list` padhta hai
3. **Cloudflare** pichhle check se compare karta hai, `anaghmasala@gmail.com` par mail bhejta hai aur dashboard update karta hai

Dashboard: https://track.anaghmasale.com (phone par "Add to Home screen" karke app ki tarah bhi chala sakte hain)

## Mail vs notification
| Kya hua | Mail | App notification |
|---|---|---|
| 🆕 Naya order | ✅ | ✅ (lamba vibration) |
| 💰 Sale badhi | ✅ | ✅ |
| ✅ Order Delivered | ✅ | ✅ |
| ⚠️ Error / login expire / monitor ruka | ✅ | ✅ |
| Baaki status (Confirmed, Shipment Created, In Transit, NDR, RTO...) | ❌ | ✅ |
| Kuch nahi badla | ❌ | ✅ bina sound, purana notification replace hota hai |

NDR/RTO par bhi mail chahiye: `wrangler.toml` mein `MAIL_STATUSES = "deliver,ndr,rto"` → `npx wrangler deploy`

**Timing:** 7:30 am se 11:30 pm tak har 30 min check. Raat 12 se 7:30 tak koi check, mail ya notification nahi. 7:30 ke check mein raat ke saare orders ek saath aate hain.

## Phone notifications (app jaisa popup)
1. Dashboard ko phone par install kariye. Android: Chrome ⋮ → Install app. iPhone: Safari → Share → Add to Home Screen.
2. **Install hue app** ko kholiye → password daaliye → **🔔 Notifications on kariye** → Allow
3. **Test bhejiye** dabaiye. 5–10 sec mein popup aana chahiye.
- Naya order: title "🆕 New order #ID · ₹amount", Android par lamba vibration, aur notification tab tak screen par rehta hai jab tak aap use hataate nahi
- Status change, sales change aur alerts: alag title ke saath popup
- App khula ho to naye order par "cha-ching" sound aur hara popup (bas ek baar screen touch kiya hona chahiye)
- App band ho to phone ki notification sound bajti hai. Android par is app ki sound badalne ke liye: Settings → Apps → KC Tracker → Notifications → Sound
- "No change" ka notification nahi aata, wo sirf mail mein aata hai

## Files
- `src/` = Cloudflare Worker (scheduler, database, mail, dashboard)
- `collector/collect.py` = GitHub par chalne wala browser script
- `.github/workflows/check.yml` = GitHub job
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

## Secrets (already set)
- Cloudflare: `MAIL_TO`, `RESEND_API_KEY`, `DASH_PASSWORD`, `INGEST_KEY`, `GH_TOKEN`
- GitHub: `WORKER_URL`, `INGEST_KEY`
