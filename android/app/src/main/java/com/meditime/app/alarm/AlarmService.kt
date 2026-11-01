package com.meditime.app.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * Foreground Service that plays the looping alarm audio and vibration pattern.
 * Uses AudioAttributes.USAGE_ALARM so it adheres to system Alarm volume settings.
 */
class AlarmService : Service() {

    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private val vibrationPattern = longArrayOf(0, 1000, 600, 1000, 600)

    companion object {
        private const val TAG = "MediTimeAlarmService"
        private const val SERVICE_NOTIFICATION_ID = 99991
        private const val AUTO_STOP_DELAY_MS = 3 * 60 * 1000L // 3 minutes timeout
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        initVibrator()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val medicineName = intent?.getStringExtra(AlarmScheduler.EXTRA_MEDICINE_NAME) ?: "Medicine"
        val familyMember = intent?.getStringExtra(AlarmScheduler.EXTRA_FAMILY_MEMBER_NAME) ?: "Family"
        val dose = intent?.getStringExtra(AlarmScheduler.EXTRA_DOSE) ?: ""
        val vibrationEnabled = intent?.getBooleanExtra(AlarmScheduler.EXTRA_VIBRATION, true) ?: true

        // 1. Promote to Foreground Service immediately
        startForeground(SERVICE_NOTIFICATION_ID, buildForegroundNotification(medicineName, familyMember, dose, intent))

        // 2. Play Alarm Sound
        playAlarmAudio()

        // 3. Trigger Vibration
        if (vibrationEnabled) {
            startVibration()
        }

        // 4. Auto-stop after 3 minutes to preserve battery if user is asleep
        android.os.Handler(mainLooper).postDelayed({
            Log.w(TAG, "Alarm timed out after 3 minutes")
            stopSelf()
        }, AUTO_STOP_DELAY_MS)

        return START_NOT_STICKY
    }

    private fun playAlarmAudio() {
        try {
            val alertUri: Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

            mediaPlayer = MediaPlayer().apply {
                setDataSource(applicationContext, alertUri)
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                isLooping = true
                prepare()
                start()
            }
            Log.d(TAG, "Alarm MediaPlayer started successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start MediaPlayer for alarm", e)
        }
    }

    private fun initVibrator() {
        vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            vibratorManager?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
    }

    private fun startVibration() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val effect = VibrationEffect.createWaveform(vibrationPattern, 0) // 0 = repeat from index 0
                vibrator?.vibrate(effect)
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(vibrationPattern, 0)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start vibration", e)
        }
    }

    private fun stopPlayback() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) it.stop()
                it.release()
            }
            mediaPlayer = null
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping MediaPlayer", e)
        }

        try {
            vibrator?.cancel()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping Vibrator", e)
        }
    }

    override fun onDestroy() {
        stopPlayback()
        super.onDestroy()
        Log.d(TAG, "AlarmService destroyed")
    }

    private fun buildForegroundNotification(
        medicineName: String,
        familyMember: String,
        dose: String,
        originalIntent: Intent?
    ): Notification {
        val fullScreenIntent = Intent(this, AlarmActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            if (originalIntent != null) putExtras(originalIntent)
        }
        val fullScreenPending = PendingIntent.getActivity(
            this,
            SERVICE_NOTIFICATION_ID,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, AlarmReceiver.CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("MEDICINE TIME: $medicineName")
            .setContentText("$familyMember: $dose")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .setContentIntent(fullScreenPending)
            .build()
    }
}
