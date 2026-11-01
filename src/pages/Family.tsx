import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateUUID as uuidv4 } from '../utils/uuid';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Heart,
  Pill,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { FamilyMember, RelationType } from '../types';

const RELATION_OPTIONS: { value: RelationType; label: string }[] = [
  { value: 'self', label: 'Self (Me)' },
  { value: 'mother', label: 'Mother' },
  { value: 'father', label: 'Father' },
  { value: 'grandmother', label: 'Grandmother' },
  { value: 'grandfather', label: 'Grandfather' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'other', label: 'Other Family Member' },
];

const AVATAR_COLORS = [
  '#0d9488', // teal
  '#2563eb', // blue
  '#7c3aed', // purple
  '#db2777', // pink
  '#ea580c', // orange
  '#16a34a', // green
  '#4f46e5', // indigo
  '#e11d48', // red
];

export default function Family() {
  const navigate = useNavigate();
  const {
    familyMembers,
    medicines,
    currentFamilyMemberId,
    setCurrentFamilyMember,
    addFamilyMember,
    updateFamilyMember,
    deleteFamilyMember,
  } = useAppStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState<RelationType>('other');
  const [age, setAge] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingMember(null);
    setName('');
    setRelation('other');
    setAge('');
    setSelectedColor(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
    setModalOpen(true);
  };

  const openEditModal = (member: FamilyMember) => {
    setEditingMember(member);
    setName(member.name);
    setRelation(member.relation);
    setAge(member.age ? String(member.age) : '');
    setSelectedColor(member.color || AVATAR_COLORS[0]);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    if (editingMember) {
      updateFamilyMember(editingMember.id, {
        name: name.trim(),
        relation,
        age: age ? parseInt(age, 10) : undefined,
        color: selectedColor,
      });
    } else {
      const newMember: FamilyMember = {
        id: uuidv4(),
        name: name.trim(),
        relation,
        age: age ? parseInt(age, 10) : undefined,
        color: selectedColor,
        createdAt: new Date().toISOString(),
      };
      addFamilyMember(newMember);
      if (!currentFamilyMemberId) {
        setCurrentFamilyMember(newMember.id);
      }
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteFamilyMember(id);
    if (currentFamilyMemberId === id) {
      const remaining = familyMembers.filter((m) => m.id !== id);
      setCurrentFamilyMember(remaining.length > 0 ? remaining[0].id : null);
    }
    setConfirmDeleteId(null);
  };

  return (
    <div className="flex flex-col h-full bg-primary-50 dark:bg-primary-950">
      {/* Header */}
      <div className="bg-white dark:bg-primary-900 px-5 pt-12 pb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="text-primary-600 dark:text-primary-400" size={26} />
              Family Profiles
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Manage medicine schedules for each loved one
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-primary-600 active:bg-primary-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm tap-target"
          >
            <Plus size={16} /> Add Member
          </button>
        </div>
      </div>

      {/* Member List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {familyMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Heart size={48} className="text-primary-200 dark:text-primary-700 mb-3" />
            <p className="font-bold text-gray-600 dark:text-gray-300 text-base">
              No family members added yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs">
              Add your parents, grandparents, or children to set up their separate medicine alarms.
            </p>
            <button
              onClick={openAddModal}
              className="mt-5 bg-primary-600 text-white px-5 py-2.5 rounded-full font-bold text-sm tap-target"
            >
              + Add First Member
            </button>
          </div>
        ) : (
          familyMembers.map((member) => {
            const memberMedicines = medicines.filter((m) => m.familyMemberId === member.id);
            const activeCount = memberMedicines.filter((m) => m.isActive && !m.isPaused).length;
            const isSelected = currentFamilyMemberId === member.id;

            return (
              <div
                key={member.id}
                className={`bg-white dark:bg-primary-900 rounded-2xl p-4 shadow-sm border transition-all ${
                  isSelected
                    ? 'border-primary-500 ring-2 ring-primary-500/20'
                    : 'border-primary-100 dark:border-primary-800'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  {/* Colored Avatar */}
                  <div
                    className="w-13 h-13 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-sm shrink-0"
                    style={{ backgroundColor: member.color || '#0d9488' }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-gray-900 dark:text-white text-base truncate">
                        {member.name}
                      </h3>
                      {isSelected && (
                        <span className="text-[10px] bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300 font-extrabold px-2 py-0.5 rounded-full">
                          Active View
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {member.relation} {member.age ? `• ${member.age} yrs` : ''}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-600 dark:text-gray-300">
                      <Pill size={12} className="text-primary-500" />
                      <span>
                        {memberMedicines.length} medicines ({activeCount} active alarms)
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 items-end">
                    <button
                      onClick={() => openEditModal(member)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 tap-target"
                      title="Edit Profile"
                    >
                      <Edit2 size={16} />
                    </button>
                    {familyMembers.length > 1 && (
                      <button
                        onClick={() => setConfirmDeleteId(member.id)}
                        className="p-1.5 text-gray-400 hover:text-alarm-500 tap-target"
                        title="Delete Profile"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Switch to this profile button */}
                {!isSelected && (
                  <button
                    onClick={() => {
                      setCurrentFamilyMember(member.id);
                      navigate('/');
                    }}
                    className="mt-3 w-full py-2 bg-primary-50 dark:bg-primary-800/60 text-primary-700 dark:text-primary-300 rounded-xl text-xs font-bold tap-target flex items-center justify-center gap-1.5"
                  >
                    <Check size={14} /> Switch to {member.name}'s Medicines
                  </button>
                )}
              </div>
            );
          })
        )}

        {/* Offline & Privacy Notice */}
        <div className="bg-mint-50 dark:bg-mint-950/40 border border-mint-200 dark:border-mint-800 rounded-2xl p-3.5 mt-4">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-mint-600 dark:text-mint-400 shrink-0 mt-0.5" />
            <p className="text-xs text-mint-800 dark:text-mint-300 leading-relaxed font-medium">
              <strong>Family Privacy First:</strong> All profiles, medicines, and alarm schedules remain stored 100% locally on this device. No family health data is transmitted to cloud servers.
            </p>
          </div>
        </div>

        <div className="h-6" />
      </div>

      {/* Add / Edit Member Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-primary-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                {editingMember ? 'Edit Profile' : 'Add Family Member'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 tap-target"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grandma, Dad, Priya"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-primary-800 border border-gray-200 dark:border-primary-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Relationship */}
              <div>
                <label className="block text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Relationship
                </label>
                <select
                  value={relation}
                  onChange={(e) => setRelation(e.target.value as RelationType)}
                  className="w-full bg-gray-50 dark:bg-primary-800 border border-gray-200 dark:border-primary-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {RELATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Age (Optional) */}
              <div>
                <label className="block text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Age (Optional)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 68"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-primary-800 border border-gray-200 dark:border-primary-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Avatar Color */}
              <div>
                <label className="block text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                  Color Tag
                </label>
                <div className="flex gap-2.5 flex-wrap">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className="w-8 h-8 rounded-full flex items-center justify-center tap-target transition-transform"
                      style={{ backgroundColor: c }}
                    >
                      {selectedColor === c && <Check size={16} className="text-white font-bold" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-3 border border-gray-200 dark:border-primary-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold text-sm tap-target"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                className="flex-1 py-3 bg-primary-600 disabled:opacity-50 text-white rounded-xl font-black text-sm tap-target shadow-md"
              >
                {editingMember ? 'Save Changes' : 'Create Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-sm bg-white dark:bg-primary-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">
              Delete Family Profile?
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
              Are you sure? This profile's associated medicines and alarm schedules will be removed. Past history logs will be retained.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 border border-gray-200 dark:border-primary-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold text-sm tap-target"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 py-2.5 bg-alarm-600 text-white rounded-xl font-black text-sm tap-target"
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
