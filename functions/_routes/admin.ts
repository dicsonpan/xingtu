import { Hono } from 'hono';
import type { AppContext } from '../_lib/env';
import { authMiddleware, requireAdmin } from '../_lib/auth';

const app = new Hono<AppContext>();
app.use('*', authMiddleware, requireAdmin);

// 用户列表（不含密码等敏感信息）
app.get('/users', async (c) => {
  const status = c.req.query('status'); // optional filter
  let query = `SELECT id, username, role, status, application_reason, reject_reason, created_at, approved_at FROM users`;
  const params: any[] = [];
  if (status && ['pending', 'approved', 'rejected', 'banned'].includes(status)) {
    query += ` WHERE status = ?`;
    params.push(status);
  }
  query += ` ORDER BY created_at DESC`;

  const stmt = params.length ? c.env.DB.prepare(query).bind(...params) : c.env.DB.prepare(query);
  const result = await stmt.all<any>();

  return c.json({ success: true, data: { users: result.results || [] } });
});

// 用户详情
app.get('/users/:id', async (c) => {
  const userId = parseInt(c.req.param('id'));

  const user = await c.env.DB
    .prepare(
      `SELECT id, username, role, status, application_reason, reject_reason, created_at, approved_at
       FROM users WHERE id = ?`
    )
    .bind(userId)
    .first<any>();

  if (!user) {
    return c.json({ success: false, error: '用户不存在' }, 404);
  }

  // 获取使用统计（不包含隐私信息）
  const usage = await c.env.DB
    .prepare(
      `SELECT
        COALESCE(SUM(tokens_used), 0) as total_tokens,
        COUNT(*) as request_count,
        MAX(created_at) as last_active
      FROM usage_logs WHERE user_id = ?`
    )
    .bind(userId)
    .first<any>();

  // 各功能使用次数
  const featureStats = await c.env.DB
    .prepare(
      `SELECT feature_type, COUNT(*) as count, SUM(tokens_used) as tokens
       FROM usage_logs WHERE user_id = ? GROUP BY feature_type`
    )
    .bind(userId)
    .all<any>();

  return c.json({
    success: true,
    data: {
      user,
      usage: {
        total_tokens: usage?.total_tokens || 0,
        request_count: usage?.request_count || 0,
        last_active: usage?.last_active || null,
        features: featureStats.results || [],
      },
    },
  });
});

// 审核通过
app.post('/users/:id/approve', async (c) => {
  const userId = parseInt(c.req.param('id'));
  const adminId = c.get('userId')!;

  const user = await c.env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(userId).first<any>();
  if (!user) {
    return c.json({ success: false, error: '用户不存在' }, 404);
  }

  await c.env.DB
    .prepare("UPDATE users SET status = 'approved', approved_at = datetime('now'), approved_by = ?, reject_reason = NULL WHERE id = ?")
    .bind(adminId, userId)
    .run();

  return c.json({ success: true, data: { message: '用户已审核通过' } });
});

// 审核拒绝
app.post('/users/:id/reject', async (c) => {
  const userId = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const reason = body.reason || '未说明原因';

  const user = await c.env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(userId).first<any>();
  if (!user) {
    return c.json({ success: false, error: '用户不存在' }, 404);
  }
  if (user.role === 'admin') {
    return c.json({ success: false, error: '不能拒绝管理员账号' }, 400);
  }

  await c.env.DB
    .prepare("UPDATE users SET status = 'rejected', reject_reason = ? WHERE id = ?")
    .bind(reason, userId)
    .run();

  return c.json({ success: true, data: { message: '用户已被拒绝' } });
});

// 封禁用户
app.post('/users/:id/ban', async (c) => {
  const userId = parseInt(c.req.param('id'));

  const user = await c.env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(userId).first<any>();
  if (!user) {
    return c.json({ success: false, error: '用户不存在' }, 404);
  }
  if (user.role === 'admin') {
    return c.json({ success: false, error: '不能封禁管理员账号' }, 400);
  }

  await c.env.DB
    .prepare("UPDATE users SET status = 'banned' WHERE id = ?")
    .bind(userId)
    .run();

  return c.json({ success: true, data: { message: '用户已被封禁' } });
});

// 解封用户
app.post('/users/:id/unban', async (c) => {
  const userId = parseInt(c.req.param('id'));

  await c.env.DB
    .prepare("UPDATE users SET status = 'approved' WHERE id = ?")
    .bind(userId)
    .run();

  return c.json({ success: true, data: { message: '用户已解封' } });
});

// 全局统计（不包含隐私信息）
app.get('/stats', async (c) => {
  const totalUsers = await c.env.DB
    .prepare('SELECT COUNT(*) as count FROM users WHERE role = ?')
    .bind('user')
    .first<any>();

  const pendingUsers = await c.env.DB
    .prepare("SELECT COUNT(*) as count FROM users WHERE status = 'pending'")
    .first<any>();

  const approvedUsers = await c.env.DB
    .prepare("SELECT COUNT(*) as count FROM users WHERE status = 'approved'")
    .first<any>();

  const totalTokens = await c.env.DB
    .prepare('SELECT COALESCE(SUM(tokens_used), 0) as total FROM usage_logs')
    .first<any>();

  const featureBreakdown = await c.env.DB
    .prepare(
      `SELECT feature_type, COUNT(*) as count, SUM(tokens_used) as tokens
       FROM usage_logs GROUP BY feature_type ORDER BY tokens DESC`
    )
    .all<any>();

  const recentUsers = await c.env.DB
    .prepare(
      `SELECT id, username, status, created_at FROM users WHERE role = 'user'
       ORDER BY created_at DESC LIMIT 10`
    )
    .all<any>();

  // 各用户使用汇总（不含隐私信息）
  const userUsage = await c.env.DB
    .prepare(
      `SELECT
        u.id as user_id,
        u.username,
        COALESCE(SUM(ul.tokens_used), 0) as total_tokens,
        COUNT(ul.id) as request_count,
        MAX(ul.created_at) as last_active
      FROM users u
      LEFT JOIN usage_logs ul ON u.id = ul.user_id
      WHERE u.role = 'user'
      GROUP BY u.id
      ORDER BY total_tokens DESC
      LIMIT 50`
    )
    .all<any>();

  return c.json({
    success: true,
    data: {
      total_users: totalUsers?.count || 0,
      pending_users: pendingUsers?.count || 0,
      approved_users: approvedUsers?.count || 0,
      total_tokens: totalTokens?.total || 0,
      feature_breakdown: featureBreakdown.results || [],
      recent_users: recentUsers.results || [],
      user_usage: userUsage.results || [],
    },
  });
});

export default app;
