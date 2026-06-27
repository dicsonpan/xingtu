import { Hono } from 'hono';
import type { AppContext } from '../_lib/env';
import { authMiddleware, requireApproved } from '../_lib/auth';
import { callAI, extractJSON } from '../_lib/ai';
import { logUsage, parseJSON } from '../_lib/db';

const app = new Hono<AppContext>();
app.use('*', authMiddleware, requireApproved);

// 专业智能匹配
app.post('/', async (c) => {
  const userId = c.get('userId')!;

  // 获取用户档案
  const profile = await c.env.DB
    .prepare('SELECT * FROM user_profiles WHERE user_id = ?')
    .bind(userId)
    .first<any>();

  if (!profile) {
    return c.json({ success: false, error: '请先完善个人档案' }, 400);
  }

  // 获取最新测评结果
  const assessment = await c.env.DB
    .prepare('SELECT talent_profile FROM assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1')
    .bind(userId)
    .first<any>();

  const talentProfile = assessment ? parseJSON<any>(assessment.talent_profile, null) : null;
  const interests = parseJSON(profile.interests, []);
  const subjectScores = parseJSON(profile.subject_scores, {});
  const preferredSchoolType = parseJSON(profile.preferred_school_type, []);

  const systemPrompt = `你是一位资深的职业教育升学顾问，专门为中考偏科生推荐合适的专业方向。

你的任务：根据学生的天赋画像、兴趣、中考成绩和个人情况，推荐 3-5 个最适合的职业教育专业（中专/中职/技校专业）。

你必须以纯 JSON 格式返回结果（不要包含 markdown 代码块标记），格式如下：
{
  "recommendations": [
    {
      "major_name": "专业名称",
      "match_score": 85,
      "reason": "为什么推荐这个专业（结合学生天赋和兴趣说明，50-100字）",
      "employment_prospect": "就业前景描述（50-100字）",
      "required_talents": ["该专业需要的天赋能力1", "能力2"]
    }
  ],
  "summary": "总体建议（100-200字）"
}

重要：
- 专业名称必须是真实存在的职业教育专业（如：数控技术、汽车维修、烹饪、计算机应用、护理、电子商务、幼儿保育、建筑装饰等）
- match_score 为 0-100 的整数
- 请结合学生的实际天赋和兴趣来推荐，不要泛泛而谈`;

  const userMessage = `学生信息：
- 地区：${profile.province || '未提供'} ${profile.city || ''}
- 中考总分：${profile.exam_total_score || '未提供'}
- 各科成绩：${JSON.stringify(subjectScores)}
- 兴趣爱好：${interests.join('、') || '未提供'}
- 家庭经济情况：${profile.family_income_level || 'medium'}
- 偏好学校类型：${preferredSchoolType.join('、') || '不限'}
- 偏好地区：${profile.preferred_region || '不限'}

${talentProfile ? `天赋画像：
- 总结：${talentProfile.summary}
- 优势：${talentProfile.strengths?.join('、')}
- 推荐方向：${talentProfile.recommended_directions?.join('、')}` : '暂无天赋测评结果，请根据兴趣和成绩分析'}

请推荐最适合的专业方向。`;

  const { response, tokensUsed } = await callAI(c.env.AI, systemPrompt, userMessage, 1500);

  let result = extractJSON<{ recommendations: any[]; summary: string }>(response);

  if (!result) {
    result = {
      recommendations: [],
      summary: response,
    };
  }

  await logUsage(c.env.DB, userId, 'matching', tokensUsed, '专业智能匹配');

  return c.json({
    success: true,
    data: { ...result, tokens_used: tokensUsed },
  });
});

export default app;
