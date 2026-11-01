import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { generateUUID as uuidv4 } from '../utils/uuid';
import {
  ArrowLeft,
  Camera,
  Bell,
  BellOff,
  Plus,
  Minus,
  TestTube,
  Save,
  ChevronDown,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useAlarm } from '../hooks/useAlarm';
import {
  Medicine,
  MedicineForm,
  FrequencyType,
  InstructionType,
} from '../types';
import { defaultTimesForFrequency } from '../utils/alarmUtils';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';

// ============================================================
// Add / Edit Medicine Form
// ============================================================

const FORMS: { value: MedicineForm; label: string; emoji: string }[] = [
  { value: 'tablet',    label: 'Tablet',   emoji: '💊' },
  { value: 'capsule',   label: 'Capsule',  emoji: '💊' },
  { value: 'syrup',     label: 'Syrup',    emoji: '🧴' },
  { value: 'drops',     label: 'Drops',    emoji: '💧' },
  { value: 'injection', label: 'Injection',emoji: '💉' },
  { value: 'cream',     label: 'Cream',    emoji: '🧴' },
  { value: 'inhaler',   label: 'Inhaler',  emoji: '💨' },
  { value: 'other',     label: 'Other',    emoji: '📦' },
];

const FREQUENCIES: { value: FrequencyType; label: string }[] = [
  { value: 'once_daily',   label: 'Once daily' },
  { value: 'twice_daily',  label: 'Twice daily' },
  { value: 'thrice_daily', label: 'Three times daily' },
  { value: 'four_times',   label: 'Four times daily' },
  { value: 'weekly',       label: 'Weekly' },
  { value: 'as_needed',    label: 'As needed' },
  { value: 'custom',       label: 'Custom' },
];

const INSTRUCTIONS: { value: InstructionType; label: string }[] = [
  { value: 'after_food',    label: 'After food' },
  { value: 'before_food',   label: 'Before food' },
  { value: 'with_water',    label: 'With water' },
  { value: 'empty_stomach', label: 'Empty stomach' },
  { value: 'with_milk',     label: 'With milk' },
  { value: 'other',         label: 'Other (specify)' },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function blankMedicine(familyMemberId: string): Medicine {
  const now = new Date();
  return {
    id: uuidv4(),
    familyMemberId,
    name: '',
    form: 'tablet',
    unit: 'mg',
    dose: 1,
    doseUnit: 'tablet',
    frequency: 'once_daily',
    times: ['08:00'],
    startDate: now.toISOString().split('T')[0],
    alarmEnabled: true,
    vibrationEnabled: true,
    snoozeDuration: 10,
    missedDoseFollowUp: true,
    isActive: true,
    isPaused: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export default function AddMedicine() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id?: string }>();
  const { medicines, familyMembers, currentFamilyMemberId, addMedicine, updateMedicine } =
    useAppStore();
  const { scheduleAlarmForMedicine, cancelMedicineAlarms, testAlarm } = useAlarm();

  const isEdit = Boolean(id);
  const memberId = currentFamilyMemberId ?? familyMembers[0]?.id ?? 'self';
  const prefill = (location.state as any)?.prefill;

  const [med, setMed] = useState<Medicine>(() => {
    if (id) {
      return medicines.find((m) => m.id === id) ?? blankMedicine(memberId);
    }
    const blank = blankMedicine(memberId);
    if (prefill) {
      if (prefill.name) blank.name = prefill.name;
      if (prefill.dose) {
        const num = parseFloat(prefill.dose);
        if (!isNaN(num)) blank.dose = num;
      }
      if (prefill.instructions) {
        if (prefill.instructions.toLowerCase().includes('after')) blank.instruction = 'after_food';
        else if (prefill.instructions.toLowerCase().includes('before')) blank.instruction = 'before_food';
        else if (prefill.instructions.toLowerCase().includes('water')) blank.instruction = 'with_water';
      }
    }
    return blank;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testFired, setTestFired] = useState(false);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Medicine>(key: K, value: Medicine[K]) {
    setMed((prev) => ({ ...prev, [key]: value }));
  }

  function handleFrequencyChange(freq: FrequencyType) {
    set('frequency', freq);
    if (freq !== 'custom' && freq !== 'as_needed' && freq !== 'weekly') {
      set('times', defaultTimesForFrequency(freq));
    }
  }

  function updateTime(index: number, value: string) {
    const times = [...med.times];
    times[index] = value;
    set('times', times);
  }

  function addTime() {
    set('times', [...med.times, '12:00']);
  }

  function removeTime(index: number) {
    set('times', med.times.filter((_, i) => i !== index));
  }

  function toggleWeekday(day: number) {
    const days = med.weekdays ?? [];
    if (days.includes(day)) {
      set('weekdays', days.filter((d) => d !== day));
    } else {
      set('weekdays', [...days, day].sort());
    }
  }

  async function pickImage() {
    try {
      const photo = await CapCamera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
        quality: 80,
      });
      if (photo.webPath) set('imageUri', photo.webPath);
    } catch (e) {
      console.log('Camera cancelled or unavailable');
    }
  }

  async function handleTestAlarm() {
    const ok = await testAlarm(med);
    setTestFired(ok);
    setTimeout(() => setTestFired(false), 3000);
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!med.name.trim()) errs.name = 'Medicine name is required';
    if (med.dose <= 0) errs.dose = 'Dose must be positive';
    if (med.times.length === 0 && med.frequency !== 'as_needed')
      errs.times = 'At least one time is required';
    if (!med.startDate) errs.startDate = 'Start date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);

    const now = new Date().toISOString();
    const saved: Medicine = { ...med, updatedAt: now };

    if (isEdit) {
      await cancelMedicineAlarms(saved.id);
      updateMedicine(saved.id, saved);
    } else {
      addMedicine(saved);
    }

    if (saved.alarmEnabled && saved.isActive && !saved.isPaused) {
      await scheduleAlarmForMedicine(saved);
    }

    setSaving(false);
    navigate(-1);
  }

  return (
    <div className="flex flex-col h-full bg-primary-50 dark:bg-primary-950">
      {/* Header */}
      <div className="bg-white dark:bg-primary-900 px-4 pt-12 pb-4 shadow-sm flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="tap-target p-1">
          <ArrowLeft size={22} className="text-gray-600 dark:text-gray-300" />
        </button>
        <h1 className="text-xl font-black text-gray-900 dark:text-white flex-1">
          {isEdit ? 'Edit Medicine' : 'Add Medicine'}
        </h1>
        {isEdit && (
          <button
            onClick={handleTestAlarm}
            className="flex items-center gap-1.5 bg-primary-50 dark:bg-primary-800 text-primary-600 dark:text-primary-400 px-3 py-1.5 rounded-full text-xs font-bold tap-target"
          >
            <TestTube size={13} />
            {testFired ? 'Alarm in 10s!' : 'Test Alarm'}
          </button>
        )}
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Family member */}
        {familyMembers.length > 1 && (
          <FormSection title="For">
            <select
              value={med.familyMemberId}
              onChange={(e) => set('familyMemberId', e.target.value)}
              className="form-select"
            >
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </FormSection>
        )}

        {/* Medicine photo */}
        <FormSection title="Photo (optional)">
          <div className="flex items-center gap-3">
            {med.imageUri ? (
              <img
                src={med.imageUri}
                alt="medicine"
                className="w-16 h-16 rounded-xl object-cover border border-primary-200"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-100 dark:bg-primary-800 rounded-xl flex items-center justify-center text-2xl">
                💊
              </div>
            )}
            <button
              onClick={pickImage}
              className="flex items-center gap-2 bg-primary-50 dark:bg-primary-800 text-primary-600 dark:text-primary-400 px-4 py-2.5 rounded-xl font-semibold text-sm tap-target"
            >
              <Camera size={16} />
              {med.imageUri ? 'Change Photo' : 'Add Photo'}
            </button>
          </div>
        </FormSection>

        {/* Name */}
        <FormSection title="Medicine Name *" error={errors.name}>
          <input
            type="text"
            placeholder="e.g. Metformin"
            value={med.name}
            onChange={(e) => set('name', e.target.value)}
            className="form-input"
          />
        </FormSection>

        {/* Generic name */}
        <FormSection title="Generic Name (optional)">
          <input
            type="text"
            placeholder="e.g. Metformin HCl"
            value={med.genericName ?? ''}
            onChange={(e) => set('genericName', e.target.value)}
            className="form-input"
          />
        </FormSection>

        {/* Form */}
        <FormSection title="Medicine Form">
          <div className="grid grid-cols-4 gap-2">
            {FORMS.map((f) => (
              <button
                key={f.value}
                onClick={() => set('form', f.value)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 tap-target text-center transition-all ${
                  med.form === f.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-800'
                    : 'border-gray-100 dark:border-primary-800 bg-white dark:bg-primary-900'
                }`}
              >
                <span className="text-xl">{f.emoji}</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{f.label}</span>
              </button>
            ))}
          </div>
        </FormSection>

        {/* Strength + Dose */}
        <div className="grid grid-cols-2 gap-3">
          <FormSection title="Strength">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="500"
                value={med.strength ?? ''}
                onChange={(e) => set('strength', e.target.value)}
                className="form-input flex-1"
              />
              <input
                type="text"
                placeholder="mg"
                value={med.unit}
                onChange={(e) => set('unit', e.target.value)}
                className="form-input w-16"
              />
            </div>
          </FormSection>
          <FormSection title="Dose *" error={errors.dose}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => set('dose', Math.max(0.5, med.dose - 0.5))}
                className="w-9 h-9 bg-gray-100 dark:bg-primary-800 rounded-lg flex items-center justify-center tap-target"
              >
                <Minus size={14} />
              </button>
              <span className="flex-1 text-center font-bold text-gray-900 dark:text-white">
                {med.dose}
              </span>
              <button
                onClick={() => set('dose', med.dose + 0.5)}
                className="w-9 h-9 bg-gray-100 dark:bg-primary-800 rounded-lg flex items-center justify-center tap-target"
              >
                <Plus size={14} />
              </button>
            </div>
            <input
              type="text"
              placeholder="tablet / ml / drops"
              value={med.doseUnit}
              onChange={(e) => set('doseUnit', e.target.value)}
              className="form-input mt-2"
            />
          </FormSection>
        </div>

        {/* Instructions */}
        <FormSection title="Instructions">
          <div className="flex flex-wrap gap-2">
            {INSTRUCTIONS.map((ins) => (
              <button
                key={ins.value}
                onClick={() => set('instruction', ins.value as InstructionType)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border tap-target ${
                  med.instruction === ins.value
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white dark:bg-primary-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-primary-700'
                }`}
              >
                {ins.label}
              </button>
            ))}
          </div>
          {med.instruction === 'other' && (
            <input
              type="text"
              placeholder="Specify instructions..."
              value={med.instructionOther ?? ''}
              onChange={(e) => set('instructionOther', e.target.value)}
              className="form-input mt-2"
            />
          )}
        </FormSection>

        {/* Frequency */}
        <FormSection title="Frequency">
          <select
            value={med.frequency}
            onChange={(e) => handleFrequencyChange(e.target.value as FrequencyType)}
            className="form-select"
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </FormSection>

        {/* Weekday picker (weekly) */}
        {med.frequency === 'weekly' && (
          <FormSection title="Days">
            <div className="flex gap-2">
              {WEEKDAYS.map((d, i) => (
                <button
                  key={d}
                  onClick={() => toggleWeekday(i)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold tap-target ${
                    (med.weekdays ?? []).includes(i)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-primary-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </FormSection>
        )}

        {/* Times */}
        {med.frequency !== 'as_needed' && (
          <FormSection title="Reminder Times *" error={errors.times}>
            <div className="space-y-2">
              {med.times.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={t}
                    onChange={(e) => updateTime(i, e.target.value)}
                    className="form-input flex-1"
                  />
                  {med.times.length > 1 && (
                    <button
                      onClick={() => removeTime(i)}
                      className="w-9 h-9 bg-alarm-50 dark:bg-alarm-900/30 text-alarm-600 dark:text-alarm-400 rounded-lg flex items-center justify-center tap-target"
                    >
                      <Minus size={14} />
                    </button>
                  )}
                </div>
              ))}
              {med.frequency === 'custom' && (
                <button
                  onClick={addTime}
                  className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 font-semibold tap-target"
                >
                  <Plus size={14} /> Add time
                </button>
              )}
            </div>
          </FormSection>
        )}

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <FormSection title="Start Date *" error={errors.startDate}>
            <input
              type="date"
              value={med.startDate}
              onChange={(e) => set('startDate', e.target.value)}
              className="form-input"
            />
          </FormSection>
          <FormSection title="End Date">
            <input
              type="date"
              value={med.endDate ?? ''}
              onChange={(e) => set('endDate', e.target.value || undefined)}
              className="form-input"
            />
            <p className="text-xs text-gray-400 mt-1">Leave blank for ongoing</p>
          </FormSection>
        </div>

        {/* Stock */}
        <FormSection title="Current Stock (optional)">
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="30"
              value={med.currentStock ?? ''}
              onChange={(e) =>
                set('currentStock', e.target.value ? Number(e.target.value) : undefined)
              }
              className="form-input flex-1"
            />
            <input
              type="text"
              placeholder="tablets"
              value={med.stockUnit ?? ''}
              onChange={(e) => set('stockUnit', e.target.value || undefined)}
              className="form-input w-28"
            />
          </div>
        </FormSection>

        {/* Expiry */}
        <FormSection title="Expiry Date (optional)">
          <input
            type="date"
            value={med.expiryDate ?? ''}
            onChange={(e) => set('expiryDate', e.target.value || undefined)}
            className="form-input"
          />
        </FormSection>

        {/* Alarm settings */}
        <FormSection title="Alarm Settings">
          <div className="space-y-3">
            <ToggleRow
              label="Enable Alarm"
              value={med.alarmEnabled}
              onChange={(v) => set('alarmEnabled', v)}
              icon={med.alarmEnabled ? <Bell size={16} /> : <BellOff size={16} />}
            />
            <ToggleRow
              label="Vibration"
              value={med.vibrationEnabled}
              onChange={(v) => set('vibrationEnabled', v)}
            />
            <ToggleRow
              label="Missed dose follow-up"
              value={med.missedDoseFollowUp}
              onChange={(v) => set('missedDoseFollowUp', v)}
            />

            {/* Snooze duration */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300 font-semibold">
                Snooze Duration
              </span>
              <div className="flex gap-2">
                {([5, 10, 15] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => set('snoozeDuration', m)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold tap-target ${
                      med.snoozeDuration === m
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-primary-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            {/* Test alarm button */}
            <button
              onClick={handleTestAlarm}
              className="w-full bg-snooze-50 dark:bg-snooze-900/30 border border-snooze-200 dark:border-snooze-700 text-snooze-700 dark:text-snooze-400 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 tap-target"
            >
              <TestTube size={16} />
              {testFired ? '✓ Alarm scheduled in 10 seconds!' : 'Test Alarm (fires in 10s)'}
            </button>
          </div>
        </FormSection>

        {/* Notes */}
        <FormSection title="Notes (optional)">
          <textarea
            placeholder="Any additional instructions or notes..."
            value={med.notes ?? ''}
            onChange={(e) => set('notes', e.target.value || undefined)}
            rows={3}
            className="form-input resize-none"
          />
        </FormSection>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary-600 active:bg-primary-700 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 tap-target transition-all disabled:opacity-60"
        >
          <Save size={20} />
          {saving ? 'Saving...' : isEdit ? 'Update Medicine' : 'Add Medicine'}
        </button>

        <div className="h-8" />
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function FormSection({
  title,
  children,
  error,
}: {
  title: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="bg-white dark:bg-primary-900 rounded-2xl p-4 shadow-sm">
      <label className="block text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
        {title}
      </label>
      {children}
      {error && <p className="text-alarm-600 text-xs mt-1 font-semibold">{error}</p>}
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700 dark:text-gray-300 font-semibold flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-colors relative tap-target ${
          value ? 'bg-primary-600' : 'bg-gray-200 dark:bg-primary-700'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            value ? 'translate-x-6' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}


