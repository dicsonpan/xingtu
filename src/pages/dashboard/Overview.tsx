import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// 使用统计类型
interface UsageStats {
  total_tokens: number;
  request_count: number;
  last_active: string | null;
}

// 功能入口配置
const features = [
  {
    to: '/dashboard/assessment',
    icon: '✨',
    title: '天赋测评',
    desc: '基于八大天赋维度的智能评估，发现你的核心优势与潜能方向。',
  },
  {
    to: '/dashboard/matching',
    icon: '🎯',
    title: '专业匹配',
    desc: '结合中考成绩与天赋兴趣，为你推荐最合适的职教专业。',
  },
  {
    to: '/dashboard/school',
    icon: '🏫',
    title: '学校对比',
    desc: '多维度对比备选学校，提供择校建议与报考技巧。',
  },
  {
    to: '/dashboard/antifraud',
    icon: '🛡️',
    title: '防骗检测',
    desc: '识别招生陷阱与虚假宣传，守护你的报考安全。',
  },
];

// 格式化时间显示
function formatTime(t: string | null): string {
  if (!t) return '暂无记录';
  // 兼容 SQLite datetime 格式 "YYYY-MM-DD HH:MM:SS"
  const d = new Date(t.replace(' ', 'T'));
  if (isNaN(d.getTime())) return t;
  return d.toLocaleString('zh-CN', { hour12: false });
}

export function Overview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const approved = user?.status === 'approved';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await profileApi.get();
        if (!cancelled) {
          setUsage(res.usage as UsageStats);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '加载使用统计失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      {/* 欢迎语 */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>
          欢迎回来{user ? `，${user.username}` : ''}
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: 6 }}>
          星途助你发现天赋、匹配专业、选对学校、远离陷阱。
        </p>
      </div>

      {/* 功能入口 */}
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>功能入口</h2>
      <div className="grid grid-2" style={{ marginBottom: 32 }}>
        {features.map((f) => (
          <div className="feature-card" key={f.to}>
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p style={{ marginBottom: 18 }}>{f.desc}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                className="btn btn-primary btn-sm"
                disabled={!approved}
                onClick={() => navigate(f.to)}
              >
                进入
              </button>
              {!approved && (
                <span className="form-hint">需审核通过后可用</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 使用统计 */}
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>使用统计</h2>
      {loading ? (
        <div className="loading">
          <div className="spinner" /> 加载中...
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div className="grid grid-3">
          <div className="stat-card">
            <div className="stat-number">{usage?.total_tokens ?? 0}</div>
            <div className="stat-label">累计 Token 消耗</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{usage?.request_count ?? 0}</div>
            <div className="stat-label">AI 请求次数</div>
          </div>
          <div className="stat-card">
            <div
              className="stat-number"
              style={{ fontSize: '1.05rem', lineHeight: 1.5, wordBreak: 'break-all' }}
            >
              {formatTime(usage?.last_active ?? null)}
            </div>
            <div className="stat-label">最后活跃时间</div>
          </div>
        </div>
      )}
    </div>
  );
}
