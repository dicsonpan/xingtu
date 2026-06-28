import { Hono } from 'hono';
import type { AppContext } from '../_lib/env';
import { authMiddleware, requireApproved } from '../_lib/auth';
import { callAI, extractJSON } from '../_lib/ai';
import { logUsage } from '../_lib/db';
import type { FraudCheckResult } from '../../shared/types';

const app = new Hono<AppContext>();
app.use('*', authMiddleware, requireApproved);

// 防骗检测
app.post('/check', async (c) => {
  const userId = c.get('userId')!;
  const body = await c.req.json();
  const { query } = body;

  if (!query || query.trim().length < 2) {
    return c.json({ success: false, error: '请输入要检测的学校名称或招生信息' }, 400);
  }

  const systemPrompt = `你是一位职业教育招生防骗专家，专门帮助家长和学生识别虚假招生、野鸡学校和招生诈骗。

你需要分析用户提供的学校名称或招生信息，判断是否存在诈骗风险。

常见的招生诈骗特征包括：
1. 学校名称仿冒知名院校（如"XX大学"实际是培训机构）
2. 承诺"包过""包分配""免试入学"等不切实际的承诺
3. 要求提前缴纳高额"占位费""报名费"
4. 无正规办学资质、无法在教育部官网查询
5. 招生中介而非学校直接招生
6. 夸大宣传、虚构就业率
7. "内部指标""特殊渠道"等话术
8. 学校名称包含"学院"但实际是技工培训

你必须以纯 JSON 格式返回结果（不要包含 markdown 代码块标记），格式如下：
{
  "risk_level": "safe 或 warning 或 danger",
  "analysis": "详细分析说明（100-300字）",
  "red_flags": ["风险点1", "风险点2"],
  "suggestions": ["建议1", "建议2", "建议3"]
}

判断标准：
- safe: 看起来是正规学校，无明显风险
- warning: 存在一些需要注意的点，需进一步核实
- danger: 高度疑似诈骗或野鸡学校，强烈建议不要报名

如果无法确定学校真伪，请给出 warning 级别，并建议用户通过教育部官网、当地教育局等官方渠道核实。`;

  const userMessage = `请检测以下学校名称/招生信息是否存在风险：

${query}

请分析并给出风险评估。`;

  const { response, tokensUsed } = await callAI(c.env.DB, systemPrompt, userMessage, 1000);

  let result = extractJSON<FraudCheckResult>(response);

  if (!result) {
    result = {
      risk_level: 'warning',
      analysis: response,
      red_flags: [],
      suggestions: ['建议通过教育部官网或当地教育局核实学校资质'],
    };
  }

  // 保存检测记录
  const insertResult = await c.env.DB
    .prepare(
      'INSERT INTO fraud_checks (user_id, query, risk_level, result) VALUES (?, ?, ?, ?)'
    )
    .bind(userId, query.trim(), result.risk_level, JSON.stringify(result))
    .run();

  await logUsage(c.env.DB, userId, 'antifraud', tokensUsed, `防骗检测: ${query.substring(0, 20)}`);

  return c.json({
    success: true,
    data: {
      check_id: insertResult.meta.last_row_id,
      ...result,
      tokens_used: tokensUsed,
    },
  });
});

// 获取检测历史
app.get('/history', async (c) => {
  const userId = c.get('userId')!;

  const results = await c.env.DB
    .prepare(
      `SELECT id, query, risk_level, result, created_at FROM fraud_checks
       WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`
    )
    .bind(userId)
    .all<any>();

  const checks = (results.results || []).map((r: any) => ({
    ...r,
    result: JSON.parse(r.result),
  }));

  return c.json({ success: true, data: { checks } });
});

export default app;
