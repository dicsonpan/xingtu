import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppContext, Env } from '../_lib/env';
import authRoutes from '../_routes/auth';
import profileRoutes from '../_routes/profile';
import assessmentRoutes from '../_routes/assessment';
import matchingRoutes from '../_routes/matching';
import schoolRoutes from '../_routes/school';
import antifraudRoutes from '../_routes/antifraud';
import adminRoutes from '../_routes/admin';

const app = new Hono<AppContext>();

// CORS
app.use('*', cors());

// 健康检查
app.get('/api/health', (c) => c.json({ success: true, data: { status: 'ok', service: '知遇 API' } }));

// 诊断接口 — 检查 DB 和 AI 绑定是否正常
app.get('/api/diagnose', async (c) => {
  const result: Record<string, any> = {};

  // 检查 DB 绑定
  try {
    if (!c.env.DB) {
      result.db = { ok: false, error: 'DB 绑定不存在' };
    } else {
      const r = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<any>();
      result.db = { ok: true, users: r?.count ?? '?' };
    }
  } catch (e: any) {
    result.db = { ok: false, error: e?.message || String(e) };
  }

  // 检查 AI 绑定
  try {
    if (!c.env.AI) {
      result.ai = { ok: false, error: 'AI 绑定不存在' };
    } else {
      result.ai = { ok: true, message: 'AI 绑定存在' };
    }
  } catch (e: any) {
    result.ai = { ok: false, error: e?.message || String(e) };
  }

  // 检查 JWT_SECRET
  result.jwt_secret = c.env.JWT_SECRET ? '已设置' : '未设置';

  return c.json({ success: true, data: result });
});

// 路由挂载
app.route('/api/auth', authRoutes);
app.route('/api/profile', profileRoutes);
app.route('/api/assessment', assessmentRoutes);
app.route('/api/matching', matchingRoutes);
app.route('/api/school', schoolRoutes);
app.route('/api/antifraud', antifraudRoutes);
app.route('/api/admin', adminRoutes);

// 404
app.notFound((c) => c.json({ success: false, error: '接口不存在' }, 404));

// 全局错误处理 — 返回具体错误信息方便排查
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  const msg = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : '';
  return c.json({ success: false, error: `服务器错误: ${msg}`, stack: stack?.substring(0, 500) }, 500);
});

export const onRequest: PagesFunction<Env> = async (context) => {
  try {
    return await app.fetch(context.request, context.env, context as unknown as ExecutionContext);
  } catch (err: any) {
    // 如果 Hono 本身崩溃了，这里兜底
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : '';
    return new Response(
      JSON.stringify({ success: false, error: `Function 崩溃: ${msg}`, stack: stack?.substring(0, 500) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
