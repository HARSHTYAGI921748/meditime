import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Bell, BellRing, Check, X, Clock } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useAppStore } from '../store/appStore';
import { useAlarm } from '../hooks/useAlarm';
import { AlarmAction, SnoozeDuration } from '../types';

// ============================================================
// AlarmScreen – Full-screen alarm UI shown when alarm fires
// ============================================================

export default function AlarmScreen() {
  const { activeAlarm, settings } = useAppStore();
  const { handleAlarmAction } = useAlarm();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const [animRing, setAnimRing] = useState(true);

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Pulse ring
  useEffect(() => {
    const interval = setInterval(() => setAnimRing((v) => !v), 800);
    return () => clearInterval(interval);
  }, []);

  if (!activeAlarm) return null;

  const privacyMode = settings.privacyMode;

  async function onAction(action: AlarmAction, snoozeMins?: SnoozeDuration) {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (_) {}
    await handleAlarmAction(activeAlarm!, action, snoozeMins);
  }

  const pill = activeAlarm;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-slate-900 via-primary-950 to-slate-900 animate-fade-in">
      {/* ── Top section ── */}
      <div className="flex flex-col items-center pt-12 px-6 w-full">
        {/* MEDICINE TIME header */}
        <p className="text-primary-400 tracking-[0.3em] text-sm font-bold uppercase mb-2">
          Medicine Time
        </p>

        {/* Clock */}
        <p className="text-white text-6xl font-black tabular-nums">
          {format(currentTime, 'HH:mm')}
        </p>
        <p className="text-primary-300 text-sm mt-1">
          {format(currentTime, 'EEEE, d MMM yyyy')}
        </p>
      </div>

      {/* ── Alarm Bell ── */}
      <div className="flex flex-col items-center my-4">
        <div className="relative">
          {/* Pulse rings */}
          <span className="absolute inset-0 rounded-full bg-alarm-500/20 animate-ping" />
          <span
            className="absolute inset-0 rounded-full bg-alarm-500/10"
            style={{ animation: 'pulse-ring 1.5s ease-out infinite' }}
          />
          <div className="relative z-10 bg-alarm-500/20 rounded-full p-8">
            <BellRing
              size={64}
              className="text-alarm-400 animate-bell-ring"
              strokeWidth={1.5}
            />
          </div>
        </div>
      </div>

      {/* ── Medicine info ── */}
      <div className="flex flex-col items-center px-8 text-center">
        {/* Family member */}
        {!privacyMode && (
          <p className="text-primary-300 text-lg font-semibold mb-1">
            {pill.familyMemberName}
          </p>
        )}

        {/* Medicine name */}
        {privacyMode ? (
          <p className="text-white text-3xl font-black mb-1">
            Medicine Reminder
          </p>
        ) : (
          <p className="text-white text-3xl font-black mb-1 leading-tight">
            {pill.medicineName}
          </p>
        )}

        {/* Dose */}
        {!privacyMode && (
          <div className="bg-primary-800/60 rounded-full px-5 py-2 mt-2 mb-1">
            <p className="text-primary-200 text-xl font-bold">
              {pill.dose} {pill.doseUnit}
            </p>
          </div>
        )}

        {/* Instructions */}
        {!privacyMode && pill.instruction && (
          <span className="mt-2 bg-mint-700/50 text-mint-200 text-sm px-4 py-1 rounded-full font-semibold">
            {pill.instruction}
          </span>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div className="w-full px-6 pb-10 space-y-3 animate-slide-up">
        {showSnoozeOptions ? (
          <div className="bg-white/10 rounded-2xl p-4">
            <p className="text-white text-center text-sm font-semibold mb-3">
              Snooze for how long?
            </p>
            <div className="flex gap-3 justify-center">
              {([5, 10, 15] as SnoozeDuration[]).map((mins) => (
                <button
                  key={mins}
                  onClick={() => onAction('snoozed', mins)}
                  className="flex-1 bg-snooze-500 text-white rounded-xl py-4 font-bold text-lg active:bg-snooze-600 tap-target"
                >
                  {mins}m
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSnoozeOptions(false)}
              className="w-full mt-3 text-white/60 text-sm tap-target"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            {/* TAKEN */}
            <button
              onClick={() => onAction('taken')}
              className="w-full bg-mint-500 active:bg-mint-600 text-white rounded-2xl py-5 flex items-center justify-center gap-3 shadow-lg tap-target transition-transform active:scale-95"
            >
              <Check size={28} strokeWidth={3} />
              <span className="text-2xl font-black tracking-wide">TAKEN</span>
            </button>

            {/* SNOOZE */}
            <button
              onClick={() => setShowSnoozeOptions(true)}
              className="w-full bg-snooze-500 active:bg-snooze-600 text-white rounded-2xl py-4 flex items-center justify-center gap-3 shadow-lg tap-target transition-transform active:scale-95"
            >
              <Clock size={24} strokeWidth={2.5} />
              <span className="text-xl font-bold tracking-wide">SNOOZE</span>
            </button>

            {/* SKIP */}
            <button
              onClick={() => onAction('skipped')}
              className="w-full bg-white/10 active:bg-white/20 text-white/80 rounded-2xl py-4 flex items-center justify-center gap-3 tap-target transition-transform active:scale-95"
            >
              <X size={22} strokeWidth={2.5} />
              <span className="text-lg font-semibold tracking-wide">SKIP</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
