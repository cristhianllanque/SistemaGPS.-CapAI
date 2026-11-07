package com.industriascopai.gps;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.CapConfig;
import com.getcapacitor.WebViewListener;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    private static final int DARK_SLATE_BG = Color.parseColor("#020617");

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
                .setAllowNavigation(new String[] { "industriascopai.com", "*.industriascopai.com" })
                .setBackgroundColor("#020617")
                .setPluginsConfiguration(pluginsJson)
                .create();
        } catch (Exception ignored) {}

        super.load();

        if (this.bridge != null) {
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
