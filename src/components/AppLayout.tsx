import { useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS } from '../types';
import { SchemaSetupNotice } from './SchemaSetupNotice';

function getPageTitle(pathname: string): string {
  if (pathname === '/app') return 'Dashboard';
  if (pathname.startsWith('/app/absensi-karyawan')) return 'Absensi Karyawan';
  if (pathname.startsWith('/app/absensi-siswa')) return 'Absensi Siswa';
  if (pathname.startsWith('/app/rekap/karyawan')) return 'Rekap Absensi · Karyawan';
  if (pathname.startsWith('/app/rekap/siswa')) return 'Rekap Absensi · Siswa';
  if (pathname.startsWith('/app/data-siswa/')) return 'Detail Kehadiran Siswa';
  if (pathname.startsWith('/app/data-siswa')) return 'Data Siswa';
  if (pathname.startsWith('/app/users')) return 'User Management';
  return 'Dashboard';
}

export default function AppLayout() {
  const { user, profile, loading, supabaseReady, schemaMissing, authError, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [rekapOpen, setRekapOpen] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm font-medium text-slate-600">Memuat sesi aplikasi...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = profile?.role ?? 'tenaga_kependidikan';
  const isAdmin = role === 'admin';
  const isGuru = role === 'guru';
  const canStudentAttendance = isAdmin || isGuru;
  const canRecap = isAdmin || isGuru;

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut();
    navigate('/login', { replace: true });
  };

  const isActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Brand Area */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 shrink-0">
        <Link
          to="/app"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 whitespace-nowrap"
        >
          <span className="w-7 h-7 rounded-md bg-red-700 text-white flex items-center justify-center text-xs font-extrabold">
            PU
          </span>
          <span className="text-base font-extrabold tracking-tight text-slate-900">
            SMK Prima Unggul
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Tutup menu"
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links (Left Side Menu) */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <Link
          to="/app"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
            isActive('/app', true)
              ? 'bg-red-700 text-white font-semibold'
              : 'text-slate-700 hover:bg-red-50 hover:text-red-700 font-medium'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>Dashboard</span>
        </Link>

        <Link
          to="/app/absensi-karyawan"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
            isActive('/app/absensi-karyawan')
              ? 'bg-red-700 text-white font-semibold'
              : 'text-slate-700 hover:bg-red-50 hover:text-red-700 font-medium'
          }`}
        >
          <UserCheck className="w-4 h-4 shrink-0" />
          <span>Absensi Karyawan</span>
        </Link>

        {canStudentAttendance && (
          <Link
            to="/app/absensi-siswa"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
              isActive('/app/absensi-siswa')
                ? 'bg-red-700 text-white font-semibold'
                : 'text-slate-700 hover:bg-red-50 hover:text-red-700 font-medium'
            }`}
          >
            <ClipboardCheck className="w-4 h-4 shrink-0" />
            <span>Absensi Siswa</span>
          </Link>
        )}

        {canRecap && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setRekapOpen((prev) => !prev)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
                isActive('/app/rekap')
                  ? 'bg-red-50 text-red-700 font-semibold'
                  : 'text-slate-700 hover:bg-red-50 hover:text-red-700 font-medium'
              }`}
            >
              <span className="flex items-center gap-3">
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Rekap Absensi</span>
              </span>
              {rekapOpen ? (
                <ChevronDown className="w-4 h-4 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0" />
              )}
            </button>

            {rekapOpen && (
              <div className="mt-1 ml-6 pl-3 border-l border-slate-200 space-y-1">
                {isAdmin && (
                  <Link
                    to="/app/rekap/karyawan"
                    onClick={() => setMobileOpen(false)}
                    className={`block px-3 py-2 rounded-md text-xs transition-colors whitespace-nowrap ${
                      isActive('/app/rekap/karyawan')
                        ? 'bg-red-700 text-white font-semibold'
                        : 'text-slate-600 hover:bg-red-50 hover:text-red-700 font-medium'
                    }`}
                  >
                    Absensi Karyawan
                  </Link>
                )}
                <Link
                  to="/app/rekap/siswa"
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded-md text-xs transition-colors whitespace-nowrap ${
                    isActive('/app/rekap/siswa')
                      ? 'bg-red-700 text-white font-semibold'
                      : 'text-slate-600 hover:bg-red-50 hover:text-red-700 font-medium'
                  }`}
                >
                  Absensi Siswa
                </Link>
              </div>
            )}
          </div>
        )}

        {isAdmin && (
          <>
            <Link
              to="/app/data-siswa"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
                isActive('/app/data-siswa')
                  ? 'bg-red-700 text-white font-semibold'
                  : 'text-slate-700 hover:bg-red-50 hover:text-red-700 font-medium'
              }`}
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>Data Siswa</span>
            </Link>

            <Link
              to="/app/users"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
                isActive('/app/users')
                  ? 'bg-red-700 text-white font-semibold'
                  : 'text-slate-700 hover:bg-red-50 hover:text-red-700 font-medium'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>User Management</span>
            </Link>
          </>
        )}
      </nav>

      {/* Bottom School Link */}
      <div className="p-4 border-t border-slate-200 text-xs text-slate-500">
        <Link to="/" className="hover:text-red-700 transition-colors font-medium">
          Lihat Halaman Profil Sekolah
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0 bg-white border-r border-slate-200 sticky top-0 h-screen">
        {navContent}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-[270px] max-w-[85vw] bg-white h-full z-10 border-r border-slate-200">
            {navContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header Bar with Logout Button at Top Right */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-red-700 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm font-bold text-slate-900 truncate">
              {getPageTitle(location.pathname)}
            </div>
          </div>

          {/* Top-Right User Info & Logout Button */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                {profile?.full_name || user.email}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-red-700 font-semibold whitespace-nowrap">
                {ROLE_LABELS[role]}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>{loggingOut ? 'Keluar...' : 'Logout'}</span>
            </button>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {!supabaseReady && <SchemaSetupNotice mode="env-missing" />}
          {supabaseReady && schemaMissing && <SchemaSetupNotice mode="schema-missing" />}
          {authError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {authError}
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
