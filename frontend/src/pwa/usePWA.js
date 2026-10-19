import { useState, useEffect } from 'react';

export function usePWA(companyData = null) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. Detectar si ya está corriendo como App Standalone (instalada)
    const standaloneCheck = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');
    setIsStandalone(standaloneCheck);

    // 2. Detectar Plataforma
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);

    // 3. Registrar Service Worker para soporte PWA y Push
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          // Service Worker activo
        })
        .catch((err) => {
          console.warn('SW register error:', err);
        });
    }

    // 4. Capturar evento de instalación nativo (Android / Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);

      // Si viene con el parámetro ?install=true (desde correo) o es móvil no instalado
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('install') === 'true' || !sessionStorage.getItem('copai_pwa_dismissed')) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Si es iOS y no está instalada, verificar si se debe mostrar el asistente
    if (isIosDevice && !standaloneCheck) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('install') === 'true' || (!sessionStorage.getItem('copai_pwa_dismissed') && (urlParams.get('login') || window.location.pathname === '/login'))) {
        setShowPrompt(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 5. Inyectar dinámicamente metadatos de Apple y Favicon según la empresa
  useEffect(() => {
    if (!companyData) return;

    const appTitle = companyData.nombre ? `${companyData.nombre}` : 'COPAI GPS';
    const logoUrl = companyData.logo_url || '/copai-symbol.png';
    const themeColor = companyData.color_primario || '#16A34A';

    // Meta Theme Color
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    metaTheme.content = themeColor;

    // Apple Mobile Web App Title
    let metaTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!metaTitle) {
      metaTitle = document.createElement('meta');
      metaTitle.name = 'apple-mobile-web-app-title';
      document.head.appendChild(metaTitle);
    }
    metaTitle.content = appTitle;

    // Apple Touch Icon
    let linkIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (!linkIcon) {
      linkIcon = document.createElement('link');
      linkIcon.rel = 'apple-touch-icon';
      document.head.appendChild(linkIcon);
    }
    linkIcon.href = logoUrl;

  }, [companyData]);

  // Función para disparar la instalación
  const triggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    sessionStorage.setItem('copai_pwa_dismissed', 'true');
  };

  return {
    isInstallable,
    isStandalone,
    isIOS,
    isAndroid,
    showPrompt,
    setShowPrompt,
    triggerInstall,
    dismissPrompt
  };
}
