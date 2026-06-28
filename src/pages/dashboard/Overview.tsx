import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// 档案数据类型
interface ProfileData {
  onboarding_step?: number;
  real_name?: string | null;
  province?: string | null;
  exam_total_score?: number | null;
}

// 使用统计类型
interface UsageStats {
  total_tokens: number;
  request_count: number;
  last_active: string | null;
}

// 新手引导步骤配置
const onboardingSteps = [
  {
    step: 1,
    icon: '📝',
    title: '完善档案',
    desc: '填写中考成绩和个人信息',
    to: '/dashboard/profile',
    cta: '去完成',
  },
  {
    step: 2,
    icon: '✨',
    title: '天赋测评',
    desc: '发现被分数掩盖的天赋',
    to: '/dashboard/assessment',
    cta: '去测评',
  },
  {
    step: 3,
    icon: '🎯',
    title: '专业匹配',
    desc: 'AI推荐适合的专业',
    to: '/dashboard/matching',
    cta: '去匹配',
  },
  {
    step: 4,
    icon: '🏫',
    title: '选对学校',
    desc: '对比学校，防骗预警',
    to: '/dashboard/school',
    cta: '去对比',
  },
];

// 功能入口配置
const features = [
  {
    to: '/dashboard/assessment',
    icon: '✨',
    title: '天赋发掘测评',
    desc: 'AI分析你的天赋维度，发现被总分掩盖的优势',
  },
  {
    to: '/dashboard/matching',
    icon: '🎯',
    title: '专业智能匹配',
    desc: '基于天赋和兴趣，推荐最适合的职教专业',
  },
  {
    to: '/dashboard/school',
    icon: '🏫',
    title: '学校推荐对比',
    desc: '对比不同学校类型，找到最适合的选择',
  },
  {
    to: '/dashboard/antifraud',
    icon: '🛡️',
    title: '防骗预警',
    desc: '识别虚假招生和野鸡学校，保护你的权益',
  },
];

// 默认使用统计（新用户或加载失败时使用）
const defaultUsage: UsageStats = {
  total_tokens: 0,
  request_count: 0,
  last_active: null,
};

// 格式化时间显示（兼容 SQLite datetime 格式 "YYYY-MM-DD HH:MM:SS"）
function formatTime(t: string | null): string {
  if (!t) return '暂无';
  const d = new Date(t.replace(' ', 'T'));
  if (isNaN(d.getTime())) return t;
  return d.toLocaleString('zh-CN', { hour12: false });
}

// 判断是否为"未找到"类错误（新用户可能尚未创建档案，接口会返回 404）
function isNotFoundError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('404') ||
    m.includes('not found') ||
    m.includes('未找到') ||
    m.includes('不存在') ||
    m.includes('no profile') ||
    m.includes('profile not')
  );
}

export function Overview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [usage, setUsage] = useState<UsageStats>(defaultUsage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const approved = user?.status === 'approved';
  const onboardingStep = profile?.onboarding_step ?? 0;
  const allDone = onboardingStep >= 4;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await profileApi.get();
        if (!cancelled) {
          setProfile((res.profile as ProfileData) ?? null);
          setUsage((res.usage as UsageStats) ?? defaultUsage);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : '加载数据失败';
          if (isNotFoundError(msg)) {
            // 新用户尚未创建档案，视为引导第 0 步，不作为错误展示
            setProfile({ onboarding_step: 0 });
            setUsage(defaultUsage);
            setError('');
          } else {
            setError(msg);
          }
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
          知遇助你发现天赋、匹配专业、选对学校、远离陷阱。
        </p>
      </div>

      {/* 新手引导 */}
      <div className="card" style={{ marginBottom: 32 }}>
        <h2 className="card-title">新手引导</h2>
        <p style={{ color: 'var(--muted)', marginTop: -10, marginBottom: 18, fontSize: 14 }}>
          四步走，找到属于你的方向
        </p>

        {loading ? (
          <div className="loading">
            <div className="spinner" /> 加载中...
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : (
          <>
            {allDone && (
              <div className="alert alert-success">
                恭喜！您已完成全部引导，可以随时使用各项功能重新分析。
              </div>
            )}
            <div className="grid grid-4">
              {onboardingSteps.map((s) => {
                const completed = onboardingStep >= s.step;
                const current = !completed && s.step === onboardingStep + 1;
                const borderColor = completed
                  ? 'var(--success)'
                  : current
                    ? 'var(--accent)'
                    : 'var(--rule)';
                return (
                  <div
                    key={s.step}
                    className="card"
                    style={{
                      padding: 20,
                      border: `2px solid ${borderColor}`,
                      boxShadow: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: 26 }}>{s.icon}</span>
                      <span
                        className="badge"
                        style={{
                          background: completed
                            ? 'var(--success-light)'
                            : current
                              ? 'var(--accent-light)'
                              : 'var(--bg2)',
                          color: completed
                            ? 'var(--success)'
                            : current
                              ? 'var(--accent)'
                              : 'var(--muted)',
                        }}
                      >
                        Step {s.step}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>{s.title}</h3>
                    <p style={{ fontSize: 13, color: 'var(--muted)', flex: 1 }}>{s.desc}</p>
                    {completed ? (
                      <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: 14 }}>
                        ✓ 已完成
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm btn-block"
                        onClick={() => navigate(s.to)}
                      >
                        {s.cta}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
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
              {!approved && <span className="form-hint">需审核通过后可用</span>}
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
            <div className="stat-number">{usage.total_tokens}</div>
            <div className="stat-label">总AI消耗 (tokens)</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{usage.request_count}</div>
            <div className="stat-label">使用次数</div>
          </div>
          <div className="stat-card">
            <div
              className="stat-number"
              style={{ fontSize: '1.05rem', lineHeight: 1.5, wordBreak: 'break-all' }}
            >
              {formatTime(usage.last_active)}
            </div>
            <div className="stat-label">最后活跃</div>
          </div>
        </div>
      )}
    </div>
  );
}
