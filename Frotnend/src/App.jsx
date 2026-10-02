import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import Breadcrumbs from './components/layout/Breadcrumbs';
import DashboardPage from './pages/DashboardPage';
import ProductSetupPage from './pages/ProductSetupPage';

// Temporary stand-in until each page is rebuilt, one step at a time
const Placeholder = ({ title }) => (
  <>
    <Breadcrumbs title={title} />
    <div className="page-body">
      <div className="card"><div className="placeholder">{title} is coming in the next step.</div></div>
    </div>
  </>
);

const routes = [
  ['/setup/references', 'Reference Images'],
  ['/setup/training', 'Learn Normal'],
  ['/inspection', 'Live Inspection'],
  ['/inspection/:id', 'Inspection Result'],
  ['/history', 'Inspection History'],
  ['/products/:id/settings', 'Product Settings'],
  ['/insights', 'Quality Insights'],
  ['/copilot', 'AI Copilot'],
];

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggle = () => {
    if (window.innerWidth < 992) setMobileOpen((o) => !o);
    else setCollapsed((c) => !c);
  };

  return (
    <BrowserRouter>
      <div className={`app ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <Navbar onToggle={toggle} />
        <Sidebar />
        <div className="overlay" onClick={() => setMobileOpen(false)} />
        <div className="main" onClick={() => mobileOpen && setMobileOpen(false)}>
          <div className="content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/setup" element={<ProductSetupPage />} />
              {routes.map(([path, title]) => (
                <Route key={path} path={path} element={<Placeholder title={title} />} />
              ))}
            </Routes>
          </div>
          <Footer />
        </div>
      </div>
    </BrowserRouter>
  );
}
