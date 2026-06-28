import { Hono } from 'hono';
import type { AppContext } from '../_lib/env';
import { authMiddleware, requireApproved } from '../_lib/auth';
import { callAI, extractJSON } from '../_lib/ai';
import { logUsage, parseJSON } from '../_lib/db';

const app = new Hono<AppContext>();
app.use('*', authMiddleware, requireApproved);

// 学校推荐与对比
app.post('/recommend', async (c) => {
  const userId = c.get('userId')!;
  const body = await c.req.json();
  const { major_name, additional_requirements } = body;

  if (!major_name) {
    return c.json({ success: false, error: '请提供目标专业名称' }, 400);
  }

  const profile = await c.env.DB
    .prepare('SELECT * FROM user_profiles WHERE user_id = ?')
    .bind(userId)
    .first<any>();

  if (!profile) {
    return c.json({ success: false, error: '请先完善个人档案' }, 400);
  }

  const preferredSchoolType = parseJSON(profile.preferred_school_type, []);

  const systemPrompt = `你是一位职业教育学校咨询专家，熟悉全国各地的中专、中职、技校情况。

你的任务：根据学生选定的专业和个人情况，推荐 3-5 所适合的学校类型或具体学校，并进行多维度对比。

由于你无法访问实时数据库，请基于你的知识提供一般性的学校类型建议和选择指南，帮助学生了解不同类型学校的特点。

你必须以纯 JSON 格式返回结果（不要包含 markdown 代码块标记），格式如下：
{
  "schools": [
    {
      "school_type": "学校类型（如：省级示范中职、普通中专、技工学校等）",
      "features": "该校/类型的特点和优势（50-100字）",
      "matching_majors": ["该类型学校通常开设的相关专业"],
      "tuition_range": "学费范围（如：免学费 / 3000-5000元/年）",
      "employment_rate": "就业率概况",
      "pros": ["优势1", "优势2"],
      "cons": ["不足1", "不足2"]
    }
  ],
  "comparison_advice": "学校选择对比建议（100-200字）",
  "application_tips": ["报名注意事项1", "注意事项2", "注意事项3"]
}`;

  const userMessage = `学生情况：
- 目标专业：${major_name}
- 地区：${profile.province || '未提供'} ${profile.city || ''}
- 中考总分：${profile.exam_total_score || '未提供'}
- 家庭经济情况：${profile.family_income_level || 'medium'}
- 偏好学校类型：${preferredSchoolType.join('、') || '不限'}
- 偏好地区：${profile.preferred_region || '不限'}
- 其他要求：${additional_requirements || '无'}

请推荐适合的学校类型并对比分析。`;

  const { response, tokensUsed } = await callAI(c.env.DB, systemPrompt, userMessage, 1500);

  let result = extractJSON<{ schools: any[]; comparison_advice: string; application_tips: string[] }>(response);

  if (!result) {
    result = {
      schools: [],
      comparison_advice: response,
      application_tips: [],
    };
  }

  await logUsage(c.env.DB, userId, 'school', tokensUsed, `学校推荐: ${major_name}`);

  return c.json({
    success: true,
    data: { ...result, tokens_used: tokensUsed },
  });
});

export default app;
