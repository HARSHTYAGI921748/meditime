package com.meditime.app.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.util.Log
import com.meditime.app.MainActivity
import org.json.JSONArray
import org.json.JSONObject

/**
 * Native Android Alarm Scheduler for MediTime.
 * Uses system AlarmManager with setAlarmClock() for guaranteed exact medicine alarms.
 */
class AlarmScheduler(private val context: Context) {

    private val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
    private val prefs: SharedPreferences =
        context.getSharedPreferences("meditime_native_alarms", Context.MODE_PRIVATE)

    companion object {
        private const val TAG = "MediTimeAlarmScheduler"
        const val ACTION_TRIGGER_ALARM = "com.meditime.app.ACTION_TRIGGER_ALARM"
        const val PREF_KEY_SAVED_ALARMS = "saved_alarms_json"

        const val EXTRA_ALARM_ID = "extra_alarm_id"
        const val EXTRA_MEDICINE_ID = "extra_medicine_id"
        const val EXTRA_MEDICINE_NAME = "extra_medicine_name"
        const val EXTRA_FAMILY_MEMBER_NAME = "extra_family_member_name"
        const val EXTRA_DOSE = "extra_dose"
        const val EXTRA_INSTRUCTIONS = "extra_instructions"
        const val EXTRA_SNOOZE_DURATION = "extra_snooze_duration"
        const val EXTRA_VIBRATION = "extra_vibration"
        const val EXTRA_RINGTONE = "extra_ringtone"
        const val EXTRA_SCHEDULED_TIME = "extra_scheduled_time"
    }

    /**
     * Checks if exact alarm permissions are granted.
     */
    fun canScheduleExactAlarms(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            alarmManager?.canScheduleExactAlarms() ?: false
        } else {
            true
        }
    }

    /**
     * Schedules a native Android alarm.
     */
    fun scheduleAlarm(
        alarmId: Int,
        triggerTimeMillis: Long,
        medicineId: String,
        medicineName: String,
        familyMemberName: String,
        dose: String,
        instructions: String?,
        snoozeDuration: Int,
        vibrationEnabled: Boolean,
        ringtone: String?
    ): Boolean {
        if (alarmManager == null) {
            Log.e(TAG, "AlarmManager not available")
            return false
        }

        if (triggerTimeMillis <= System.currentTimeMillis()) {
            Log.w(TAG, "Trigger time $triggerTimeMillis is in the past, ignoring")
            return false
        }

        try {
            val intent = Intent(context, AlarmReceiver::class.java).apply {
                action = ACTION_TRIGGER_ALARM
                putExtra(EXTRA_ALARM_ID, alarmId)
                putExtra(EXTRA_MEDICINE_ID, medicineId)
                putExtra(EXTRA_MEDICINE_NAME, medicineName)
                putExtra(EXTRA_FAMILY_MEMBER_NAME, familyMemberName)
                putExtra(EXTRA_DOSE, dose)
                putExtra(EXTRA_INSTRUCTIONS, instructions ?: "")
                putExtra(EXTRA_SNOOZE_DURATION, snoozeDuration)
                putExtra(EXTRA_VIBRATION, vibrationEnabled)
                putExtra(EXTRA_RINGTONE, ringtone ?: "default")
                putExtra(EXTRA_SCHEDULED_TIME, triggerTimeMillis)
            }

            val pendingIntent = PendingIntent.getBroadcast(
                context,
                alarmId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Intent when user clicks the clock icon in system UI
            val showIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val showPendingIntent = PendingIntent.getActivity(
                context,
                alarmId + 100000,
                showIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Primary method: setAlarmClock() gives highest priority on Android
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                val alarmClockInfo = AlarmManager.AlarmClockInfo(triggerTimeMillis, showPendingIntent)
                alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
                Log.d(TAG, "setAlarmClock scheduled: ID=$alarmId at $triggerTimeMillis for $medicineName")
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTimeMillis, pendingIntent)
                Log.d(TAG, "setExactAndAllowWhileIdle scheduled: ID=$alarmId")
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTimeMillis, pendingIntent)
            }

            // Save to persistent storage for boot recovery
            saveAlarmMetadata(
                alarmId,
                triggerTimeMillis,
                medicineId,
                medicineName,
                familyMemberName,
                dose,
                instructions,
                snoozeDuration,
                vibrationEnabled,
                ringtone
            )

            return true
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException: Exact alarm permission missing", e)
            return false
        } catch (e: Exception) {
            Log.e(TAG, "Error scheduling alarm", e)
            return false
        }
    }

    /**
     * Cancels an alarm by its ID.
     */
    fun cancelAlarm(alarmId: Int): Boolean {
        try {
            val intent = Intent(context, AlarmReceiver::class.java).apply {
                action = ACTION_TRIGGER_ALARM
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                alarmId,
                intent,
                PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
            )
            if (pendingIntent != null && alarmManager != null) {
                alarmManager.cancel(pendingIntent)
                pendingIntent.cancel()
            }
            removeAlarmMetadata(alarmId)
            Log.d(TAG, "Alarm cancelled: $alarmId")
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Error cancelling alarm $alarmId", e)
            return false
        }
    }

    /**
     * Cancels all alarms for a specific medicine.
     */
    fun cancelMedicineAlarms(medicineId: String): Boolean {
        val alarms = getSavedAlarms()
        for (i in 0 until alarms.length()) {
            val obj = alarms.getJSONObject(i)
            if (obj.optString("medicineId") == medicineId) {
                cancelAlarm(obj.getInt("alarmId"))
            }
        }
        return true
    }

    /**
     * Cancels all scheduled alarms.
     */
    fun cancelAllAlarms(): Boolean {
        val alarms = getSavedAlarms()
        for (i in 0 until alarms.length()) {
            val obj = alarms.getJSONObject(i)
            cancelAlarm(obj.getInt("alarmId"))
        }
        prefs.edit().remove(PREF_KEY_SAVED_ALARMS).apply()
        return true
    }

    /**
     * Restores and reschedules all saved future alarms (called after phone reboot).
     */
    fun rescheduleAllSavedAlarms() {
        val alarms = getSavedAlarms()
        val now = System.currentTimeMillis()
        var count = 0

        for (i in 0 until alarms.length()) {
            val obj = alarms.getJSONObject(i)
            val trigger = obj.getLong("triggerTime")
            if (trigger > now) {
                scheduleAlarm(
                    alarmId = obj.getInt("alarmId"),
                    triggerTimeMillis = trigger,
                    medicineId = obj.getString("medicineId"),
                    medicineName = obj.getString("medicineName"),
                    familyMemberName = obj.getString("familyMemberName"),
                    dose = obj.getString("dose"),
                    instructions = obj.optString("instructions", null),
                    snoozeDuration = obj.optInt("snoozeDuration", 10),
                    vibrationEnabled = obj.optBoolean("vibrationEnabled", true),
                    ringtone = obj.optString("ringtone", null)
                )
                count++
            }
        }
        Log.i(TAG, "Re-registered $count alarms after reboot/time change")
    }

    private fun getSavedAlarms(): JSONArray {
        val json = prefs.getString(PREF_KEY_SAVED_ALARMS, null) ?: return JSONArray()
        return try {
            JSONArray(json)
        } catch (e: Exception) {
            JSONArray()
        }
    }

    private fun saveAlarmMetadata(
        alarmId: Int,
        triggerTime: Long,
        medicineId: String,
        medicineName: String,
        familyMemberName: String,
        dose: String,
        instructions: String?,
        snoozeDuration: Int,
        vibrationEnabled: Boolean,
        ringtone: String?
    ) {
        val array = getSavedAlarms()
        val updated = JSONArray()

        // Exclude old entry if already present
        for (i in 0 until array.length()) {
            val item = array.getJSONObject(i)
            if (item.getInt("alarmId") != alarmId) {
                updated.put(item)
            }
        }

        val newItem = JSONObject().apply {
            put("alarmId", alarmId)
            put("triggerTime", triggerTime)
            put("medicineId", medicineId)
            put("medicineName", medicineName)
            put("familyMemberName", familyMemberName)
            put("dose", dose)
            put("instructions", instructions ?: "")
            put("snoozeDuration", snoozeDuration)
            put("vibrationEnabled", vibrationEnabled)
            put("ringtone", ringtone ?: "")
        }
        updated.put(newItem)

        prefs.edit().putString(PREF_KEY_SAVED_ALARMS, updated.toString()).apply()
    }

    private fun removeAlarmMetadata(alarmId: Int) {
        val array = getSavedAlarms()
        val updated = JSONArray()
        for (i in 0 until array.length()) {
            val item = array.getJSONObject(i)
            if (item.getInt("alarmId") != alarmId) {
                updated.put(item)
            }
        }
        prefs.edit().putString(PREF_KEY_SAVED_ALARMS, updated.toString()).apply()
    }
}
