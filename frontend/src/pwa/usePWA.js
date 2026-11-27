import { useState, useEffect } from 'react';
import { isNativeApp } from '../config';

export function usePWA(companyData = null) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. Detectar si ya está corriendo como App Standalone (PWA instalada o APK Nativo Capacitor)
    const standaloneCheck = 
      isNativeApp ||
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

    // 3. Registrar Service Worker para soporte PWA y Push, verificando actualizaciones al volver a primer plano
    let swReg = null;
    const handleSwVisibilityUpdate = () => {
      if (document.visibilityState === 'visible' && swReg) {
        swReg.update().catch(() => {});
      }
    };

    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          swReg = reg;
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('SW register error:', err);
        });
      document.addEventListener('visibilitychange', handleSwVisibilityUpdate);
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
      document.removeEventListener('visibilitychange', handleSwVisibilityUpdate);
    };
  }, []);

  // 5. Inyectar dinámicamente metadatos de Apple y Favicon según la empresa (universal para cualquier cliente)
  useEffect(() => {
    const isMobileViewport = typeof window !== 'undefined' && window.innerWidth <= 768;
    const rawName = (companyData?.id && companyData.id !== 0 && companyData?.nombre)
      ? companyData.nombre.replace(/^(empresa\s+de\s+transportes?\s+|transportes?\s+|empresa\s+)/i, '').trim()
      : '';
    const appTitle = rawName ? rawName.slice(0, 20) : 'COPAI GPS';
    const logoKey = companyData?.logo_url
      ? companyData.logo_url.split('/').pop().replace('.png', '').slice(-10)
      : 'copai';
    const appleLogoUrl = (companyData?.slug && companyData?.logo_url && companyData.id !== 0)
      ? `/api/pwa/icon/${companyData.slug}/180.png?v=${logoKey}`
      : '/apple-touch-icon.png';
    const favLogoUrl = (companyData?.slug && companyData?.logo_url && companyData.id !== 0)
      ? `/api/pwa/icon/${companyData.slug}/192.png?v=${logoKey}`
      : '/copai-symbol.png';
    const themeColor = isMobileViewport ? '#020617' : (companyData?.color_primario || '#020617');

    // Meta Theme Color (En móvil siempre #020617 oscuro para eliminar niebla blanca superior en iOS)
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    metaTheme.content = themeColor;

    // Apple Mobile Web App Title (si cerró sesión o es Copai Central, muestra COPAI GPS)
    let metaTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!metaTitle) {
      metaTitle = document.createElement('meta');
      metaTitle.name = 'apple-mobile-web-app-title';
      document.head.appendChild(metaTitle);
    }
    metaTitle.content = appTitle;

    // Eliminar cualquier link precomposed antiguo para que iOS Safari respete siempre el ícono dinámico
    document.querySelectorAll('link[rel="apple-touch-icon-precomposed"]').forEach((el) => el.remove());

    // Apple Touch Icon y Favicon dinámico con cache-busting al actualizar logo
    let linkIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (!linkIcon) {
      linkIcon = document.createElement('link');
      linkIcon.rel = 'apple-touch-icon';
      linkIcon.sizes = '180x180';
      document.head.appendChild(linkIcon);
    }
    linkIcon.href = appleLogoUrl;

    let favIcon = document.querySelector('link[rel="icon"]');
    if (favIcon) {
      favIcon.href = favLogoUrl;
    }

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
