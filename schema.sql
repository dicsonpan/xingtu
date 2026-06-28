-- ============================================================
-- 知遇 数据库 Schema (Cloudflare D1)
-- ============================================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','banned')),
  application_reason TEXT NOT NULL,
  reject_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT,
  approved_by INTEGER REFERENCES users(id)
);

-- 用户档案表（志愿填报相关信息）
CREATE TABLE IF NOT EXISTS user_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  -- 基础信息
  real_name TEXT,
  gender TEXT CHECK(gender IN ('male','female','other')),
  birth_year INTEGER,
  province TEXT,
  city TEXT,
  school_name TEXT,
  -- 中考信息
  exam_total_score INTEGER,
  subject_scores TEXT, -- JSON: {"chinese":80,"math":45,"english":50,"physics":40,"chemistry":35,"politics":60,"history":55,"pe":70}
  -- 兴趣偏好（自填）
  interests TEXT,       -- JSON array: ["机械","计算机","烹饪",...]
  hobbies TEXT,         -- JSON array
  -- 天赋维度自评 (1-5分)
  hands_on_ability INTEGER DEFAULT 3,       -- 动手能力
  spatial_thinking INTEGER DEFAULT 3,       -- 空间想象力
  interpersonal_skill INTEGER DEFAULT 3,    -- 人际交往
  art_perception INTEGER DEFAULT 3,         -- 艺术感知
  logical_thinking INTEGER DEFAULT 3,       -- 逻辑思维
  language_expression INTEGER DEFAULT 3,    -- 语言表达
  memory_ability INTEGER DEFAULT 3,         -- 记忆能力
  observation_ability INTEGER DEFAULT 3,    -- 观察力
  -- 家庭及偏好
  family_income_level TEXT DEFAULT 'medium' CHECK(family_income_level IN ('low','medium','high')),
  preferred_region TEXT,
  preferred_school_type TEXT, -- 中专/中职/技校，可多选 JSON
  -- 新手指引进度
  onboarding_step INTEGER DEFAULT 0,  -- 0=未开始, 1=已填档案, 2=已测评, 3=已匹配, 4=已完成全部
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 使用记录表（token追踪）
CREATE TABLE IF NOT EXISTS usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL CHECK(feature_type IN ('assessment','matching','school','antifraud','chat')),
  tokens_used INTEGER NOT NULL DEFAULT 0,
  request_summary TEXT, -- 不含隐私信息的功能性摘要
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 测评记录表
CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers TEXT NOT NULL,       -- JSON: 测评回答（情景选择+语音描述）
  talent_profile TEXT,         -- JSON: AI分析的天赋画像
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 对话记录表
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL,
  messages TEXT NOT NULL,      -- JSON array
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 防骗检测记录表
CREATE TABLE IF NOT EXISTS fraud_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  risk_level TEXT,             -- safe / warning / danger
  result TEXT NOT NULL,        -- JSON: AI分析结果
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 系统设置表（AI配置等）
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  -- AI 接口配置 (OpenAI 兼容格式)
  api_base_url TEXT,    -- 如 https://api.openai.com/v1
  api_key TEXT,         -- API 密钥
  model TEXT,           -- 如 gpt-4o-mini
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by INTEGER REFERENCES users(id),
  CHECK (id = 1)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_feature ON usage_logs(feature_type);
CREATE INDEX IF NOT EXISTS idx_assessments_user ON assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_checks_user ON fraud_checks(user_id);
