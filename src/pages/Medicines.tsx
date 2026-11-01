import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useAlarm } from '../hooks/useAlarm';
import MedicineCard from '../components/MedicineCard';

// ============================================================
// Medicines Page
// ============================================================

export default function Medicines() {
  const navigate = useNavigate();
  const { medicines, familyMembers, currentFamilyMemberId, deleteMedicine, togglePauseMedicine } =
    useAppStore();
  const { cancelMedicineAlarms } = useAlarm();

  const [searchQ, setSearchQ] = useState('');
  const [filterMember, setFilterMember] = useState<string>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return medicines
      .filter((m) => {
        const matchSearch =
          searchQ.trim() === '' ||
          m.name.toLowerCase().includes(searchQ.toLowerCase()) ||
          (m.genericName ?? '').toLowerCase().includes(searchQ.toLowerCase());
        const matchMember =
          filterMember === 'all' || m.familyMemberId === filterMember;
        return matchSearch && matchMember;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [medicines, searchQ, filterMember]);

  async function handleDelete(id: string) {
    await cancelMedicineAlarms(id);
    deleteMedicine(id);
    setConfirmDelete(null);
  }

  return (
    <div className="flex flex-col h-full bg-primary-50 dark:bg-primary-950">
      {/* Header */}
      <div className="bg-white dark:bg-primary-900 px-4 pt-12 pb-4 shadow-sm">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-4">My Medicines</h1>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search medicines..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-primary-800 border border-gray-200 dark:border-primary-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-400 text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>

        {/* Family member filter chips */}
        {familyMembers.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            <FilterChip
              label="All"
              active={filterMember === 'all'}
              onClick={() => setFilterMember('all')}
            />
            {familyMembers.map((m) => (
              <FilterChip
                key={m.id}
                label={m.name}
                active={filterMember === m.id}
                onClick={() => setFilterMember(m.id)}
                color={m.color}
              />
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <p className="text-4xl mb-4">💊</p>
            <p className="font-bold text-gray-500 dark:text-gray-400 text-base">
              {searchQ ? 'No medicines found' : 'No medicines yet'}
            </p>
            {!searchQ && (
              <>
                <p className="text-sm text-gray-400 mt-1 mb-5">
                  Tap + to add your first medicine
                </p>
                <button
                  onClick={() => navigate('/add-medicine')}
                  className="bg-primary-600 text-white px-6 py-3 rounded-full font-bold tap-target"
                >
                  + Add Medicine
                </button>
              </>
            )}
          </div>
        ) : (
          filtered.map((med) => (
            <MedicineCard
              key={med.id}
              medicine={med}
              variant="list"
              onEdit={() => navigate(`/add-medicine/${med.id}`)}
              onPauseToggle={() => togglePauseMedicine(med.id)}
              onDelete={() => setConfirmDelete(med.id)}
            />
          ))
        )}
        <div className="h-4" />
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/add-medicine')}
        className="fixed bottom-24 right-5 w-14 h-14 bg-primary-600 text-white rounded-full shadow-xl flex items-center justify-center tap-target active:scale-95 transition-transform z-10"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
          <div className="w-full bg-white dark:bg-primary-900 rounded-t-3xl p-6 animate-slide-up">
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">
              Delete Medicine?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              This will remove the medicine and cancel all its alarms. Dose history will be kept.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-gray-200 dark:border-primary-700 text-gray-700 dark:text-gray-300 rounded-xl py-3 font-bold tap-target"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 bg-alarm-500 text-white rounded-xl py-3 font-bold tap-target"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold tap-target transition-all ${
        active
          ? 'bg-primary-600 text-white'
          : 'bg-gray-100 dark:bg-primary-800 text-gray-600 dark:text-gray-300'
      }`}
    >
      {color && (
        <span
          className="inline-block w-2 h-2 rounded-full mr-1.5"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </button>
  );
}
