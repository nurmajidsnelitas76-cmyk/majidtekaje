import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  formatIndonesianDate,
  formatShortDate,
  formatTimeOnly,
  getTodayIsoDate,
} from '../../lib/date';
import {
  ROLE_LABELS,
  type AttendanceStatus,
  type EmployeeAttendanceRecord,
} from '../../types';
import { StatusIndicator } from '../../components/StatusIndicator';

export default function EmployeeAttendancePage() {
  const { supabase, user, profile } = useAuth();
  const today = getTodayIsoDate();

  const [selectedMonth, setSelectedMonth] = useState(() => today.slice(0, 7));
  const [todayRecord, setTodayRecord] = useState<EmployeeAttendanceRecord | null>(null);
  const [history, setHistory] = useState<EmployeeAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusChoice, setStatusChoice] = useState<'hadir' | 'izin' | 'sakit'>('hadir');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadAttendance = useCallback(async () => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const monthStart = `${selectedMonth}-01`;
      const [yearStr, monthStr] = selectedMonth.split('-');
      const lastDay = new Date(Number(yearStr), Number(monthStr), 0).getDate();
      const monthEnd = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

      const [todayRes, historyRes] = await Promise.all([
        supabase
          .from('employee_attendance')
          .select('*')
          .eq('user_id', user.id)
          .eq('attendance_date', today)
          .maybeSingle(),
        supabase
          .from('employee_attendance')
          .select('*')
          .eq('user_id', user.id)
          .gte('attendance_date', monthStart)
          .lte('attendance_date', monthEnd)
          .order('attendance_date', { ascending: false }),
      ]);

      const todayData = (todayRes.data as EmployeeAttendanceRecord | null) ?? null;
      setTodayRecord(todayData);
      if (todayData) {
        if (todayData.status === 'hadir' || todayData.status === 'izin' || todayData.status === 'sakit') {
          setStatusChoice(todayData.status);
        }
        setNotes(todayData.notes || '');
      }
      setHistory((historyRes.data as EmployeeAttendanceRecord[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [supabase, user, today, selectedMonth]);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  const handleSubmitCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      const nowIso = new Date().toISOString();
      const payload = {
        user_id: user.id,
        attendance_date: today,
        status: statusChoice as AttendanceStatus,
        check_in_at: statusChoice === 'hadir' ? todayRecord?.check_in_at || nowIso : null,
        notes: notes.trim(),
      };

      const { error } = await supabase
        .from('employee_attendance')
        .upsert(payload, { onConflict: 'user_id,attendance_date' });

      if (error) throw error;
      setFeedback({
        type: 'ok',
        text:
          statusChoice === 'hadir'
            ? 'Absensi masuk berhasil disimpan.'
            : `Keterangan ${statusChoice} hari ini berhasil disimpan.`,
      });
      await loadAttendance();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal menyimpan absensi.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (!supabase || !user || !todayRecord) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const { error } = await supabase
        .from('employee_attendance')
        .update({
          check_out_at: new Date().toISOString(),
          notes: notes.trim() || todayRecord.notes,
        })
        .eq('id', todayRecord.id)
        .eq('user_id', user.id);

      if (error) throw error;
      setFeedback({ type: 'ok', text: 'Jam pulang (check-out) berhasil dicatat.' });
      await loadAttendance();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal mencatat check-out.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const summary = {
    hadir: history.filter((h) => h.status === 'hadir').length,
    izin: history.filter((h) => h.status === 'izin').length,
    sakit: history.filter((h) => h.status === 'sakit').length,
    alfa: history.filter((h) => h.status === 'alfa').length,
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Absensi Mandiri Karyawan</h1>
          <p className="text-sm text-slate-600 mt-1">
            {profile?.full_name || user?.email} · {profile ? ROLE_LABELS[profile.role] : 'Karyawan'}
            {profile?.nip ? ` · NIP ${profile.nip}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-3.5 py-2 rounded-lg whitespace-nowrap">
          <Calendar className="w-4 h-4 shrink-0" />
          <span>{formatIndonesianDate(today)}</span>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Self-Attendance Form & Today Status */}
      <div className="grid lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleSubmitCheckIn}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Form Kehadiran Hari Ini</h2>
            {todayRecord && <StatusIndicator status={todayRecord.status} />}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Pilih Status Kehadiran
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-lg">
              {(['hadir', 'izin', 'sakit'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setStatusChoice(opt)}
                  className={`py-2 px-3 text-xs font-semibold rounded-md capitalize transition-colors cursor-pointer ${
                    statusChoice === opt
                      ? 'bg-red-700 text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="empNotes" className="block text-xs font-semibold text-slate-700">
              Catatan / Keterangan (Opsional)
            </label>
            <textarea
              id="empNotes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Hadir tepat waktu / Izin keperluan keluarga / Surat dokter terlampir"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={submitting || loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 disabled:bg-red-300 rounded-lg transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              {submitting
                ? 'Menyimpan...'
                : todayRecord
                  ? 'Perbarui Absensi Hari Ini'
                  : statusChoice === 'hadir'
                    ? 'Simpan Check-In Hadir'
                    : `Ajukan ${statusChoice.toUpperCase()}`}
            </button>

            {todayRecord && todayRecord.status === 'hadir' && !todayRecord.check_out_at && (
              <button
                type="button"
                onClick={handleCheckOut}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Catat Check-Out Pulang
              </button>
            )}
          </div>
        </form>

        {/* Summary Panel */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900">Ringkasan Bulan Dipilih</h2>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Hadir</div>
              <div className="text-2xl font-extrabold text-emerald-700 tabular-nums mt-1">
                {summary.hadir}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Izin</div>
              <div className="text-2xl font-extrabold text-amber-700 tabular-nums mt-1">
                {summary.izin}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Sakit</div>
              <div className="text-2xl font-extrabold text-sky-700 tabular-nums mt-1">
                {summary.sakit}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Alfa</div>
              <div className="text-2xl font-extrabold text-red-700 tabular-nums mt-1">
                {summary.alfa}
              </div>
            </div>
          </div>

          {todayRecord && (
            <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-xs text-slate-600">
              <span>Jam Masuk Hari Ini</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {formatTimeOnly(todayRecord.check_in_at)} · Pulang:{' '}
                {formatTimeOnly(todayRecord.check_out_at)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Personal Attendance Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900">
            Riwayat Kehadiran Pribadi ({selectedMonth})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6">Tanggal</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Check-In</th>
                <th className="py-3 px-4">Check-Out</th>
                <th className="py-3 px-6">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 px-6 text-center text-xs text-slate-500">
                    Memuat riwayat absensi...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 px-6 text-center text-xs text-slate-500">
                    Belum ada catatan absensi pada bulan ini.
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-6 font-medium text-slate-900 tabular-nums whitespace-nowrap">
                      {formatShortDate(item.attendance_date)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusIndicator status={item.status} />
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums">
                      {formatTimeOnly(item.check_in_at)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums">
                      {formatTimeOnly(item.check_out_at)}
                    </td>
                    <td className="py-3 px-6 text-xs text-slate-600">{item.notes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
