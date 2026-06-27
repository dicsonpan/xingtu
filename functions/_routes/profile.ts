import { Hono } from 'hono';
import type { AppContext } from '../_lib/env';
import { authMiddleware } from '../_lib/auth';
import { ensureProfileExists, parseJSON, getUserUsageStats } from '../_lib/db';
import type { ProfileUpdateBody } from '../../shared/types';

const app = new Hono<AppContext>();
app.use('*', authMiddleware);

// 获取个人档案
app.get('/', async (c) => {
  const userId = c.get('userId')!;
  await ensureProfileExists(c.env.DB, userId);

  const profile = await c.env.DB
    .prepare('SELECT * FROM user_profiles WHERE user_id = ?')
    .bind(userId)
    .first<any>();

  if (!profile) {
    return c.json({ success: false, error: '档案不存在' }, 404);
  }

  // 解析 JSON 字段
  profile.subject_scores = parseJSON(profile.subject_scores, null);
  profile.interests = parseJSON(profile.interests, []);
  profile.hobbies = parseJSON(profile.hobbies, []);
  profile.preferred_school_type = parseJSON(profile.preferred_school_type, []);

  // 获取使用统计
  const usage = await getUserUsageStats(c.env.DB, userId);

  return c.json({
    success: true,
    data: { profile, usage },
  });
});

// 更新个人档案
app.put('/', async (c) => {
  const userId = c.get('userId')!;
  const body = await c.req.json<ProfileUpdateBody>();

  await ensureProfileExists(c.env.DB, userId);

  // 构建更新语句
  const fields: string[] = [];
  const values: any[] = [];

  const stringFields = ['real_name', 'gender', 'province', 'city', 'school_name', 'preferred_region', 'family_income_level'];
  const numberFields = ['birth_year', 'exam_total_score', 'hands_on_ability', 'spatial_thinking', 'interpersonal_skill', 'art_perception', 'logical_thinking', 'language_expression', 'memory_ability', 'observation_ability'];

  for (const f of stringFields) {
    if (body[f as keyof ProfileUpdateBody] !== undefined) {
      fields.push(`${f} = ?`);
      values.push(body[f as keyof ProfileUpdateBody]);
    }
  }
  for (const f of numberFields) {
    if (body[f as keyof ProfileUpdateBody] !== undefined) {
      fields.push(`${f} = ?`);
      values.push(body[f as keyof ProfileUpdateBody]);
    }
  }

  // JSON 字段
  if (body.subject_scores !== undefined) {
    fields.push('subject_scores = ?');
    values.push(JSON.stringify(body.subject_scores));
  }
  if (body.interests !== undefined) {
    fields.push('interests = ?');
    values.push(JSON.stringify(body.interests));
  }
  if (body.hobbies !== undefined) {
    fields.push('hobbies = ?');
    values.push(JSON.stringify(body.hobbies));
  }
  if (body.preferred_school_type !== undefined) {
    fields.push('preferred_school_type = ?');
    values.push(JSON.stringify(body.preferred_school_type));
  }

  if (fields.length === 0) {
    return c.json({ success: false, error: '没有需要更新的字段' }, 400);
  }

  fields.push("updated_at = datetime('now')");
  values.push(userId);

  await c.env.DB
    .prepare(`UPDATE user_profiles SET ${fields.join(', ')} WHERE user_id = ?`)
    .bind(...values)
    .run();

  return c.json({ success: true, data: { message: '档案更新成功' } });
});

export default app;
