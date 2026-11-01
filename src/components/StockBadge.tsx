import clsx from 'clsx';
import { Package, AlertTriangle, Calendar } from 'lucide-react';
import { Medicine, StockStatus } from '../types';
import { getStockStatus } from '../utils/stockUtils';

interface Props {
  medicine: Medicine;
  showDays?: boolean;
}

const labelStyles: Record<StockStatus['label'], string> = {
  ok:       'bg-mint-100 dark:bg-mint-900/50 text-mint-700 dark:text-mint-300',
  low:      'bg-snooze-100 dark:bg-snooze-900/50 text-snooze-700 dark:text-snooze-300',
  critical: 'bg-alarm-100 dark:bg-alarm-900/50 text-alarm-700 dark:text-alarm-300',
  expired:  'bg-alarm-200 dark:bg-alarm-900 text-alarm-800 dark:text-alarm-200',
  unknown:  'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
};

export default function StockBadge({ medicine, showDays = true }: Props) {
  const status = getStockStatus(medicine);

  return (
    <div className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold', labelStyles[status.label])}>
      {status.label === 'expired' ? (
        <AlertTriangle size={11} />
      ) : status.label === 'low' || status.label === 'critical' ? (
        <AlertTriangle size={11} />
      ) : (
        <Package size={11} />
      )}
      <span>
        {medicine.currentStock != null
          ? `${medicine.currentStock} ${medicine.stockUnit ?? medicine.doseUnit ?? ''} left`
          : 'No stock info'}
      </span>
      {showDays && status.daysRemaining != null && status.label !== 'expired' && (
        <span className="opacity-75">· {status.daysRemaining}d</span>
      )}
    </div>
  );
}
