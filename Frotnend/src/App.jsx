import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import Breadcrumbs from './components/layout/Breadcrumbs';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AICopilotPage from './pages/AICopilotPage';
import ProductSetupPage from './pages/ProductSetupPage';
import ReferenceImagesPage from './pages/ReferenceImagesPage';
import './App.css';

const routes = [
  ['/setup/training', 'Learn Normal'],
  ['/inspection', 'Live Inspection'], ['/inspection/:id', 'Inspection Result'],
  ['/history', 'Inspection History'], ['/products/:id/settings', 'Product Settings'],
  ['/insights', 'Quality Insights'],
];

function Placeholder({ title }) {
  return <><Breadcrumbs title={title} /><div className="page-body"><div className="card"><div className="placeholder">{title} is coming in the next step.</div></div></div></>;
}

function AuthRedirect() {
  const { loading, isAuthenticated } = useAuth();
  if (loading) return <main className="auth-loading" role="status">Checking your VisionQC session…</main>;
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

function DashboardShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggle = () => {
    if (window.innerWidth < 992) setMobileOpen((open) => !open);
    else setCollapsed((value) => !value);
  };
  return <div className={`app ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
    <Navbar onToggle={toggle} />
    <Sidebar />
    <div className="overlay" onClick={() => setMobileOpen(false)} />
    <div className="main" onClick={() => mobileOpen && setMobileOpen(false)}>
      <div className="content"><Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/copilot" element={<AICopilotPage />} />
        <Route path="/setup" element={<ProductSetupPage />} />
        <Route path="/setup/references" element={<ReferenceImagesPage />} />
        {routes.map(([path, title]) => <Route key={path} path={path} element={<Placeholder title={title} />} />)}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes></div>
      <Footer />
    </div>
  </div>;
}

export default function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route element={<ProtectedRoute />}><Route path="/*" element={<DashboardShell />} /></Route>
    <Route path="*" element={<AuthRedirect />} />
  </Routes></AuthProvider></BrowserRouter>;
}
