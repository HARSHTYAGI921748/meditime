import { useMemo } from 'react';
import { format, isToday, startOfDay, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { Bell, ChevronRight, PillIcon, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { getAllAlarmTimesForDay } from '../utils/alarmUtils';
import MedicineCard from '../components/MedicineCard';
import FamilySelector from '../components/FamilySelector';
import { DoseRecord, DoseStatus } from '../types';
import { getStockStatus } from '../utils/stockUtils';

// ============================================================
// Home Page
// ============================================================

export default function Home() {
  const navigate = useNavigate();
  const { medicines, doseRecords, familyMembers, currentFamilyMemberId } = useAppStore();

  const today = new Date();
  const currentMemberId = currentFamilyMemberId ?? familyMembers[0]?.id;

  // Filter medicines for current member
  const myMedicines = useMemo(
    () => medicines.filter((m) => m.familyMemberId === currentMemberId && m.isActive),
    [medicines, currentMemberId]
  );

  // Build today's dose schedule
  const todaySchedule = useMemo(() => {
    const schedule: Array<{
      medicineId: string;
      medicineName: string;
      scheduledTime: Date;
      record?: DoseRecord;
    }> = [];

    for (const med of myMedicines) {
      const times = getAllAlarmTimesForDay(med, today);
      for (const t of times) {
        const isoTime = t.toISOString();
        const record = doseRecords.find(
          (r) =>
            r.medicineId === med.id &&
            Math.abs(new Date(r.scheduledTime).getTime() - t.getTime()) < 60_000 * 5
        );
        schedule.push({
          medicineId: med.id,
          medicineName: med.name,
          scheduledTime: t,
          record,
        });
      }
    }

    return schedule.sort(
      (a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime()
    );
  }, [myMedicines, doseRecords, today]);

  // Stats
  const stats = useMemo(() => {
    const total = todaySchedule.length;
    const taken = todaySchedule.filter((s) => s.record?.status === 'taken').length;
    const skipped = todaySchedule.filter((s) => s.record?.status === 'skipped').length;
    const missed = todaySchedule.filter((s) => {
      if (s.record) return s.record.status === 'missed';
      return isBefore(s.scheduledTime, today) && !s.record;
    }).length;
    const adherence = total > 0 ? Math.round((taken / total) * 100) : 0;
    return { total, taken, skipped, missed, adherence };
  }, [todaySchedule, today]);

  // Next upcoming dose
  const nextDose = useMemo(
    () => todaySchedule.find((s) => !s.record && isAfter(s.scheduledTime, today)),
    [todaySchedule, today]
  );

  const currentMember = familyMembers.find((m) => m.id === currentMemberId);

  return (
    <div className="flex flex-col h-full bg-primary-50 dark:bg-primary-950">
      {/* ── Header ── */}
      <div className="bg-white dark:bg-primary-900 px-5 pt-12 pb-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold tracking-widest uppercase">
              {format(today, 'EEEE, d MMMM')}
            </p>
            <h1 className="text-2xl font-black text-primary-700 dark:text-primary-300 leading-tight">
              MediTime
            </h1>
          </div>
          <FamilySelector />
        </div>

        {/* Next alarm banner */}
        {nextDose && (
          <div className="bg-primary-600 rounded-2xl px-4 py-3 flex items-center gap-3">
            <Bell size={20} className="text-white" />
            <div className="flex-1">
              <p className="text-white/80 text-xs font-semibold">Next alarm</p>
              <p className="text-white font-black">
                {nextDose.medicineName} · {format(nextDose.scheduledTime, 'h:mm a')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Today" value={stats.total} color="primary" />
          <StatCard label="Taken" value={stats.taken} color="mint" />
          <StatCard label="Missed" value={stats.missed} color="alarm" />
        </div>

        {/* Adherence bar */}
        {stats.total > 0 && (
          <div className="bg-white dark:bg-primary-900 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <TrendingUp size={14} className="text-primary-500" />
                Today's Adherence
              </span>
              <span className="text-lg font-black text-primary-600 dark:text-primary-400">
                {stats.adherence}%
              </span>
            </div>
            <div className="h-3 bg-gray-100 dark:bg-primary-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-mint-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.adherence}%` }}
              />
            </div>
          </div>
        )}

        {/* Today's schedule */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
              Today's Schedule
            </h2>
            <button
              onClick={() => navigate('/history')}
              className="text-xs text-primary-600 dark:text-primary-400 font-semibold flex items-center gap-0.5 tap-target"
            >
              History <ChevronRight size={14} />
            </button>
          </div>

          {todaySchedule.length === 0 ? (
            <EmptyToday onAdd={() => navigate('/add-medicine')} />
          ) : (
            <div className="space-y-2.5">
              {todaySchedule.map((item, i) => {
                const med = myMedicines.find((m) => m.id === item.medicineId);
                if (!med) return null;
                let status: DoseStatus = 'pending';
                if (item.record?.status) {
                  status = item.record.status;
                } else if (isBefore(item.scheduledTime, today)) {
                  status = 'missed';
                }
                return (
                  <MedicineCard
                    key={`${item.medicineId}-${i}`}
                    medicine={med}
                    variant="home"
                    doseStatus={status}
                    scheduledTime={item.scheduledTime.toISOString()}
                    onTap={() => navigate(`/add-medicine/${med.id}`)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Low stock warnings */}
        {myMedicines.filter((m) => {
          const s = getStockStatus(m);
          return s.label === 'low' || s.label === 'critical';
        }).length > 0 && (
          <div className="bg-alarm-50 dark:bg-alarm-950/50 border border-alarm-200 dark:border-alarm-800 rounded-2xl p-4">
            <p className="font-bold text-alarm-700 dark:text-alarm-400 text-sm mb-1">
              ⚠️ Low Stock Alert
            </p>
            {myMedicines
              .filter((m) => {
                const s = getStockStatus(m);
                return s.label === 'low' || s.label === 'critical';
              })
              .map((m) => (
                <p key={m.id} className="text-alarm-600 dark:text-alarm-300 text-xs">
                  {m.name} – {m.currentStock} {m.stockUnit ?? m.doseUnit} remaining
                </p>
              ))}
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'primary' | 'mint' | 'alarm';
}) {
  const colorClass =
    color === 'primary'
      ? 'bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
      : color === 'mint'
      ? 'bg-mint-50 dark:bg-mint-900/30 text-mint-700 dark:text-mint-400'
      : 'bg-alarm-50 dark:bg-alarm-900/30 text-alarm-700 dark:text-alarm-400';

  return (
    <div className={`${colorClass} rounded-2xl p-3 text-center`}>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-semibold opacity-70 mt-0.5">{label}</p>
    </div>
  );
}

function EmptyToday({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <PillIcon size={48} className="text-primary-200 dark:text-primary-700 mb-4" />
      <p className="font-bold text-gray-500 dark:text-gray-400 text-base">
        No medicines scheduled today
      </p>
      <p className="text-sm text-gray-400 dark:text-gray-600 mt-1 mb-5">
        Add your first medicine to get started
      </p>
      <button
        onClick={onAdd}
        className="bg-primary-600 text-white px-6 py-3 rounded-full font-bold tap-target"
      >
        + Add Medicine
      </button>
    </div>
  );
}
