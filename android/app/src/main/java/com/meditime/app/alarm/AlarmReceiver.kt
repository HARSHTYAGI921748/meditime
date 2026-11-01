package com.meditime.app.alarm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.meditime.app.R

/**
 * Native BroadcastReceiver that receives the alarm intent from AlarmManager.
 * Launches AlarmActivity as a full-screen intent and starts AlarmService for sound/vibration.
 */
class AlarmReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "MediTimeAlarmReceiver"
        const val CHANNEL_ID = "meditime_alarm_channel"
        const val WAKE_LOCK_TAG = "meditime:alarm_receiver_wakelock"

        const val ACTION_TAKEN = "com.meditime.app.ACTION_ACTION_TAKEN"
        const val ACTION_SNOOZE = "com.meditime.app.ACTION_ACTION_SNOOZE"
        const val ACTION_SKIP = "com.meditime.app.ACTION_ACTION_SKIP"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "onReceive triggered with action: $action")

        val alarmId = intent.getIntExtra(AlarmScheduler.EXTRA_ALARM_ID, 0)
        val medicineId = intent.getStringExtra(AlarmScheduler.EXTRA_MEDICINE_ID) ?: ""
        val medicineName = intent.getStringExtra(AlarmScheduler.EXTRA_MEDICINE_NAME) ?: "Medicine"
        val familyMember = intent.getStringExtra(AlarmScheduler.EXTRA_FAMILY_MEMBER_NAME) ?: "Family Member"
        val dose = intent.getStringExtra(AlarmScheduler.EXTRA_DOSE) ?: ""
        val instructions = intent.getStringExtra(AlarmScheduler.EXTRA_INSTRUCTIONS) ?: ""
        val snoozeMins = intent.getIntExtra(AlarmScheduler.EXTRA_SNOOZE_DURATION, 10)
        val vibration = intent.getBooleanExtra(AlarmScheduler.EXTRA_VIBRATION, true)
        val ringtone = intent.getStringExtra(AlarmScheduler.EXTRA_RINGTONE)

        // Handle direct notification button actions
        when (action) {
            ACTION_TAKEN -> {
                Log.i(TAG, "Direct action: TAKEN for $medicineName")
                stopAlarmService(context)
                dismissNotification(context, alarmId)
                return
            }
            ACTION_SNOOZE -> {
                Log.i(TAG, "Direct action: SNOOZE for $medicineName ($snoozeMins min)")
                stopAlarmService(context)
                dismissNotification(context, alarmId)
                // Schedule snooze alarm
                val scheduler = AlarmScheduler(context)
                val trigger = System.currentTimeMillis() + (snoozeMins * 60 * 1000L)
                scheduler.scheduleAlarm(
                    alarmId = alarmId + 500000,
                    triggerTimeMillis = trigger,
                    medicineId = medicineId,
                    medicineName = medicineName,
                    familyMemberName = familyMember,
                    dose = dose,
                    instructions = instructions,
                    snoozeDuration = snoozeMins,
                    vibrationEnabled = vibration,
                    ringtone = ringtone
                )
                return
            }
            ACTION_SKIP -> {
                Log.i(TAG, "Direct action: SKIP for $medicineName")
                stopAlarmService(context)
                dismissNotification(context, alarmId)
                return
            }
        }

        // Standard alarm trigger:
        // 1. Acquire partial wake lock to guarantee CPU remains active
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val wakeLock = powerManager?.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
            WAKE_LOCK_TAG
        )
        wakeLock?.acquire(3 * 60 * 1000L) // 3 minute safety timeout

        // 2. Ensure Notification Channel exists
        createNotificationChannel(context)

        // 3. Prepare Full-screen Intent targeting AlarmActivity
        val fullScreenIntent = Intent(context, AlarmActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtras(intent)
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            alarmId,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 4. Prepare Action PendingIntents for notification
        val takenIntent = Intent(context, AlarmReceiver::class.java).apply {
            this.action = ACTION_TAKEN
            putExtras(intent)
        }
        val takenPending = PendingIntent.getBroadcast(
            context,
            alarmId + 100,
            takenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val snoozeIntent = Intent(context, AlarmReceiver::class.java).apply {
            this.action = ACTION_SNOOZE
            putExtras(intent)
        }
        val snoozePending = PendingIntent.getBroadcast(
            context,
            alarmId + 200,
            snoozeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 5. Build High-Priority Notification with Full-Screen Intent
        val notificationBuilder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("MEDICINE TIME: $medicineName")
            .setContentText("$familyMember: Take $dose ($instructions)")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(false)
            .setOngoing(true)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent)
            .addAction(android.R.drawable.checkbox_on_background, "TAKEN", takenPending)
            .addAction(android.R.drawable.ic_popup_sync, "SNOOZE ($snoozeMins m)", snoozePending)

        val notificationManager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(alarmId, notificationBuilder.build())

        // 6. Start Foreground AlarmService to play ringing audio & vibration
        val serviceIntent = Intent(context, AlarmService::class.java).apply {
            putExtras(intent)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }

        // 7. Directly attempt to launch AlarmActivity
        try {
            context.startActivity(fullScreenIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Could not start AlarmActivity directly; notification will handle it", e)
        }
    }

    private fun stopAlarmService(context: Context) {
        val stopIntent = Intent(context, AlarmService::class.java)
        context.stopService(stopIntent)
    }

    private fun dismissNotification(context: Context, notificationId: Int) {
        val notificationManager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(notificationId)
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val existing = notificationManager.getNotificationChannel(CHANNEL_ID)
            if (existing == null) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    context.getString(R.string.channel_alarm_name),
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = context.getString(R.string.channel_alarm_description)
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 800, 400, 800)
                    lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
                    setBypassDnd(true)
                    val soundUri: Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                    setSound(
                        soundUri,
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                }
                notificationManager.createNotificationChannel(channel)
            }
        }
    }
}
