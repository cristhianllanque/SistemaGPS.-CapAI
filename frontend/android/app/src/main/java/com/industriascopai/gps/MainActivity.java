package com.industriascopai.gps;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.CapConfig;
import com.getcapacitor.WebViewListener;
import com.google.firebase.messaging.FirebaseMessaging;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    private static final int DARK_SLATE_BG = Color.parseColor("#020617");
    private static final int REQ_POST_NOTIFICATIONS = 5001;

    @Override
    protected void load() {
        try {
            JSONObject pluginsJson = new JSONObject();
            JSONObject systemBarsJson = new JSONObject();
            // Desactivar el passthrough CSS inestable y delegar los márgenes al contenedor nativo Android
            systemBarsJson.put("insetsHandling", "disable");
            systemBarsJson.put("style", "DARK");
            pluginsJson.put("SystemBars", systemBarsJson);

            String targetUrl = getString(R.string.server_url);
            this.config = new CapConfig.Builder(this)
                .setServerUrl(targetUrl)
                .setErrorPath("offline.html")
                .setAllowNavigation(new String[] { "industriascopai.com", "*.industriascopai.com" })
                .setBackgroundColor("#020617")
                .setPluginsConfiguration(pluginsJson)
                .create();
        } catch (Exception ignored) {}

        super.load();

        if (this.bridge != null) {
            if (this.bridge.getWebView() != null) {
                try {
                    this.bridge.getWebView().addJavascriptInterface(new CopaiJsBridge(), "CopaiAndroidBridge");
                } catch (Exception ignored) {}
            }
            this.bridge.addWebViewListener(new WebViewListener() {
                @Override
                public void onPageCommitVisible(WebView view, String url) {
                    super.onPageCommitVisible(view, url);
                    markNativeFramedInWebView(view);
                }

                @Override
                public void onPageLoaded(WebView view) {
                    super.onPageLoaded(view);
                    markNativeFramedInWebView(view);
                }
            });
        }
    }

    public class CopaiJsBridge {
        @JavascriptInterface
        public void showNotification(String title, String body, String tag) {
            CopaiNotificationHelper.showHighPriorityNotification(
                getApplicationContext(),
                title,
                body,
                tag
            );
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            runOnUiThread(() -> promptPostNotificationsPermissionIfNeeded());
        }

        @JavascriptInterface
        public boolean areNotificationsEnabled() {
            try {
                return NotificationManagerCompat.from(getApplicationContext()).areNotificationsEnabled();
            } catch (Exception e) {
                return true;
            }
        }

        @JavascriptInterface
        public String getFcmToken() {
            try {
                SharedPreferences prefs = getApplicationContext().getSharedPreferences(
                    CopaiFirebaseMessagingService.PREFS_NAME,
                    Context.MODE_PRIVATE
                );
                return prefs.getString(CopaiFirebaseMessagingService.KEY_FCM_TOKEN, "");
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public void setBackgroundProtection(boolean enabled) {
            try {
                SharedPreferences prefs = getApplicationContext().getSharedPreferences(
                    CopaiFirebaseMessagingService.PREFS_NAME,
                    Context.MODE_PRIVATE
                );
                prefs.edit().putBoolean("bg_protection_enabled", enabled).apply();
            } catch (Exception ignored) {}
        }
    }

    private void promptPostNotificationsPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    new String[] { Manifest.permission.POST_NOTIFICATIONS },
                    REQ_POST_NOTIFICATIONS
                );
            }
        }
    }

    private void initFirebaseTokenIfConfigured() {
        try {
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
                if (!task.isSuccessful()) return;
                String token = task.getResult();
                if (token != null && !token.isEmpty()) {
                    SharedPreferences prefs = getApplicationContext().getSharedPreferences(
                        CopaiFirebaseMessagingService.PREFS_NAME,
                        Context.MODE_PRIVATE
                    );
                    prefs.edit().putString(CopaiFirebaseMessagingService.KEY_FCM_TOKEN, token).apply();
                    notifyWebViewFcmToken(token);
                }
            });
        } catch (Exception ignored) {}
    }

    private void notifyWebViewFcmToken(String token) {
        if (token == null || token.isEmpty()) return;
        runOnUiThread(() -> {
            try {
                if (bridge != null && bridge.getWebView() != null) {
                    String escaped = token.replace("\\", "\\\\").replace("'", "\\'");
                    bridge.getWebView().evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('copai:fcm-token',{detail:'" + escaped + "'}));",
                        null
                    );
                }
            } catch (Exception ignored) {}
        });
    }

    private void markNativeFramedInWebView(WebView view) {
        if (view == null) return;
        view.evaluateJavascript(
            "window.__COPAI_NATIVE_FRAMED=true;if(document&&document.documentElement){document.documentElement.classList.add('is-android-native-framed');}",
            null
        );
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        CopaiNotificationHelper.ensureNotificationChannel(this);
        promptPostNotificationsPermissionIfNeeded();
        initFirebaseTokenIfConfigured();

        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.getDecorView().setBackgroundColor(DARK_SLATE_BG);
        window.setStatusBarColor(DARK_SLATE_BG);
        window.setNavigationBarColor(DARK_SLATE_BG);

        // Forzar íconos blancos nítidos (◁ ○ □, hora y batería) sobre fondo #020617 incluso si el teléfono está en Modo Claro
        WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, window.getDecorView());
        if (insetsController != null) {
            insetsController.setAppearanceLightStatusBars(false);
            insetsController.setAppearanceLightNavigationBars(false);
        }

        // Reservar físicamente a nivel nativo el espacio exacto de barra superior (cámara/reloj),
        // barra inferior (3 botones ◁ ○ □ de 48dp o línea de gestos de 16-24dp) y teclado (IME)
        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            contentView.setBackgroundColor(DARK_SLATE_BG);
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, windowInsets) -> {
                Insets sysBars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
                );
                Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
                boolean imeVisible = windowInsets.isVisible(WindowInsetsCompat.Type.ime());

                int bottomPad = imeVisible ? Math.max(sysBars.bottom, ime.bottom) : sysBars.bottom;
                v.setPadding(sysBars.left, sysBars.top, sysBars.right, bottomPad);

                return new WindowInsetsCompat.Builder(windowInsets)
                    .setInsets(
                        WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout(),
                        Insets.NONE
                    )
                    .build();
            });
            ViewCompat.requestApplyInsets(contentView);
        }

        // Navegación inteligente con el botón Atrás (◁) de Android
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (bridge != null && bridge.getWebView() != null) {
                    WebView wv = bridge.getWebView();
                    String url = wv.getUrl() != null ? wv.getUrl() : "";
                    String path = "";
                    try {
                        android.net.Uri uri = android.net.Uri.parse(url);
                        path = uri.getPath() != null ? uri.getPath() : "";
                    } catch (Exception ignored) {}

                    boolean isRootRoute = path.isEmpty() || "/".equals(path) || "/dashboard".equals(path) || "/login".equals(path);
                    if (!isRootRoute && wv.canGoBack()) {
                        wv.goBack();
                        return;
                    }
                }
                moveTaskToBack(true);
            }
        });
    }
}
