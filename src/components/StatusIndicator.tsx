import { CheckCircle2, Clock, FileText, XCircle } from 'lucide-react';
import type { AttendanceStatus } from '../types';
import { ATTENDANCE_STATUS_LABELS } from '../types';

export function StatusIndicator({ status }: { status: AttendanceStatus }) {
  switch (status) {
    case 'hadir':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          {ATTENDANCE_STATUS_LABELS[status]}
        </span>
      );
    case 'izin':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          {ATTENDANCE_STATUS_LABELS[status]}
        </span>
      );
    case 'sakit':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-md whitespace-nowrap">
          <FileText className="w-3.5 h-3.5 shrink-0" />
          {ATTENDANCE_STATUS_LABELS[status]}
        </span>
      );
    case 'alfa':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-md whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          {ATTENDANCE_STATUS_LABELS[status]}
        </span>
      );
  }
}
