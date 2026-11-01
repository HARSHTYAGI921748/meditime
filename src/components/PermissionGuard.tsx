import { useState, useEffect } from 'react';
import { ShieldAlert, Bell, Clock, Smartphone } from 'lucide-react';
import { MediTimeAlarm } from '../plugins/MediTimeAlarmPlugin';
import { PermissionStatus } from '../types';

// ============================================================
// PermissionGuard – Shows an explanation screen if critical
// Android alarm permissions are missing
// ============================================================

interface Props {
  children: React.ReactNode;
}

export default function PermissionGuard({ children }: Props) {
  const [status, setStatus] = useState<PermissionStatus | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    MediTimeAlarm.checkPermissions()
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setChecking(false));
  }, []);

  async function requestPermissions() {
    try {
      await MediTimeAlarm.requestPermissions();
      const newStatus = await MediTimeAlarm.checkPermissions();
      setStatus(newStatus);
    } catch (e) {
      console.error('Permission request error:', e);
    }
  }

  async function openSettings() {
    try {
      await MediTimeAlarm.openAlarmPermissionSettings();
    } catch (e) {
      console.error('Open settings error:', e);
    }
  }

  if (checking) return <>{children}</>;

  // On web / null status – just show children
  if (!status) return <>{children}</>;

  const needsNotification = status.notifications === 'denied';
  const needsExactAlarm = status.exactAlarm === 'denied';

  // If all permissions ok, just render children
  if (!needsNotification && !needsExactAlarm) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-40 bg-white dark:bg-primary-950 flex flex-col items-center justify-center px-8 text-center">
      <ShieldAlert size={64} className="text-alarm-500 mb-6" />

      <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
        Permissions Needed
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
        MediTime needs these permissions to deliver medicine reminders reliably,
        even when your phone is locked or the app is closed.
      </p>

      {/* Permission list */}
      <div className="w-full space-y-3 mb-8">
        <PermissionRow
          icon={<Bell className="text-primary-500" />}
          label="Send Notifications"
          status={status.notifications === 'granted' ? 'granted' : 'missing'}
          description="Required to show alarm alerts"
        />
        <PermissionRow
          icon={<Clock className="text-primary-500" />}
          label="Schedule Exact Alarms"
          status={
            status.exactAlarm === 'granted' || status.exactAlarm === 'not_required'
              ? 'granted'
              : 'missing'
          }
          description="Required for precise alarm timing"
        />
        <PermissionRow
          icon={<Smartphone className="text-primary-500" />}
          label="Display on Lock Screen"
          status={
            status.fullScreenIntent === 'not_applicable' || status.fullScreenIntent === 'granted'
              ? 'granted'
              : 'missing'
          }
          description="Shows alarm when phone is locked"
        />
      </div>

      <button
        onClick={requestPermissions}
        className="w-full bg-primary-600 text-white rounded-2xl py-4 font-black text-lg mb-3 tap-target"
      >
        Grant Permissions
      </button>
      <button
        onClick={openSettings}
        className="text-sm text-primary-600 dark:text-primary-400 font-semibold tap-target"
      >
        Open Android Settings
      </button>

      {/* Skip link */}
      <button
        onClick={() => setStatus({ ...status, notifications: 'granted', exactAlarm: 'granted' })}
        className="mt-4 text-xs text-gray-400 tap-target"
      >
        Continue without full permissions (alarms may not work)
      </button>
    </div>
  );
}

function PermissionRow({
  icon,
  label,
  status,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  status: 'granted' | 'missing';
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 dark:bg-primary-900 rounded-xl p-3 text-left">
      <div className="p-2 bg-primary-50 dark:bg-primary-800 rounded-lg">{icon}</div>
      <div className="flex-1">
        <p className="font-bold text-gray-800 dark:text-white text-sm">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <span
        className={`text-xs font-black px-2 py-1 rounded-full ${
          status === 'granted'
            ? 'bg-mint-100 text-mint-700'
            : 'bg-alarm-100 text-alarm-700'
        }`}
      >
        {status === 'granted' ? '✓' : '✗'}
      </span>
    </div>
  );
}
