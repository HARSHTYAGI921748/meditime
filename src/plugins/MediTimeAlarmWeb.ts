import { WebPlugin } from '@capacitor/core';
import type {
  MediTimeAlarmPlugin,
  ScheduleAlarmOptions,
  ScheduleAlarmResult,
  PermissionStatus,
  ScheduledAlarm,
} from './MediTimeAlarmPlugin';

// ============================================================
// Web Fallback Implementation
// ⚠️  This is NOT a real alarm engine.
//    It uses browser Notification API as a development preview.
//    Real alarms require the Android native build.
// ============================================================

const WEB_ALARM_STORE_KEY = 'meditime_web_alarms';

function loadWebAlarms(): Map<number, ReturnType<typeof setTimeout>> {
  return new Map();
}

const activeTimers: Map<number, ReturnType<typeof setTimeout>> = loadWebAlarms();

export class MediTimeAlarmWeb extends WebPlugin implements MediTimeAlarmPlugin {
  async scheduleAlarm(options: ScheduleAlarmOptions): Promise<ScheduleAlarmResult> {
    console.warn(
      '[MediTimeAlarm WEB] scheduleAlarm called – using browser setTimeout. ' +
        'This is a development preview only. Real alarms need the Android build.'
    );

    const delay = options.triggerTime - Date.now();
    if (delay < 0) {
      return { success: false, error: 'Trigger time is in the past' };
    }

    // Cancel existing timer for this alarmId
    if (activeTimers.has(options.alarmId)) {
      clearTimeout(activeTimers.get(options.alarmId)!);
    }

    const timer = setTimeout(async () => {
      // Try browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`⏰ Medicine Time – ${options.medicineName}`, {
          body: `${options.familyMemberName}: Take ${options.dose}${options.instructions ? '\n' + options.instructions : ''}`,
          icon: '/vite.svg',
          tag: `meditime-alarm-${options.alarmId}`,
        });
      } else {
        alert(
          `⏰ MEDICINE TIME\n\n${options.familyMemberName}: ${options.medicineName}\nDose: ${options.dose}`
        );
      }

      // Dispatch a custom DOM event so the React app can show AlarmScreen
      window.dispatchEvent(
        new CustomEvent('meditime:alarm', {
          detail: {
            alarmId: options.alarmId,
            medicineId: options.medicineId,
            medicineName: options.medicineName,
            familyMemberName: options.familyMemberName,
            dose: options.dose,
            instructions: options.instructions,
            snoozeDuration: options.snoozeDuration,
          },
        })
      );
    }, delay);

    activeTimers.set(options.alarmId, timer);
    return { success: true };
  }

  async cancelAlarm(options: { alarmId: number }): Promise<{ success: boolean }> {
    if (activeTimers.has(options.alarmId)) {
      clearTimeout(activeTimers.get(options.alarmId)!);
      activeTimers.delete(options.alarmId);
    }
    return { success: true };
  }

  async cancelAllAlarms(_options: Record<string, never>): Promise<{ success: boolean }> {
    activeTimers.forEach((timer) => clearTimeout(timer));
    activeTimers.clear();
    return { success: true };
  }

  async cancelMedicineAlarms(_options: { medicineId: string }): Promise<{ success: boolean }> {
    // Web fallback – can't filter by medicineId without extra bookkeeping
    return { success: true };
  }

  async checkPermissions(): Promise<PermissionStatus> {
    const notifPerm = 'Notification' in window ? Notification.permission : 'denied';
    return {
      exactAlarm: 'not_required', // no concept on web
      notifications:
        notifPerm === 'granted'
          ? 'granted'
          : notifPerm === 'default'
          ? 'prompt'
          : 'denied',
      fullScreenIntent: 'not_applicable',
    };
  }

  async requestPermissions(): Promise<Omit<PermissionStatus, 'fullScreenIntent'>> {
    let notifStatus: 'granted' | 'denied' | 'prompt' = 'denied';
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      notifStatus = result === 'granted' ? 'granted' : result === 'default' ? 'prompt' : 'denied';
    }
    return {
      exactAlarm: 'not_required',
      notifications: notifStatus,
    };
  }

  async openAlarmPermissionSettings(): Promise<void> {
    console.info('[MediTimeAlarm WEB] openAlarmPermissionSettings: no-op on web');
  }

  async getScheduledAlarms(): Promise<{ alarms: ScheduledAlarm[] }> {
    return { alarms: [] };
  }

  async testAlarm(options: {
    medicineId: string;
    medicineName: string;
    familyMemberName: string;
    dose: string;
  }): Promise<ScheduleAlarmResult> {
    return this.scheduleAlarm({
      alarmId: Math.floor(Math.random() * 99999),
      triggerTime: Date.now() + 10_000,
      ...options,
      snoozeDuration: 10,
      vibrationEnabled: true,
    });
  }
}
