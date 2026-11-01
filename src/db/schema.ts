// SQLite schema for MediTime
// All tables use TEXT primary keys (UUID strings)

export const CREATE_FAMILY_MEMBERS = `
CREATE TABLE IF NOT EXISTS family_members (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  relation    TEXT NOT NULL,
  age         INTEGER,
  avatar      TEXT,
  color       TEXT NOT NULL DEFAULT '#0d9488',
  created_at  TEXT NOT NULL
);`;

export const CREATE_MEDICINES = `
CREATE TABLE IF NOT EXISTS medicines (
  id                      TEXT PRIMARY KEY,
  family_member_id        TEXT NOT NULL,
  name                    TEXT NOT NULL,
  generic_name            TEXT,
  form                    TEXT NOT NULL DEFAULT 'tablet',
  strength                TEXT,
  unit                    TEXT NOT NULL DEFAULT 'mg',
  dose                    REAL NOT NULL DEFAULT 1,
  dose_unit               TEXT NOT NULL DEFAULT 'tablet',
  instruction             TEXT,
  instruction_other       TEXT,
  notes                   TEXT,
  color                   TEXT,
  image_uri               TEXT,
  frequency               TEXT NOT NULL DEFAULT 'once_daily',
  times                   TEXT NOT NULL DEFAULT '["08:00"]',
  weekdays                TEXT,
  start_date              TEXT NOT NULL,
  end_date                TEXT,
  current_stock           REAL,
  stock_unit              TEXT,
  low_stock_threshold     REAL,
  expiry_date             TEXT,
  alarm_enabled           INTEGER NOT NULL DEFAULT 1,
  ringtone                TEXT,
  vibration_enabled       INTEGER NOT NULL DEFAULT 1,
  snooze_duration         INTEGER NOT NULL DEFAULT 10,
  advance_reminder_minutes INTEGER,
  missed_dose_follow_up   INTEGER NOT NULL DEFAULT 1,
  is_active               INTEGER NOT NULL DEFAULT 1,
  is_paused               INTEGER NOT NULL DEFAULT 0,
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL,
  FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE CASCADE
);`;

export const CREATE_DOSE_RECORDS = `
CREATE TABLE IF NOT EXISTS dose_records (
  id               TEXT PRIMARY KEY,
  medicine_id      TEXT NOT NULL,
  medicine_name    TEXT NOT NULL,
  family_member_id TEXT NOT NULL,
  scheduled_time   TEXT NOT NULL,
  actual_time      TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  dose             REAL NOT NULL,
  dose_unit        TEXT NOT NULL,
  notes            TEXT,
  created_at       TEXT NOT NULL,
  FOREIGN KEY (medicine_id)      REFERENCES medicines(id) ON DELETE CASCADE,
  FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE CASCADE
);`;

export const CREATE_SETTINGS = `
CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);`;

export const ALL_TABLES = [
  CREATE_FAMILY_MEMBERS,
  CREATE_MEDICINES,
  CREATE_DOSE_RECORDS,
  CREATE_SETTINGS,
];
