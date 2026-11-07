import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import ParticularesPage from './pages/ParticularesPage';
import ResetPassword from './pages/ResetPassword';

/**
 * Vigilante silencioso de actualizaciones en vivo (OTA Web / iOS PWA / Android APK).
 * Detecta nuevos hashes de compilación tras cada `git push` y actualiza la app
 * automáticamente al abrirla o volver de segundo plano sin cerrar la sesión del usuario.
 */
function AutoVersionUpdater() {
  const isCheckingRef = useRef(false);

  useEffect(() => {
    if (import.meta.env.DEV) return;

    const handlePreloadError = (event) => {
      event.preventDefault();
      const now = Date.now();
      const lastChunkReload = Number(sessionStorage.getItem('copai_chunk_reload_ts') || '0');
      if (now - lastChunkReload > 15000) {
        sessionStorage.setItem('copai_chunk_reload_ts', String(now));
        window.location.reload();
      }
    };

    const checkForLiveUpdate = async () => {
      if (isCheckingRef.current) return;

      // No interrumpir si el usuario está escribiendo activamente en un formulario
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }

      const currentScript = document.querySelector('script[type="module"][src*="/assets/index-"]');
      const currentSrc = currentScript?.getAttribute('src');
      if (!currentSrc) return;

      isCheckingRef.current = true;
      try {
        const res = await fetch(`${window.location.origin}/index.html?_v=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (!res.ok) return;

        const html = await res.text();
        const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
        const latestSrc = match?.[1];

        if (latestSrc && latestSrc !== currentSrc) {
          const alreadyReloadedFor = sessionStorage.getItem('copai_last_auto_reload');
          if (alreadyReloadedFor !== latestSrc) {
            sessionStorage.setItem('copai_last_auto_reload', latestSrc);
            if ('caches' in window) {
              try {
                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k)));
              } catch (_) {}
            }
            window.location.reload();
          }
        }
      } catch (_) {
        // Silencioso si no hay red momentáneamente
      } finally {
        isCheckingRef.current = false;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForLiveUpdate();
      }
    };

    const handlePageShow = (event) => {
      if (event.persisted) {
        checkForLiveUpdate();
      }
    };

    const initialTimer = setTimeout(checkForLiveUpdate, 1500);
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkForLiveUpdate();
      }
    }, 180000);

    window.addEventListener('vite:preloadError', handlePreloadError);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('online', checkForLiveUpdate);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
      window.removeEventListener('vite:preloadError', handlePreloadError);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('online', checkForLiveUpdate);
    };
  }, []);

  return null;
}

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  const location = useLocation();
  if (!token) {
    return <Navigate to={`/login${location.search}`} replace />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <AutoVersionUpdater />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardHome />} />
          <Route path="empresas" element={<CompaniesPage />} />
          <Route path="particulares" element={<ParticularesPage />} />
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
