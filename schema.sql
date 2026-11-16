CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  source TEXT,
  ok INTEGER NOT NULL,
  error_code TEXT,
  error TEXT,
  metrics TEXT,
  status_counts TEXT,
  changes TEXT,
  order_count INTEGER
);
CREATE INDEX IF NOT EXISTS idx_runs_ts ON runs(ts);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  status TEXT,
  amount REAL,
  customer TEXT,
  city TEXT,
  placed_at TEXT,
  items TEXT,
  payment TEXT,
  first_seen INTEGER,
  updated_at INTEGER,
  history TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_updated ON orders(updated_at);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  type TEXT,
  title TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);

CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT);

CREATE TABLE IF NOT EXISTS push_subs (endpoint TEXT PRIMARY KEY, sub TEXT, ua TEXT, created INTEGER);
CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, kind TEXT, title TEXT, body TEXT);
CREATE TABLE IF NOT EXISTS cleanup_log (msg_id TEXT PRIMARY KEY, ts INTEGER NOT NULL, mail_ts INTEGER, subject TEXT);
CREATE INDEX IF NOT EXISTS idx_cleanup_ts ON cleanup_log(ts);
