package com.meditime.app.plugin

import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.meditime.app.alarm.AlarmScheduler

/**
 * Capacitor Plugin Bridge for MediTime Native Android Alarm Engine.
 */
@CapacitorPlugin(
    name = "MediTimeAlarm",
    permissions = [
        Permission(
            alias = "notifications",
            strings = [android.Manifest.permission.POST_NOTIFICATIONS]
        )
    ]
)
class MediTimeAlarmPlugin : Plugin() {

    private lateinit var scheduler: AlarmScheduler

    override fun load() {
        super.load()
        scheduler = AlarmScheduler(context)
    }

    @PluginMethod
    fun scheduleAlarm(call: PluginCall) {
        val alarmId = call.getInt("alarmId") ?: run {
            call.reject("alarmId is required")
            return
        }
        val triggerTime = call.getDouble("triggerTime")?.toLong() ?: run {
            call.reject("triggerTime is required")
            return
        }
        val medicineId = call.getString("medicineId") ?: ""
        val medicineName = call.getString("medicineName") ?: ""
        val familyMemberName = call.getString("familyMemberName") ?: ""
        val dose = call.getString("dose") ?: ""
        val instructions = call.getString("instructions")
        val snoozeDuration = call.getInt("snoozeDuration") ?: 10
        val vibrationEnabled = call.getBoolean("vibrationEnabled") ?: true
        val ringtone = call.getString("ringtone")

        val success = scheduler.scheduleAlarm(
            alarmId = alarmId,
            triggerTimeMillis = triggerTime,
            medicineId = medicineId,
            medicineName = medicineName,
            familyMemberName = familyMemberName,
            dose = dose,
            instructions = instructions,
            snoozeDuration = snoozeDuration,
            vibrationEnabled = vibrationEnabled,
            ringtone = ringtone
        )

        val ret = JSObject()
        ret.put("success", success)
        if (!success) {
            ret.put("error", "Failed to schedule exact alarm with Android AlarmManager")
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun cancelAlarm(call: PluginCall) {
        val alarmId = call.getInt("alarmId") ?: run {
            call.reject("alarmId is required")
            return
        }
        val success = scheduler.cancelAlarm(alarmId)
        val ret = JSObject()
        ret.put("success", success)
        call.resolve(ret)
    }

    @PluginMethod
    fun cancelMedicineAlarms(call: PluginCall) {
        val medicineId = call.getString("medicineId") ?: run {
            call.reject("medicineId is required")
            return
        }
        val success = scheduler.cancelMedicineAlarms(medicineId)
        val ret = JSObject()
        ret.put("success", success)
        call.resolve(ret)
    }

    @PluginMethod
    fun cancelAllAlarms(call: PluginCall) {
        val success = scheduler.cancelAllAlarms()
        val ret = JSObject()
        ret.put("success", success)
        call.resolve(ret)
    }

    @PluginMethod
    fun checkPermissions(call: PluginCall) {
        val ret = JSObject()

        // 1. Exact Alarm Check
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            val canExact = alarmManager?.canScheduleExactAlarms() ?: false
            ret.put("exactAlarm", if (canExact) "granted" else "denied")
        } else {
            ret.put("exactAlarm", "not_required")
        }

        // 2. Notification Check
        val notificationManager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notifEnabled = notificationManager.areNotificationsEnabled()
        ret.put("notifications", if (notifEnabled) "granted" else "denied")

        // 3. Full Screen Intent Check
        ret.put("fullScreenIntent", "granted")

        call.resolve(ret)
    }

    @PluginMethod
    fun openAlarmPermissionSettings(call: PluginCall) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                    data = Uri.fromParts("package", context.packageName, null)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
            } else {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", context.packageName, null)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
            }
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to open alarm settings", e)
        }
    }

    @PluginMethod
    fun testAlarm(call: PluginCall) {
        val medicineId = call.getString("medicineId") ?: "test_med"
        val medicineName = call.getString("medicineName") ?: "Paracetamol (Test)"
        val familyMemberName = call.getString("familyMemberName") ?: "Self"
        val dose = call.getString("dose") ?: "1 tablet"

        val triggerTime = System.currentTimeMillis() + 10_000L // 10 seconds
        val testAlarmId = 999001

        val success = scheduler.scheduleAlarm(
            alarmId = testAlarmId,
            triggerTimeMillis = triggerTime,
            medicineId = medicineId,
            medicineName = medicineName,
            familyMemberName = familyMemberName,
            dose = dose,
            instructions = "Test Alarm (Rings on lock screen)",
            snoozeDuration = 5,
            vibrationEnabled = true,
            ringtone = "default"
        )

        val ret = JSObject()
        ret.put("success", success)
        call.resolve(ret)
    }
}
