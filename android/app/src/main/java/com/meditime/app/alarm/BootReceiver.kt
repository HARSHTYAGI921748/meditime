package com.meditime.app.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Boot Receiver to restore and reschedule all native medicine alarms after:
 * - Device reboot (BOOT_COMPLETED)
 * - App update (MY_PACKAGE_REPLACED)
 * - Clock / Timezone change (TIME_SET, TIMEZONE_CHANGED)
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "MediTimeBootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        Log.i(TAG, "Device state changed: $action. Restoring medicine alarms...")

        if (action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED ||
            action == Intent.ACTION_TIME_CHANGED ||
            action == Intent.ACTION_TIMEZONE_CHANGED
        ) {
            try {
                val scheduler = AlarmScheduler(context)
                scheduler.rescheduleAllSavedAlarms()
                Log.i(TAG, "All alarms successfully restored after $action")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to restore alarms after reboot", e)
            }
        }
    }
}
