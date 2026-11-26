import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Download,
  GitFork,
  XCircle,
} from 'lucide-react';
import { SUPABASE_RELATIONAL_SCHEMA_SQL } from '../lib/schemaSql';

interface TableStatusMap {
  [key: string]: { ready: boolean; count: number | null };
}

export function SchemaSetupNotice({
  mode,
}: {
  mode: 'env-missing' | 'schema-missing';
}) {
  const [copied, setCopied] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [dbTables, setDbTables] = useState<TableStatusMap | null>(null);
  const [liveSql, setLiveSql] = useState<string>(SUPABASE_RELATIONAL_SCHEMA_SQL);

  useEffect(() => {
    if (mode !== 'schema-missing') return;
    fetch('/api/db/status')
      .then((res) => res.json())
      .then((data) => {
        if (data?.tables) {
          setDbTables(data.tables);
        }
      })
      .catch(() => {
        // Ignore check failure
      });

    fetch('/api/db/schema-sql')
      .then((res) => (res.ok ? res.text() : null))
      .then((sqlText) => {
        if (sqlText) setLiveSql(sqlText);
      })
      .catch(() => {
        // Fallback to bundled SQL
      });
  }, [mode]);

  const handleCopyFullSql = async () => {
    try {
      await navigator.clipboard.writeText(liveSql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleDownloadSql = () => {
    const blob = new Blob([liveSql], {
      type: 'application/sql;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'smk_prima_unggul_supabase_schema.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (mode === 'env-missing') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-950 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <h3 className="font-bold text-red-900">
              Konfigurasi Environment Supabase Belum Terpasang
            </h3>
            <p className="text-red-800 leading-relaxed">
              Aplikasi ini terhubung langsung ke Supabase Authentication dan database relasional
              PostgreSQL. Tambahkan variabel environment berikut pada panel <strong>Secrets</strong>{' '}
              atau file{' '}
              <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-red-200">
                .env
              </code>
              :
            </p>
            <ul className="font-mono text-xs bg-white border border-red-200 rounded-md p-3 space-y-1 text-slate-800">
              <li>SUPABASE_URL (atau VITE_SUPABASE_URL)</li>
              <li>SUPABASE_ANON_KEY (atau VITE_SUPABASE_ANON_KEY)</li>
              <li>SUPABASE_SERVICE_ROLE_KEY</li>
            </ul>
            <p className="text-xs text-red-700">
              Jika menggunakan Vercel, pastikan environment variables diaktifkan dan lakukan{' '}
              <strong>Redeploy</strong> agar perubahan terbaca.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const relations = [
    { table: 'majors', desc: 'Master 6 Jurusan (TKJ, DKV, BC, AK, MPLB, BD)' },
    { table: 'classes', desc: 'Master Kelas -> FK majors(code) & profiles(id)' },
    { table: 'profiles', desc: 'Profil Karyawan -> FK auth.users(id) ON DELETE CASCADE' },
    { table: 'students', desc: 'Data Siswa -> FK majors(code) & classes(id)' },
    { table: 'employee_attendance', desc: 'Absensi Karyawan -> FK profiles(id)' },
    { table: 'student_attendance', desc: 'Absensi Siswa -> FK students(id) & profiles(id)' },
  ];

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-amber-900">
              Inisialisasi Skema Database Relasional Supabase
            </h3>
            <p className="text-amber-800 text-xs leading-relaxed">
              Salin skrip SQL di bawah lalu jalankan di{' '}
              <strong>Supabase Dashboard → SQL Editor → Run</strong> untuk membuat seluruh tabel
              berelasi, foreign key, trigger admin pertama, dan kebijakan RLS.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyFullSql}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-amber-300 bg-white text-amber-950 hover:bg-amber-100 transition-colors whitespace-nowrap cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'SQL Tersalin!' : 'Salin SQL Lengkap'}
          </button>

          <button
            type="button"
            onClick={handleDownloadSql}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-red-700 text-white hover:bg-red-800 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh schema.sql
          </button>
        </div>
      </div>

      {/* Peta Relasi Tabel */}
      <div className="bg-white border border-amber-200 rounded-lg p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <GitFork className="w-4 h-4 text-red-700" />
            <span>Struktur Relasi Tabel PostgreSQL (Supabase)</span>
          </div>
          <button
            type="button"
            onClick={() => setShowSql((prev) => !prev)}
            className="text-xs font-semibold text-red-700 hover:underline cursor-pointer"
          >
            {showSql ? 'Sembunyikan Skrip SQL' : 'Lihat Pratinjau SQL'}
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          {relations.map((rel) => {
            const status = dbTables?.[rel.table];
            return (
              <div
                key={rel.table}
                className="flex items-start justify-between gap-2 text-xs p-2.5 rounded-md bg-slate-50 border border-slate-200"
              >
                <div>
                  <div className="font-mono font-bold text-slate-900">public.{rel.table}</div>
                  <div className="text-slate-600 mt-0.5">{rel.desc}</div>
                </div>
                {status && (
                  <span className="shrink-0 mt-0.5">
                    {status.ready ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {showSql && (
          <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-slate-900 text-slate-100 p-4 text-xs font-mono leading-relaxed">
            {liveSql}
          </pre>
        )}
      </div>
    </div>
  );
}
