// ============================================================
// AI 辅助函数 (Cloudflare Workers AI)
// 从 D1 system_settings 表读取模型配置
// ============================================================

// 默认模型 — 通义千问3，中文能力强，性价比高
const DEFAULT_MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';

// 可选模型列表（供管理后台展示）
export const AVAILABLE_MODELS = [
  { value: '@cf/qwen/qwen3-30b-a3b-fp8', label: 'Qwen3 30B (通义千问3) — 推荐，中文最佳，性价比高' },
  { value: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', label: 'Llama 3.3 70B — 能力强，消耗较大' },
  { value: '@cf/meta/llama-3.1-8b-instruct-fp8-fast', label: 'Llama 3.1 8B — 轻量快速，消耗低' },
  { value: '@cf/openai/gpt-oss-20b', label: 'GPT-OSS 20B (OpenAI开源) — 均衡之选' },
  { value: '@cf/zai-org/glm-4.7-flash', label: 'GLM-4.7-Flash (智谱) — 中文优秀，超长上下文' },
];

interface AIResponse {
  response: string;
  tokensUsed: number;
}

/**
 * 从数据库读取配置的模型
 */
async function getModel(db: D1Database): Promise<string> {
  const row = await db
    .prepare('SELECT model FROM system_settings WHERE id = 1')
    .first<any>();
  return row?.model || DEFAULT_MODEL;
}

/**
 * 调用 Cloudflare Workers AI 并追踪 token 用量
 */
export async function callAI(
  ai: Ai,
  db: D1Database,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 1024
): Promise<AIResponse> {
  const model = await getModel(db);
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  try {
    const result: any = await ai.run(model as any, {
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    } as any);

    const response = result?.response || '';
    // Workers AI 返回 usage 对象，包含 prompt_tokens 和 completion_tokens
    const tokensUsed = result?.usage?.total_tokens
      || (result?.usage?.prompt_tokens || 0) + (result?.usage?.completion_tokens || 0)
      || 0;

    return { response, tokensUsed };
  } catch (err) {
    console.error('AI call failed:', err);
    return {
      response: 'AI 服务暂时不可用，请稍后重试。',
      tokensUsed: 0,
    };
  }
}

/**
 * 测试 Workers AI 连接（供管理后台使用）
 */
export async function testAIConnection(ai: Ai, db: D1Database): Promise<{ success: boolean; reply: string; model: string; error?: string }> {
  const model = await getModel(db);
  try {
    const result: any = await ai.run(model as any, {
      messages: [{ role: 'user', content: '请回复"连接成功"四个字' }],
      max_tokens: 20,
    } as any);

    const reply = result?.response || '';
    return { success: true, reply, model };
  } catch (err: any) {
    return { success: false, reply: '', model, error: err?.message || String(err) };
  }
}

/**
 * 尝试从 AI 响应中提取 JSON
 */
export function extractJSON<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/```json\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim()) as T;
      } catch {
        // continue
      }
    }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.substring(start, end + 1)) as T;
      } catch {
        // continue
      }
    }
    return null;
  }
}
