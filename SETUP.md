# Kirana Club Tracker: Simple Setup

## Ye kaise kaam karta hai (3 line mein)

1. **Cloudflare** (free) har 30 minute GitHub ko bolta hai: "check karo"
2. **GitHub** (free) ek asli Chrome kholta hai, aapke login ke saath, aur Overview + Orders page padhta hai, bilkul jaise aap padhte hain
3. Data **Cloudflare** ko wapas jaata hai → wo pichhli baar se compare karta hai → **mail** bhejta hai aur **dashboard** (track.anaghmasale.com) update karta hai

Laptop band ho tab bhi ye chalta rahega. Har baar login cookie bhi apne aap taaza ho jaati hai, jaise aapke Chrome mein hoti hai, isliye login lamba chalega.

---

## Setup (ek baar, ~25 minute)

### 1. GitHub repo banaiye
1. github.com par **Anagh-Masale** account se login kariye → **New repository**
2. Naam rakhiye `kirana-monitor` aur **Public** select kariye. Public repo par GitHub ki free minutes unlimited hain, aur repo mein koi data ya password nahi jaata.
3. Zip extract kariye, us folder mein terminal kholiye aur ye chalaiye:
```bash
git init && git add . && git commit -m "kirana monitor"
git branch -M main
git remote add origin https://github.com/Anagh-Masale/kirana-monitor.git
git push -u origin main
```

### 2. GitHub token banaiye (Cloudflare isse GitHub ko trigger karega)
GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**
- Repository access: **Only select repositories** → `kirana-monitor`
- Permissions → **Contents: Read and write**
- Expiration: sabse lamba jo mile
- Generate kariye aur token copy kar lijiye

### 3. Cloudflare par deploy kariye
Usi folder mein ye commands chalaiye:
```bash
npm install
npx wrangler login
npx wrangler d1 create kirana-monitor
```
Jo `database_id` aaye, use `wrangler.toml` mein `PASTE_DATABASE_ID_HERE` ki jagah daaliye. Phir:
```bash
npx wrangler d1 execute kirana-monitor --remote --file=schema.sql
npx wrangler secret put MAIL_TO          # anaghmasala@gmail.com
npx wrangler secret put RESEND_API_KEY   # Resend → API Keys → naya key
npx wrangler secret put DASH_PASSWORD    # dashboard ka password (aap chuniye)
npx wrangler secret put INGEST_KEY       # koi bhi lamba random text, ise yaad rakhiye
npx wrangler secret put GH_TOKEN         # step 2 wala token
npx wrangler deploy
```

### 4. GitHub ko Cloudflare ka pata dijiye
GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** dabakar do secrets banaiye:
- `WORKER_URL` = `https://track.anaghmasale.com`
- `INGEST_KEY` = wahi text jo step 3 mein daala tha

### 5. Login cookie dijiye (bas ek baar)
1. Chrome mein `supplier.kirana.club` kholiye (login hona chahiye)
2. `F12` → **Network** → list mein **session** wali row par click kariye → **Headers** → **Request Headers** mein `cookie:` dhundhiye → uski poori value copy kariye
3. `track.anaghmasale.com` kholiye → password daaliye → box mein cookie paste kariye → **Save & check now**
4. 2 minute baad dashboard par asli data dikhega aur pehla mail aayega

---

## Iske baad kya hoga

| Kab | Kya hoga |
|---|---|
| Har 30 min | Check hoga, phir mail aayega: kya badla, ya "No change" |
| Naya order | 🔔 New order #ID · status · ₹amount · COD/Paid · customer |
| Status badla | Order #ID: In Transit → Delivered (RTO/Cancelled laal rang mein) |
| Sales badli | Today's Sales: ₹690 → ₹1,930 |
| Login expire | Ek hi alert mail aayega → step 5 dobara kariye (1 min) |
| GitHub run nahi chala | 75 min mein "Monitor ruka hua hai" mail aayega |
| Har 30 min ka mail zyada lage | `wrangler.toml` mein `EMAIL_MODE = "changes"` kariye → `npx wrangler deploy` |

## Pehli baar chalne par agar error aaye
Dashboard par laal box mein error likha aayega. Uska screenshot mujhe bhejiye, main fix kar dunga.
