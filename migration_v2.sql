-- ============================================================
-- 知遇 v2 迁移脚本（用于已有数据库升级）
-- 在 Cloudflare D1 Console 中执行此文件
-- ============================================================

-- 1. 新增系统设置表（AI配置）
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  api_base_url TEXT,
  api_key TEXT,
  model TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by INTEGER REFERENCES users(id),
  CHECK (id = 1)
);

-- 2. 用户档案表新增 onboarding_step 字段
-- 注意: SQLite 的 ALTER TABLE ADD COLUMN 不支持 IF NOT EXISTS
-- 如果已存在此列会报错，可忽略
ALTER TABLE user_profiles ADD COLUMN onboarding_step INTEGER DEFAULT 0;
