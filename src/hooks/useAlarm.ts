import { useCallback, useEffect, useRef } from 'react';
import {
  addMinutes,
  format,
  isAfter,
  isBefore,
  parseISO,
} from 'date-fns';
import { generateUUID as uuidv4 } from '../utils/uuid';
import { MediTimeAlarm } from '../plugins/MediTimeAlarmPlugin';
import { useAppStore } from '../store/appStore';
import {
  computeAlarmId,
  getAllAlarmTimesForDay,
  getNextAlarmTime,
  instructionLabel,
} from '../utils/alarmUtils';
import { deductDose } from '../utils/stockUtils';
import { AlarmAction, AlarmPayload, Medicine, FamilyMember } from '../types';

// ============================================================
// useAlarm – hook for all alarm scheduling logic
// ============================================================

export function useAlarm() {
  const {
    medicines,
    familyMembers,
    addDoseRecord,
    updateDoseRecord,
    doseRecords,
    updateMedicine,
    clearActiveAlarm,
  } = useAppStore();

  const memberMap = useRef<Record<string, FamilyMember>>({});
  useEffect(() => {
    memberMap.current = Object.fromEntries(familyMembers.map((m) => [m.id, m]));
  }, [familyMembers]);

  // ----------------------------------------------------------
  // Schedule a single alarm for a medicine at a specific time
  // ----------------------------------------------------------
  const scheduleOneAlarm = useCallback(
    async (medicine: Medicine, triggerTime: Date): Promise<boolean> => {
      const member = memberMap.current[medicine.familyMemberId];
      if (!member) return false;

      const alarmId = computeAlarmId(medicine.id, format(triggerTime, 'yyyy-MM-dd_HH:mm'));
      const doseStr = `${medicine.dose} ${medicine.doseUnit}`;

      try {
        const result = await MediTimeAlarm.scheduleAlarm({
          alarmId,
          triggerTime: triggerTime.getTime(),
          medicineId: medicine.id,
          medicineName: medicine.name,
          familyMemberName: member.name,
          dose: doseStr,
          instructions: instructionLabel(medicine.instruction, medicine.instructionOther),
          snoozeDuration: medicine.snoozeDuration,
          vibrationEnabled: medicine.vibrationEnabled,
          ringtone: medicine.ringtone,
        });

        if (!result.success) {
          console.error('[useAlarm] scheduleAlarm failed:', result.error);
        }
        return result.success;
      } catch (e) {
        console.error('[useAlarm] scheduleAlarm error:', e);
        return false;
      }
    },
    []
  );

  // ----------------------------------------------------------
  // Schedule all upcoming alarms for a single medicine
  // ----------------------------------------------------------
  const scheduleAlarmForMedicine = useCallback(
    async (medicine: Medicine) => {
      if (!medicine.isActive || medicine.isPaused || !medicine.alarmEnabled) return;

      const now = new Date();
      // Schedule next 7 days worth of alarms
      for (let d = 0; d < 7; d++) {
        const day = new Date(now);
        day.setDate(day.getDate() + d);
        const times = getAllAlarmTimesForDay(medicine, day);
        for (const t of times) {
          if (isAfter(t, now)) {
            await scheduleOneAlarm(medicine, t);
          }
        }
      }
    },
    [scheduleOneAlarm]
  );

  // ----------------------------------------------------------
  // Schedule all medicines for all family members
  // ----------------------------------------------------------
  const scheduleAllAlarms = useCallback(async () => {
    for (const med of medicines) {
      await scheduleAlarmForMedicine(med);
    }
  }, [medicines, scheduleAlarmForMedicine]);

  // ----------------------------------------------------------
  // Cancel all alarms for a medicine
  // ----------------------------------------------------------
  const cancelMedicineAlarms = useCallback(async (medicineId: string) => {
    try {
      await MediTimeAlarm.cancelMedicineAlarms({ medicineId });
    } catch (e) {
      console.error('[useAlarm] cancelMedicineAlarms error:', e);
    }
  }, []);

  // ----------------------------------------------------------
  // Test alarm – fires 10 seconds from now
  // ----------------------------------------------------------
  const testAlarm = useCallback(
    async (medicine: Medicine): Promise<boolean> => {
      const member = memberMap.current[medicine.familyMemberId];
      if (!member) return false;
      try {
        const result = await MediTimeAlarm.testAlarm({
          medicineId: medicine.id,
          medicineName: medicine.name,
          familyMemberName: member.name,
          dose: `${medicine.dose} ${medicine.doseUnit}`,
        });
        return result.success;
      } catch (e) {
        console.error('[useAlarm] testAlarm error:', e);
        return false;
      }
    },
    []
  );

  // ----------------------------------------------------------
  // Handle alarm action: taken / skipped / snoozed
  // ----------------------------------------------------------
  const handleAlarmAction = useCallback(
    async (
      payload: AlarmPayload,
      action: AlarmAction,
      snoozeMins?: number
    ) => {
      const now = new Date().toISOString();
      const medicine = medicines.find((m) => m.id === payload.medicineId);

      // Check if a pending dose record already exists for this scheduled time
      const existingRecord = doseRecords.find(
        (r) =>
          r.medicineId === payload.medicineId &&
          r.scheduledTime === payload.scheduledTime &&
          r.status === 'pending'
      );

      if (action === 'taken') {
        const recordId = existingRecord?.id ?? uuidv4();
        if (existingRecord) {
          updateDoseRecord(recordId, {
            status: 'taken',
            actualTime: now,
          });
        } else {
          addDoseRecord({
            id: recordId,
            medicineId: payload.medicineId,
            medicineName: payload.medicineName,
            familyMemberId: payload.familyMemberId,
            scheduledTime: payload.scheduledTime,
            actualTime: now,
            status: 'taken',
            dose: payload.dose,
            doseUnit: payload.doseUnit,
            createdAt: now,
          });
        }

        // Deduct stock if tracked
        if (medicine && medicine.currentStock != null) {
          const newStock = deductDose(medicine);
          if (newStock != null) {
            updateMedicine(medicine.id, { currentStock: newStock });
          }
        }

        // Schedule next alarm for this medicine
        if (medicine) {
          const nextTime = getNextAlarmTime(medicine, new Date(payload.scheduledTime));
          if (nextTime) {
            await scheduleOneAlarm(medicine, nextTime);
          }
        }
      } else if (action === 'skipped') {
        const recordId = existingRecord?.id ?? uuidv4();
        if (existingRecord) {
          updateDoseRecord(recordId, { status: 'skipped', actualTime: now });
        } else {
          addDoseRecord({
            id: recordId,
            medicineId: payload.medicineId,
            medicineName: payload.medicineName,
            familyMemberId: payload.familyMemberId,
            scheduledTime: payload.scheduledTime,
            actualTime: now,
            status: 'skipped',
            dose: payload.dose,
            doseUnit: payload.doseUnit,
            createdAt: now,
          });
        }

        // Schedule next alarm
        if (medicine) {
          const nextTime = getNextAlarmTime(medicine, new Date(payload.scheduledTime));
          if (nextTime) {
            await scheduleOneAlarm(medicine, nextTime);
          }
        }
      } else if (action === 'snoozed') {
        const mins = snoozeMins ?? payload.snoozeDuration ?? 10;
        const snoozeTime = addMinutes(new Date(), mins);

        // Update / create dose record as snoozed
        if (existingRecord) {
          updateDoseRecord(existingRecord.id, { status: 'snoozed' });
        } else {
          addDoseRecord({
            id: uuidv4(),
            medicineId: payload.medicineId,
            medicineName: payload.medicineName,
            familyMemberId: payload.familyMemberId,
            scheduledTime: payload.scheduledTime,
            status: 'snoozed',
            dose: payload.dose,
            doseUnit: payload.doseUnit,
            createdAt: now,
          });
        }

        // Schedule snooze alarm
        if (medicine) {
          await scheduleOneAlarm(medicine, snoozeTime);
        }
      }

      clearActiveAlarm();
    },
    [
      medicines,
      doseRecords,
      addDoseRecord,
      updateDoseRecord,
      updateMedicine,
      scheduleOneAlarm,
      clearActiveAlarm,
    ]
  );

  return {
    scheduleAlarmForMedicine,
    scheduleAllAlarms,
    cancelMedicineAlarms,
    testAlarm,
    handleAlarmAction,
  };
}
