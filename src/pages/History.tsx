import React, { useState, useMemo } from 'react';
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  isToday,
  isBefore,
} from 'date-fns';
import {
  History as HistoryIcon,
  Download,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Filter,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../store/appStore';
import { DoseRecord, DoseStatus } from '../types';
import { exportDosesToCsv, downloadCsv } from '../utils/csvExport';

type FilterTab = 'all' | 'taken' | 'skipped' | 'snoozed' | 'missed';
type RangeFilter = 'today' | '7days' | '30days' | 'all';

export default function History() {
  const { doseRecords, familyMembers, medicines, currentFamilyMemberId } = useAppStore();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [range, setRange] = useState<RangeFilter>('7days');
  const [selectedMember, setSelectedMember] = useState<string>(currentFamilyMemberId || 'all');

  // Filter records
  const filteredRecords = useMemo(() => {
    let list = [...doseRecords];

    // Family member filter
    if (selectedMember !== 'all') {
      list = list.filter((r) => r.familyMemberId === selectedMember);
    }

    // Status filter
    if (activeTab !== 'all') {
      list = list.filter((r) => r.status === activeTab);
    }

    // Date range filter
    const now = new Date();
    if (range === 'today') {
      list = list.filter((r) => isToday(parseISO(r.scheduledTime)));
    } else if (range === '7days') {
      const cutoff = subDays(now, 7);
      list = list.filter((r) => parseISO(r.scheduledTime) >= cutoff);
    } else if (range === '30days') {
      const cutoff = subDays(now, 30);
      list = list.filter((r) => parseISO(r.scheduledTime) >= cutoff);
    }

    // Sort descending by scheduled time
    return list.sort((a, b) => b.scheduledTime.localeCompare(a.scheduledTime));
  }, [doseRecords, selectedMember, activeTab, range]);

  // Overall Statistics for current member/filter
  const stats = useMemo(() => {
    let base = doseRecords;
    if (selectedMember !== 'all') {
      base = base.filter((r) => r.familyMemberId === selectedMember);
    }

    const taken = base.filter((r) => r.status === 'taken').length;
    const skipped = base.filter((r) => r.status === 'skipped').length;
    const missed = base.filter((r) => r.status === 'missed').length;
    const total = taken + skipped + missed;
    const adherence = total > 0 ? Math.round((taken / total) * 100) : 100;

    return { taken, skipped, missed, total, adherence };
  }, [doseRecords, selectedMember]);

  // Weekly Days adherence breakdown
  const weekDays = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const end = endOfWeek(today, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    return days.map((day) => {
      const dayRecords = doseRecords.filter(
        (r) =>
          (selectedMember === 'all' || r.familyMemberId === selectedMember) &&
          isSameDay(parseISO(r.scheduledTime), day)
      );

      const dayTaken = dayRecords.filter((r) => r.status === 'taken').length;
      const dayTotal = dayRecords.length;
      const rate = dayTotal > 0 ? (dayTaken / dayTotal) * 100 : 0;

      return {
        day,
        label: format(day, 'EEE'),
        taken: dayTaken,
        total: dayTotal,
        rate,
        isFuture: isBefore(today, day) && !isToday(day),
      };
    });
  }, [doseRecords, selectedMember]);

  const handleExportCsv = () => {
    const csv = exportDosesToCsv(doseRecords, familyMembers, medicines);
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    downloadCsv(csv, `meditime-history-${dateStr}.csv`);
  };

  return (
    <div className="flex flex-col h-full bg-primary-50 dark:bg-primary-950">
      {/* Header */}
      <div className="bg-white dark:bg-primary-900 px-5 pt-12 pb-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <HistoryIcon className="text-primary-600 dark:text-primary-400" size={26} />
              Dose History
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Track taken, skipped, and snoozed doses
            </p>
          </div>
          <button
            onClick={handleExportCsv}
            disabled={doseRecords.length === 0}
            className="flex items-center gap-1.5 bg-primary-50 dark:bg-primary-800 text-primary-700 dark:text-primary-300 disabled:opacity-40 px-3 py-2 rounded-xl text-xs font-bold tap-target border border-primary-200 dark:border-primary-700 shadow-sm"
          >
            <Download size={15} /> Export CSV
          </button>
        </div>

        {/* Member Filter Chips */}
        {familyMembers.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mt-1">
            <button
              onClick={() => setSelectedMember('all')}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-bold tap-target shrink-0',
                selectedMember === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-primary-800 text-gray-600 dark:text-gray-300'
              )}
            >
              All Family
            </button>
            {familyMembers.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMember(m.id)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-bold tap-target shrink-0 flex items-center gap-1.5',
                  selectedMember === m.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-primary-800 text-gray-600 dark:text-gray-300'
                )}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: m.color || '#0d9488' }}
                />
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Weekly Adherence Chart */}
        <div className="bg-white dark:bg-primary-900 rounded-2xl p-4 shadow-sm border border-primary-100 dark:border-primary-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-primary-600 dark:text-primary-400" />
              <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">
                This Week's Adherence
              </h2>
            </div>
            <div className="flex items-center gap-1 text-primary-600 dark:text-primary-400 text-xs font-extrabold">
              <TrendingUp size={14} />
              <span>{stats.adherence}% Overall</span>
            </div>
          </div>

          {/* Bar Columns */}
          <div className="grid grid-cols-7 gap-2 pt-2 pb-1 items-end h-28">
            {weekDays.map((col, idx) => (
              <div key={idx} className="flex flex-col items-center h-full justify-end">
                <div className="w-full bg-gray-100 dark:bg-primary-800/80 rounded-lg flex items-end justify-center h-20 p-1">
                  {!col.isFuture && (
                    <div
                      className={clsx(
                        'w-full rounded-md transition-all duration-300',
                        col.total === 0
                          ? 'bg-transparent'
                          : col.rate >= 80
                          ? 'bg-mint-500'
                          : col.rate >= 50
                          ? 'bg-snooze-500'
                          : 'bg-alarm-400'
                      )}
                      style={{ height: col.total > 0 ? `${Math.max(15, col.rate)}%` : '0%' }}
                    />
                  )}
                </div>
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-1">
                  {col.label}
                </span>
                <span className="text-[9px] text-gray-400">
                  {col.total > 0 ? `${col.taken}/${col.total}` : '-'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Range and Status Filter Tabs */}
        <div className="space-y-2">
          {/* Range pills */}
          <div className="flex gap-1.5 bg-gray-200/60 dark:bg-primary-800/60 p-1 rounded-xl">
            {(['today', '7days', '30days', 'all'] as RangeFilter[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={clsx(
                  'flex-1 py-1.5 text-xs font-bold capitalize rounded-lg tap-target transition-all',
                  range === r
                    ? 'bg-white dark:bg-primary-900 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                {r === '7days' ? '7 Days' : r === '30days' ? '30 Days' : r}
              </button>
            ))}
          </div>

          {/* Status tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {(['all', 'taken', 'skipped', 'snoozed', 'missed'] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'px-3 py-1.5 rounded-xl text-xs font-bold capitalize tap-target shrink-0',
                  activeTab === tab
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white dark:bg-primary-900 text-gray-600 dark:text-gray-300 border border-primary-50 dark:border-primary-800'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* History Records List */}
        <div className="space-y-2.5">
          {filteredRecords.length === 0 ? (
            <div className="bg-white dark:bg-primary-900 rounded-2xl p-8 text-center border border-primary-100 dark:border-primary-800">
              <Calendar size={36} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
                No medicine records found
              </p>
              <p className="text-xs text-gray-400 mt-1">
                When you respond to alarms (Taken, Skipped, Snoozed), logs will appear here.
              </p>
            </div>
          ) : (
            filteredRecords.map((record) => {
              const member = familyMembers.find((m) => m.id === record.familyMemberId);
              const schedDate = parseISO(record.scheduledTime);
              const actualDate = record.actualTime ? parseISO(record.actualTime) : null;

              return (
                <div
                  key={record.id}
                  className="bg-white dark:bg-primary-900 rounded-2xl p-3.5 shadow-sm border border-primary-100 dark:border-primary-800 flex items-start gap-3"
                >
                  {/* Status Icon */}
                  <div className="mt-0.5">
                    {record.status === 'taken' && (
                      <CheckCircle2 size={22} className="text-mint-500" />
                    )}
                    {record.status === 'skipped' && (
                      <XCircle size={22} className="text-gray-400" />
                    )}
                    {record.status === 'snoozed' && (
                      <Clock size={22} className="text-snooze-500" />
                    )}
                    {record.status === 'missed' && (
                      <AlertCircle size={22} className="text-alarm-500" />
                    )}
                  </div>

                  {/* Record Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-extrabold text-sm text-gray-900 dark:text-white truncate">
                        {record.medicineName}
                      </h4>
                      <span
                        className={clsx(
                          'text-[10px] font-extrabold px-2 py-0.5 rounded-full capitalize',
                          record.status === 'taken'
                            ? 'bg-mint-100 text-mint-700 dark:bg-mint-900/40 dark:text-mint-300'
                            : record.status === 'skipped'
                            ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                            : record.status === 'snoozed'
                            ? 'bg-snooze-100 text-snooze-700 dark:bg-snooze-900/40 dark:text-snooze-300'
                            : 'bg-alarm-100 text-alarm-700 dark:bg-alarm-900/40 dark:text-alarm-300'
                        )}
                      >
                        {record.status}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                      Dose: {record.dose} {record.doseUnit}
                      {member && ` • for ${member.name}`}
                    </p>

                    {/* Time breakdown: Scheduled vs Actual */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-gray-400">
                      <span>Scheduled: {format(schedDate, 'd MMM, h:mm a')}</span>
                      {actualDate && (
                        <span className="text-primary-600 dark:text-primary-400 font-medium">
                          Confirmed: {format(actualDate, 'h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}
