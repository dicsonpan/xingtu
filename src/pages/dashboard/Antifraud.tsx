import { useState, useEffect } from 'react';
import { antifraudApi } from '../../api/client';

type RiskLevel = 'safe' | 'warning' | 'danger';

interface CheckResult {
  check_id: number;
  risk_level: RiskLevel;
  analysis: string;
  red_flags: string[];
  suggestions: string[];
  tokens_used: number;
}

interface HistoryItem {
  id: number;
  query: string;
  risk_level: RiskLevel;
  created_at: string;
}

const RISK_LABEL: Record<RiskLevel, string> = {
  safe: '安全',
  warning: '需谨慎',
  danger: '高风险',
};

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function truncate(s: string, n: number): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '...' : s;
}

export function Antifraud() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await antifraudApi.history();
      setHistory((res.checks || []) as HistoryItem[]);
    } catch {
      // 忽略历史加载错误
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleCheck = async () => {
    if (!query.trim()) {
      setError('请输入要检测的学校名称或招生信息');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await antifraudApi.check({ query: query.trim() });
      setResult(res as CheckResult);
      loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : '检测失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>防骗检测</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          识别虚假招生、野鸡学校与招生诈骗，保护您的权益。
        </p>
      </div>

      <div className="alert alert-info">
        输入您要查询的学校名称或招生信息，AI 将帮您识别潜在风险。
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="form-group">
          <label className="form-label">待检测信息</label>
          <textarea
            className="form-textarea"
            style={{ minHeight: 140 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="请输入学校名称、招生简章内容、或任何您觉得可疑的招生信息"
          />
        </div>
        <button className="btn btn-primary btn-lg btn-block" onClick={handleCheck} disabled={loading}>
          {loading ? '检测中...' : '开始检测'}
        </button>
      </div>

      {loading && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="loading">
            <div className="spinner" /> AI 正在分析招生信息风险...
          </div>
        </div>
      )}

      {result && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="card-title">检测结果</h3>

          <div style={{ marginBottom: 16 }}>
            <span
              className={`risk-indicator risk-${result.risk_level}`}
              style={{ fontSize: 16, padding: '8px 18px' }}
            >
              {RISK_LABEL[result.risk_level] || result.risk_level}
            </span>
          </div>

          {result.analysis && (
            <div className="result-block">
              <h4>分析说明</h4>
              <p style={{ lineHeight: 1.85 }}>{result.analysis}</p>
            </div>
          )}

          {result.red_flags && result.red_flags.length > 0 && (
            <div className="result-block" style={{ background: 'var(--danger-light)' }}>
              <h4 style={{ color: 'var(--danger)' }}>风险点（红旗）</h4>
              <ul style={{ paddingLeft: 20 }}>
                {result.red_flags.map((r, i) => (
                  <li key={i} style={{ marginBottom: 4, color: 'var(--danger)' }}>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.suggestions && result.suggestions.length > 0 && (
            <div className="result-block" style={{ background: 'var(--success-light)' }}>
              <h4 style={{ color: 'var(--success)' }}>建议</h4>
              <ul style={{ paddingLeft: 20 }}>
                {result.suggestions.map((s, i) => (
                  <li key={i} style={{ marginBottom: 4, color: 'var(--success)' }}>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
            本次消耗 Token：{result.tokens_used}
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="card-title">检测历史</h3>
        {historyLoading ? (
          <div className="loading">
            <div className="spinner" /> 加载历史...
          </div>
        ) : history.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>查询内容</th>
                  <th>风险等级</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td style={{ maxWidth: 360 }}>{truncate(h.query, 40)}</td>
                    <td>
                      <span className={`risk-indicator risk-${h.risk_level}`}>{RISK_LABEL[h.risk_level]}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: 13 }}>
                      {formatDate(h.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="icon">📋</div>暂无检测记录
          </div>
        )}
      </div>
    </div>
  );
}
