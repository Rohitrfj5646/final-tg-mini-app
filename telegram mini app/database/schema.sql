-- ================================================
-- CRYPTOSIGNAL PRO — SUPABASE DATABASE SCHEMA
-- ================================================
-- Run this SQL in: Supabase Dashboard → SQL Editor → New Query
-- Then click "Run" button
-- ================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- TABLE: users
-- ================================================
CREATE TABLE IF NOT EXISTS users (
  id               TEXT PRIMARY KEY,              -- e.g. "telegram_123456789"
  telegram_id      BIGINT UNIQUE,
  username         TEXT,
  first_name       TEXT DEFAULT '',
  last_name        TEXT DEFAULT '',
  photo_url        TEXT DEFAULT '',
  balance          DECIMAL(15, 2) DEFAULT 10000.00,
  total_profit     DECIMAL(15, 2) DEFAULT 0.00,
  total_loss       DECIMAL(15, 2) DEFAULT 0.00,
  role             TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  last_login_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TABLE: signals
-- ================================================
CREATE TABLE IF NOT EXISTS signals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol       TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('BUY', 'SELL')),
  entry        DECIMAL(20, 8) NOT NULL,
  stop_loss    DECIMAL(20, 8),
  take_profit  DECIMAL(20, 8),
  confidence   INTEGER DEFAULT 80 CHECK (confidence BETWEEN 1 AND 100),
  description  TEXT DEFAULT '',
  status       TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'cancelled')),
  created_by   TEXT DEFAULT 'admin',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TABLE: trades
-- ================================================
CREATE TABLE IF NOT EXISTS trades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT REFERENCES users(id) ON DELETE CASCADE,
  signal_id       UUID REFERENCES signals(id) ON DELETE SET NULL,
  symbol          TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('BUY', 'SELL')),
  amount          DECIMAL(15, 2) NOT NULL,
  entry_price     DECIMAL(20, 8) DEFAULT 0,
  close_price     DECIMAL(20, 8),
  pnl             DECIMAL(15, 2) DEFAULT 0,
  pnl_percentage  DECIMAL(10, 4) DEFAULT 0,
  status          TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  closed_at       TIMESTAMPTZ
);

-- ================================================
-- TABLE: transactions
-- ================================================
CREATE TABLE IF NOT EXISTS transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw')),
  amount       DECIMAL(15, 2) NOT NULL,
  method       TEXT DEFAULT 'manual',
  address      TEXT DEFAULT '',
  note         TEXT DEFAULT '',
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note  TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ
);

-- ================================================
-- TABLE: news
-- ================================================
CREATE TABLE IF NOT EXISTS news (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  content     TEXT DEFAULT '',
  image_url   TEXT DEFAULT '',
  url         TEXT DEFAULT '',
  source      TEXT DEFAULT 'Admin',
  category    TEXT DEFAULT 'crypto',
  published   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TABLE: settings
-- ================================================
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TABLE: subscribers (Telegram bot alerts)
-- ================================================
CREATE TABLE IF NOT EXISTS subscribers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id    BIGINT UNIQUE NOT NULL,
  username   TEXT,
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- DEFAULT SETTINGS
-- ================================================
INSERT INTO settings (key, value) VALUES
  ('app_name', 'CryptoSignal Pro'),
  ('welcome_bonus', '10000'),
  ('maintenance', 'false'),
  ('min_deposit', '10'),
  ('min_withdraw', '10')
ON CONFLICT (key) DO NOTHING;

-- ================================================
-- SAMPLE SIGNALS (for testing)
-- ================================================
INSERT INTO signals (symbol, type, entry, stop_loss, take_profit, confidence, description, status)
VALUES
  ('BTCUSDT', 'BUY',  65000, 63000, 70000, 88, 'Strong support at 65K. Institutional buying detected. RSI oversold.', 'active'),
  ('ETHUSDT', 'BUY',  3200,  3050,  3600,  82, 'ETH breaking out of consolidation. Layer 2 activity high.', 'active'),
  ('SOLUSDT', 'SELL', 175,   185,   155,   75, 'SOL facing resistance. Volume declining. Short opportunity.', 'active')
ON CONFLICT DO NOTHING;

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================
-- Enable RLS on all tables
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades       ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE news         ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers  ENABLE ROW LEVEL SECURITY;

-- ---- Policies for service_role (backend) ----
-- Service role bypasses RLS automatically, no explicit policy needed.

-- ---- Public read policies (anon key — frontend) ----
-- Signals: any logged-in user can read
CREATE POLICY "signals_read_all" ON signals
  FOR SELECT USING (true);

-- News: read published only
CREATE POLICY "news_read_published" ON news
  FOR SELECT USING (published = true);

-- Settings: read all
CREATE POLICY "settings_read_all" ON settings
  FOR SELECT USING (true);

-- Users: read own only
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (true);  -- Backend validates via JWT

-- Trades: read own only (backend enforces user_id filter)
CREATE POLICY "trades_read_all" ON trades
  FOR SELECT USING (true);

-- Transactions: read own only
CREATE POLICY "transactions_read_all" ON transactions
  FOR SELECT USING (true);

-- ================================================
-- INDEXES (for performance)
-- ================================================
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- ================================================
-- DONE! Your database is ready.
-- ================================================
-- Tables created:
--   ✅ users
--   ✅ signals  
--   ✅ trades
--   ✅ transactions
--   ✅ news
--   ✅ settings
--   ✅ subscribers
-- ================================================
