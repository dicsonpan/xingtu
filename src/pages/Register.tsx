import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  application_reason?: string;
}

export function Register() {
  const { user, loading } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [applicationReason, setApplicationReason] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // 已登录用户重定向
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const validate = (): boolean => {
    const next: FormErrors = {};

    if (!username.trim()) {
      next.username = '请输入用户名';
    } else if (username.trim().length < 2 || username.trim().length > 20) {
      next.username = '用户名长度需为 2-20 个字符';
    }

    if (!email.trim()) {
      next.email = '请输入邮箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = '邮箱格式不正确';
    }

    if (!password) {
      next.password = '请输入密码';
    } else if (password.length < 6) {
      next.password = '密码至少需要 6 位';
    }

    if (!confirmPassword) {
      next.confirmPassword = '请再次输入密码';
    } else if (confirmPassword !== password) {
      next.confirmPassword = '两次输入的密码不一致';
    }

    if (!applicationReason.trim()) {
      next.application_reason = '请填写申请理由';
    } else if (applicationReason.trim().length < 10) {
      next.application_reason = '申请理由至少需要 10 个字符';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      await authApi.register({
        username: username.trim(),
        email: email.trim(),
        password,
        application_reason: applicationReason.trim(),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        {success ? (
          <>
            <h2>注册成功</h2>
            <div className="alert alert-success">
              注册成功，等待管理员审核。审核通过后即可登录使用星途的全部功能。
            </div>
            <Link to="/login" className="btn btn-primary btn-block">
              前往登录
            </Link>
          </>
        ) : (
          <>
            <h2>注册星途</h2>
            <p className="subtitle">填写信息，开启你的科学升学之旅</p>

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
                  placeholder="2-20 个字符"
                  maxLength={20}
                  autoComplete="username"
                />
                {errors.username && <div className="form-error">{errors.username}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  邮箱 <span className="req">*</span>
                </label>
                <input
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  autoComplete="email"
                />
                {errors.email && <div className="form-error">{errors.email}</div>}
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
                  placeholder="至少 6 位"
                  autoComplete="new-password"
                />
                {errors.password && <div className="form-error">{errors.password}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  确认密码 <span className="req">*</span>
                </label>
                <input
                  className="form-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  autoComplete="new-password"
                />
                {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  申请理由 <span className="req">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  value={applicationReason}
                  onChange={(e) => setApplicationReason(e.target.value)}
                  placeholder="请简要说明您为什么需要使用星途，例如您是偏科生/家长/教育工作者等"
                />
                <div className="form-hint">至少 10 个字符</div>
                {errors.application_reason && (
                  <div className="form-error">{errors.application_reason}</div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                disabled={submitting}
              >
                {submitting ? '提交中...' : '提交注册'}
              </button>
            </form>

            <p className="auth-switch">
              已有账号？ <Link to="/login">前往登录</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
