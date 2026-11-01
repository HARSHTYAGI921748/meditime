package com.meditime.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.meditime.app.plugin.MediTimeAlarmPlugin

/**
 * Main Activity for MediTime.
 * Integrates Capacitor WebView with the native Kotlin Alarm Plugin.
 */
class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        // Register native Android Alarm plugin before bridge initialization
        registerPlugin(MediTimeAlarmPlugin::class.java)
        super.onCreate(savedInstanceState)
    }

    override fun onResume() {
        super.onResume()
        // Check for incoming intent actions from lock-screen AlarmActivity
        val action = intent?.getStringExtra("alarm_action")
        val medicineId = intent?.getStringExtra("medicine_id")
        if (action != null && medicineId != null) {
            // Forward event into Capacitor JavaScript layer
            val js = "window.dispatchEvent(new CustomEvent('meditime:native_action', { detail: { action: '$action', medicineId: '$medicineId' } }));"
            bridge?.webView?.evaluateJavascript(js, null)
            intent?.removeExtra("alarm_action")
        }
    }
}
