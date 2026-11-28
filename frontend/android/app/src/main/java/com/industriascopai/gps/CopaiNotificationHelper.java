package com.industriascopai.gps;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public final class CopaiNotificationHelper {

    public static final String CHANNEL_ID = "copai_emergency_alerts";
    public static final String CHANNEL_NAME = "Alertas Críticas CopAI GPS";
    private static final long[] VIBRATION_PATTERN = new long[] { 0, 600, 150, 600, 150, 800, 150, 1000 };

    private CopaiNotificationHelper() {}

    public static void ensureNotificationChannel(Context context) {
        if (context == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        try {
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;

            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notificaciones urgentes de Botón de Pánico, Sabotaje de Batería y Exceso de Velocidad");
            channel.enableVibration(true);
            channel.setVibrationPattern(VIBRATION_PATTERN);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            AudioAttributes audioAttrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            channel.setSound(soundUri, audioAttrs);

            manager.createNotificationChannel(channel);
        } catch (Exception ignored) {}
    }

    public static void showHighPriorityNotification(Context context, String title, String body, String tag) {
        if (context == null) return;
        ensureNotificationChannel(context);

        // Vibración física inmediata para que se sienta en el bolsillo
        try {
            Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(VIBRATION_PATTERN, -1));
                } else {
                    vibrator.vibrate(VIBRATION_PATTERN, -1);
                }
            }
        } catch (Exception ignored) {}

        try {
            if (Build.VERSION.SDK_INT >= 33) {
                if (ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
                    return;
                }
            }

            Intent intent = new Intent(context, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            intent.putExtra("copai_alert_tag", tag != null ? tag : "copai-alert");

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getActivity(context, 1001, intent, flags);

            Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title != null && !title.isEmpty() ? title : "Alerta CopAI GPS")
                .setContentText(body != null ? body : "")
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body != null ? body : ""))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setVibrate(VIBRATION_PATTERN)
                .setSound(soundUri)
                .setContentIntent(pendingIntent);

            int notificationId = (tag != null ? tag.hashCode() : (int) System.currentTimeMillis());
            NotificationManagerCompat.from(context).notify(notificationId, builder.build());
        } catch (Exception ignored) {}
    }
}
