import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  GraduationCap,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const HERO_IMAGE = '/src/assets/images/hero_smk_campus_1795061394846.jpg';
const LAB_TEK_IMAGE = '/src/assets/images/lab_teknologi_tkj_1795061394368.jpg';
const STUDIO_BC_IMAGE = '/src/assets/images/studio_broadcast_bc_1795061395475.jpg';
const LAB_BISNIS_IMAGE = '/src/assets/images/lab_bisnis_modern_1795061394481.jpg';

const BIDANG_KEAHLIAN = [
  {
    index: '01',
    title: 'Teknologi Informasi & Desain Kreatif',
    summary:
      'Mempersiapkan tenaga ahli infrastruktur jaringan, keamanan server, serta desainer komunikasi visual berstandar agensi kreatif.',
    programs: [
      {
        code: 'TKJ',
        name: 'Teknik Komputer dan Jaringan',
        focus: 'Administrasi server Linux, routing & switching Cisco/MikroTik, fiber optik, serta manajemen infrastruktur cloud.',
      },
      {
        code: 'DKV',
        name: 'Desain Komunikasi Visual',
        focus: 'Identitas merek, ilustrasi digital, desain antarmuka UI/UX, fotografi komersial, serta produksi media cetak.',
      },
    ],
  },
  {
    index: '02',
    title: 'Media Penyiaran & Produksi Film',
    summary:
      'Mengasah keahlian produksi konten audio-visual siaran televisi, sinematografi, penyutradaraan, dan tata suara studio.',
    programs: [
      {
        code: 'BC',
        name: 'Broadcasting dan Perfilman',
        focus: 'Produksi program siaran langsung, sinematografi kamera digital, tata cahaya studio, dan penyuntingan pascaproduksi.',
      },
    ],
  },
  {
    index: '03',
    title: 'Bisnis, Keuangan & Manajemen Perkantoran',
    summary:
      'Membentuk profesional tata kelola keuangan perusahaan, administrasi perkantoran modern, dan strategi pemasaran niaga digital.',
    programs: [
      {
        code: 'AK',
        name: 'Akuntansi dan Keuangan Lembaga',
        focus: 'Siklus akuntansi perusahaan jasa/dagang, perpajakan, audit dasar, dan sistem akuntansi berbasis komputer.',
      },
      {
        code: 'MPLB',
        name: 'Manajemen Perkantoran dan Layanan Bisnis',
        focus: 'Korespondensi eksekutif, kearsipan digital, pengelolaan rapat korporat, dan layanan pelanggan terpadu.',
      },
      {
        code: 'BD',
        name: 'Bisnis Digital',
        focus: 'E-commerce, optimasi pemasaran digital, analitik penjualan daring, dan pengelolaan rantai pasok ritel modern.',
      },
    ],
  },
];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top Navigation Bar — Strict 3-Zone Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="text-lg font-extrabold tracking-tight text-red-700 whitespace-nowrap shrink-0"
          >
            SMK Prima Unggul
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#profil"
              className="hover:text-red-700 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-red-700"
            >
              Profil Sekolah
            </a>
            <a
              href="#jurusan"
              className="hover:text-red-700 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-red-700"
            >
              Bidang Keahlian
            </a>
            <a
              href="#fasilitas"
              className="hover:text-red-700 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-red-700"
            >
              Fasilitas Praktik
            </a>
            <a
              href="#sistem"
              className="hover:text-red-700 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-red-700"
            >
              Sistem Absensi
            </a>
          </nav>

          <div className="shrink-0">
            <Link
              to={user ? '/app' : '/login'}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {user ? 'Buka Aplikasi' : 'Masuk Portal'}
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-slate-200 bg-slate-50/70">
        <div className="max-w-7xl mx-auto px-6 py-14 lg:py-20">
          <div className="grid lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <div className="text-xs font-semibold text-red-700 tracking-wide">
                Sekolah Menengah Kejuruan Terakreditasi · Berbasis Industri
              </div>

              <h1
                className="font-extrabold tracking-tight text-slate-900 leading-[1.12]"
                style={{ fontSize: 'clamp(2.25rem, 3.8vw, 3.5rem)', textWrap: 'balance' }}
              >
                Mencetak Lulusan Vokasi Disiplin, Kompeten, dan Siap Kerja.
              </h1>

              <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                SMK Prima Unggul memadukan kurikulum berbasis praktik industri, 3 bidang keahlian
                utama dengan 6 kompetensi keahlian unggulan (TKJ, DKV, AK, BC, MPLB, dan BD),
                serta tata kelola kedisiplinan digital bagi seluruh siswa, guru, dan tenaga
                kependidikan.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to={user ? '/app' : '/login'}
                  className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {user ? 'Masuk ke Dashboard /app' : 'Masuk Portal Absensi'}
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Link>

                <a
                  href="#jurusan"
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:border-red-300 hover:text-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Jelajahi 6 Program Keahlian
                </a>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[300px] lg:min-h-[420px] rounded-xl overflow-hidden border border-slate-200 bg-gradient-to-br from-red-900 via-red-800 to-slate-900">
                <img
                  src={HERO_IMAGE}
                  alt="Gedung Kampus Modern SMK Prima Unggul"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover lg:h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-6 text-white">
                  <div className="text-xs font-medium text-red-200">
                    Kampus Terpadu SMK Prima Unggul
                  </div>
                  <div className="text-lg font-bold mt-1">
                    Lingkungan Belajar Modern &amp; Laboratorium Berstandar Industri
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Column Proof Strip */}
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-2xl font-extrabold text-red-700 tabular-nums">3 Bidang</div>
              <div className="text-sm font-semibold text-slate-900 mt-1">Jurusan Utama</div>
              <div className="text-xs text-slate-500 mt-1">
                Teknologi, Media Penyiaran, serta Bisnis &amp; Manajemen
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-2xl font-extrabold text-red-700 tabular-nums">6 Program</div>
              <div className="text-sm font-semibold text-slate-900 mt-1">Kompetensi Keahlian</div>
              <div className="text-xs text-slate-500 mt-1">
                TKJ · DKV · BC · AK · MPLB · BD
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-2xl font-extrabold text-red-700 tabular-nums">100% Digital</div>
              <div className="text-sm font-semibold text-slate-900 mt-1">Presensi Terpadu</div>
              <div className="text-xs text-slate-500 mt-1">
                Monitoring kehadiran siswa &amp; karyawan real-time
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-2xl font-extrabold text-red-700 tabular-nums">Akreditasi A</div>
              <div className="text-sm font-semibold text-slate-900 mt-1">Mutu Pendidikan</div>
              <div className="text-xs text-slate-500 mt-1">
                Kemitraan aktif dengan perusahaan teknologi &amp; perbankan
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Profil Sekolah */}
      <section id="profil" className="py-16 lg:py-24 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-4">
              <div className="text-xs font-semibold text-red-700">Tentang Sekolah</div>
              <h2
                className="text-3xl font-extrabold tracking-tight text-slate-900"
                style={{ textWrap: 'balance' }}
              >
                Profil SMK Prima Unggul
              </h2>
              <p className="text-slate-600 leading-relaxed">
                SMK Prima Unggul adalah institusi pendidikan menengah kejuruan yang berfokus pada
                keseimbangan antara penguasaan keterampilan teknis terapan, etos kerja profesional,
                dan budaya disiplin harian.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Setiap peserta didik dibimbing oleh guru produktif berpengalaman dan didukung oleh
                tenaga kependidikan yang sigap dalam layanan akademik. Kedisiplinan kehadiran di
                kelas maupun unit kerja dipantau langsung melalui sistem presensi terintegrasi.
              </p>
            </div>

            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-3">
                <GraduationCap className="w-6 h-6 text-red-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Kurikulum Sinkron Industri
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Materi pembelajaran kejuruan disusun bersama praktisi industri sehingga lulusan
                  menguasai perangkat lunak, peralatan studio, serta standar prosedur kerja aktual.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-3">
                <ClipboardCheck className="w-6 h-6 text-red-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Budaya Disiplin &amp; Akuntabel
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Kehadiran siswa dicatat per kelas oleh guru, sementara seluruh guru dan tenaga
                  kependidikan melakukan presensi harian secara mandiri dalam satu portal.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-3">
                <Building2 className="w-6 h-6 text-red-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Fasilitas Praktik Spesifik
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Tersedia laboratorium jaringan server, studio desain grafis, ruang siaran
                  broadcasting kedap suara, serta mini-office akuntansi dan bisnis digital.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-3">
                <ShieldCheck className="w-6 h-6 text-red-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Tata Kelola Data Terpusat
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Data siswa, rekap kehadiran harian, dan manajemen akun pegawai tersimpan aman dan
                  terstruktur untuk pelaporan akademik yang cepat.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Bidang Jurusan & 6 Kompetensi Keahlian */}
      <section id="jurusan" className="py-16 lg:py-24 bg-slate-50/70 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="max-w-2xl space-y-3">
            <div className="text-xs font-semibold text-red-700">
              3 Bidang Jurusan · 6 Kompetensi Keahlian
            </div>
            <h2
              className="text-3xl font-extrabold tracking-tight text-slate-900"
              style={{ textWrap: 'balance' }}
            >
              Pilihan Jurusan Unggulan SMK Prima Unggul
            </h2>
            <p className="text-slate-600 leading-relaxed">
              SMK Prima Unggul menyelenggarakan 3 rumpun jurusan utama yang terbagi ke dalam 6
              kompetensi keahlian terakreditasi: TKJ, DKV, BC, AK, MPLB, dan BD.
            </p>
          </div>

          <div className="space-y-8">
            {BIDANG_KEAHLIAN.map((bidang) => (
              <div
                key={bidang.index}
                className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-red-700 tabular-nums">
                      Bidang Keahlian {bidang.index}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{bidang.title}</h3>
                  </div>
                  <p className="text-sm text-slate-600 max-w-xl">{bidang.summary}</p>
                </div>

                <div
                  className={`grid gap-5 ${
                    bidang.programs.length === 1
                      ? 'md:grid-cols-1'
                      : bidang.programs.length === 2
                        ? 'md:grid-cols-2'
                        : 'md:grid-cols-3'
                  }`}
                >
                  {bidang.programs.map((prog) => (
                    <div
                      key={prog.code}
                      className="rounded-lg border border-slate-200 bg-slate-50/60 p-5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-sm font-bold text-red-700">
                          {prog.code}
                        </span>
                        <span className="text-xs text-slate-500">Program Keahlian</span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900">{prog.name}</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">{prog.focus}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fasilitas Praktik — Asymmetric Bento Grid */}
      <section id="fasilitas" className="py-16 lg:py-24 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="text-xs font-semibold text-red-700">Sarana Pembelajaran</div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Laboratorium &amp; Studio Praktik Siswa
              </h2>
            </div>
            <p className="text-sm text-slate-600 max-w-md">
              Setiap kompetensi keahlian dilengkapi ruang praktik khusus untuk menunjang proyek
              portofolio siswa sejak kelas X.
            </p>
          </div>

          <div className="grid md:grid-cols-12 gap-6">
            <div className="md:col-span-6 relative rounded-xl overflow-hidden border border-slate-200 min-h-[300px] bg-slate-900">
              <img
                src={LAB_TEK_IMAGE}
                alt="Laboratorium Komputer TKJ dan Studio DKV SMK Prima Unggul"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-6 text-white space-y-1">
                <div className="flex items-center gap-2 text-xs text-red-200 font-medium">
                  <Cpu className="w-4 h-4 shrink-0" />
                  <span>TKJ &amp; DKV</span>
                </div>
                <h3 className="text-lg font-bold">Laboratorium Jaringan &amp; Studio Desain</h3>
                <p className="text-xs text-slate-200">
                  Perangkat workstation ganda, rak server latihan, dan pen tablet grafis profesional.
                </p>
              </div>
            </div>

            <div className="md:col-span-6 grid gap-6">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 min-h-[220px] bg-slate-900">
                <img
                  src={STUDIO_BC_IMAGE}
                  alt="Studio Broadcasting dan Perfilman SMK Prima Unggul"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-5 text-white space-y-1">
                  <div className="flex items-center gap-2 text-xs text-red-200 font-medium">
                    <Camera className="w-4 h-4 shrink-0" />
                    <span>Broadcasting &amp; Perfilman</span>
                  </div>
                  <h3 className="text-base font-bold">Studio Siaran &amp; Produksi Audio-Visual</h3>
                </div>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-slate-200 min-h-[220px] bg-slate-900">
                <img
                  src={LAB_BISNIS_IMAGE}
                  alt="Ruang Simulasi Akuntansi, MPLB, dan Bisnis Digital"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-5 text-white space-y-1">
                  <div className="flex items-center gap-2 text-xs text-red-200 font-medium">
                    <Users className="w-4 h-4 shrink-0" />
                    <span>AK · MPLB · BD</span>
                  </div>
                  <h3 className="text-base font-bold">
                    Kantor Simulasi Akuntansi &amp; Bisnis Digital
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sistem Absensi Digital Terintegrasi */}
      <section id="sistem" className="py-16 lg:py-24 bg-red-700 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="text-xs font-semibold text-red-100">
                Portal Kehadiran SMK Prima Unggul
              </div>
              <h2
                className="text-3xl font-extrabold tracking-tight text-white"
                style={{ textWrap: 'balance' }}
              >
                Satu Sistem Absensi untuk Seluruh Civitas Sekolah
              </h2>
              <p className="text-red-50 leading-relaxed max-w-2xl">
                Dirancang khusus dengan hak akses berbasis peran untuk mendukung pencatatan
                kehadiran harian guru, tenaga kependidikan, dan seluruh siswa lintas jurusan.
              </p>
              <div className="pt-2">
                <Link
                  to={user ? '/app' : '/login'}
                  className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-bold text-red-700 bg-white hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {user ? 'Masuk ke Ruang Kerja /app' : 'Login ke Sistem Absensi'}
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4 bg-red-800/70 border border-red-600/60 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-red-100 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold">Administrator</div>
                  <p className="text-xs text-red-100 mt-0.5">
                    Kelola data siswa, manajemen akun pengguna tersinkronisasi Supabase Auth,
                    absensi pribadi, dan rekap menyeluruh.
                  </p>
                </div>
              </div>
              <div className="border-t border-red-600/50 pt-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-red-100 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold">Guru</div>
                  <p className="text-xs text-red-100 mt-0.5">
                    Melakukan absensi karyawan mandiri, mengabsen siswa per kelas, serta memantau
                    rekap absensi siswa.
                  </p>
                </div>
              </div>
              <div className="border-t border-red-600/50 pt-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-red-100 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold">Tenaga Kependidikan</div>
                  <p className="text-xs text-red-100 mt-0.5">
                    Memantau ringkasan dashboard dan melakukan absensi harian karyawan secara mandiri.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-slate-600">
          <div>
            <div className="font-bold text-slate-900">SMK Prima Unggul</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Program Keahlian: TKJ · DKV · BC · AK · MPLB · BD
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-medium">
            <a href="#profil" className="hover:text-red-700 transition-colors">
              Profil
            </a>
            <a href="#jurusan" className="hover:text-red-700 transition-colors">
              Jurusan
            </a>
            <Link to="/login" className="text-red-700 font-semibold hover:underline">
              Portal Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
