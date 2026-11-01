import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  FamilyMember,
  Medicine,
  DoseRecord,
  AlarmPayload,
  AppSettings,
} from '../types';

interface AppState {
  // Data
  familyMembers: FamilyMember[];
  medicines: Medicine[];
  doseRecords: DoseRecord[];
  activeAlarm: AlarmPayload | null;
  currentFamilyMemberId: string | null;
  settings: AppSettings;
  initialized: boolean;

  // Family member actions
  setFamilyMembers: (members: FamilyMember[]) => void;
  addFamilyMember: (member: FamilyMember) => void;
  updateFamilyMember: (id: string, updates: Partial<FamilyMember>) => void;
  deleteFamilyMember: (id: string) => void;
  setCurrentFamilyMember: (id: string | null) => void;

  // Medicine actions
  setMedicines: (medicines: Medicine[]) => void;
  addMedicine: (medicine: Medicine) => void;
  updateMedicine: (id: string, updates: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  togglePauseMedicine: (id: string) => void;

  // Dose record actions
  setDoseRecords: (records: DoseRecord[]) => void;
  addDoseRecord: (record: DoseRecord) => void;
  updateDoseRecord: (id: string, updates: Partial<DoseRecord>) => void;

  // Alarm actions
  setActiveAlarm: (payload: AlarmPayload) => void;
  clearActiveAlarm: () => void;

  // Settings
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Init
  setInitialized: (v: boolean) => void;
}

const defaultSettings: AppSettings = {
  language: 'en',
  darkMode: false,
  privacyMode: false,
  pinEnabled: false,
  biometricEnabled: false,
  defaultSnoozeDuration: 10,
  defaultRingtone: 'default',
  defaultVibration: true,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      familyMembers: [],
      medicines: [],
      doseRecords: [],
      activeAlarm: null,
      currentFamilyMemberId: null,
      settings: defaultSettings,
      initialized: false,

      setFamilyMembers: (members) => set({ familyMembers: members }),
      addFamilyMember: (member) =>
        set((s) => ({ familyMembers: [...s.familyMembers, member] })),
      updateFamilyMember: (id, updates) =>
        set((s) => ({
          familyMembers: s.familyMembers.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),
      deleteFamilyMember: (id) =>
        set((s) => ({
          familyMembers: s.familyMembers.filter((m) => m.id !== id),
        })),
      setCurrentFamilyMember: (id) => set({ currentFamilyMemberId: id }),

      setMedicines: (medicines) => set({ medicines }),
      addMedicine: (medicine) =>
        set((s) => ({ medicines: [...s.medicines, medicine] })),
      updateMedicine: (id, updates) =>
        set((s) => ({
          medicines: s.medicines.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),
      deleteMedicine: (id) =>
        set((s) => ({ medicines: s.medicines.filter((m) => m.id !== id) })),
      togglePauseMedicine: (id) =>
        set((s) => ({
          medicines: s.medicines.map((m) =>
            m.id === id ? { ...m, isPaused: !m.isPaused } : m
          ),
        })),

      setDoseRecords: (records) => set({ doseRecords: records }),
      addDoseRecord: (record) =>
        set((s) => ({ doseRecords: [...s.doseRecords, record] })),
      updateDoseRecord: (id, updates) =>
        set((s) => ({
          doseRecords: s.doseRecords.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),

      setActiveAlarm: (payload) => set({ activeAlarm: payload }),
      clearActiveAlarm: () => set({ activeAlarm: null }),

      updateSettings: (updates) =>
        set((s) => ({ settings: { ...s.settings, ...updates } })),

      setInitialized: (v) => set({ initialized: v }),
    }),
    {
      name: 'meditime-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        familyMembers: s.familyMembers,
        medicines: s.medicines,
        doseRecords: s.doseRecords,
        settings: s.settings,
        currentFamilyMemberId: s.currentFamilyMemberId,
      }),
    }
  )
);
