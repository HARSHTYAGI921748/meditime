import { format } from 'date-fns';
import { DoseRecord, FamilyMember, Medicine } from '../types';

// ============================================================
// CSV export utility
// ============================================================

function escapeCsv(val: unknown): string {
  const str = val == null ? '' : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(cols: unknown[]): string {
  return cols.map(escapeCsv).join(',');
}

export function exportDosesToCsv(
  records: DoseRecord[],
  members: FamilyMember[],
  medicines: Medicine[]
): string {
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m.name]));
  const medicineMap = Object.fromEntries(medicines.map((m) => [m.id, m]));

  const header = row([
    'Date',
    'Scheduled Time',
    'Actual Time',
    'Family Member',
    'Medicine',
    'Dose',
    'Unit',
    'Status',
    'Notes',
  ]);

  const rows = records
    .slice()
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
    .map((r) => {
      const med = medicineMap[r.medicineId];
      return row([
        format(new Date(r.scheduledTime), 'yyyy-MM-dd'),
        format(new Date(r.scheduledTime), 'HH:mm'),
        r.actualTime ? format(new Date(r.actualTime), 'HH:mm') : '',
        memberMap[r.familyMemberId] ?? r.familyMemberId,
        r.medicineName ?? med?.name ?? '',
        r.dose,
        r.doseUnit,
        r.status,
        r.notes ?? '',
      ]);
    });

  return [header, ...rows].join('\n');
}

export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
