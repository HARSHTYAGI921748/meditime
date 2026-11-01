package com.meditime.app.alarm

import android.app.KeyguardManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.meditime.app.MainActivity
import com.meditime.app.R

/**
 * Dedicated Medicine Alarm Lock-Screen Activity.
 * Designed to show above the device keyguard/lock screen and wake the display.
 */
class AlarmActivity : AppCompatActivity() {

    private var alarmId: Int = 0
    private var medicineId: String = ""
    private var medicineName: String = ""
    private var familyMember: String = ""
    private var dose: String = ""
    private var instructions: String = ""
    private var snoozeDuration: Int = 10
    private var vibrationEnabled: Boolean = true
    private var ringtone: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Configure Lock Screen & Screen-On APIs
        setupLockScreenFlags()

        // 2. Set dedicated layout
        setContentView(R.layout.activity_alarm)

        // 3. Extract Intent extras
        extractExtras(intent)

        // 4. Bind Views & Populate Info
        bindViews()
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        if (intent != null) {
            extractExtras(intent)
            bindViews()
        }
    }

    private fun setupLockScreenFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
            keyguardManager?.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                        WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    private fun extractExtras(srcIntent: Intent) {
        alarmId = srcIntent.getIntExtra(AlarmScheduler.EXTRA_ALARM_ID, 0)
        medicineId = srcIntent.getStringExtra(AlarmScheduler.EXTRA_MEDICINE_ID) ?: ""
        medicineName = srcIntent.getStringExtra(AlarmScheduler.EXTRA_MEDICINE_NAME) ?: "Medicine"
        familyMember = srcIntent.getStringExtra(AlarmScheduler.EXTRA_FAMILY_MEMBER_NAME) ?: "Family"
        dose = srcIntent.getStringExtra(AlarmScheduler.EXTRA_DOSE) ?: ""
        instructions = srcIntent.getStringExtra(AlarmScheduler.EXTRA_INSTRUCTIONS) ?: ""
        snoozeDuration = srcIntent.getIntExtra(AlarmScheduler.EXTRA_SNOOZE_DURATION, 10)
        vibrationEnabled = srcIntent.getBooleanExtra(AlarmScheduler.EXTRA_VIBRATION, true)
        ringtone = srcIntent.getStringExtra(AlarmScheduler.EXTRA_RINGTONE)
    }

    private fun bindViews() {
        val tvFamily = findViewById<TextView>(R.id.tvFamilyMember)
        val tvMedName = findViewById<TextView>(R.id.tvMedicineName)
        val tvDose = findViewById<TextView>(R.id.tvDose)
        val tvInstr = findViewById<TextView>(R.id.tvInstructions)

        val btnTaken = findViewById<Button>(R.id.btnTaken)
        val btnSnooze = findViewById<Button>(R.id.btnSnooze)
        val btnSkip = findViewById<Button>(R.id.btnSkip)

        // Populate details
        tvFamily.text = familyMember
        tvMedName.text = medicineName
        tvDose.text = if (dose.isNotBlank()) "Take: $dose" else ""
        if (instructions.isNotBlank()) {
            tvInstr.text = instructions
            tvInstr.visibility = View.VISIBLE
        } else {
            tvInstr.visibility = View.GONE
        }

        btnSnooze.text = "SNOOZE ($snoozeDuration MIN)"

        // Click Handlers
        btnTaken.setOnClickListener { handleTaken() }
        btnSnooze.setOnClickListener { handleSnooze() }
        btnSkip.setOnClickListener { handleSkip() }
    }

    private fun stopAlarmSoundAndNotification() {
        val stopService = Intent(this, AlarmService::class.java)
        stopService(stopService)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(alarmId)
    }

    private fun handleTaken() {
        stopAlarmSoundAndNotification()
        recordAction("taken")
        finishAndOpenApp("taken")
    }

    private fun handleSnooze() {
        stopAlarmSoundAndNotification()

        // Schedule next native alarm for snooze
        val scheduler = AlarmScheduler(this)
        val snoozeMillis = snoozeDuration * 60 * 1000L
        val trigger = System.currentTimeMillis() + snoozeMillis

        scheduler.scheduleAlarm(
            alarmId = alarmId + 700000,
            triggerTimeMillis = trigger,
            medicineId = medicineId,
            medicineName = medicineName,
            familyMemberName = familyMember,
            dose = dose,
            instructions = instructions,
            snoozeDuration = snoozeDuration,
            vibrationEnabled = vibrationEnabled,
            ringtone = ringtone
        )

        recordAction("snoozed")
        finish()
    }

    private fun handleSkip() {
        stopAlarmSoundAndNotification()
        recordAction("skipped")
        finish()
    }

    private fun recordAction(action: String) {
        // Save latest alarm action to SharedPreferences so Capacitor webview picks it up on resume
        val prefs = getSharedPreferences("meditime_alarm_actions", Context.MODE_PRIVATE)
        prefs.edit()
            .putString("last_action", action)
            .putString("last_medicine_id", medicineId)
            .putLong("last_action_timestamp", System.currentTimeMillis())
            .apply()
    }

    private fun finishAndOpenApp(action: String) {
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("alarm_action", action)
            putExtra("medicine_id", medicineId)
        }
        startActivity(launchIntent)
        finish()
    }

    override fun onBackPressed() {
        // Disable back button while ringing so user intentionally taps TAKEN, SNOOZE, or SKIP
    }
}
