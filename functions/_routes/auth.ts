import { Hono } from 'hono';
import type { AppContext } from '../_lib/env';
import { generateSalt, hashPassword, verifyPassword, createJWT, authMiddleware } from '../_lib/auth';
import { ensureProfileExists } from '../_lib/db';
import type { RegisterBody, LoginBody, ChangePasswordBody } from '../../shared/types';

const app = new Hono<AppContext>();

// 注册
app.post('/register', async (c) => {
  const body = await c.req.json<RegisterBody>();
  const { username, email, password, application_reason } = body;

  if (!username || !email || !password || !application_reason) {
    return c.json({ success: false, error: '请填写所有必填字段' }, 400);
  }
  if (username.length < 2 || username.length > 20) {
    return c.json({ success: false, error: '用户名长度需在 2-20 个字符之间' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ success: false, error: '邮箱格式不正确' }, 400);
  }
  if (password.length < 6) {
    return c.json({ success: false, error: '密码长度至少 6 位' }, 400);
  }
  if (application_reason.trim().length < 10) {
    return c.json({ success: false, error: '申请理由请至少填写 10 个字' }, 400);
  }

  // 检查用户名/邮箱是否已存在
  const existing = await c.env.DB
    .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
    .bind(username, email)
    .first();
  if (existing) {
    return c.json({ success: false, error: '用户名或邮箱已被注册' }, 409);
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  const result = await c.env.DB
    .prepare(
      `INSERT INTO users (username, email, password_hash, salt, application_reason)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(username, email, passwordHash, salt, application_reason.trim())
    .run();

  const userId = result.meta.last_row_id;
  await ensureProfileExists(c.env.DB, userId!);

  return c.json({
    success: true,
    data: {
      message: '注册成功！您的账号正在等待管理员审核，审核通过后即可使用全部功能。',
      user_id: userId,
    },
  });
});

// 登录
app.post('/login', async (c) => {
  const body = await c.req.json<LoginBody>();
  const { username, password } = body;

  if (!username || !password) {
    return c.json({ success: false, error: '请输入用户名和密码' }, 400);
  }

  const user = await c.env.DB
    .prepare('SELECT * FROM users WHERE username = ?')
    .bind(username)
    .first<any>();

  if (!user) {
    return c.json({ success: false, error: '用户名或密码错误' }, 401);
  }

  const valid = await verifyPassword(password, user.salt, user.password_hash);
  if (!valid) {
    return c.json({ success: false, error: '用户名或密码错误' }, 401);
  }

  if (user.status === 'banned') {
    return c.json({ success: false, error: '账号已被封禁，如有疑问请联系管理员' }, 403);
  }

  const token = await createJWT(
    {
      userId: user.id,
      role: user.role,
      status: user.status,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7天有效期
    },
    c.env.JWT_SECRET
  );

  return c.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        application_reason: user.application_reason,
        reject_reason: user.reject_reason,
        created_at: user.created_at,
        approved_at: user.approved_at,
      },
    },
  });
});

// 修改密码
app.post('/change-password', authMiddleware, async (c) => {
  const body = await c.req.json<ChangePasswordBody>();
  const { old_password, new_password } = body;

  if (!old_password || !new_password) {
    return c.json({ success: false, error: '请填写旧密码和新密码' }, 400);
  }
  if (new_password.length < 6) {
    return c.json({ success: false, error: '新密码长度至少 6 位' }, 400);
  }

  const userId = c.get('userId')!;
  const user = await c.env.DB
    .prepare('SELECT password_hash, salt FROM users WHERE id = ?')
    .bind(userId)
    .first<any>();

  if (!user) {
    return c.json({ success: false, error: '用户不存在' }, 404);
  }

  const valid = await verifyPassword(old_password, user.salt, user.password_hash);
  if (!valid) {
    return c.json({ success: false, error: '旧密码错误' }, 401);
  }

  const newSalt = generateSalt();
  const newHash = await hashPassword(new_password, newSalt);

  await c.env.DB
    .prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?')
    .bind(newHash, newSalt, userId)
    .run();

  return c.json({ success: true, data: { message: '密码修改成功' } });
});

// 获取当前用户信息
app.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')!;
  const user = await c.env.DB
    .prepare(
      `SELECT id, username, email, role, status, application_reason, reject_reason, created_at, approved_at
       FROM users WHERE id = ?`
    )
    .bind(userId)
    .first<any>();

  if (!user) {
    return c.json({ success: false, error: '用户不存在' }, 404);
  }

  return c.json({ success: true, data: { user } });
});

// 初始化管理员账号 (使用预设密钥)
app.post('/init-admin', async (c) => {
  const body = await c.req.json();
  const { admin_key, username, email, password } = body;

  if (admin_key !== c.env.ADMIN_INIT_KEY) {
    return c.json({ success: false, error: '管理员密钥错误' }, 403);
  }

  // 检查是否已存在管理员
  const existingAdmin = await c.env.DB
    .prepare("SELECT id FROM users WHERE role = 'admin'")
    .first();
  if (existingAdmin) {
    return c.json({ success: false, error: '系统已存在管理员账号' }, 409);
  }

  if (!username || !email || !password) {
    return c.json({ success: false, error: '请填写用户名、邮箱和密码' }, 400);
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  const result = await c.env.DB
    .prepare(
      `INSERT INTO users (username, email, password_hash, salt, role, status, application_reason, approved_at)
       VALUES (?, ?, ?, ?, 'admin', 'approved', '系统管理员初始账号', datetime('now'))`
    )
    .bind(username, email, passwordHash, salt)
    .run();

  const userId = result.meta.last_row_id;
  await ensureProfileExists(c.env.DB, userId!);

  return c.json({
    success: true,
    data: { message: '管理员账号创建成功，请登录', user_id: userId },
  });
});

export default app;
