import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Landing } from './pages/Landing';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/dashboard/Profile';
import { Assessment } from './pages/dashboard/Assessment';
import { Matching } from './pages/dashboard/Matching';
import { SchoolCompare } from './pages/dashboard/SchoolCompare';
import { Antifraud } from './pages/dashboard/Antifraud';
import { ChangePassword } from './pages/dashboard/ChangePassword';
import { Overview } from './pages/dashboard/Overview';
import { Admin } from './pages/Admin';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="loading"><div className="spinner" /> 加载中...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /> 加载中...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<Overview />} />
          <Route path="profile" element={<Profile />} />
          <Route path="assessment" element={<Assessment />} />
          <Route path="matching" element={<Matching />} />
          <Route path="school" element={<SchoolCompare />} />
          <Route path="antifraud" element={<Antifraud />} />
          <Route path="password" element={<ChangePassword />} />
        </Route>
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </>
  );
}
