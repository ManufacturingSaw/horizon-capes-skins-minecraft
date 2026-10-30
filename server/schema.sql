-- Tailor's free server: who wears what. Cloudflare D1 (SQLite).
-- Apply with: wrangler d1 execute tailor --remote --file=schema.sql

-- Only a player's Minecraft id and name. No email, no password, no token.
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,                 -- Minecraft player id, 32 hex, no dashes
  name TEXT NOT NULL,
  first_seen INTEGER NOT NULL,         -- unix seconds; the first month gets the Founder cape
  squad TEXT REFERENCES squads(code)
);

CREATE TABLE IF NOT EXISTS wearing (
  player TEXT PRIMARY KEY REFERENCES players(id),
  cape TEXT,                           -- cape.ember, custom:<id> or squad
  wings TEXT,
  hat TEXT,
  pet TEXT,
  updated INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS squads (
  code TEXT PRIMARY KEY,               -- WOLF-7Q2K
  name TEXT NOT NULL,
  emblem TEXT NOT NULL,                -- wolf, crown, flame, star…
  color1 TEXT NOT NULL,                -- the cape
  color2 TEXT NOT NULL,                -- the emblem and the band
  owner TEXT NOT NULL REFERENCES players(id),
  created INTEGER NOT NULL
);

-- Custom capes. The picture itself is in R2 under capes/<id>.
CREATE TABLE IF NOT EXISTS capes (
  id TEXT PRIMARY KEY,                 -- first 20 hex of the picture's SHA-256
  owner TEXT NOT NULL REFERENCES players(id),
  kind TEXT NOT NULL,                  -- png, jpeg or gif
  bytes INTEGER NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0,   -- 1 after 3 reports, until a volunteer reviews it
  created INTEGER NOT NULL
);

-- One row per player per cape, so reporting twice counts once.
CREATE TABLE IF NOT EXISTS reports (
  cape TEXT NOT NULL REFERENCES capes(id),
  reporter TEXT NOT NULL REFERENCES players(id),
  created INTEGER NOT NULL,
  PRIMARY KEY (cape, reporter)
);

CREATE INDEX IF NOT EXISTS players_squad ON players(squad);
