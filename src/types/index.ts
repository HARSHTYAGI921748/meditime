// ============================================================
// MediTime – Full TypeScript Type Definitions
// ============================================================

export type RelationType =
  | 'self'
  | 'mother'
  | 'father'
  | 'grandmother'
  | 'grandfather'
  | 'spouse'
  | 'child'
  | 'sibling'
  | 'other';

export interface FamilyMember {
  id: string;
  name: string;
  relation: RelationType;
  age?: number;
  avatar?: string;
  color: string; // hex colour for avatar background
  createdAt: string; // ISO
}

export type MedicineForm =
  | 'tablet'
  | 'capsule'
  | 'syrup'
  | 'drops'
  | 'injection'
  | 'cream'
  | 'inhaler'
  | 'other';

export type FrequencyType =
  | 'once_daily'
  | 'twice_daily'
  | 'thrice_daily'
  | 'four_times'
  | 'weekly'
  | 'as_needed'
  | 'custom';

export type InstructionType =
  | 'after_food'
  | 'before_food'
  | 'with_water'
  | 'empty_stomach'
  | 'with_milk'
  | 'other';

export interface Medicine {
  id: string;
  familyMemberId: string;
  name: string;
  genericName?: string;
  form: MedicineForm;
  strength?: string;
  unit: string;             // mg / ml / %
  dose: number;
  doseUnit: string;         // tablet / ml / drops
  instruction?: InstructionType;
  instructionOther?: string;
  notes?: string;
  color?: string;           // pill colour (UI display)
  imageUri?: string;

  // Schedule
  frequency: FrequencyType;
  times: string[];          // ["08:00", "20:00"] etc.
  weekdays?: number[];      // 0=Sun … 6=Sat (for weekly freq)
  startDate: string;        // ISO date "YYYY-MM-DD"
  endDate?: string;         // ISO date or undefined = ongoing

  // Stock
  currentStock?: number;
  stockUnit?: string;
  lowStockThreshold?: number;
  expiryDate?: string;      // "YYYY-MM-DD"

  // Alarm
  alarmEnabled: boolean;
  ringtone?: string;
  vibrationEnabled: boolean;
  snoozeDuration: 5 | 10 | 15;
  advanceReminderMinutes?: number;
  missedDoseFollowUp: boolean;

  // Lifecycle
  isActive: boolean;
  isPaused: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DoseStatus = 'pending' | 'taken' | 'skipped' | 'snoozed' | 'missed';

export interface DoseRecord {
  id: string;
  medicineId: string;
  medicineName: string;
  familyMemberId: string;
  scheduledTime: string;  // ISO datetime
  actualTime?: string;    // ISO datetime when user confirmed
  status: DoseStatus;
  dose: number;
  doseUnit: string;
  notes?: string;
  createdAt: string;
}

export interface AlarmPayload {
  alarmId: number;
  medicineId: string;
  medicineName: string;
  familyMemberId: string;
  familyMemberName: string;
  scheduledTime: string;  // ISO datetime
  dose: number;
  doseUnit: string;
  instruction?: string;
  imageUri?: string;
  snoozeDuration: number;
  vibrationEnabled: boolean;
  ringtone?: string;
}

export type AlarmAction = 'taken' | 'skipped' | 'snoozed';

export type SnoozeDuration = 5 | 10 | 15;

export interface AppSettings {
  language: 'en' | 'hi';
  darkMode: boolean;
  privacyMode: boolean;       // hides details on lock screen
  pinEnabled: boolean;
  pin?: string;
  biometricEnabled: boolean;
  defaultSnoozeDuration: SnoozeDuration;
  defaultRingtone: string;
  defaultVibration: boolean;
}

export interface PermissionStatus {
  exactAlarm: 'granted' | 'denied' | 'not_required';
  notifications: 'granted' | 'denied' | 'prompt';
  fullScreenIntent: 'granted' | 'denied' | 'not_applicable';
}

export interface StockStatus {
  label: 'ok' | 'low' | 'critical' | 'expired' | 'unknown';
  daysRemaining?: number;
  message: string;
}

export interface AdherenceStats {
  total: number;
  taken: number;
  skipped: number;
  missed: number;
  pending: number;
  percentage: number;
}
