import {
  addDays,
  addMinutes,
  format,
  isAfter,
  isBefore,
  parseISO,
  setHours,
  setMinutes,
  setSeconds,
  startOfDay,
} from 'date-fns';
import { Medicine } from '../types';

// ============================================================
// Alarm utility functions
// ============================================================

/**
 * Convert "HH:MM" string + base date into a full Date object.
 */
export function timeStringToDate(timeStr: string, baseDate: Date = new Date()): Date {
  const [hh, mm] = timeStr.split(':').map(Number);
  return setSeconds(setMinutes(setHours(new Date(baseDate), hh), mm), 0);
}

/**
 * Returns a deterministic integer alarm ID from medicine ID + time string.
 * Fits in a 32-bit signed integer so AlarmManager accepts it.
 */
export function computeAlarmId(medicineId: string, timeStr: string): number {
  const raw = medicineId + '_' + timeStr;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (Math.imul(31, hash) + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2_147_483_647;
}

/**
 * Returns all scheduled alarm Date objects for a given medicine on a given day.
 * Returns [] if medicine is inactive, paused, or outside date range.
 */
export function getAllAlarmTimesForDay(medicine: Medicine, day: Date): Date[] {
  if (!medicine.isActive || medicine.isPaused || !medicine.alarmEnabled) return [];

  const dayStart = startOfDay(day);
  const medicineStart = startOfDay(parseISO(medicine.startDate));
  if (isBefore(dayStart, medicineStart)) return [];
  if (medicine.endDate) {
    const medicineEnd = startOfDay(parseISO(medicine.endDate));
    if (isAfter(dayStart, medicineEnd)) return [];
  }

  // Weekly: check weekday
  if (medicine.frequency === 'weekly' && medicine.weekdays) {
    if (!medicine.weekdays.includes(day.getDay())) return [];
  }

  // as_needed has no scheduled alarms
  if (medicine.frequency === 'as_needed') return [];

  return medicine.times.map((t) => timeStringToDate(t, day));
}

/**
 * Returns the very next alarm Date for a medicine (after `from`).
 * Returns null if no future alarm exists.
 */
export function getNextAlarmTime(
  medicine: Medicine,
  from: Date = new Date()
): Date | null {
  if (!medicine.isActive || medicine.isPaused || !medicine.alarmEnabled) return null;

  // Search up to 8 days ahead
  for (let d = 0; d < 8; d++) {
    const day = addDays(startOfDay(from), d);
    const times = getAllAlarmTimesForDay(medicine, day);
    for (const t of times) {
      if (isAfter(t, from)) return t;
    }
  }
  return null;
}

/**
 * Human-readable schedule description, e.g. "Twice daily – 08:00, 20:00"
 */
export function formatScheduleDescription(medicine: Medicine): string {
  const freqMap: Record<string, string> = {
    once_daily: 'Once daily',
    twice_daily: 'Twice daily',
    thrice_daily: 'Three times daily',
    four_times: 'Four times daily',
    weekly: 'Weekly',
    as_needed: 'As needed',
    custom: 'Custom',
  };
  const freq = freqMap[medicine.frequency] ?? medicine.frequency;
  if (medicine.times.length === 0) return freq;
  const timeList = medicine.times
    .map((t) => {
      const [hh, mm] = t.split(':').map(Number);
      const d = new Date();
      d.setHours(hh, mm, 0, 0);
      return format(d, 'h:mm a');
    })
    .join(', ');
  return `${freq} – ${timeList}`;
}

/**
 * Returns true if the medicine has an alarm due within the next `withinMinutes`.
 */
export function isAlarmDueSoon(
  medicine: Medicine,
  withinMinutes = 60,
  from: Date = new Date()
): boolean {
  const next = getNextAlarmTime(medicine, from);
  if (!next) return false;
  return isBefore(next, addMinutes(from, withinMinutes));
}

/**
 * Default alarm times for a given frequency.
 */
export function defaultTimesForFrequency(frequency: string): string[] {
  switch (frequency) {
    case 'once_daily':   return ['08:00'];
    case 'twice_daily':  return ['08:00', '20:00'];
    case 'thrice_daily': return ['08:00', '14:00', '20:00'];
    case 'four_times':   return ['07:00', '12:00', '17:00', '22:00'];
    case 'weekly':       return ['08:00'];
    default:             return ['08:00'];
  }
}

/**
 * Convert medicine instruction enum to human-readable text.
 */
export function instructionLabel(instr?: string, other?: string): string {
  if (!instr) return '';
  const map: Record<string, string> = {
    after_food:    'After food',
    before_food:   'Before food',
    with_water:    'With water',
    empty_stomach: 'Empty stomach',
    with_milk:     'With milk',
    other:         other ?? 'Special instructions',
  };
  return map[instr] ?? instr;
}
