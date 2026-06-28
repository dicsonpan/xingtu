import { Hono } from 'hono';
import type { AppContext } from '../_lib/env';
import { authMiddleware, requireApproved } from '../_lib/auth';
import { callAI, extractJSON } from '../_lib/ai';
import { logUsage, parseJSON } from '../_lib/db';
import type { TalentProfile } from '../../shared/types';

const app = new Hono<AppContext>();
app.use('*', authMiddleware, requireApproved);

// 提交测评并获取AI天赋分析
// 新流程：情景选择题 + 语音/文字自由描述 + AI综合分析
app.post('/', async (c) => {
  const userId = c.get('userId')!;
  const body = await c.req.json();

  const { scenario_answers, voice_description, subject_scores, interests } = body;

  // 至少要有情景选择或语音描述中的一种
  if ((!scenario_answers || !Array.isArray(scenario_answers) || scenario_answers.length === 0) && !voice_description) {
    return c.json({ success: false, error: '请至少完成情景选择题或语音描述' }, 400);
  }

  // 保存测评答案
  const answers = JSON.stringify({ scenario_answers, voice_description, subject_scores, interests });
  const insertResult = await c.env.DB
    .prepare('INSERT INTO assessments (user_id, answers) VALUES (?, ?)')
    .bind(userId, answers)
    .run();
  const assessmentId = insertResult.meta.last_row_id;

  // 构建情景选择文本
  let scenarioText = '未提供';
  if (scenario_answers && Array.isArray(scenario_answers) && scenario_answers.length > 0) {
    scenarioText = scenario_answers
      .map((a: any) => `问题${a.questionIndex + 1}：选择了「${a.selectedLabel || a.selected}」`)
      .join('\n');
  }

  // 语音/文字描述
  const voiceText = voice_description ? voice_description.trim() : '未提供';

  // 中考成绩
  const scoreText = subject_scores
    ? Object.entries(subject_scores).map(([k, v]) => `${k}: ${v}`).join('、')
    : '未提供';

  // 兴趣
  const interestText = interests?.length ? interests.join('、') : '未提供';

  const systemPrompt = `你是一位专业的职业教育天赋评估专家，专门帮助中考偏科生发现被总分掩盖的天赋。

你的核心理念：偏科 ≠ 笨。偏科往往意味着在特定领域有突出天赋。请从多元智能的角度分析，不要只看分数低就认为学生没有天赋。

请根据学生的情景选择、自由描述、中考成绩和兴趣，生成一份详细的天赋画像。

你必须以纯 JSON 格式返回结果（不要包含 markdown 代码块标记），格式如下：
{
  "summary": "一句话总结该学生的天赋特点（20-40字）",
  "strengths": ["优势1", "优势2", "优势3"],
  "weaknesses": ["需要注意的方面1", "方面2"],
  "recommended_directions": ["推荐发展方向1", "方向2", "方向3"],
  "detailed_analysis": "200-400字的详细分析，要具体、有温度、有洞察力，结合学生的实际回答来分析"
}`;

  const userMessage = `学生测评数据：

【情景选择】
${scenarioText}

【自我描述】
${voiceText}

【中考各科成绩】${scoreText}
【兴趣爱好】${interestText}

请综合以上信息，分析这位学生的天赋画像。重点发掘被分数掩盖的优势。`;

  const { response, tokensUsed } = await callAI(c.env.AI, c.env.DB, systemPrompt, userMessage, 1200);

  let talentProfile: TalentProfile | null = extractJSON<TalentProfile>(response);

  if (!talentProfile) {
    talentProfile = {
      summary: '测评完成，以下是AI分析结果',
      strengths: ['请查看详细分析'],
      weaknesses: [],
      recommended_directions: [],
      detailed_analysis: response,
    };
  }

  // 保存 AI 分析结果
  await c.env.DB
    .prepare('UPDATE assessments SET talent_profile = ? WHERE id = ?')
    .bind(JSON.stringify(talentProfile), assessmentId)
    .run();

  // 更新新手指引进度（非关键操作，失败不影响结果）
  try {
    await c.env.DB
      .prepare("UPDATE user_profiles SET onboarding_step = MAX(onboarding_step, 2), updated_at = datetime('now') WHERE user_id = ? AND onboarding_step < 2")
      .bind(userId)
      .run();
  } catch (e) { /* onboarding_step 列可能不存在，忽略 */ }

  // 记录使用量
  await logUsage(c.env.DB, userId, 'assessment', tokensUsed, '天赋发掘测评');

  return c.json({
    success: true,
    data: {
      assessment_id: assessmentId,
      talent_profile: talentProfile,
      tokens_used: tokensUsed,
    },
  });
});

// 获取最新测评结果
app.get('/latest', async (c) => {
  const userId = c.get('userId')!;

  const assessment = await c.env.DB
    .prepare('SELECT * FROM assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1')
    .bind(userId)
    .first<any>();

  if (!assessment) {
    return c.json({ success: false, error: '暂无测评记录' }, 404);
  }

  assessment.answers = parseJSON(assessment.answers, {});
  assessment.talent_profile = parseJSON(assessment.talent_profile, null);

  return c.json({ success: true, data: { assessment } });
});

// 获取测评历史
app.get('/history', async (c) => {
  const userId = c.get('userId')!;

  const results = await c.env.DB
    .prepare(
      `SELECT id, talent_profile, created_at FROM assessments
       WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`
    )
    .bind(userId)
    .all<any>();

  const assessments = (results.results || []).map((a: any) => ({
    ...a,
    talent_profile: parseJSON(a.talent_profile, null),
  }));

  return c.json({ success: true, data: { assessments } });
});

export default app;
