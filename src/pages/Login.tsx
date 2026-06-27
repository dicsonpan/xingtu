import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface LocationState {
  from?: { pathname?: string };
}

export function Login() {
  const { user, loading, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 管理员初始化相关状态
  const [showAdminInit, setShowAdminInit] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState(false);
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  // 已登录用户重定向
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const from = (location.state as LocationState | null)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }

    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminInit = async (e: FormEvent) => {
    e.preventDefault();
    setAdminError('');
    if (!adminKey.trim() || !adminUsername.trim() || !adminEmail.trim() || !adminPassword) {
      setAdminError('请填写所有字段');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim())) {
      setAdminError('邮箱格式不正确');
      return;
    }
    if (adminPassword.length < 6) {
      setAdminError('密码至少需要 6 位');
      return;
    }

    setAdminSubmitting(true);
    try {
      await authApi.initAdmin({
        admin_key: adminKey.trim(),
        username: adminUsername.trim(),
        email: adminEmail.trim(),
        password: adminPassword,
      });
      setAdminSuccess(true);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : '初始化失败，请稍后重试');
    } finally {
      setAdminSubmitting(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>登录星途</h2>
        <p className="subtitle">欢迎回来，继续你的星途之旅</p>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">
              用户名 <span className="req">*</span>
            </label>
            <input
              className="form-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              密码 <span className="req">*</span>
            </label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={submitting}
          >
            {submitting ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="auth-switch">
          还没有账号？ <Link to="/register">立即注册</Link>
        </p>

        {/* 管理员初始化 */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setShowAdminInit((v) => !v)}
            className="btn btn-ghost btn-sm"
          >
            {showAdminInit ? '收起' : '管理员初始化'}
          </button>
        </div>

        {showAdminInit && (
          <div style={{ marginTop: 16, padding: 20, background: 'var(--bg2)', borderRadius: 'var(--radius-sm)' }}>
            {adminSuccess ? (
              <>
                <div className="alert alert-success" style={{ marginBottom: 0 }}>
                  管理员账号初始化成功，请使用该账号登录。
                </div>
              </>
            ) : (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>管理员初始化</h3>
                {adminError && <div className="alert alert-danger">{adminError}</div>}
                <form onSubmit={handleAdminInit} noValidate>
                  <div className="form-group">
                    <label className="form-label">
                      Admin Key <span className="req">*</span>
                    </label>
                    <input
                      className="form-input"
                      type="password"
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                      placeholder="管理员密钥"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      用户名 <span className="req">*</span>
                    </label>
                    <input
                      className="form-input"
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="管理员用户名"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      邮箱 <span className="req">*</span>
                    </label>
                    <input
                      className="form-input"
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@email.com"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      密码 <span className="req">*</span>
                    </label>
                    <input
                      className="form-input"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="至少 6 位"
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-secondary btn-block"
                    disabled={adminSubmitting}
                  >
                    {adminSubmitting ? '初始化中...' : '初始化管理员'}
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
