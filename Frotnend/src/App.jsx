import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import ToastContainer from './components/common/ToastContainer';
import { useToast } from './hooks/useToast';

import DashboardPage from './pages/DashboardPage';
import ProductSetupPage from './pages/ProductSetupPage';
import ReferenceImagesPage from './pages/ReferenceImagesPage';
import TrainingPage from './pages/TrainingPage';
import LiveInspectionPage from './pages/LiveInspectionPage';
import InspectionDetailPage from './pages/InspectionDetailPage';
import InspectionHistoryPage from './pages/InspectionHistoryPage';
import ProductSettingsPage from './pages/ProductSettingsPage';
import QualityInsightsPage from './pages/QualityInsightsPage';
import AICopilotPage from './pages/AICopilotPage';

import './styles/global.css';

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  const toggleSidebar = () => setCollapsed(!collapsed);

  return (
    <BrowserRouter>
      <div className="app-wrapper">
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
        
        <div className={`main-area ${collapsed ? 'collapsed' : ''}`}>
          <Navbar collapsed={collapsed} onToggle={toggleSidebar} />
          
          <main className="page-container">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/setup" element={<ProductSetupPage addToast={addToast} />} />
              <Route path="/setup/references" element={<ReferenceImagesPage addToast={addToast} />} />
              <Route path="/setup/training" element={<TrainingPage addToast={addToast} />} />
              <Route path="/inspection" element={<LiveInspectionPage />} />
              <Route path="/inspection/:id" element={<InspectionDetailPage addToast={addToast} />} />
              <Route path="/history" element={<InspectionHistoryPage />} />
              <Route path="/products/:id/settings" element={<ProductSettingsPage addToast={addToast} />} />
              <Route path="/insights" element={<QualityInsightsPage />} />
              <Route path="/copilot" element={<AICopilotPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>

          <Footer />
        </div>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </BrowserRouter>
  );
}
