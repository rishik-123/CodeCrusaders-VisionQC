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
import TrainingPage from './pages/TrainingPage';
import LiveInspectionPage from './pages/LiveInspectionPage';
import InspectionHistoryPage from './pages/InspectionHistoryPage';
import InspectionDetailPage from './pages/InspectionDetailPage';
import ProductSettingsPage from './pages/ProductSettingsPage';
import QualityInsightsPage from './pages/QualityInsightsPage';
import './App.css';

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
        <Route path="/setup/training" element={<TrainingPage />} />
        <Route path="/inspection" element={<LiveInspectionPage />} />
        <Route path="/inspection/:id" element={<InspectionDetailPage />} />
        <Route path="/history" element={<InspectionHistoryPage />} />
        <Route path="/products/:id/settings" element={<ProductSettingsPage />} />
        <Route path="/insights" element={<QualityInsightsPage />} />
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
