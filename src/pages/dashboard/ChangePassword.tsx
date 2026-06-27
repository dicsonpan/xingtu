import { useState } from 'react';
import { authApi } from '../../api/client';

export function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // 表单校验，返回错误信息，无错误返回 null
  const validate = (): string | null => {
    if (!oldPassword) return '请输入旧密码';
    if (newPassword.length < 6) return '新密码至少需要 6 位字符';
    if (newPassword !== confirmPassword) return '两次输入的新密码不一致';
    return null;
  };

  const resetForm = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = validate();
    if (msg) {
      setError(msg);
      setSuccess('');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await authApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      setSuccess('密码修改成功');
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : '密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>修改密码</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 20, fontSize: 14 }}>
        为了账号安全，请定期更换密码，新密码至少 6 位。
      </p>

      <div className="card" style={{ maxWidth: 480 }}>
        {success && <div className="alert alert-success">{success}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              旧密码 <span className="req">*</span>
            </label>
            <input
              className="form-input"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="请输入当前密码"
              autoComplete="current-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              新密码 <span className="req">*</span>
            </label>
            <input
              className="form-input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="至少 6 位字符"
              autoComplete="new-password"
            />
            <div className="form-hint">新密码至少需要 6 位字符</div>
          </div>

          <div className="form-group">
            <label className="form-label">
              确认新密码 <span className="req">*</span>
            </label>
            <input
              className="form-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入新密码"
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? '提交中...' : '确认修改'}
          </button>
        </form>
      </div>
    </div>
  );
}
