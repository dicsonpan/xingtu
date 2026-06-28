import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../api/client';
import type { User, UserStatus } from '../../shared/types';

type Tab = 'users' | 'stats' | 'ai';
type StatusFilter = 'all' | UserStatus;

interface FeatureStat {
  feature_type: string;
  count: number;
  tokens: number;
}

interface AdminStats {
  total_users: number;
  pending_users: number;
  approved_users: number;
  total_tokens: number;
  feature_breakdown: FeatureStat[];
  recent_users: { id: number; username: string; status: string; created_at: string }[];
  user_usage: {
    user_id: number;
    username: string;
    total_tokens: number;
    request_count: number;
    last_active: string | null;
  }[];
}

interface UserDetailUsage {
  total_tokens: number;
  request_count: number;
  last_active: string | null;
  features: FeatureStat[];
}

interface AIConfig {
  api_base_url: string;
  api_key_masked: string;
  model: string;
  configured: boolean;
  updated_at: string | null;
}

type AIMessageKind = 'success' | 'danger' | 'info' | 'warning';
interface AIMessage {
  kind: AIMessageKind;
  text: string;
}

const STATUS_LABEL: Record<UserStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
  banned: '已封禁',
};

const STATUS_BADGE: Record<UserStatus, string> = {
  pending: 'badge-pending',
  approved: 'badge-approved',
  rejected: 'badge-rejected',
  banned: 'badge-banned',
};

const FEATURE_LABEL: Record<string, string> = {
  assessment: '天赋测评',
  matching: '专业匹配',
  school: '学校推荐',
  antifraud: '防骗检测',
};

const FILTERS: StatusFilter[] = ['all', 'pending', 'approved', 'rejected', 'banned'];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function truncate(s: string | null | undefined, n: number): string {
  if (!s) return '—';
  return s.length > n ? s.slice(0, n) + '...' : s;
}

function featureLabel(type: string): string {
  return FEATURE_LABEL[type] || type;
}

export function Admin() {
  const [tab, setTab] = useState<Tab>('users');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ user: User; usage: UserDetailUsage } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // AI 配置相关状态
  const [aiConfig, setAIConfig] = useState<AIConfig | null>(null);
  const [aiConfigLoading, setAIConfigLoading] = useState(false);
  const [aiForm, setAIForm] = useState({ api_base_url: '', api_key: '', model: '' });
  const [savingAI, setSavingAI] = useState(false);
  const [testingAI, setTestingAI] = useState(false);
  const [aiMessage, setAIMessage] = useState<AIMessage | null>(null);

  const loadUsers = useCallback(async (status: StatusFilter) => {
    setUsersLoading(true);
    setError('');
    try {
      const res = await adminApi.users(status === 'all' ? undefined : status);
      setUsers((res.users || []) as User[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载用户列表失败');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await adminApi.stats();
      setStats(res as AdminStats);
    } catch {
      // 忽略统计加载错误
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadAIConfig = useCallback(async () => {
    setAIConfigLoading(true);
    try {
      const res = await adminApi.getAIConfig();
      const cfg = res as AIConfig;
      setAIConfig(cfg);
      // 预填表单（密钥留空，由 placeholder 显示掩码值）
      setAIForm({
        api_base_url: cfg.api_base_url || '',
        api_key: '',
        model: cfg.model || '',
      });
    } catch (e) {
      setAIMessage({
        kind: 'danger',
        text: e instanceof Error ? e.message : '加载 AI 配置失败',
      });
    } finally {
      setAIConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers('all');
    loadStats();
  }, [loadUsers, loadStats]);

  const handleFilterChange = (s: StatusFilter) => {
    setFilter(s);
    loadUsers(s);
  };

  const refreshAll = () => {
    loadUsers(filter);
    loadStats();
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setError('');
    if (t === 'ai' && !aiConfig && !aiConfigLoading) {
      loadAIConfig();
    }
  };

  const runAction = async (id: number, fn: () => Promise<unknown>) => {
    setActionLoading(id);
    setError('');
    try {
      await fn();
      if (detail?.user.id === id) setDetail(null);
      refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = (id: number) => runAction(id, () => adminApi.approve(id));
  const handleBan = (id: number) => runAction(id, () => adminApi.ban(id));
  const handleUnban = (id: number) => runAction(id, () => adminApi.unban(id));

  const handleReject = (id: number) => {
    const reason = window.prompt('请输入拒绝理由：');
    if (reason === null) return; // 用户取消
    if (!reason.trim()) {
      setError('请输入拒绝理由');
      return;
    }
    runAction(id, () => adminApi.reject(id, reason.trim()));
  };

  const handleViewDetail = async (u: User) => {
    setDetailLoading(true);
    setDetail(null);
    setError('');
    try {
      const res = await adminApi.userDetail(u.id);
      setDetail({ user: res.user as User, usage: res.usage as UserDetailUsage });
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载用户详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveAI = async () => {
    setSavingAI(true);
    setAIMessage(null);
    try {
      await adminApi.updateAIConfig({
        api_base_url: aiForm.api_base_url.trim(),
        api_key: aiForm.api_key,
        model: aiForm.model.trim(),
      });
      setAIMessage({ kind: 'success', text: 'AI 配置已保存' });
      // 刷新配置状态（同步 updated_at 与掩码密钥）
      await loadAIConfig();
    } catch (e) {
      setAIMessage({
        kind: 'danger',
        text: e instanceof Error ? e.message : '保存 AI 配置失败',
      });
    } finally {
      setSavingAI(false);
    }
  };

  const handleTestAI = async () => {
    setTestingAI(true);
    setAIMessage(null);
    try {
      const res = await adminApi.testAIConfig();
      const data = res as { message: string; reply: string; model: string };
      setAIMessage({
        kind: 'success',
        text: `连接成功！AI回复: ${data.reply}`,
      });
    } catch (e) {
      setAIMessage({
        kind: 'danger',
        text: e instanceof Error ? e.message : '测试连接失败',
      });
    } finally {
      setTestingAI(false);
    }
  };

  const renderActions = (u: User) => {
    if (u.role === 'admin') {
      return <span style={{ color: 'var(--muted)', fontSize: 13 }}>管理员</span>;
    }
    const busy = actionLoading === u.id;
    switch (u.status) {
      case 'pending':
        return (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="btn btn-success btn-sm" disabled={busy} onClick={() => handleApprove(u.id)}>
              通过
            </button>
            <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => handleReject(u.id)}>
              拒绝
            </button>
          </div>
        );
      case 'approved':
        return (
          <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => handleBan(u.id)}>
            封禁
          </button>
        );
      case 'rejected':
        return (
          <button className="btn btn-success btn-sm" disabled={busy} onClick={() => handleApprove(u.id)}>
            重新审核
          </button>
        );
      case 'banned':
        return (
          <button className="btn btn-success btn-sm" disabled={busy} onClick={() => handleUnban(u.id)}>
            解封
          </button>
        );
      default:
        return null;
    }
  };

  const alertClass = (kind: AIMessageKind) =>
    kind === 'success'
      ? 'alert alert-success'
      : kind === 'danger'
      ? 'alert alert-danger'
      : kind === 'warning'
      ? 'alert alert-warning'
      : 'alert alert-info';

  return (
    <div className="container" style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>管理后台</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>用户审核、平台统计与系统配置</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="tabs">
        <button className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => handleTabChange('users')}>
          用户审核
        </button>
        <button className={`tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => handleTabChange('stats')}>
          使用统计
        </button>
        <button className={`tab ${tab === 'ai' ? 'active' : ''}`} onClick={() => handleTabChange('ai')}>
          AI配置
        </button>
      </div>

      {tab === 'users' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {FILTERS.map((s) => (
              <button
                key={s}
                className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleFilterChange(s)}
              >
                {s === 'all' ? '全部' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          {usersLoading ? (
            <div className="loading">
              <div className="spinner" /> 加载用户列表...
            </div>
          ) : users.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>用户名</th>
                    <th>状态</th>
                    <th>申请理由</th>
                    <th>注册时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 4px' }}
                          onClick={() => handleViewDetail(u)}
                        >
                          {u.username}
                        </button>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[u.status]}`}>{STATUS_LABEL[u.status]}</span>
                      </td>
                      <td style={{ maxWidth: 260, color: 'var(--muted)' }}>{truncate(u.application_reason, 30)}</td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: 13 }}>
                        {formatDate(u.created_at)}
                      </td>
                      <td>{renderActions(u)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="icon">👥</div>暂无用户
            </div>
          )}
        </div>
      )}

      {tab === 'stats' && (
        <div>
          {statsLoading ? (
            <div className="loading">
              <div className="spinner" /> 加载统计数据...
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-4" style={{ marginBottom: 24 }}>
                <div className="stat-card">
                  <div className="stat-number">{stats.total_users}</div>
                  <div className="stat-label">总用户数</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{stats.pending_users}</div>
                  <div className="stat-label">待审核数</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{stats.approved_users}</div>
                  <div className="stat-label">已通过数</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{stats.total_tokens}</div>
                  <div className="stat-label">总 Token 消耗</div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 24 }}>
                <h3 className="card-title">功能使用分布</h3>
                {stats.feature_breakdown && stats.feature_breakdown.length > 0 ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>功能</th>
                          <th>次数</th>
                          <th>Token</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.feature_breakdown.map((f, i) => (
                          <tr key={i}>
                            <td>{featureLabel(f.feature_type)}</td>
                            <td>{f.count}</td>
                            <td>{f.tokens}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">暂无使用记录</div>
                )}
              </div>

              <div className="card">
                <h3 className="card-title">用户使用排行</h3>
                {stats.user_usage && stats.user_usage.length > 0 ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>用户名</th>
                          <th>Token 总量</th>
                          <th>请求次数</th>
                          <th>最后活跃</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.user_usage.map((u, i) => (
                          <tr key={i}>
                            <td>{u.username}</td>
                            <td>{u.total_tokens}</td>
                            <td>{u.request_count}</td>
                            <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: 13 }}>
                              {formatDate(u.last_active)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">暂无使用记录</div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="icon">📊</div>暂无统计数据
            </div>
          )}
        </div>
      )}

      {tab === 'ai' && (
        <div>
          <div className="card">
            <h3 className="card-title">AI 接口配置</h3>

            <div className="alert alert-info" style={{ marginTop: 12 }}>
              配置 OpenAI 兼容的 API 接口。支持 OpenAI、DeepSeek、通义千问等兼容 OpenAI 格式的服务。配置后所有 AI
              功能（天赋测评、专业匹配、学校推荐、防骗检测）将使用此接口。
            </div>

            {aiConfig && !aiConfig.configured && (
              <div className="alert alert-warning">AI 尚未配置，用户无法使用 AI 功能</div>
            )}

            {aiMessage && <div className={alertClass(aiMessage.kind)}>{aiMessage.text}</div>}

            {aiConfigLoading ? (
              <div className="loading">
                <div className="spinner" /> 加载 AI 配置...
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">API 地址</label>
                  <input
                    className="form-input"
                    type="text"
                    value={aiForm.api_base_url}
                    placeholder="https://api.openai.com/v1"
                    onChange={(e) => setAIForm({ ...aiForm, api_base_url: e.target.value })}
                  />
                  <div className="form-hint">
                    OpenAI: https://api.openai.com/v1 | DeepSeek: https://api.deepseek.com/v1 |
                    其他兼容服务请填对应的 /v1 结尾地址
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">API 密钥</label>
                  <input
                    className="form-input"
                    type="password"
                    value={aiForm.api_key}
                    placeholder={aiConfig?.api_key_masked || '请输入 API 密钥'}
                    onChange={(e) => setAIForm({ ...aiForm, api_key: e.target.value })}
                  />
                  <div className="form-hint">如仅需修改地址或模型而不换密钥，此处留空即可保持原有密钥不变</div>
                </div>

                <div className="form-group">
                  <label className="form-label">模型名称</label>
                  <input
                    className="form-input"
                    type="text"
                    value={aiForm.model}
                    placeholder="gpt-4o-mini"
                    onChange={(e) => setAIForm({ ...aiForm, model: e.target.value })}
                  />
                  <div className="form-hint">常用模型: gpt-4o-mini / gpt-4o / deepseek-chat / qwen-plus 等</div>
                </div>

                {aiConfig?.updated_at && (
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                    上次更新时间: {formatDate(aiConfig.updated_at)}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary"
                    disabled={savingAI || testingAI}
                    onClick={handleSaveAI}
                  >
                    {savingAI ? '保存中...' : '保存配置'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    disabled={savingAI || testingAI}
                    onClick={handleTestAI}
                  >
                    {testingAI ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span className="spinner" /> 测试中...
                      </span>
                    ) : (
                      '测试连接'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="alert alert-info" style={{ marginTop: 16, fontSize: 13 }}>
            提示: 每次AI调用都会消耗token。可在"使用统计"tab中查看各用户token消耗明细。
          </div>
        </div>
      )}

      {/* 用户详情模态框 */}
      {(detail || detailLoading) && (
        <div
          onClick={() => !detailLoading && setDetail(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ maxWidth: 560, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}
          >
            {detailLoading ? (
              <div className="loading">
                <div className="spinner" /> 加载用户详情...
              </div>
            ) : detail ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 16,
                    gap: 12,
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700 }}>{detail.user.username}</h3>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                      ID {detail.user.id} ·{' '}
                      <span className={`badge ${STATUS_BADGE[detail.user.status]}`}>
                        {STATUS_LABEL[detail.user.status]}
                      </span>
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setDetail(null)}>
                    关闭
                  </button>
                </div>

                <div className="result-block">
                  <h4>申请理由</h4>
                  <p style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{detail.user.application_reason || '—'}</p>
                </div>

                {detail.user.reject_reason && (
                  <div className="result-block" style={{ background: 'var(--danger-light)' }}>
                    <h4 style={{ color: 'var(--danger)' }}>拒绝理由</h4>
                    <p style={{ color: 'var(--danger)' }}>{detail.user.reject_reason}</p>
                  </div>
                )}

                <div className="result-block">
                  <h4>使用统计</h4>
                  <div className="grid grid-3" style={{ marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--muted)' }}>Token 总量</div>
                      <strong>{detail.usage.total_tokens}</strong>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--muted)' }}>请求次数</div>
                      <strong>{detail.usage.request_count}</strong>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--muted)' }}>最后活跃</div>
                      <strong style={{ fontSize: 13 }}>{formatDate(detail.usage.last_active)}</strong>
                    </div>
                  </div>
                  {detail.usage.features && detail.usage.features.length > 0 ? (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>功能</th>
                            <th>次数</th>
                            <th>Token</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.usage.features.map((f, i) => (
                            <tr key={i}>
                              <td>{featureLabel(f.feature_type)}</td>
                              <td>{f.count}</td>
                              <td>{f.tokens}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--muted)', fontSize: 13 }}>暂无功能使用记录</div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
