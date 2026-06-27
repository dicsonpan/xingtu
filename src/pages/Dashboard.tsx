import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserStatus } from '../../shared/types';

// 侧边栏导航项配置
const navItems: {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}[] = [
  { to: '/dashboard', label: '总览', icon: '🏠', end: true },
  { to: '/dashboard/profile', label: '个人档案', icon: '👤' },
  { to: '/dashboard/assessment', label: '天赋测评', icon: '✨' },
  { to: '/dashboard/matching', label: '专业匹配', icon: '🎯' },
  { to: '/dashboard/school', label: '学校对比', icon: '🏫' },
  { to: '/dashboard/antifraud', label: '防骗检测', icon: '🛡️' },
  { to: '/dashboard/password', label: '修改密码', icon: '🔑' },
];

// 状态徽章文案
const statusBadgeText: Record<UserStatus, string> = {
  pending: '审核中',
  approved: '已通过',
  rejected: '已驳回',
  banned: '已封禁',
};

export function Dashboard() {
  const { user } = useAuth();
  const status: UserStatus | undefined = user?.status;

  return (
    <div className="container">
      <div className="dash-layout">
        {/* 侧边栏导航 */}
        <aside className="dash-sidebar">
          <div
            style={{
              fontWeight: 800,
              fontSize: 18,
              padding: '4px 14px 16px',
              borderBottom: '1px solid var(--rule)',
              marginBottom: 12,
            }}
          >
            控制台
          </div>

          {user && (
            <div style={{ padding: '0 14px 16px' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{user.username}</div>
              {status && (
                <span className={`badge badge-${status}`} style={{ marginTop: 6 }}>
                  {statusBadgeText[status]}
                </span>
              )}
            </div>
          )}

          <nav>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* 主内容区 */}
        <main className="dash-content">
          {status && status !== 'approved' && (
            <div className="alert alert-warning">
              您的账号正在审核中，审核通过后即可使用全部功能
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
