// Kirana Club portal se data laane wala adapter.
// Return shape (yahi dashboard/email/diff use karte hain):
// {
//   metrics: { "Total Sale": 13050, "Today's Sale": 1850, "Delivered": 5, ... },
//   orders: [{ id, status, amount, customer, city, placedAt, items }],
//   statusCounts?: { "New": 3, "Delivered": 5, "RTO": 1 }   // optional
// }

function fail(code, message) {
  return Object.assign(new Error(message), { code });
}

export async function collect(env, settings) {
  if (env.DEMO === "1") return demo(settings);

  const token = await settings.get("KC_TOKEN");
  if (!token) throw fail("SESSION", "Kirana Club ka session token set nahi hai. Dashboard par 'Update session' mein paste kariye.");

  // ---- PORTAL ADAPTER ----
  // Asli API endpoints aapki HAR file dekhkar yahan lagenge.
  // 401/403 aane par: throw fail("SESSION", "Session expire ho gaya")
  throw fail("CONFIG", "Portal adapter abhi configure nahi hua. HAR file bhejiye, endpoints yahan lagenge.");
}

// ---------------- demo data (adapter lagne tak) ----------------
const FLOW = ["New", "Confirmed", "Shipped", "Delivered"];
const SHOPS = [
  ["Gupta General Store", "Lucknow"], ["Sharma Kirana", "Patna"], ["Maa Durga Stores", "Varanasi"],
  ["Jai Hind Provision", "Kanpur"], ["Yadav Traders", "Gaya"], ["Shree Balaji Mart", "Prayagraj"],
  ["Ansari Kirana", "Muzaffarpur"], ["Annapurna Stores", "Gorakhpur"],
];

async function demo(settings) {
  const raw = await settings.get("demo_state");
  const st = raw ? JSON.parse(raw) : { seq: 1040, orders: [] };
  if (!raw) for (let i = 0; i < 6; i++) st.orders.push(newOrder(st, i < 3 ? 3 : i < 5 ? 2 : 1));

  for (const o of st.orders) {
    const i = FLOW.indexOf(o.status);
    if (i >= 0 && i < 3 && Math.random() < 0.3) {
      o.status = i === 2 && Math.random() < 0.15 ? "RTO" : FLOW[i + 1];
    }
  }
  if (Math.random() < 0.45) st.orders.push(newOrder(st, 0));
  await settings.set("demo_state", JSON.stringify(st));

  const delivered = st.orders.filter((o) => o.status === "Delivered");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const todays = st.orders.filter((o) => o.day === today);
  return {
    metrics: {
      "Total Sale": delivered.reduce((a, o) => a + o.amount, 0),
      "Today's Sale": todays.reduce((a, o) => a + o.amount, 0),
      "Yesterday's Sale": 2340,
      "Total Orders": st.orders.length,
      "Delivered Orders": delivered.length,
    },
    orders: st.orders.map(({ day, ...o }) => o),
  };
}

function newOrder(st, stage) {
  const [customer, city] = SHOPS[Math.floor(Math.random() * SHOPS.length)];
  return {
    id: String(++st.seq),
    status: FLOW[stage],
    amount: [420, 560, 780, 960, 1240, 1650][Math.floor(Math.random() * 6)],
    customer,
    city,
    placedAt: new Date().toISOString(),
    day: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
  };
}
