import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePortal from './pages/HomePortal';
import FloodMonitoring from './pages/FloodMonitoring';
import RoadUpdates from './pages/RoadUpdates';
import CitizenAlerts from './pages/CitizenAlerts';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';

// Footer Pages
import EmergencyContacts from './pages/EmergencyContacts';
import PrivacyPolicy from './pages/PrivacyPolicy';
import AccessibilityStatement from './pages/AccessibilityStatement';
import DataAPI from './pages/DataAPI';

import { useAppContext } from './context/AppContext';

function App() {
  const { isAdminAuthenticated, isAppMode } = useAppContext();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePortal />} />
          <Route path="flood-monitoring" element={<FloodMonitoring />} />
          <Route path="road-updates" element={<RoadUpdates />} />
          <Route path="alerts" element={<CitizenAlerts />} />
          
          {/* Footer Page Routes */}
          <Route path="emergency-contacts" element={<EmergencyContacts />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="accessibility" element={<AccessibilityStatement />} />
          <Route path="data-api" element={<DataAPI />} />

          {!isAppMode && (
            <Route 
              path="admin" 
              element={isAdminAuthenticated ? <AdminDashboard /> : <AdminLogin />} 
            />
          )}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
