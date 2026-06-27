import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="navbar-brand">星途</Link>
        <div className="navbar-links">
          <Link to="/">首页</Link>
          {user ? (
            <>
              <Link to="/dashboard">控制台</Link>
              {user.role === 'admin' && <Link to="/admin">管理后台</Link>}
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{user.username}</span>
              <button onClick={handleLogout} className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                退出
              </button>
            </>
          ) : (
            <>
              <Link to="/login">登录</Link>
              <Link to="/register" style={{ background: 'var(--accent)', padding: '4px 14px', borderRadius: 6, color: '#fff' }}>
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
