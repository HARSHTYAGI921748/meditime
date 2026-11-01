import { useState } from 'react';
import { ChevronDown, UserCircle } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../store/appStore';
import { FamilyMember } from '../types';

const relationLabels: Record<string, string> = {
  self: 'Me',
  mother: 'Mother',
  father: 'Father',
  grandmother: 'Grandmother',
  grandfather: 'Grandfather',
  spouse: 'Spouse',
  child: 'Child',
  sibling: 'Sibling',
  other: 'Other',
};

interface Props {
  onSelect?: (id: string) => void;
}

export default function FamilySelector({ onSelect }: Props) {
  const { familyMembers, currentFamilyMemberId, setCurrentFamilyMember } = useAppStore();
  const [open, setOpen] = useState(false);

  const current = familyMembers.find((m) => m.id === currentFamilyMemberId)
    ?? familyMembers[0];

  function select(member: FamilyMember) {
    setCurrentFamilyMember(member.id);
    onSelect?.(member.id);
    setOpen(false);
  }

  if (familyMembers.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-white dark:bg-primary-800 border border-primary-100 dark:border-primary-700 rounded-full px-3 py-1.5 shadow-sm tap-target"
      >
        {/* Avatar */}
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black"
          style={{ backgroundColor: current?.color ?? '#0d9488' }}
        >
          {current?.name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <span className="text-sm font-bold text-gray-800 dark:text-white">
          {current?.name ?? 'Select'}
        </span>
        <ChevronDown size={14} className="text-gray-400" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute top-full mt-2 left-0 z-50 bg-white dark:bg-primary-900 rounded-2xl shadow-xl border border-primary-100 dark:border-primary-700 overflow-hidden min-w-[180px]">
            {familyMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => select(member)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 text-left tap-target transition-colors',
                  member.id === currentFamilyMemberId
                    ? 'bg-primary-50 dark:bg-primary-800'
                    : 'hover:bg-gray-50 dark:hover:bg-primary-800/50'
                )}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0"
                  style={{ backgroundColor: member.color }}
                >
                  {member.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{member.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {relationLabels[member.relation] ?? member.relation}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
