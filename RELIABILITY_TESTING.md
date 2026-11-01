# MediTime: Android Alarm Reliability & Edge-Case Testing Guide

MediTime is built for personal and family healthcare where alarm reliability is critical. Because Android aggressively optimizes power consumption via Doze Mode, App Standby, and manufacturer OEM battery managers, this guide provides complete test procedures across all 15 required Android operating states.

---

## 1. Matrix of Tested Android States

| # | Test Scenario | Android Mechanism / API Used | Expected Behavior | Verification Steps |
|---|---|---|---|---|
| **1** | **Phone Unlocked** | `AlarmManager.setAlarmClock()` -> `AlarmReceiver` -> `AlarmActivity` | Heads-up notification appears + audio rings + user can tap Taken/Snooze/Skip. | Schedule alarm 1 min ahead. Use phone normally. Verify prompt appears immediately. |
| **2** | **Phone Locked** | `setShowWhenLocked(true)`, `setTurnScreenOn(true)` | Display wakes up showing dedicated MediTime lock-screen alarm over keyguard. | Lock phone. Wait for alarm time. Display turns on automatically showing full screen. |
| **3** | **Screen Off (Doze Mode)** | `RTC_WAKEUP` + `PARTIAL_WAKE_LOCK` | Device wakes from deep Doze state exactly at scheduled minute. | Force Doze: `adb shell dumpsys deviceidle force-idle`. Trigger alarm. Device must ring. |
| **4** | **App in Background** | `BroadcastReceiver` + Foreground `AlarmService` | Background execution limits bypassed because AlarmManager delivers broadcast. | Minimize app to home screen. Verify alarm rings and notification displays. |
| **5** | **App Force Closed / Killed** | Registered in system `AlarmManager` | Android OS maintains alarms in system server; triggers even if process was killed. | Swipe app away from Recent Apps. Wait for alarm. Alarm triggers successfully. |
| **6** | **No Internet / Airplane Mode** | 100% Local SQLite & AlarmManager | Zero external API calls required. Alarms fire fully offline. | Enable Airplane mode. Schedule test alarm for 10s. Verify loud ring & vibration. |
| **7** | **Device Restarted / Reboot** | `RECEIVE_BOOT_COMPLETED` -> `BootReceiver` | `BootReceiver` runs on boot, reads saved alarms from storage, and reschedules them. | Schedule alarm for +1 hour. Reboot phone (`adb reboot`). Check scheduled alarms in logcat. |
| **8** | **Battery Saver Enabled** | `setAlarmClock()` exemption | `setAlarmClock()` is explicitly exempted from Android standard battery saver restrictions. | Turn on Android Battery Saver. Wait for alarm. Verifies on-time delivery. |
| **9** | **Exact Alarm Permission Denied** | `PermissionGuard.tsx` + Settings redirect | User is shown an explanation screen with a one-tap deep link to system settings. | Revoke permission in Settings -> Apps -> Special App Access -> Alarms & Reminders. |
| **10** | **Notification Permission Denied** | `POST_NOTIFICATIONS` check | Permission banner displayed warning user that visual heads-up alerts require approval. | Deny POST_NOTIFICATIONS on Android 13+. MediTime requests permission on startup. |
| **11** | **Full-Screen Intent Unavailable** | Standard High-Priority Notification fallback | Notification with sound, vibration, and large action buttons appears in status bar. | Open notification drawer, tap TAKEN or SNOOZE directly from notification. |
| **12** | **Multiple Alarms at Same Time** | Unique 32-bit Integer Alarm IDs | Separate `PendingIntent` for each medicine; both broadcast receivers fire concurrently. | Schedule two different medicines for 08:00 AM. Both alarms ring and display. |
| **13** | **Timezone / Clock Changed** | `ACTION_TIME_CHANGED`, `ACTION_TIMEZONE_CHANGED` | `BootReceiver` catches time adjustments and recalculates future alarm timestamps. | Manually change device time or travel across timezones. Future alarms re-align. |
| **14** | **Schedule Edited or Deleted** | `cancelAlarm(alarmId)` | Previous `PendingIntent` is cancelled in `AlarmManager` before new schedule is saved. | Edit 08:00 AM medicine to 09:00 AM. Verify 08:00 AM does NOT ring; 09:00 AM rings. |
| **15** | **Silent / Do Not Disturb Mode** | `AudioAttributes.USAGE_ALARM` | Respects user's system alarm volume. If alarm volume is on, it rings according to OS rules. | Put phone in Silent mode. Check that system Alarm volume slider controls loudness. |

---

## 2. Key Android Operating System Limitations & Mitigations

### A. Aggressive OEM Battery Killers (Xiaomi, Samsung, Huawei, OnePlus)
* **Limitation:** Certain vendor Android skins (MIUI, OneUI, EMUI) terminate background broadcast receivers or delay alarms if the app is not battery-whitelisted.
* **Mitigation:** In MediTime's Settings, prompt users on affected devices to:
  1. Set **Battery** to *"Unrestricted"* or *"No restrictions"*.
  2. Enable **Autostart** (on Xiaomi/MIUI devices).

### B. Device Powered Off
* **Limitation:** No standard Android smartphone can wake up from a total power-off state to ring an app alarm unless the device hardware supports RTC auto-power-on.
* **Notice:** MediTime explicitly states to the user that the phone must remain powered on (even in standby/screen-off mode).

### C. Android 14+ Full-Screen Intent Changes
* **Limitation:** In Android 14 (API 34), `USE_FULL_SCREEN_INTENT` may require manual user authorization if not pre-granted for non-calling apps.
* **Mitigation:** MediTime couples full-screen intents with persistent high-priority notifications containing action buttons (`TAKEN`, `SNOOZE`), ensuring the user never misses a reminder.
