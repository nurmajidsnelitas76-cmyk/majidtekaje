import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { MAJOR_LABELS, type MajorCode, type Student } from '../../types';

const MAJORS: MajorCode[] = ['TKJ', 'DKV', 'AK', 'BC', 'MPLB', 'BD'];

export default function StudentsPage() {
  const { supabase, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [majorFilter, setMajorFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [nis, setNis] = useState('');
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('');
  const [major, setMajor] = useState<MajorCode>('TKJ');

  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadStudents = useCallback(async () => {
    if (!supabase || !isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const relationalRes = await supabase
        .from('students')
        .select('*, majors:major (code, name, field_name), classes:class_id (id, name, major_code)')
        .order('class_name', { ascending: true })
        .order('full_name', { ascending: true });

      if (relationalRes.error) {
        // Fallback if majors/classes relations aren't initialized yet
        const fallbackRes = await supabase
          .from('students')
          .select('*')
          .order('class_name', { ascending: true })
          .order('full_name', { ascending: true });
        if (fallbackRes.error) throw fallbackRes.error;
        setStudents((fallbackRes.data as Student[]) ?? []);
      } else {
        setStudents((relationalRes.data as Student[]) ?? []);
      }
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal memuat data siswa.',
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, isAdmin]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (majorFilter !== 'ALL' && s.major !== majorFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !s.full_name.toLowerCase().includes(q) &&
          !s.nis.toLowerCase().includes(q) &&
          !s.class_name.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [students, majorFilter, searchQuery]);

  const openAddModal = () => {
    setEditingStudent(null);
    setNis('');
    setFullName('');
    setClassName('');
    setMajor('TKJ');
    setModalOpen(true);
  };

  const openEditModal = (stu: Student) => {
    setEditingStudent(stu);
    setNis(stu.nis);
    setFullName(stu.full_name);
    setClassName(stu.class_name);
    setMajor(stu.major);
    setModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        nis: nis.trim(),
        full_name: fullName.trim(),
        class_name: className.trim(),
        major,
        updated_at: new Date().toISOString(),
      };

      if (editingStudent) {
        const { error } = await supabase
          .from('students')
          .update(payload)
          .eq('id', editingStudent.id);
        if (error) throw error;
        setFeedback({ type: 'ok', text: `Data siswa ${payload.full_name} berhasil diperbarui.` });
      } else {
        const { error } = await supabase.from('students').insert(payload);
        if (error) throw error;
        setFeedback({ type: 'ok', text: `Siswa ${payload.full_name} berhasil ditambahkan.` });
      }

      setModalOpen(false);
      await loadStudents();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal menyimpan data siswa.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!supabase || !deleteTarget) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const { error } = await supabase.from('students').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setFeedback({ type: 'ok', text: `Data siswa ${deleteTarget.full_name} telah dihapus.` });
      setDeleteTarget(null);
      await loadStudents();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal menghapus data siswa.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
        Hanya Administrator yang memiliki akses untuk mengelola data master siswa.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Data Master Siswa</h1>
          <p className="text-sm text-slate-600 mt-1">
            Kelola daftar siswa (NIS, Nama Lengkap, Kelas, dan Jurusan) untuk diabsen oleh guru.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 shrink-0" />
          Tambah Siswa
        </button>
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

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan NIS, nama siswa, atau kelas..."
            className="w-full pl-10 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <select
          value={majorFilter}
          onChange={(e) => setMajorFilter(e.target.value)}
          className="sm:w-56 px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
        >
          <option value="ALL">Semua Jurusan</option>
          {MAJORS.map((m) => (
            <option key={m} value={m}>
              {m} — {MAJOR_LABELS[m]}
            </option>
          ))}
        </select>
      </div>

      {/* Student Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-3.5 border-b border-slate-200 text-xs text-slate-600">
          Total <strong className="text-slate-900 tabular-nums">{filteredStudents.length}</strong> siswa
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6">NIS</th>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Jurusan</th>
                <th className="py-3 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 px-6 text-center text-xs text-slate-500">
                    Memuat data siswa...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 px-6 text-center text-xs text-slate-500">
                    Belum ada data siswa. Klik tombol &quot;Tambah Siswa&quot; untuk mulai menambahkan.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu) => (
                  <tr key={stu.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-6 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {stu.nis}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      <Link
                        to={`/app/data-siswa/${stu.id}`}
                        className="hover:text-red-700 hover:underline"
                      >
                        {stu.full_name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{stu.class_name}</td>
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      <span className="font-mono font-bold text-red-700">{stu.major}</span>
                      <span className="text-slate-400 mx-1.5">·</span>
                      <span className="text-slate-600">{MAJOR_LABELS[stu.major]}</span>
                    </td>
                    <td className="py-3 px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          to={`/app/data-siswa/${stu.id}`}
                          className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100"
                          title="Detail & Riwayat Absensi"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEditModal(stu)}
                          className="p-1.5 text-slate-500 hover:text-red-700 rounded-md hover:bg-red-50 cursor-pointer"
                          title="Edit Siswa"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(stu)}
                          className="p-1.5 text-slate-500 hover:text-red-700 rounded-md hover:bg-red-50 cursor-pointer"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Data Siswa'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">NIS</label>
                <input
                  type="text"
                  required
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  placeholder="Contoh: 202601001"
                  className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Rizky Pratama"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Jurusan</label>
                  <select
                    value={major}
                    onChange={(e) => setMajor(e.target.value as MajorCode)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                  >
                    {MAJORS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Kelas</label>
                  <input
                    type="text"
                    required
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="Contoh: XI TKJ 1"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:bg-red-300 rounded-lg cursor-pointer"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Hapus Data Siswa?</h2>
            <p className="text-sm text-slate-600">
              Anda akan menghapus siswa <strong>{deleteTarget.full_name}</strong> (NIS{' '}
              <span className="font-mono">{deleteTarget.nis}</span>) beserta seluruh riwayat
              absensinya.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteStudent}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg cursor-pointer"
              >
                {submitting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
