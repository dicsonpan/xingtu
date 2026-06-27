import type { Env } from './env';

// ============================================================
// 数据库辅助函数
// ============================================================

export async function logUsage(
  db: D1Database,
  userId: number,
  featureType: string,
  tokensUsed: number,
  summary?: string
): Promise<void> {
  await db
    .prepare('INSERT INTO usage_logs (user_id, feature_type, tokens_used, request_summary) VALUES (?, ?, ?, ?)')
    .bind(userId, featureType, tokensUsed, summary || null)
    .run();
}

export async function getUserUsageStats(db: D1Database, userId: number) {
  const result = await db
    .prepare(
      `SELECT
        COALESCE(SUM(tokens_used), 0) as total_tokens,
        COUNT(*) as request_count,
        MAX(created_at) as last_active
      FROM usage_logs WHERE user_id = ?`
    )
    .bind(userId)
    .first();
  return result || { total_tokens: 0, request_count: 0, last_active: null };
}

export async function ensureProfileExists(db: D1Database, userId: number): Promise<void> {
  await db.prepare('INSERT OR IGNORE INTO user_profiles (user_id) VALUES (?)').bind(userId).run();
}

export function parseJSON<T>(str: string | null, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}
