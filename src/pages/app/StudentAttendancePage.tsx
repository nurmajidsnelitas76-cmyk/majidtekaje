import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCheck, Save, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatIndonesianDate, getTodayIsoDate } from '../../lib/date';
import type { AttendanceStatus, MajorCode, Student } from '../../types';

const MAJORS: MajorCode[] = ['TKJ', 'DKV', 'AK', 'BC', 'MPLB', 'BD'];

export default function StudentAttendancePage() {
  const { supabase, user, profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getTodayIsoDate());
  const [majorFilter, setMajorFilter] = useState<string>('ALL');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [students, setStudents] = useState<Student[]>([]);
  const [draftMap, setDraftMap] = useState<
    Record<string, { status: AttendanceStatus; notes: string }>
  >({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const canAccess = profile?.role === 'admin' || profile?.role === 'guru';

  const loadData = useCallback(async () => {
    if (!supabase || !canAccess) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [studentsRes, attendanceRes] = await Promise.all([
        supabase
          .from('students')
          .select('*')
          .order('class_name', { ascending: true })
          .order('full_name', { ascending: true }),
        supabase
          .from('student_attendance')
          .select('*')
          .eq('attendance_date', selectedDate),
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (attendanceRes.error) throw attendanceRes.error;

      const studentRows = (studentsRes.data as Student[]) ?? [];
      setStudents(studentRows);

      const existingByStudent = new Map(
        (attendanceRes.data || []).map((rec) => [rec.student_id, rec])
      );

      const nextDraft: Record<string, { status: AttendanceStatus; notes: string }> = {};
      for (const stu of studentRows) {
        const existing = existingByStudent.get(stu.id);
        nextDraft[stu.id] = {
          status: (existing?.status as AttendanceStatus) || 'hadir',
          notes: existing?.notes || '',
        };
      }
      setDraftMap(nextDraft);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal memuat data siswa.',
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, canAccess, selectedDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const classOptions = useMemo(() => {
    const filteredByMajor =
      majorFilter === 'ALL' ? students : students.filter((s) => s.major === majorFilter);
    return Array.from(new Set(filteredByMajor.map((s) => s.class_name))).sort();
  }, [students, majorFilter]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (majorFilter !== 'ALL' && s.major !== majorFilter) return false;
      if (classFilter !== 'ALL' && s.class_name !== classFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!s.full_name.toLowerCase().includes(q) && !s.nis.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [students, majorFilter, classFilter, searchQuery]);

  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setDraftMap((prev) => ({
      ...prev,
      [studentId]: {
        status,
        notes: prev[studentId]?.notes || '',
      },
    }));
  };

  const setStudentNotes = (studentId: string, notes: string) => {
    setDraftMap((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || 'hadir',
        notes,
      },
    }));
  };

  const handleMarkAllPresent = () => {
    setDraftMap((prev) => {
      const updated = { ...prev };
      for (const stu of filteredStudents) {
        updated[stu.id] = {
          status: 'hadir',
          notes: updated[stu.id]?.notes || '',
        };
      }
      return updated;
    });
  };

  const handleSaveAttendance = async () => {
    if (!supabase || !user || filteredStudents.length === 0) return;

    setSaving(true);
    setFeedback(null);
    try {
      const rows = filteredStudents.map((stu) => ({
        student_id: stu.id,
        recorded_by: user.id,
        attendance_date: selectedDate,
        status: draftMap[stu.id]?.status || 'hadir',
        notes: (draftMap[stu.id]?.notes || '').trim(),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('student_attendance')
        .upsert(rows, { onConflict: 'student_id,attendance_date' });

      if (error) throw error;

      setFeedback({
        type: 'ok',
        text: `Berhasil menyimpan absensi ${rows.length} siswa untuk tanggal ${formatIndonesianDate(selectedDate)}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal menyimpan absensi siswa.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
        Hanya Administrator dan Guru yang memiliki akses untuk menginput absensi siswa.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Input Absensi Siswa</h1>
          <p className="text-sm text-slate-600 mt-1">
            Tandai status kehadiran siswa (Hadir, Izin, Sakit, Alfa) sesuai kelas dan tanggal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleMarkAllPresent}
            disabled={filteredStudents.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 shrink-0" />
            Tandai Semua Hadir
          </button>

          <button
            type="button"
            onClick={handleSaveAttendance}
            disabled={saving || filteredStudents.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 disabled:bg-red-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Save className="w-4 h-4 shrink-0" />
            {saving ? 'Menyimpan...' : 'Simpan Absensi Siswa'}
          </button>
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

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">Tanggal Absensi</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">Jurusan</label>
          <select
            value={majorFilter}
            onChange={(e) => {
              setMajorFilter(e.target.value);
              setClassFilter('ALL');
            }}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
          >
            <option value="ALL">Semua Jurusan</option>
            {MAJORS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">Kelas</label>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
          >
            <option value="ALL">Semua Kelas</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">Cari Siswa</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nama atau NIS..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
        </div>
      </div>

      {/* Students Attendance Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Menampilkan <strong className="text-slate-900 tabular-nums">{filteredStudents.length}</strong> siswa
          </span>
          <span className="font-mono">{selectedDate}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6">NIS</th>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Status Kehadiran</th>
                <th className="py-3 px-6">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 px-6 text-center text-xs text-slate-500">
                    Memuat daftar siswa...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 px-6 text-center text-xs text-slate-500">
                    Belum ada data siswa yang sesuai filter. Admin dapat menambahkan siswa pada menu Data Siswa.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu) => {
                  const current = draftMap[stu.id] || { status: 'hadir', notes: '' };
                  return (
                    <tr key={stu.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-6 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {stu.nis}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {stu.full_name}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                        {stu.class_name} · <span className="font-mono font-semibold text-red-700">{stu.major}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                          {(['hadir', 'izin', 'sakit', 'alfa'] as AttendanceStatus[]).map((st) => {
                            const active = current.status === st;
                            let activeClass = 'bg-emerald-600 text-white';
                            if (st === 'izin') activeClass = 'bg-amber-500 text-white';
                            if (st === 'sakit') activeClass = 'bg-sky-600 text-white';
                            if (st === 'alfa') activeClass = 'bg-red-700 text-white';

                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setStudentStatus(stu.id, st)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-md capitalize transition-colors cursor-pointer ${
                                  active
                                    ? activeClass
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-6 min-w-[200px]">
                        <input
                          type="text"
                          value={current.notes}
                          onChange={(e) => setStudentNotes(stu.id, e.target.value)}
                          placeholder="Catatan opsional..."
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
