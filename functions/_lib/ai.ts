// ============================================================
// AI 辅助函数 (Cloudflare Workers AI)
// ============================================================

const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';

interface AIResponse {
  response: string;
  tokensUsed: number;
}

/**
 * 调用 Workers AI 并追踪 token 用量
 */
export async function callAI(
  ai: Ai,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 1024
): Promise<AIResponse> {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  try {
    const result = await ai.run(AI_MODEL as any, {
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    } as any);

    const response = (result as any).response || '';
    // 估算 token 用量 (中文约 2 字符/token, 英文约 4 字符/token, 取中间值)
    const inputTokens = Math.ceil(systemPrompt.length / 3 + userMessage.length / 3);
    const outputTokens = Math.ceil(response.length / 3);
    const tokensUsed = inputTokens + outputTokens;

    return { response, tokensUsed };
  } catch (err) {
    // AI 调用失败时返回错误信息，不阻断流程
    console.error('AI call failed:', err);
    return {
      response: 'AI 服务暂时不可用，请稍后重试。',
      tokensUsed: 0,
    };
  }
}

/**
 * 尝试从 AI 响应中提取 JSON
 */
export function extractJSON<T>(text: string): T | null {
  // 尝试直接解析
  try {
    return JSON.parse(text) as T;
  } catch {
    // 尝试提取 ```json ... ``` 中的内容
    const match = text.match(/```json\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim()) as T;
      } catch {
        // continue
      }
    }
    // 尝试提取第一个 { 到最后一个 } 的内容
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
