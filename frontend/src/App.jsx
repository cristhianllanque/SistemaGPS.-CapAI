import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout';
import DashboardHome from './components/DashboardHome';
import DevicesPage from './components/DevicesPage';
import VehiclesPage from './components/VehiclesPage';
import DriversPage from './components/DriversPage';
import LinkingPage from './components/LinkingPage';
import MonitoringPage from './components/MonitoringPage';
import AlertsPage from './components/AlertsPage';
import HistorialRutas from './pages/HistorialRutas';
import Reportes from './pages/Reportes';
import UsersPage from './pages/UsersPage';
import CompaniesPage from './pages/CompaniesPage';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardHome />} />
          <Route path="empresas" element={<CompaniesPage />} />
          <Route path="dispositivos" element={<DevicesPage />} />
          <Route path="vehiculos" element={<VehiclesPage />} />
          <Route path="conductores" element={<DriversPage />} />
          <Route path="vinculacion" element={<LinkingPage />} />
          <Route path="monitoreo" element={<MonitoringPage />} />
          <Route path="historial-rutas" element={<HistorialRutas />} />
          <Route path="alertas" element={<AlertsPage />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="usuarios" element={<UsersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
