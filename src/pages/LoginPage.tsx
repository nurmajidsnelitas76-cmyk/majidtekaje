import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, ShieldAlert, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SchemaSetupNotice } from '../components/SchemaSetupNotice';

export default function LoginPage() {
  const { supabase, user, loading, supabaseReady, schemaMissing, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [hasExistingUsers, setHasExistingUsers] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [nip, setNip] = useState('');
  const [selectedRole, setSelectedRole] = useState<'guru' | 'tenaga_kependidikan'>('guru');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/first-user-status')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.hasUsers === 'boolean') {
          setHasExistingUsers(data.hasUsers);
          if (data.hasUsers === false) {
            setMode('register');
          }
        }
      })
      .catch(() => {
        // Ignore check failure
      });
  }, []);

  if (!loading && user) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    if (!supabase) {
      setErrorMsg('Koneksi Supabase belum terkonfigurasi.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setErrorMsg(
            error.message === 'Invalid login credentials'
              ? 'Email atau kata sandi tidak sesuai.'
              : error.message
          );
          return;
        }
        await refreshProfile();
        navigate('/app', { replace: true });
      } else {
        if (!fullName.trim()) {
          setErrorMsg('Nama lengkap wajib diisi.');
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Kata sandi minimal 6 karakter.');
          return;
        }

        // Attempt server-side auto-confirmed registration first so user can log in immediately
        const regRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password,
            full_name: fullName.trim(),
            nip: nip.trim(),
            role: hasExistingUsers === false ? 'admin' : selectedRole,
          }),
        });

        const regBody = await regRes.json().catch(() => ({}));

        if (regRes.ok) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (signInErr) {
            setInfoMsg('Akun berhasil didaftarkan. Silakan masuk menggunakan email dan kata sandi Anda.');
            setMode('login');
            return;
          }
          await refreshProfile();
          navigate('/app', { replace: true });
          return;
        }

        if (!regBody.fallbackClientSignup) {
          setErrorMsg(regBody.error || 'Gagal mendaftarkan akun.');
          return;
        }

        // Fallback to standard Supabase client signUp when service role key is not configured
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              nip: nip.trim(),
              role: hasExistingUsers === false ? 'admin' : selectedRole,
            },
          },
        });
        if (error) {
          setErrorMsg(error.message);
          return;
        }
        if (data.session) {
          await refreshProfile();
          navigate('/app', { replace: true });
        } else {
          setInfoMsg(
            'Akun berhasil didaftarkan di Supabase Authentication. Periksa email Anda untuk konfirmasi atau langsung masuk jika konfirmasi email dinonaktifkan.'
          );
          setMode('login');
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses autentikasi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="text-lg font-extrabold tracking-tight text-red-700 whitespace-nowrap"
          >
            SMK Prima Unggul
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-700 transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            Kembali ke Profil Sekolah
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl grid md:grid-cols-12 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Brand Panel */}
          <div className="md:col-span-5 bg-red-700 text-white p-8 flex flex-col justify-between space-y-8">
            <div className="space-y-4">
              <div className="text-xs font-semibold text-red-100">
                Portal Sistem Absensi
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight leading-snug">
                SMK Prima Unggul
              </h1>
              <p className="text-sm text-red-100 leading-relaxed">
                Seluruh civitas sekolah—<strong className="text-white">Administrator</strong>,{' '}
                <strong className="text-white">Guru</strong>, dan{' '}
                <strong className="text-white">Tenaga Kependidikan</strong>—memiliki akses penuh
                untuk masuk dan mendaftar akun ke portal absensi sekolah.
              </p>
            </div>

            <div className="space-y-3 border-t border-red-600/60 pt-5 text-xs text-red-100 leading-relaxed">
              <div className="font-semibold text-white">Ketentuan Hak Akses Login</div>
              <p>
                Akun pertama yang terdaftar pada Supabase Authentication otomatis menjadi{' '}
                <strong className="text-white">Administrator</strong>. Pengguna berikutnya dapat
                langsung mendaftar sebagai <strong className="text-white">Guru</strong> atau{' '}
                <strong className="text-white">Tenaga Kependidikan</strong> maupun dibuatkan akun
                oleh Administrator.
              </p>
            </div>
          </div>

          {/* Auth Form Panel */}
          <div className="md:col-span-7 p-8 space-y-6">
            {!loading && !supabaseReady && <SchemaSetupNotice mode="env-missing" />}
            {!loading && supabaseReady && schemaMissing && (
              <SchemaSetupNotice mode="schema-missing" />
            )}

            {hasExistingUsers === false && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-900 flex items-start gap-2.5">
                <UserPlus className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                <span>
                  Belum ada akun terdaftar di Supabase Authentication. Daftarkan akun pertama Anda
                  sekarang untuk menjadi <strong>Administrator</strong> sistem.
                </span>
              </div>
            )}

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Masuk Akun
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {hasExistingUsers === false ? 'Daftar Admin Pertama' : 'Daftar Akun Baru'}
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {infoMsg && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
                {infoMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700">
                      Nama Lengkap
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Contoh: Drs. Ahmad Suryadi"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="nip" className="block text-xs font-semibold text-slate-700">
                        NIP / NUPTK (Opsional)
                      </label>
                      <input
                        id="nip"
                        type="text"
                        value={nip}
                        onChange={(e) => setNip(e.target.value)}
                        placeholder="Contoh: 198405122010011004"
                        className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
                      />
                    </div>

                    {hasExistingUsers !== false && (
                      <div className="space-y-1.5">
                        <label
                          htmlFor="registerRole"
                          className="block text-xs font-semibold text-slate-700"
                        >
                          Peran / Jabatan
                        </label>
                        <select
                          id="registerRole"
                          value={selectedRole}
                          onChange={(e) =>
                            setSelectedRole(e.target.value as 'guru' | 'tenaga_kependidikan')
                          }
                          className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                        >
                          <option value="guru">Guru</option>
                          <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
                        </select>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
                  Email Sekolah
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@smkprimaunggul.sch.id"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !supabaseReady}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 disabled:bg-red-300 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting
                  ? 'Memproses...'
                  : mode === 'login'
                    ? 'Masuk ke Aplikasi'
                    : 'Daftarkan & Langsung Masuk'}
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="py-5 text-center text-xs text-slate-500">
        SMK Prima Unggul · Sistem Informasi Absensi Siswa &amp; Karyawan
      </footer>
    </div>
  );
}
