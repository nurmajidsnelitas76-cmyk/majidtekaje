import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatShortDate } from '../../lib/date';
import { MAJOR_LABELS, type Student, type StudentAttendanceRecord } from '../../types';
import { StatusIndicator } from '../../components/StatusIndicator';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { supabase, profile } = useAuth();
  const isAdminOrGuru = profile?.role === 'admin' || profile?.role === 'guru';

  const [student, setStudent] = useState<Student | null>(null);
  const [records, setRecords] = useState<StudentAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!supabase || !id || !isAdminOrGuru) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [stuRes, attRes] = await Promise.all([
          supabase.from('students').select('*').eq('id', id).maybeSingle(),
          supabase
            .from('student_attendance')
            .select('*')
            .eq('student_id', id)
            .order('attendance_date', { ascending: false }),
        ]);

        setStudent((stuRes.data as Student | null) ?? null);
        setRecords((attRes.data as StudentAttendanceRecord[]) ?? []);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [supabase, id, isAdminOrGuru]);

  if (!isAdminOrGuru) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
        Akses ditolak.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
        Memuat detail siswa...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-4 text-center">
        <div className="text-sm text-slate-600">Data siswa tidak ditemukan.</div>
        <Link
          to="/app/data-siswa"
          className="inline-flex items-center gap-2 text-xs font-semibold text-red-700 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Data Siswa
        </Link>
      </div>
    );
  }

  const hadir = records.filter((r) => r.status === 'hadir').length;
  const izin = records.filter((r) => r.status === 'izin').length;
  const sakit = records.filter((r) => r.status === 'sakit').length;
  const alfa = records.filter((r) => r.status === 'alfa').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/app/data-siswa"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-red-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Daftar Siswa
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
        <div className="font-mono text-xs font-bold text-red-700">
          NIS {student.nis} · {student.major}
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">{student.full_name}</h1>
        <p className="text-sm text-slate-600">
          Kelas {student.class_name} · {MAJOR_LABELS[student.major]}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Hadir</div>
          <div className="text-xl font-extrabold text-emerald-700 tabular-nums mt-1">{hadir}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Izin</div>
          <div className="text-xl font-extrabold text-amber-700 tabular-nums mt-1">{izin}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Sakit</div>
          <div className="text-xl font-extrabold text-sky-700 tabular-nums mt-1">{sakit}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Alfa</div>
          <div className="text-xl font-extrabold text-red-700 tabular-nums mt-1">{alfa}</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900">Riwayat Kehadiran Siswa</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6">Tanggal</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 px-6 text-center text-xs text-slate-500">
                    Belum ada riwayat absensi untuk siswa ini.
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-6 font-medium text-slate-900 tabular-nums">
                      {formatShortDate(rec.attendance_date)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusIndicator status={rec.status} />
                    </td>
                    <td className="py-3 px-6 text-xs text-slate-600">{rec.notes || '—'}</td>
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
