package com.industriascopai.gps;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.NonNull;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class CopaiFirebaseMessagingService extends FirebaseMessagingService {

    public static final String PREFS_NAME = "copai_prefs";
    public static final String KEY_FCM_TOKEN = "fcm_token";

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        try {
            SharedPreferences prefs = getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(KEY_FCM_TOKEN, token).apply();
        } catch (Exception ignored) {}
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        String title = "Alerta CopAI GPS";
        String body = "Se detectó un evento de seguridad en tu vehículo.";
        String tag = "copai-fcm-alert";

        Map<String, String> data = remoteMessage.getData();
        if (data != null && !data.isEmpty()) {
            if (data.get("title") != null) title = data.get("title");
            if (data.get("body") != null) body = data.get("body");
            if (data.get("tag") != null) tag = data.get("tag");
        }

        RemoteMessage.Notification notif = remoteMessage.getNotification();
        if (notif != null) {
            if (notif.getTitle() != null && !notif.getTitle().isEmpty()) {
                title = notif.getTitle();
            }
            if (notif.getBody() != null && !notif.getBody().isEmpty()) {
                body = notif.getBody();
            }
            if (notif.getTag() != null && !notif.getTag().isEmpty()) {
                tag = notif.getTag();
            }
        }

        CopaiNotificationHelper.showHighPriorityNotification(getApplicationContext(), title, body, tag);
    }
}
