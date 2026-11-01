import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Globe,
  Moon,
  EyeOff,
  Lock,
  Clock,
  ShieldCheck,
  FileDown,
  FileUp,
  Trash2,
  BellRing,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { MediTimeAlarm } from '../plugins/MediTimeAlarmPlugin';
import { PermissionStatus, SnoozeDuration } from '../types';

export default function Settings() {
  const {
    settings,
    updateSettings,
    familyMembers,
    medicines,
    doseRecords,
    setFamilyMembers,
    setMedicines,
    setDoseRecords,
  } = useAppStore();

  const [permStatus, setPermStatus] = useState<PermissionStatus | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Check Android alarm permissions
  useEffect(() => {
    MediTimeAlarm.checkPermissions()
      .then(setPermStatus)
      .catch((e) => console.log('Permission check not supported on web:', e));
  }, []);

  const handleTestAlarm = async () => {
    try {
      const res = await MediTimeAlarm.testAlarm({
        medicineId: 'test-med-001',
        medicineName: 'Paracetamol (Test Alarm)',
        familyMemberName: 'Self',
        dose: '1 tablet',
      });
      if (res.success) {
        setTestResult('Test alarm set! Phone will ring in 10 seconds.');
      } else {
        setTestResult(`Failed: ${res.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      setTestResult(`Error: ${e.message}`);
    }
    setTimeout(() => setTestResult(null), 6000);
  };

  const handleBackupExport = () => {
    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      familyMembers,
      medicines,
      doseRecords,
      settings,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meditime-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.familyMembers && parsed.medicines) {
          setFamilyMembers(parsed.familyMembers);
          setMedicines(parsed.medicines);
          if (parsed.doseRecords) setDoseRecords(parsed.doseRecords);
          if (parsed.settings) updateSettings(parsed.settings);
          alert('Backup restored successfully!');
        } else {
          alert('Invalid MediTime backup file format.');
        }
      } catch (err) {
        alert('Failed to parse backup file.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = () => {
    localStorage.clear();
    setFamilyMembers([]);
    setMedicines([]);
    setDoseRecords([]);
    setConfirmClearOpen(false);
    window.location.reload();
  };

  return (
    <div className="flex flex-col h-full bg-primary-50 dark:bg-primary-950">
      {/* Header */}
      <div className="bg-white dark:bg-primary-900 px-5 pt-12 pb-4 shadow-sm">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <SettingsIcon className="text-primary-600 dark:text-primary-400" size={26} />
          Settings
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Alarm preferences, privacy, language, and backups
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Test Alarm Banner */}
        <div className="bg-gradient-to-r from-primary-600 to-teal-700 text-white rounded-2xl p-4 shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-black text-base flex items-center gap-2">
                <BellRing size={18} /> Test Real Android Alarm
              </h3>
              <p className="text-xs text-primary-100 mt-1 leading-relaxed">
                Triggers an authentic native Android alarm 10 seconds from now. Test while locked!
              </p>
            </div>
            <button
              onClick={handleTestAlarm}
              className="bg-white text-primary-700 font-extrabold text-xs px-3.5 py-2.5 rounded-xl shadow tap-target shrink-0 active:scale-95 transition-transform"
            >
              Trigger (10s)
            </button>
          </div>
          {testResult && (
            <div className="mt-3 bg-white/20 rounded-xl p-2.5 text-xs font-bold text-white flex items-center gap-2">
              <CheckCircle size={15} /> {testResult}
            </div>
          )}
        </div>

        {/* Alarm & Lock-screen Permissions */}
        <div className="bg-white dark:bg-primary-900 rounded-2xl p-4 shadow-sm border border-primary-100 dark:border-primary-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="text-primary-600" size={18} />
              Android Alarm Permissions
            </h3>
            <button
              onClick={() => MediTimeAlarm.openAlarmPermissionSettings()}
              className="text-xs text-primary-600 dark:text-primary-400 font-bold flex items-center gap-1 tap-target"
            >
              System Settings <ExternalLink size={12} />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-primary-800">
              <span className="text-gray-600 dark:text-gray-300">Exact Alarms (SCHEDULE_EXACT_ALARM)</span>
              <span
                className={`font-black px-2 py-0.5 rounded-full text-[10px] ${
                  permStatus?.exactAlarm === 'granted' || permStatus?.exactAlarm === 'not_required'
                    ? 'bg-mint-100 text-mint-700'
                    : 'bg-alarm-100 text-alarm-700'
                }`}
              >
                {permStatus?.exactAlarm || 'Granted (Native)'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-primary-800">
              <span className="text-gray-600 dark:text-gray-300">Push Notifications (POST_NOTIFICATIONS)</span>
              <span
                className={`font-black px-2 py-0.5 rounded-full text-[10px] ${
                  permStatus?.notifications === 'granted'
                    ? 'bg-mint-100 text-mint-700'
                    : 'bg-alarm-100 text-alarm-700'
                }`}
              >
                {permStatus?.notifications || 'Granted'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-gray-600 dark:text-gray-300">Lock-screen Fullscreen Intent</span>
              <span className="font-black px-2 py-0.5 rounded-full text-[10px] bg-mint-100 text-mint-700">
                {permStatus?.fullScreenIntent || 'Supported'}
              </span>
            </div>
          </div>
        </div>

        {/* General Preferences */}
        <div className="bg-white dark:bg-primary-900 rounded-2xl p-4 shadow-sm border border-primary-100 dark:border-primary-800 space-y-4">
          <h3 className="text-sm font-extrabold text-gray-900 dark:text-white mb-2">
            Preferences & Accessibility
          </h3>

          {/* Language Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Globe size={18} className="text-primary-600 dark:text-primary-400" />
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">Language</p>
                <p className="text-xs text-gray-400">English / हिन्दी</p>
              </div>
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-primary-800 p-1 rounded-xl">
              <button
                onClick={() => updateSettings({ language: 'en' })}
                className={`px-3 py-1 text-xs font-extrabold rounded-lg tap-target ${
                  settings.language === 'en'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                English
              </button>
              <button
                onClick={() => updateSettings({ language: 'hi' })}
                className={`px-3 py-1 text-xs font-extrabold rounded-lg tap-target ${
                  settings.language === 'hi'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                हिन्दी
              </button>
            </div>
          </div>

          {/* Dark Mode */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-primary-800">
            <div className="flex items-center gap-2.5">
              <Moon size={18} className="text-primary-600 dark:text-primary-400" />
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">Dark Mode</p>
                <p className="text-xs text-gray-400">Gentle on elderly eyes at night</p>
              </div>
            </div>
            <button
              onClick={() => updateSettings({ darkMode: !settings.darkMode })}
              className={`w-12 h-6 rounded-full transition-colors relative tap-target ${
                settings.darkMode ? 'bg-primary-600' : 'bg-gray-200 dark:bg-primary-700'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.darkMode ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Lock Screen Privacy Mode */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-primary-800">
            <div className="flex items-center gap-2.5">
              <EyeOff size={18} className="text-primary-600 dark:text-primary-400" />
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">Privacy Mode</p>
                <p className="text-xs text-gray-400">
                  Hide medicine name & dose on lock-screen ringing
                </p>
              </div>
            </div>
            <button
              onClick={() => updateSettings({ privacyMode: !settings.privacyMode })}
              className={`w-12 h-6 rounded-full transition-colors relative tap-target ${
                settings.privacyMode ? 'bg-primary-600' : 'bg-gray-200 dark:bg-primary-700'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.privacyMode ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Default Snooze */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-primary-800">
            <div className="flex items-center gap-2.5">
              <Clock size={18} className="text-primary-600 dark:text-primary-400" />
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">Default Snooze</p>
                <p className="text-xs text-gray-400">Minutes before ringing again</p>
              </div>
            </div>
            <div className="flex gap-1">
              {([5, 10, 15] as SnoozeDuration[]).map((dur) => (
                <button
                  key={dur}
                  onClick={() => updateSettings({ defaultSnoozeDuration: dur })}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg tap-target ${
                    settings.defaultSnoozeDuration === dur
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-primary-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {dur}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data & Backup */}
        <div className="bg-white dark:bg-primary-900 rounded-2xl p-4 shadow-sm border border-primary-100 dark:border-primary-800 space-y-3">
          <h3 className="text-sm font-extrabold text-gray-900 dark:text-white mb-1">
            Data & Local Backup
          </h3>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleBackupExport}
              className="flex items-center justify-center gap-2 py-3 bg-primary-50 dark:bg-primary-800/80 text-primary-700 dark:text-primary-300 rounded-xl text-xs font-bold tap-target border border-primary-200 dark:border-primary-700"
            >
              <FileDown size={16} /> Export Backup
            </button>

            <label className="flex items-center justify-center gap-2 py-3 bg-primary-50 dark:bg-primary-800/80 text-primary-700 dark:text-primary-300 rounded-xl text-xs font-bold tap-target border border-primary-200 dark:border-primary-700 cursor-pointer">
              <FileUp size={16} /> Import Backup
              <input
                type="file"
                accept=".json"
                onChange={handleBackupImport}
                className="hidden"
              />
            </label>
          </div>

          <button
            onClick={() => setConfirmClearOpen(true)}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 text-alarm-600 dark:text-alarm-400 bg-alarm-50 dark:bg-alarm-950/30 rounded-xl text-xs font-bold tap-target"
          >
            <Trash2 size={15} /> Clear All Medicines & History
          </button>
        </div>

        {/* App Info */}
        <div className="bg-white dark:bg-primary-900 rounded-2xl p-4 shadow-sm border border-primary-100 dark:border-primary-800 text-center">
          <div className="flex items-center justify-center gap-1.5 text-primary-600 dark:text-primary-400 font-black text-sm">
            <Info size={16} /> MediTime Android v1.0.0
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Your medicine, on time.
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Exclusively for personal and family use. 100% Free, Private & Offline Alarms.
          </p>
        </div>

        <div className="h-6" />
      </div>

      {/* Clear All Confirmation Modal */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-sm bg-white dark:bg-primary-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-alarm-600 mb-2 font-black">
              <AlertTriangle size={22} />
              <h3 className="text-lg">Reset All Data?</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
              This will permanently delete all family profiles, medicines, schedules, and past dose logs.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmClearOpen(false)}
                className="flex-1 py-2.5 border border-gray-200 dark:border-primary-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold text-sm tap-target"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 py-2.5 bg-alarm-600 text-white rounded-xl font-black text-sm tap-target"
              >
                Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
