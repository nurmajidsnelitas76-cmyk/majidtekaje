-- ============================================================================
-- SMK PRIMA UNGGUL — RELATIONAL SUPABASE DATABASE SCHEMA
-- Jalankan script ini pada Supabase Dashboard -> SQL Editor
-- Relasi Utama:
--   1. auth.users (1) <---> (1) public.profiles
--   2. public.profiles (1) ---> (N) public.employee_attendance
--   3. public.majors (1) ---> (N) public.classes ---> (N) public.students
--   4. public.students (1) ---> (N) public.student_attendance <--- (N) public.profiles (recorded_by)
-- ============================================================================

-- 1. Tabel Master Bidang & Kompetensi Keahlian (3 Bidang, 6 Jurusan)
CREATE TABLE IF NOT EXISTS public.majors (
  code text PRIMARY KEY CHECK (code IN ('TKJ', 'DKV', 'AK', 'BC', 'MPLB', 'BD')),
  name text NOT NULL,
  field_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.majors (code, name, field_name) VALUES
  ('TKJ', 'Teknik Komputer dan Jaringan', 'Teknologi Informasi & Desain Kreatif'),
  ('DKV', 'Desain Komunikasi Visual', 'Teknologi Informasi & Desain Kreatif'),
  ('BC', 'Broadcasting dan Perfilman', 'Media Penyiaran & Produksi Film'),
  ('AK', 'Akuntansi dan Keuangan Lembaga', 'Bisnis, Keuangan & Manajemen Perkantoran'),
  ('MPLB', 'Manajemen Perkantoran dan Layanan Bisnis', 'Bisnis, Keuangan & Manajemen Perkantoran'),
  ('BD', 'Bisnis Digital', 'Bisnis, Keuangan & Manajemen Perkantoran')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  field_name = EXCLUDED.field_name;

-- 2. Tabel Profil Karyawan (Berelasi langsung 1:1 dengan Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  nip text DEFAULT '',
  role text NOT NULL CHECK (role IN ('admin', 'guru', 'tenaga_kependidikan')),
  jabatan text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS full_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS nip text DEFAULT '',
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'tenaga_kependidikan',
  ADD COLUMN IF NOT EXISTS jabatan text DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 3. Tabel Kelas (Berelasi ke public.majors dan wali kelas di public.profiles)
CREATE TABLE IF NOT EXISTS public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  major_code text NOT NULL REFERENCES public.majors(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  homeroom_teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS major_code text NOT NULL DEFAULT 'TKJ' REFERENCES public.majors(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS homeroom_teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Tabel Data Siswa (Berelasi ke public.majors dan public.classes)
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nis text UNIQUE NOT NULL,
  full_name text NOT NULL,
  class_name text NOT NULL,
  major text NOT NULL REFERENCES public.majors(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS nis text DEFAULT '',
  ADD COLUMN IF NOT EXISTS full_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS class_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS major text NOT NULL DEFAULT 'TKJ' REFERENCES public.majors(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 5. Tabel Absensi Karyawan (Berelasi ke public.profiles)
CREATE TABLE IF NOT EXISTS public.employee_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL CHECK (status IN ('hadir', 'izin', 'sakit', 'alfa')),
  check_in_at timestamptz,
  check_out_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, attendance_date)
);

ALTER TABLE public.employee_attendance
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'hadir',
  ADD COLUMN IF NOT EXISTS check_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS check_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- 6. Tabel Absensi Siswa (Berelasi ke public.students dan public.profiles sebagai pencatat)
CREATE TABLE IF NOT EXISTS public.student_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL CHECK (status IN ('hadir', 'izin', 'sakit', 'alfa')),
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, attendance_date)
);

ALTER TABLE public.student_attendance
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'hadir',
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Pastikan unique index untuk upsert absensi tersedia meski tabel sudah pernah dibuat sebelumnya
CREATE UNIQUE INDEX IF NOT EXISTS uq_emp_att_user_date ON public.employee_attendance(user_id, attendance_date);
CREATE UNIQUE INDEX IF NOT EXISTS uq_stu_att_student_date ON public.student_attendance(student_id, attendance_date);

-- Indexes untuk performa query relasional & filter tanggal
CREATE INDEX IF NOT EXISTS idx_students_major ON public.students(major);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_emp_att_date ON public.employee_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_emp_att_user_date ON public.employee_attendance(user_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_stu_att_date ON public.student_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_stu_att_student_date ON public.student_attendance(student_id, attendance_date);

-- 7. Trigger Otomatis: Sinkronisasi relasi students.class_id -> classes.id
CREATE OR REPLACE FUNCTION public.sync_student_class_relation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_id uuid;
BEGIN
  IF NEW.class_name IS NOT NULL AND length(trim(NEW.class_name)) > 0 THEN
    INSERT INTO public.classes (name, major_code)
    VALUES (trim(NEW.class_name), NEW.major)
    ON CONFLICT (name) DO UPDATE SET major_code = EXCLUDED.major_code
    RETURNING id INTO v_class_id;

    NEW.class_id := v_class_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_student_class ON public.students;
CREATE TRIGGER trg_sync_student_class
  BEFORE INSERT OR UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.sync_student_class_relation();

-- 8. Helper Function untuk Role Check (menghindari infinite recursion di RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 9. Trigger Otomatis: User Pertama di Supabase Auth Menjadi ADMIN
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_count integer;
  assigned_role text;
BEGIN
  SELECT count(*) INTO existing_count FROM public.profiles;

  IF existing_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'tenaga_kependidikan');
    IF assigned_role NOT IN ('admin', 'guru', 'tenaga_kependidikan') THEN
      assigned_role := 'tenaga_kependidikan';
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, nip, role, jabatan)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(COALESCE(NEW.email, 'User'), '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'nip', ''),
    assigned_role,
    COALESCE(NEW.raw_user_meta_data->>'jabatan', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    nip = EXCLUDED.nip,
    role = EXCLUDED.role,
    jabatan = EXCLUDED.jabatan,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. Views Relasional untuk Pelaporan
DROP VIEW IF EXISTS public.v_employee_attendance_detail;
CREATE VIEW public.v_employee_attendance_detail AS
SELECT
  ea.id,
  ea.attendance_date,
  ea.status,
  ea.check_in_at,
  ea.check_out_at,
  ea.notes,
  p.id AS user_id,
  p.full_name,
  p.email,
  p.nip,
  p.role,
  p.jabatan
FROM public.employee_attendance ea
JOIN public.profiles p ON p.id = ea.user_id;

DROP VIEW IF EXISTS public.v_student_attendance_detail;
CREATE VIEW public.v_student_attendance_detail AS
SELECT
  sa.id,
  sa.attendance_date,
  sa.status,
  sa.notes,
  s.id AS student_id,
  s.nis,
  s.full_name AS student_name,
  s.class_name,
  s.major,
  m.name AS major_name,
  m.field_name,
  rec.full_name AS recorded_by_name
FROM public.student_attendance sa
JOIN public.students s ON s.id = sa.student_id
JOIN public.majors m ON m.code = s.major
LEFT JOIN public.profiles rec ON rec.id = sa.recorded_by;

-- 11. Aktifkan Row Level Security (RLS)
ALTER TABLE public.majors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

-- Policies: MAJORS & CLASSES
DROP POLICY IF EXISTS "majors_select_authenticated" ON public.majors;
CREATE POLICY "majors_select_authenticated"
  ON public.majors FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "classes_select_authenticated" ON public.classes;
CREATE POLICY "classes_select_authenticated"
  ON public.classes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "classes_manage_admin" ON public.classes;
CREATE POLICY "classes_manage_admin"
  ON public.classes FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- Policies: PROFILES
DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_self_or_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = public.get_my_role());

DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- Policies: STUDENTS
DROP POLICY IF EXISTS "students_select_authenticated" ON public.students;
CREATE POLICY "students_select_authenticated"
  ON public.students FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'guru'));

DROP POLICY IF EXISTS "students_insert_admin" ON public.students;
CREATE POLICY "students_insert_admin"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "students_update_admin" ON public.students;
CREATE POLICY "students_update_admin"
  ON public.students FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "students_delete_admin" ON public.students;
CREATE POLICY "students_delete_admin"
  ON public.students FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- Policies: EMPLOYEE ATTENDANCE
DROP POLICY IF EXISTS "emp_att_select_self_or_admin" ON public.employee_attendance;
CREATE POLICY "emp_att_select_self_or_admin"
  ON public.employee_attendance FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "emp_att_insert_self" ON public.employee_attendance;
CREATE POLICY "emp_att_insert_self"
  ON public.employee_attendance FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "emp_att_update_self_or_admin" ON public.employee_attendance;
CREATE POLICY "emp_att_update_self_or_admin"
  ON public.employee_attendance FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.get_my_role() = 'admin')
  WITH CHECK (user_id = auth.uid() OR public.get_my_role() = 'admin');

-- Policies: STUDENT ATTENDANCE
DROP POLICY IF EXISTS "stu_att_select_admin_guru" ON public.student_attendance;
CREATE POLICY "stu_att_select_admin_guru"
  ON public.student_attendance FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'guru'));

DROP POLICY IF EXISTS "stu_att_insert_admin_guru" ON public.student_attendance;
CREATE POLICY "stu_att_insert_admin_guru"
  ON public.student_attendance FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'guru'));

DROP POLICY IF EXISTS "stu_att_update_admin_guru" ON public.student_attendance;
CREATE POLICY "stu_att_update_admin_guru"
  ON public.student_attendance FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'guru'))
  WITH CHECK (public.get_my_role() IN ('admin', 'guru'));

DROP POLICY IF EXISTS "stu_att_delete_admin" ON public.student_attendance;
CREATE POLICY "stu_att_delete_admin"
  ON public.student_attendance FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- 12. Hak Akses Schema & Tabel untuk Login Semua Role (Authenticated & Anon)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.majors, public.classes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.students, public.employee_attendance, public.student_attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT SELECT ON public.v_employee_attendance_detail, public.v_student_attendance_detail TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
