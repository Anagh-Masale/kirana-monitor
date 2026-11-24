"""
Kirana Club collector: asli Chrome (headless) mein portal kholta hai, bilkul aapki tarah.
1. Worker se saved login cookies leta hai
2. Overview URL kholta hai -> login page aaya to "SESSION" error bhejta hai
3. Overview ke numbers + Orders list (saare pages) padhta hai
4. Data + refreshed cookies Worker ko bhejta hai (cookies taaza rehti hain, login lamba chalta hai)
Logs mein koi customer data print nahi hota.
"""
import json
import os
import re
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

WORKER = os.environ.get("WORKER_URL", "").strip().rstrip("/")
KEY = os.environ.get("INGEST_KEY", "").strip()
if not WORKER or not KEY:
    print("SETUP ERROR: GitHub secrets WORKER_URL / INGEST_KEY set nahi hain")
    sys.exit(1)
SITE = os.getenv("SITE_URL", "https://supplier.kirana.club").rstrip("/")
OVERVIEW_URL = os.getenv("OVERVIEW_URL", SITE + "/en/apps/ecommerce/orders/overview")
ORDERS_URL = os.getenv("ORDERS_URL", SITE + "/en/apps/ecommerce/orders/list")
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN", ".kirana.club")
MAX_PAGES = 30


def api(path, payload=None):
    req = urllib.request.Request(
        WORKER + path,
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={"authorization": f"Bearer {KEY}", "content-type": "application/json",
                 "user-agent": "Mozilla/5.0 (kirana-monitor collector)"},
        method="POST" if payload is not None else "GET",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode() or "{}")


# ---------- cookies: 3 formats accept ----------
def to_storage_state(raw):
    raw = (raw or "").strip()
    if not raw:
        return None
    if raw.startswith("{"):
        st = json.loads(raw)
        if "cookies" in st:
            return st  # playwright storage state (rotated by us)
    cookies = []
    if raw.startswith("["):  # Cookie-Editor export
        for c in json.loads(raw):
            ss = {"lax": "Lax", "strict": "Strict", "no_restriction": "None"}.get(str(c.get("sameSite", "")).lower(), "Lax")
            cookies.append({
                "name": c["name"], "value": c["value"], "domain": c["domain"], "path": c.get("path", "/"),
                "expires": c.get("expirationDate", -1) or -1, "httpOnly": bool(c.get("httpOnly")),
                "secure": bool(c.get("secure")), "sameSite": ss,
            })
    else:  # "a=b; c=d" (DevTools request header copy)
        raw = re.sub(r"^cookie:\s*", "", raw, flags=re.I)
        for part in raw.split(";"):
            if "=" not in part:
                continue
            n, v = part.strip().split("=", 1)
            # Portal par next-auth cookies sirf supplier.kirana.club ki hoti hain (host-only),
            # baaki login cookies .kirana.club ki. Galat domain se refresh ke baad duplicate cookie banti.
            host_only = n.startswith("__Host-") or "next-auth" in n or n == "colorPref"
            domain = SITE.split("//")[1].split("/")[0] if host_only else COOKIE_DOMAIN
            secure = SITE.startswith("https")
            cookies.append({
                "name": n, "value": v, "domain": domain, "path": "/", "expires": -1,
                "httpOnly": True, "secure": secure, "sameSite": "Lax",
            })
    return {"cookies": cookies, "origins": []}


# ---------- page helpers ----------
def settle(page, wait_text=None, timeout=45000):
    try:
        page.wait_for_load_state("networkidle", timeout=timeout)
    except Exception:
        pass
    if wait_text:
        try:
            page.get_by_text(re.compile(wait_text, re.I)).first.wait_for(timeout=timeout)
        except Exception:
            pass
    time.sleep(1.5)


def is_login(page):
    u = page.url.lower()
    if "/login" in u or "/auth/" in u or "signin" in u:
        return True
    # Login form dikh raha hai (phone/OTP/email field) aur dashboard ka table/overview nahi
    form = page.locator('input[type="tel"], input[type="password"], input[name*="otp" i], input[name*="phone" i], input[name*="email" i]')
    try:
        dash = page.locator("table").count() + page.get_by_text(re.compile("ordering overview|this month sales", re.I)).count()
        return form.count() > 0 and form.first.is_visible() and dash == 0
    except Exception:
        return False


def nice(s):
    s = s.strip().title()
    return re.sub(r"\b(Rto|Ndr|Cod|Kc|Kb)\b", lambda m: m.group(1).upper(), s)


MONEY = re.compile(r"₹\s*([\d,]+(?:\.\d+)?)")


def money(s):
    m = MONEY.search(s)
    return float(m.group(1).replace(",", "")) if m else None


def parse_overview(text):
    lines = [re.sub(r"\s+", " ", l).strip() for l in text.splitlines()]
    lines = [l for l in lines if l]
    out = {}
    cards = [
        ("this month sales", "This Month Sales"),
        ("today's sales", "Today's Sales"),
        ("yesterday's sales", "Yesterday's Sales"),
        ("delivered orders", "Delivered"),
        ("returned orders", "Returned"),
    ]
    low = [l.lower().replace("’", "'") for l in lines]
    for key, name in cards:
        if key not in low:
            continue
        i = low.index(key)
        amt = cnt = pct = None
        for j in range(i + 1, min(i + 10, len(lines))):
            l = lines[j]
            if any(low[j] == k for k, _ in cards):
                break
            if amt is None and MONEY.search(l):
                amt = money(l)
                continue
            m = re.match(r"^(\d+)\s*orders?$", l, re.I)
            if m and cnt is None:
                cnt = int(m.group(1)); continue
            if re.fullmatch(r"\d+", l) and cnt is None and j + 1 < len(lines) and lines[j + 1].lower().startswith("order"):
                cnt = int(l); continue
            m = re.fullmatch(r"(\d+(?:\.\d+)?)\s*%", l)
            if m and pct is None:
                pct = m.group(1) + "%"
        short = name.replace(" Sales", "")
        if amt is not None:
            out[name if "Sales" in name else f"{name} value"] = amt
        if cnt is not None:
            out[f"{short} orders"] = cnt
        if pct is not None:
            out[f"{name} %"] = pct
    return out


def wait_metrics(page, timeout=60):
    """Numbers aane tak ruko (portal pehle label dikhata hai, numbers baad mein load karta hai)."""
    end, last = time.time() + timeout, {}
    while time.time() < end:
        try:
            last = parse_overview(page.inner_text("body", timeout=10000))
        except Exception:
            last = {}
        if "This Month Sales" in last and "Today's Sales" in last:
            time.sleep(1.5)  # baaki cards bhi load ho jaayein
            try:
                last = parse_overview(page.inner_text("body", timeout=10000)) or last
            except Exception:
                pass
            return last
        time.sleep(2)
    return last


LAST_PAGE = {"page": None, "shot": None, "state": None}


def grab_shot():
    try:
        pg = LAST_PAGE["page"]
        if pg and not LAST_PAGE["shot"]:
            import base64
            LAST_PAGE["shot"] = base64.b64encode(pg.screenshot(type="jpeg", quality=55, timeout=15000)).decode()
    except Exception:
        pass


def page_debug(page):
    try:
        txt = re.sub(r"\s+", " ", page.inner_text("body", timeout=5000))[:250]
    except Exception:
        txt = "?"
    return f"URL: {page.url} | Page text: {txt}"


def parse_tabs(text):
    counts = {}
    for l in text.splitlines():
        m = re.fullmatch(r"\s*([A-Za-z][A-Za-z _/-]*?)\s*\|\s*(\d+)\s*", l)
        if m:
            counts[nice(m.group(1))] = int(m.group(2))
    return counts


def read_rows(page):
    heads = [h.strip().lower() for h in page.locator("table thead th").all_inner_texts()]
    idx = lambda *names: next((i for i, h in enumerate(heads) if any(n in h for n in names)), None)
    ci = {k: idx(*v) for k, v in {
        "id": ("order",), "date": ("date",), "customer": ("customer",), "total": ("total", "amount"),
        "status": ("status",), "payment": ("payment",)}.items()}
    rows = []
    for r in page.locator("table tbody tr").all():
        cells = [c.strip() for c in r.locator("td").all_inner_texts()]
        if not cells:
            continue
        g = lambda k: cells[ci[k]] if ci[k] is not None and ci[k] < len(cells) else ""
        oid = re.sub(r"[^\w-]", "", g("id"))
        if not oid:
            continue
        rows.append({
            "id": oid, "placedAt": g("date"), "customer": g("customer"), "amount": money(g("total")),
            "status": nice(g("status")), "payment": g("payment"),
        })
    return rows


def next_page(page):
    for sel in ['button[aria-label="Go to next page"]', 'button[aria-label*="next" i]', '[title*="next" i]']:
        b = page.locator(sel).first
        if b.count() and b.is_visible() and b.is_enabled():
            b.click()
            return True
    return False


# ---------- main ----------
def main():
    state_raw = api("/api/state").get("state")
    state = to_storage_state(state_raw)
    if not state:
        api("/api/ingest", {"error": "Login cookies set nahi hain. Dashboard par paste kariye.", "error_code": "SESSION"})
        print("no cookies"); return

    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(storage_state=state, viewport={"width": 1600, "height": 1000}, locale="en-IN",
                                  timezone_id="Asia/Kolkata",
                                  user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
        page = ctx.new_page()
        LAST_PAGE["page"] = page
        try:
            metrics = {}
            for attempt in range(3):  # 3 try: overview numbers Kirana ki taraf se flaky ho sakte hain
                if attempt == 0:
                    page.goto(OVERVIEW_URL, wait_until="domcontentloaded", timeout=90000)
                else:
                    page.reload(wait_until="domcontentloaded", timeout=90000)
                settle(page, "this month sales", timeout=60000)
                if is_login(page):
                    api("/api/ingest", {"error": "Kirana Club ne login page dikhaya (session expire).", "error_code": "SESSION"})
                    print("login page"); browser.close(); return
                metrics = wait_metrics(page, 90)
                if "This Month Sales" in metrics:
                    break
            if "This Month Sales" not in metrics:
                # Overview numbers nahi aaye (Kirana ki taraf se slow/flaky) — ye CRITICAL nahi hai.
                # Poora run fail MAT karo: orders list hi asli data hai. Metrics khaali chhod do,
                # Worker pichhle good numbers carry-forward kar lega. Sirf chup-chaap log, koi error mail nahi.
                print("warn: overview numbers load nahi hue — metrics skip, orders phir bhi le rahe hain")
                metrics = {}

            counts = {}
            for attempt in range(2):
                if attempt == 0:
                    page.goto(ORDERS_URL, wait_until="domcontentloaded", timeout=90000)
                else:
                    page.reload(wait_until="domcontentloaded", timeout=90000)
                settle(page, timeout=60000)
                try:
                    page.locator("table tbody tr").first.wait_for(timeout=60000)
                except Exception:
                    pass
                if is_login(page):
                    api("/api/ingest", {"error": "Orders page par login maanga (session expire).", "error_code": "SESSION"})
                    browser.close(); return
                time.sleep(1.5)
                counts = parse_tabs(page.inner_text("body"))
                rows_ok = page.locator("table tbody tr").count() > 0 or counts.get("All", 1) == 0
                if counts and rows_ok:
                    break
            if not counts or not (page.locator("table tbody tr").count() > 0 or counts.get("All", 1) == 0):
                grab_shot()
                raise RuntimeError("Orders list 2 try mein load nahi hui (galat data bhejne se behtar ruk gaye). " + page_debug(page))

            orders, seen = [], set()
            for _ in range(MAX_PAGES):
                first = page.locator("table tbody tr").first.inner_text() if page.locator("table tbody tr").count() else ""
                for o in read_rows(page):
                    if o["id"] not in seen:
                        seen.add(o["id"]); orders.append(o)
                if not next_page(page):
                    break
                for _ in range(30):  # naya page load hone tak ruko
                    time.sleep(0.5)
                    cur = page.locator("table tbody tr").first.inner_text() if page.locator("table tbody tr").count() else ""
                    if cur != first:
                        break
                settle(page, timeout=15000)

        except Exception:
            grab_shot()
            try:  # fail par bhi taaza cookies save karo, taaki login na toote
                LAST_PAGE["state"] = json.dumps(ctx.storage_state())
            except Exception:
                pass
            raise
        new_state = json.dumps(ctx.storage_state())
        LAST_PAGE["state"] = new_state
        browser.close()

    if counts.get("All", 0) > 0 and not orders:
        raise RuntimeError("Portal par orders hain par list se 0 padhe gaye - data nahi bheja")
    # "More views" wale status (RTO In Transit, Exception...) orders list se gin kar jodo
    for o in orders:
        if o["status"] and o["status"] not in counts:
            counts[o["status"]] = sum(1 for x in orders if x["status"] == o["status"])
    payload = {"metrics": metrics, "orders": orders, "statusCounts": counts, "state": new_state}
    res = api("/api/ingest", payload)
    print(f"ok: {len(metrics)} metrics, {len(orders)} orders, {len(counts)} tabs, changes={res.get('changes')}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        msg = f"{type(e).__name__}: {str(e)[:500]}"
        shot = LAST_PAGE["shot"]  # fail ke waqt ka screenshot (sirf dashboard par, public log mein nahi)
        try:
            api("/api/ingest", {"error": msg, "error_code": "ERROR", "shot": shot, "state": LAST_PAGE["state"]})
        except Exception:
            pass
        import urllib.error
        if isinstance(e, urllib.error.HTTPError):
            print(f"failed: Worker ne HTTP {e.code} diya ({e.url.split('?')[0]})")
        else:
            print("failed:", msg.split(" | Page text:")[0][:200])
        sys.exit(1)
