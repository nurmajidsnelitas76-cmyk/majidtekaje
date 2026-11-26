import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  downloadCsv,
  formatShortDate,
  formatTimeOnly,
  getFirstDayOfMonthIso,
  getTodayIsoDate,
} from '../../lib/date';
import {
  ATTENDANCE_STATUS_LABELS,
  ROLE_LABELS,
  type AttendanceStatus,
  type EmployeeAttendanceRecord,
  type MajorCode,
  type StudentAttendanceRecord,
  type UserRole,
} from '../../types';
import { StatusIndicator } from '../../components/StatusIndicator';

const MAJORS: MajorCode[] = ['TKJ', 'DKV', 'AK', 'BC', 'MPLB', 'BD'];

export default function AttendanceRecapPage() {
  const { type } = useParams<{ type: string }>();
  const { supabase, profile } = useAuth();

  const recapType = type === 'karyawan' ? 'karyawan' : 'siswa';
  const isAdmin = profile?.role === 'admin';
  const isGuru = profile?.role === 'guru';

  const canAccess =
    (recapType === 'karyawan' && isAdmin) ||
    (recapType === 'siswa' && (isAdmin || isGuru));

  const [startDate, setStartDate] = useState(getFirstDayOfMonthIso());
  const [endDate, setEndDate] = useState(getTodayIsoDate());
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [majorFilter, setMajorFilter] = useState<string>('ALL');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [employeeRows, setEmployeeRows] = useState<EmployeeAttendanceRecord[]>([]);
  const [studentRows, setStudentRows] = useState<StudentAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadRecap = useCallback(async () => {
    if (!supabase || !canAccess) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      if (recapType === 'karyawan') {
        const { data, error } = await supabase
          .from('employee_attendance')
          .select(
            '*, profiles:user_id (id, full_name, email, nip, role, jabatan)'
          )
          .gte('attendance_date', startDate)
          .lte('attendance_date', endDate)
          .order('attendance_date', { ascending: false });

        if (error) throw error;
        setEmployeeRows((data as EmployeeAttendanceRecord[]) ?? []);
      } else {
        const { data, error } = await supabase
          .from('student_attendance')
          .select(
            '*, students:student_id (id, nis, full_name, class_name, major)'
          )
          .gte('attendance_date', startDate)
          .lte('attendance_date', endDate)
          .order('attendance_date', { ascending: false });

        if (error) throw error;
        setStudentRows((data as StudentAttendanceRecord[]) ?? []);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat rekap absensi.');
    } finally {
      setLoading(false);
    }
  }, [supabase, canAccess, recapType, startDate, endDate]);

  useEffect(() => {
    void loadRecap();
  }, [loadRecap]);

  const studentClassOptions = useMemo(() => {
    const classes = studentRows
      .map((r) => r.students?.class_name)
      .filter((c): c is string => Boolean(c));
    return Array.from(new Set(classes)).sort();
  }, [studentRows]);

  const filteredEmployees = useMemo(() => {
    return employeeRows.filter((row) => {
      if (statusFilter !== 'ALL' && row.status !== statusFilter) return false;
      if (roleFilter !== 'ALL' && row.profiles?.role !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (row.profiles?.full_name || '').toLowerCase();
        const email = (row.profiles?.email || '').toLowerCase();
        const nip = (row.profiles?.nip || '').toLowerCase();
        if (!name.includes(q) && !email.includes(q) && !nip.includes(q)) return false;
      }
      return true;
    });
  }, [employeeRows, statusFilter, roleFilter, searchQuery]);

  const filteredStudents = useMemo(() => {
    return studentRows.filter((row) => {
      if (statusFilter !== 'ALL' && row.status !== statusFilter) return false;
      if (majorFilter !== 'ALL' && row.students?.major !== majorFilter) return false;
      if (classFilter !== 'ALL' && row.students?.class_name !== classFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (row.students?.full_name || '').toLowerCase();
        const nis = (row.students?.nis || '').toLowerCase();
        if (!name.includes(q) && !nis.includes(q)) return false;
      }
      return true;
    });
  }, [studentRows, statusFilter, majorFilter, classFilter, searchQuery]);

  const summaryCounts = useMemo(() => {
    const source = recapType === 'karyawan' ? filteredEmployees : filteredStudents;
    return {
      total: source.length,
      hadir: source.filter((r) => r.status === 'hadir').length,
      izin: source.filter((r) => r.status === 'izin').length,
      sakit: source.filter((r) => r.status === 'sakit').length,
      alfa: source.filter((r) => r.status === 'alfa').length,
    };
  }, [recapType, filteredEmployees, filteredStudents]);

  const handleExportCsv = () => {
    if (recapType === 'karyawan') {
      downloadCsv(
        `rekap-absensi-karyawan-${startDate}-sd-${endDate}.csv`,
        ['Tanggal', 'NIP', 'Nama Lengkap', 'Email', 'Role', 'Status', 'Jam Masuk', 'Jam Pulang', 'Catatan'],
        filteredEmployees.map((r) => [
          r.attendance_date,
          r.profiles?.nip || '',
          r.profiles?.full_name || '',
          r.profiles?.email || '',
          r.profiles?.role ? ROLE_LABELS[r.profiles.role as UserRole] : '',
          ATTENDANCE_STATUS_LABELS[r.status as AttendanceStatus],
          formatTimeOnly(r.check_in_at),
          formatTimeOnly(r.check_out_at),
          r.notes || '',
        ])
      );
    } else {
      downloadCsv(
        `rekap-absensi-siswa-${startDate}-sd-${endDate}.csv`,
        ['Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Jurusan', 'Status', 'Catatan'],
        filteredStudents.map((r) => [
          r.attendance_date,
          r.students?.nis || '',
          r.students?.full_name || '',
          r.students?.class_name || '',
          r.students?.major || '',
          ATTENDANCE_STATUS_LABELS[r.status as AttendanceStatus],
          r.notes || '',
        ])
      );
    }
  };

  if (!canAccess) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
        Anda tidak memiliki izin untuk mengakses halaman rekap ini.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            {recapType === 'karyawan' ? 'Rekap Absensi Karyawan' : 'Rekap Absensi Siswa'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {recapType === 'karyawan'
              ? 'Laporan kehadiran harian seluruh Administrator, Guru, dan Tenaga Kependidikan.'
              : 'Laporan kehadiran harian siswa SMK Prima Unggul per kelas dan jurusan.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={summaryCounts.total === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 disabled:bg-red-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4 shrink-0" />
          Ekspor CSV
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Total Catatan</div>
          <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">
            {summaryCounts.total}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Hadir</div>
          <div className="text-xl font-extrabold text-emerald-700 tabular-nums mt-1">
            {summaryCounts.hadir}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Izin</div>
          <div className="text-xl font-extrabold text-amber-700 tabular-nums mt-1">
            {summaryCounts.izin}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Sakit</div>
          <div className="text-xl font-extrabold text-sky-700 tabular-nums mt-1">
            {summaryCounts.sakit}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 col-span-2 sm:col-span-1">
          <div className="text-xs text-slate-500">Alfa</div>
          <div className="text-xl font-extrabold text-red-700 tabular-nums mt-1">
            {summaryCounts.alfa}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">Dari Tanggal</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">Sampai Tanggal</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="hadir">Hadir</option>
            <option value="izin">Izin</option>
            <option value="sakit">Sakit</option>
            <option value="alfa">Alfa</option>
          </select>
        </div>

        {recapType === 'karyawan' ? (
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Role Karyawan</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
            >
              <option value="ALL">Semua Role</option>
              <option value="admin">Administrator</option>
              <option value="guru">Guru</option>
              <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
            </select>
          </div>
        ) : (
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Jurusan / Kelas</label>
            <div className="flex gap-2">
              <select
                value={majorFilter}
                onChange={(e) => setMajorFilter(e.target.value)}
                className="w-1/2 px-2 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
              >
                <option value="ALL">Jurusan</option>
                {MAJORS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-1/2 px-2 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
              >
                <option value="ALL">Kelas</option>
                {studentClassOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">Pencarian</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={recapType === 'karyawan' ? 'Nama / NIP / Email...' : 'Nama / NIS...'}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
        </div>
      </div>

      {/* Recap Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {recapType === 'karyawan' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-6">Tanggal</th>
                  <th className="py-3 px-4">Nama Karyawan</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Masuk</th>
                  <th className="py-3 px-4">Pulang</th>
                  <th className="py-3 px-6">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 px-6 text-center text-xs text-slate-500">
                      Memuat rekap absensi karyawan...
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 px-6 text-center text-xs text-slate-500">
                      Tidak ada catatan absensi karyawan pada rentang filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-6 font-medium text-slate-900 tabular-nums whitespace-nowrap">
                        {formatShortDate(row.attendance_date)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {row.profiles?.full_name || '—'}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {row.profiles?.nip ? `NIP ${row.profiles.nip}` : row.profiles?.email}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                        {row.profiles?.role
                          ? ROLE_LABELS[row.profiles.role as UserRole]
                          : '—'}
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
                      <td className="py-3 px-6 text-xs text-slate-600">{row.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-6">Tanggal</th>
                  <th className="py-3 px-4">NIS</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Kelas · Jurusan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-10 px-6 text-center text-xs text-slate-500">
                      Memuat rekap absensi siswa...
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 px-6 text-center text-xs text-slate-500">
                      Tidak ada catatan absensi siswa pada rentang filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-6 font-medium text-slate-900 tabular-nums whitespace-nowrap">
                        {formatShortDate(row.attendance_date)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {row.students?.nis || '—'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {row.students?.full_name || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                        {row.students?.class_name || '—'} ·{' '}
                        <span className="font-mono font-semibold text-red-700">
                          {row.students?.major || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusIndicator status={row.status} />
                      </td>
                      <td className="py-3 px-6 text-xs text-slate-600">{row.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
