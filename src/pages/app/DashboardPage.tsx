import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  GraduationCap,
  LogIn,
  LogOut as LogOutIcon,
  Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  formatIndonesianDate,
  formatShortDate,
  formatTimeOnly,
  getFirstDayOfMonthIso,
  getTodayIsoDate,
} from '../../lib/date';
import { ROLE_LABELS, type EmployeeAttendanceRecord } from '../../types';
import { StatusIndicator } from '../../components/StatusIndicator';

export default function DashboardPage() {
  const { supabase, user, profile } = useAuth();
  const today = getTodayIsoDate();
  const monthStart = getFirstDayOfMonthIso();

  const [nowText, setNowText] = useState(() =>
    new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date())
  );

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [todayRecord, setTodayRecord] = useState<EmployeeAttendanceRecord | null>(null);
  const [myMonthLogs, setMyMonthLogs] = useState<EmployeeAttendanceRecord[]>([]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentEmployeesToday: 0,
    totalStudents: 0,
    presentStudentsToday: 0,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setNowText(
        new Intl.DateTimeFormat('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(new Date())
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!supabase || !user || !profile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [todayRes, monthRes] = await Promise.all([
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
          .order('attendance_date', { ascending: false })
          .limit(10),
      ]);

      setTodayRecord((todayRes.data as EmployeeAttendanceRecord | null) ?? null);
      setMyMonthLogs((monthRes.data as EmployeeAttendanceRecord[]) ?? []);

      if (profile.role === 'admin' || profile.role === 'guru') {
        const [stuTotalRes, stuTodayRes] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase
            .from('student_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('attendance_date', today)
            .eq('status', 'hadir'),
        ]);

        let empTotal = 0;
        let empToday = 0;
        if (profile.role === 'admin') {
          const [eTot, eTod] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase
              .from('employee_attendance')
              .select('*', { count: 'exact', head: true })
              .eq('attendance_date', today)
              .eq('status', 'hadir'),
          ]);
          empTotal = eTot.count ?? 0;
          empToday = eTod.count ?? 0;
        }

        setStats({
          totalEmployees: empTotal,
          presentEmployeesToday: empToday,
          totalStudents: stuTotalRes.count ?? 0,
          presentStudentsToday: stuTodayRes.count ?? 0,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, user, profile, today, monthStart]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const handleQuickCheckIn = async () => {
    if (!supabase || !user) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase.from('employee_attendance').upsert(
        {
          user_id: user.id,
          attendance_date: today,
          status: 'hadir',
          check_in_at: nowIso,
          notes: 'Check-in mandiri dari dashboard',
        },
        { onConflict: 'user_id,attendance_date' }
      );
      if (error) throw error;
      setFeedback({ type: 'ok', text: 'Check-in kehadiran hari ini berhasil dicatat.' });
      await loadDashboard();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal mencatat check-in.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickCheckOut = async () => {
    if (!supabase || !user || !todayRecord) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('employee_attendance')
        .update({ check_out_at: nowIso })
        .eq('id', todayRecord.id)
        .eq('user_id', user.id);
      if (error) throw error;
      setFeedback({ type: 'ok', text: 'Check-out pulang berhasil dicatat.' });
      await loadDashboard();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal mencatat check-out.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const role = profile?.role ?? 'tenaga_kependidikan';
  const myPresentCount = myMonthLogs.filter((r) => r.status === 'hadir').length;
  const myLeaveCount = myMonthLogs.filter((r) => r.status === 'izin' || r.status === 'sakit').length;

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-red-700">
            {ROLE_LABELS[role]} · SMK Prima Unggul
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Selamat Datang, {profile?.full_name || user?.email}
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{formatIndonesianDate(today)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
          <div className="text-left md:text-right">
            <div className="text-xs text-slate-500">Waktu Lokal</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {nowText}
            </div>
          </div>
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

      {/* Personal Attendance Quick Action */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500">
            Status Presensi Pribadi Hari Ini
          </div>
          {loading ? (
            <div className="h-6 w-48 bg-slate-100 rounded animate-pulse" />
          ) : todayRecord ? (
            <div className="flex flex-wrap items-center gap-3">
              <StatusIndicator status={todayRecord.status} />
              <span className="text-sm text-slate-600 font-mono tabular-nums">
                Masuk: {formatTimeOnly(todayRecord.check_in_at)}
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="text-sm text-slate-600 font-mono tabular-nums">
                Pulang: {formatTimeOnly(todayRecord.check_out_at)}
              </span>
            </div>
          ) : (
            <div className="text-sm font-semibold text-slate-800">
              Anda belum melakukan absensi masuk hari ini.
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {!todayRecord && (
            <button
              type="button"
              onClick={handleQuickCheckIn}
              disabled={submitting || loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 disabled:bg-red-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              {submitting ? 'Menyimpan...' : 'Check-In Hadir Sekarang'}
            </button>
          )}

          {todayRecord && todayRecord.status === 'hadir' && !todayRecord.check_out_at && (
            <button
              type="button"
              onClick={handleQuickCheckOut}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogOutIcon className="w-4 h-4 shrink-0" />
              {submitting ? 'Menyimpan...' : 'Check-Out Pulang'}
            </button>
          )}

          <Link
            to="/app/absensi-karyawan"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap"
          >
            Buka Menu Absensi Karyawan
            <ArrowRight className="w-4 h-4 shrink-0" />
          </Link>
        </div>
      </div>

      {/* Role-Specific Summary KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {role === 'admin' && (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Total Karyawan</span>
                <Users className="w-4 h-4 text-red-700" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {stats.totalEmployees}
              </div>
              <Link
                to="/app/users"
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline"
              >
                Kelola User <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Karyawan Hadir Hari Ini</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {stats.presentEmployeesToday}
              </div>
              <Link
                to="/app/rekap/karyawan"
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline"
              >
                Lihat Rekap Karyawan <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </>
        )}

        {(role === 'admin' || role === 'guru') && (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Total Siswa Terdaftar</span>
                <GraduationCap className="w-4 h-4 text-red-700" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {stats.totalStudents}
              </div>
              <Link
                to={role === 'admin' ? '/app/data-siswa' : '/app/absensi-siswa'}
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline"
              >
                {role === 'admin' ? 'Kelola Data Siswa' : 'Absen Siswa'}{' '}
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Siswa Hadir Hari Ini</span>
                <ClipboardCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {stats.presentStudentsToday}
              </div>
              <Link
                to="/app/rekap/siswa"
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline"
              >
                Lihat Rekap Siswa <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </>
        )}

        {(role === 'guru' || role === 'tenaga_kependidikan') && (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Hadir Bulan Ini (Saya)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {myPresentCount} Hari
              </div>
              <div className="text-xs text-slate-500">Periode berjalan</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Izin / Sakit Bulan Ini</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {myLeaveCount} Hari
              </div>
              <div className="text-xs text-slate-500">Periode berjalan</div>
            </div>
          </>
        )}
      </div>

      {/* Personal Recent Attendance Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2 className="text-sm font-bold text-slate-900">
            Riwayat Absensi Pribadi Bulan Ini
          </h2>
          <Link
            to="/app/absensi-karyawan"
            className="text-xs font-semibold text-red-700 hover:underline whitespace-nowrap"
          >
            Lihat Semua
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6">Tanggal</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Jam Masuk</th>
                <th className="py-3 px-4">Jam Pulang</th>
                <th className="py-3 px-6">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 px-6 text-center text-slate-500 text-xs">
                    Memuat data kehadiran...
                  </td>
                </tr>
              ) : myMonthLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 px-6 text-center text-slate-500 text-xs">
                    Belum ada catatan presensi pribadi di bulan ini.
                  </td>
                </tr>
              ) : (
                myMonthLogs.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-6 font-medium text-slate-900 tabular-nums whitespace-nowrap">
                      {formatShortDate(row.attendance_date)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusIndicator status={row.status} />
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums">
                      {formatTimeOnly(row.check_in_at)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums">
                      {formatTimeOnly(row.check_out_at)}
                    </td>
                    <td className="py-3 px-6 text-xs text-slate-600">
                      {row.notes || '—'}
                    </td>
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
