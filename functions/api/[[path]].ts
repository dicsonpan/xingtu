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
  return c.json({ success: false, error: `服务器错误: ${msg}` }, 500);
});

export const onRequest: PagesFunction<Env> = async (context) => {
  return app.fetch(context.request, context.env, context as unknown as ExecutionContext);
};
