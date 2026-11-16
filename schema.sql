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
