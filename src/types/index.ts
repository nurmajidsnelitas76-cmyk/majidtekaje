export type UserRole = 'admin' | 'guru' | 'tenaga_kependidikan';

export type MajorCode = 'TKJ' | 'DKV' | 'AK' | 'BC' | 'MPLB' | 'BD';

export type AttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'alfa';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  nip: string;
  role: UserRole;
  jabatan: string;
  created_at: string;
  updated_at?: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
}

export interface Major {
  code: MajorCode;
  name: string;
  field_name: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  major_code: MajorCode;
  homeroom_teacher_id?: string | null;
}

export interface Student {
  id: string;
  nis: string;
  full_name: string;
  class_name: string;
  major: MajorCode;
  class_id?: string | null;
  majors?: Major | null;
  classes?: SchoolClass | null;
  created_at: string;
  updated_at?: string;
}

export interface EmployeeAttendanceRecord {
  id: string;
  user_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  check_in_at: string | null;
  check_out_at: string | null;
  notes: string;
  created_at: string;
  profiles?: Pick<UserProfile, 'id' | 'full_name' | 'email' | 'nip' | 'role' | 'jabatan'>;
}

export interface StudentAttendanceRecord {
  id: string;
  student_id: string;
  recorded_by: string | null;
  attendance_date: string;
  status: AttendanceStatus;
  notes: string;
  created_at: string;
  updated_at?: string;
  students?: Pick<Student, 'id' | 'nis' | 'full_name' | 'class_name' | 'major'>;
  recorder?: Pick<UserProfile, 'id' | 'full_name'> | null;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  guru: 'Guru',
  tenaga_kependidikan: 'Tenaga Kependidikan',
};

export const MAJOR_LABELS: Record<MajorCode, string> = {
  TKJ: 'Teknik Komputer dan Jaringan',
  DKV: 'Desain Komunikasi Visual',
  AK: 'Akuntansi dan Keuangan Lembaga',
  BC: 'Broadcasting dan Perfilman',
  MPLB: 'Manajemen Perkantoran dan Layanan Bisnis',
  BD: 'Bisnis Digital',
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  hadir: 'Hadir',
  izin: 'Izin',
  sakit: 'Sakit',
  alfa: 'Alfa',
};
