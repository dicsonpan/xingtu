// ============================================================
// AI 辅助函数 (OpenAI 兼容 API)
// 从 D1 system_settings 表读取配置，支持任意 OpenAI 兼容端点
// ============================================================

interface AIConfig {
  api_base_url: string;
  api_key: string;
  model: string;
}

interface AIResponse {
  response: string;
  tokensUsed: number;
}

/**
 * 从数据库读取 AI 配置
 */
async function getAIConfig(db: D1Database): Promise<AIConfig | null> {
  const row = await db
    .prepare('SELECT api_base_url, api_key, model FROM system_settings WHERE id = 1')
    .first<any>();
  if (!row || !row.api_key || !row.api_base_url || !row.model) {
    return null;
  }
  return {
    api_base_url: row.api_base_url.replace(/\/$/, ''),
    api_key: row.api_key,
    model: row.model,
  };
}

/**
 * 调用 OpenAI 兼容 API 并追踪真实 token 用量
 */
export async function callAI(
  db: D1Database,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 1024
): Promise<AIResponse> {
  const config = await getAIConfig(db);
  if (!config) {
    return {
      response: 'AI 服务尚未配置，请联系管理员在后台设置 AI 接口参数。',
      tokensUsed: 0,
    };
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  try {
    const url = `${config.api_base_url}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.api_key}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('AI API error:', res.status, errText);
      return {
        response: `AI 服务调用失败 (${res.status})，请稍后重试。`,
        tokensUsed: 0,
      };
    }

    const data: any = await res.json();
    const response = data.choices?.[0]?.message?.content || '';
    // 使用 API 返回的真实 token 用量
    const tokensUsed = data.usage?.total_tokens || 0;

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
