import { registerPlugin } from '@capacitor/core';

// ============================================================
// MediTimeAlarmPlugin – Capacitor bridge to native Kotlin code
// ============================================================

export interface ScheduleAlarmOptions {
  alarmId: number;
  triggerTime: number;       // Unix timestamp in milliseconds
  medicineId: string;
  medicineName: string;
  familyMemberName: string;
  dose: string;              // "2 tablets"
  instructions?: string;
  snoozeDuration: number;    // minutes
  vibrationEnabled: boolean;
  ringtone?: string;
}

export interface ScheduleAlarmResult {
  success: boolean;
  error?: string;
}

export interface PermissionStatus {
  exactAlarm: 'granted' | 'denied' | 'not_required';
  notifications: 'granted' | 'denied' | 'prompt';
  fullScreenIntent: 'granted' | 'denied' | 'not_applicable';
}

export interface ScheduledAlarm {
  alarmId: number;
  triggerTime: number;
  medicineId: string;
}

export interface MediTimeAlarmPlugin {
  scheduleAlarm(options: ScheduleAlarmOptions): Promise<ScheduleAlarmResult>;
  cancelAlarm(options: { alarmId: number }): Promise<{ success: boolean }>;
  cancelAllAlarms(options: Record<string, never>): Promise<{ success: boolean }>;
  cancelMedicineAlarms(options: { medicineId: string }): Promise<{ success: boolean }>;
  checkPermissions(): Promise<PermissionStatus>;
  requestPermissions(): Promise<Omit<PermissionStatus, 'fullScreenIntent'>>;
  openAlarmPermissionSettings(): Promise<void>;
  getScheduledAlarms(): Promise<{ alarms: ScheduledAlarm[] }>;
  testAlarm(options: {
    medicineId: string;
    medicineName: string;
    familyMemberName: string;
    dose: string;
  }): Promise<ScheduleAlarmResult>;
}

const MediTimeAlarm = registerPlugin<MediTimeAlarmPlugin>('MediTimeAlarm', {
  // Web fallback – used in browser / dev mode only
  web: () =>
    import('./MediTimeAlarmWeb').then((m) => new m.MediTimeAlarmWeb()),
});

export { MediTimeAlarm };
