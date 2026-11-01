import { format, parseISO } from 'date-fns';
import { Pill, Clock, Package, PauseCircle, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { Medicine, DoseStatus } from '../types';
import { formatScheduleDescription, instructionLabel } from '../utils/alarmUtils';
import { getStockStatus } from '../utils/stockUtils';

// ============================================================
// MedicineCard – multi-variant medicine display card
// ============================================================

interface Props {
  medicine: Medicine;
  variant?: 'list' | 'compact' | 'home';
  doseStatus?: DoseStatus;
  scheduledTime?: string; // ISO for home card
  onEdit?: () => void;
  onDelete?: () => void;
  onPauseToggle?: () => void;
  onTap?: () => void;
}

const formIcons: Record<string, string> = {
  tablet:   '💊',
  capsule:  '💊',
  syrup:    '🧴',
  drops:    '💧',
  injection:'💉',
  cream:    '🧴',
  inhaler:  '💨',
  other:    '📦',
};

const statusColors: Record<DoseStatus, string> = {
  pending:  'bg-blue-100 text-blue-700',
  taken:    'bg-mint-100 text-mint-700',
  skipped:  'bg-gray-100 text-gray-600',
  snoozed:  'bg-snooze-100 text-snooze-700',
  missed:   'bg-alarm-100 text-alarm-700',
};

const statusLabels: Record<DoseStatus, string> = {
  pending:  'Upcoming',
  taken:    'Taken ✓',
  skipped:  'Skipped',
  snoozed:  'Snoozed',
  missed:   'Missed',
};

export default function MedicineCard({
  medicine,
  variant = 'list',
  doseStatus,
  scheduledTime,
  onEdit,
  onDelete,
  onPauseToggle,
  onTap,
}: Props) {
  const stock = getStockStatus(medicine);
  const emoji = formIcons[medicine.form] ?? '💊';

  if (variant === 'compact') {
    return (
      <div
        onClick={onTap}
        className="flex items-center gap-3 bg-white dark:bg-primary-900 rounded-xl p-3 shadow-sm border border-primary-50 dark:border-primary-800 tap-target"
      >
        <span className="text-2xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 dark:text-white truncate">{medicine.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {medicine.dose} {medicine.doseUnit}
          </p>
        </div>
        {doseStatus && (
          <span className={clsx('text-xs font-semibold px-2 py-1 rounded-full', statusColors[doseStatus])}>
            {statusLabels[doseStatus]}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'home') {
    return (
      <div
        onClick={onTap}
        className={clsx(
          'bg-white dark:bg-primary-900 rounded-2xl p-4 shadow-sm border-l-4 tap-target',
          doseStatus === 'taken'   ? 'border-mint-500'   :
          doseStatus === 'missed'  ? 'border-alarm-500'  :
          doseStatus === 'skipped' ? 'border-gray-400'   :
          doseStatus === 'snoozed' ? 'border-snooze-500' :
                                     'border-primary-500'
        )}
      >
        <div className="flex items-start gap-3">
          <div className="bg-primary-100 dark:bg-primary-800 rounded-xl p-2.5 text-2xl leading-none">
            {emoji}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-gray-900 dark:text-white text-base leading-tight">
                {medicine.name}
              </p>
              {doseStatus && (
                <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap', statusColors[doseStatus])}>
                  {statusLabels[doseStatus]}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
              {medicine.dose} {medicine.doseUnit}
              {medicine.instruction && (
                <span className="ml-2 text-primary-600 dark:text-primary-400">
                  · {instructionLabel(medicine.instruction, medicine.instructionOther)}
                </span>
              )}
            </p>
            {scheduledTime && (
              <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
                <Clock size={11} />
                <span>{format(parseISO(scheduledTime), 'h:mm a')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Default: list variant ──
  return (
    <div className="bg-white dark:bg-primary-900 rounded-2xl p-4 shadow-sm border border-primary-50 dark:border-primary-800">
      <div className="flex items-start gap-3">
        {/* Icon / image */}
        <div className="bg-primary-50 dark:bg-primary-800 rounded-xl p-3 text-2xl leading-none shrink-0">
          {medicine.imageUri ? (
            <img
              src={medicine.imageUri}
              alt={medicine.name}
              className="w-8 h-8 object-cover rounded-lg"
            />
          ) : (
            emoji
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + paused badge */}
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-gray-900 dark:text-white text-base truncate">
              {medicine.name}
            </h3>
            {medicine.isPaused && (
              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full font-semibold">
                Paused
              </span>
            )}
          </div>

          {/* Generic name */}
          {medicine.genericName && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{medicine.genericName}</p>
          )}

          {/* Dose + schedule */}
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {medicine.dose} {medicine.doseUnit} · {formatScheduleDescription(medicine)}
          </p>

          {/* Instruction */}
          {medicine.instruction && (
            <p className="text-xs text-primary-600 dark:text-primary-400 mt-0.5">
              {instructionLabel(medicine.instruction, medicine.instructionOther)}
            </p>
          )}

          {/* Stock */}
          {medicine.currentStock != null && (
            <div className="flex items-center gap-1.5 mt-2">
              <Package size={12} className={
                stock.label === 'ok'      ? 'text-mint-600' :
                stock.label === 'low'     ? 'text-snooze-600' :
                stock.label === 'critical'? 'text-alarm-600' :
                'text-gray-400'
              } />
              <span className={clsx(
                'text-xs font-semibold',
                stock.label === 'ok'      ? 'text-mint-700' :
                stock.label === 'low'     ? 'text-snooze-700' :
                stock.label === 'critical'? 'text-alarm-700' :
                'text-gray-500'
              )}>
                {medicine.currentStock} {medicine.stockUnit ?? medicine.doseUnit} left
              </span>
              {(stock.label === 'low' || stock.label === 'critical') && (
                <AlertTriangle size={12} className="text-alarm-500" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {(onEdit || onPauseToggle || onDelete) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-primary-800">
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 font-semibold bg-primary-50 dark:bg-primary-800 px-3 py-1.5 rounded-lg tap-target"
            >
              <Edit2 size={13} /> Edit
            </button>
          )}
          {onPauseToggle && (
            <button
              onClick={onPauseToggle}
              className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 font-semibold bg-gray-50 dark:bg-primary-800 px-3 py-1.5 rounded-lg tap-target"
            >
              <PauseCircle size={13} />
              {medicine.isPaused ? 'Resume' : 'Pause'}
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 text-xs text-alarm-600 dark:text-alarm-400 font-semibold bg-alarm-50 dark:bg-alarm-950 px-3 py-1.5 rounded-lg tap-target ml-auto"
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
