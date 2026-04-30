const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// Allow DATABASE_URL to be pre-set in env before dotenv runs
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
}

const dbPath = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('/')
  ? process.env.DATABASE_URL
  : path.resolve(__dirname, '..', (process.env.DATABASE_URL || './src/data/careeros.sqlite').replace('./', ''));

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    website TEXT,
    career_page TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS job_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_name TEXT NOT NULL,
    source_type TEXT,
    base_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id TEXT UNIQUE,
    title TEXT NOT NULL,
    company TEXT,
    company_id INTEGER,
    salary_min REAL,
    salary_max REAL,
    salary_text TEXT,
    remote_status TEXT DEFAULT 'unknown',
    location TEXT,
    posted_date TEXT,
    source_name TEXT,
    source_url TEXT,
    company_career_url TEXT,
    description TEXT,
    description_snippet TEXT,
    hard_filter_status TEXT DEFAULT 'pending',
    hard_filter_reason TEXT,
    status TEXT DEFAULT 'new',
    label TEXT DEFAULT 'unscored',
    score REAL DEFAULT 0,
    red_flags TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS job_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    title_alignment REAL DEFAULT 0,
    salary_alignment REAL DEFAULT 0,
    remote_eligibility REAL DEFAULT 0,
    experience_match REAL DEFAULT 0,
    skill_match REAL DEFAULT 0,
    growth_value REAL DEFAULT 0,
    total_score REAL DEFAULT 0,
    label TEXT,
    why_it_matches TEXT,
    missing_or_weak_requirements TEXT,
    skills_gap_level TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS resume_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    filename TEXT,
    resume_text TEXT,
    change_summary TEXT,
    keywords_added TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS cover_letters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    filename TEXT,
    cover_letter_text TEXT,
    angle_summary TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS application_packets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    packet_json TEXT,
    manual_apply_link TEXT,
    auto_apply_possible INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS application_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    status TEXT,
    notes TEXT,
    applied_date TEXT,
    follow_up_7_day TEXT,
    follow_up_14_day TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS user_approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    action TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS bot_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT,
    message TEXT,
    details_json TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

console.log('[DB] Database ready:', dbPath);
module.exports = db;
