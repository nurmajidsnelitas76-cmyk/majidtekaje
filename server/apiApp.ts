import express from 'express';
import type { Request, Response, NextFunction, Express } from 'express';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import path from 'node:path';
import fs from 'node:fs';
import { SUPABASE_RELATIONAL_SCHEMA_SQL } from '../src/lib/schemaSql.ts';

interface AuthenticatedRequest extends Request {
  authUser?: User;
  authRole?: string;
}

const VALID_ROLES = new Set(['admin', 'guru', 'tenaga_kependidikan']);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSupabaseEnv() {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const supabaseAnonKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();
  const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey };
}

function getAdminClient(): SupabaseClient | null {
  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseEnv();
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    res.status(503).json({
      error:
        'Konfigurasi Supabase server belum lengkap (SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY diperlukan).',
    });
    return;
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Token autentikasi tidak ditemukan.' });
    return;
  }

  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: 'Sesi tidak valid atau telah berakhir.' });
    return;
  }

  req.authUser = data.user;
  next();
}

async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const adminClient = getAdminClient();
  if (!adminClient || !req.authUser) {
    res.status(401).json({ error: 'Akses tidak sah.' });
    return;
  }

  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', req.authUser.id)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: `Gagal memverifikasi role pengguna: ${error.message}` });
    return;
  }

  if (!profile || profile.role !== 'admin') {
    res.status(403).json({ error: 'Hanya administrator yang memiliki izin untuk aksi ini.' });
    return;
  }

  req.authRole = profile.role;
  next();
}

export function createApiApp(): Express {
  const app = express();

  // Compatibility for serverless platforms (e.g. Vercel) that may pre-parse JSON request bodies
  app.use((req, _res, next) => {
    const maybePreparsed = req as Request & { _body?: boolean };
    if (maybePreparsed.body !== undefined && typeof maybePreparsed.body === 'object') {
      maybePreparsed._body = true;
    }
    next();
  });
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = getSupabaseEnv();
    res.json({
      ok: true,
      supabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
      adminConfigured: Boolean(supabaseUrl && supabaseServiceRoleKey),
    });
  });

  app.get('/api/public-config', (_req, res) => {
    const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = getSupabaseEnv();
    res.json({
      supabaseUrl,
      supabaseAnonKey,
      adminConfigured: Boolean(supabaseUrl && supabaseServiceRoleKey),
    });
  });

  app.get('/api/db/status', async (_req, res) => {
    const adminClient = getAdminClient();
    if (!adminClient) {
      res.json({
        connected: false,
        adminConfigured: false,
        tables: {},
      });
      return;
    }

    const tableNames = [
      'majors',
      'classes',
      'profiles',
      'students',
      'employee_attendance',
      'student_attendance',
    ];

    const tables: Record<string, { ready: boolean; count: number | null }> = {};
    await Promise.all(
      tableNames.map(async (table) => {
        const { count, error } = await adminClient
          .from(table)
          .select('*', { count: 'exact', head: true });
        tables[table] = {
          ready: !error,
          count: error ? null : (count ?? 0),
        };
      })
    );

    const allReady = Object.values(tables).every((t) => t.ready);
    res.json({
      connected: true,
      adminConfigured: true,
      allReady,
      tables,
    });
  });

  app.get('/api/db/schema-sql', (_req, res) => {
    try {
      const schemaPath = path.resolve(process.cwd(), 'supabase', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf-8');
        res.type('text/plain').send(sql);
        return;
      }
    } catch {
      // Fallback to bundled schema string below
    }
    res.type('text/plain').send(SUPABASE_RELATIONAL_SCHEMA_SQL);
  });

  app.get('/api/auth/first-user-status', async (_req, res) => {
    const adminClient = getAdminClient();
    if (!adminClient) {
      res.json({ hasUsers: null, adminConfigured: false });
      return;
    }

    try {
      const { data: usersData, error } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });
      if (error) {
        res.json({ hasUsers: null, adminConfigured: true });
        return;
      }
      res.json({
        hasUsers: (usersData?.users?.length ?? 0) > 0,
        adminConfigured: true,
      });
    } catch {
      res.json({ hasUsers: null, adminConfigured: true });
    }
  });

  // Public registration endpoint: creates confirmed user in Supabase Auth so all users can login immediately
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    const adminClient = getAdminClient();
    if (!adminClient) {
      res.status(503).json({
        error: 'Registrasi langsung memerlukan SUPABASE_SERVICE_ROLE_KEY pada server.',
        fallbackClientSignup: true,
      });
      return;
    }

    const { email, password, full_name, nip, role } = req.body || {};
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof full_name !== 'string' ||
      !email.trim() ||
      !full_name.trim()
    ) {
      res.status(400).json({ error: 'Nama lengkap, email, dan kata sandi wajib diisi.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
      return;
    }

    try {
      const { data: existingList } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });

      const isFirstUser = (existingList?.users?.length ?? 0) === 0;
      let assignedRole = 'tenaga_kependidikan';

      if (isFirstUser) {
        assignedRole = 'admin';
      } else if (role === 'guru' || role === 'tenaga_kependidikan') {
        assignedRole = role;
      }

      const cleanEmail = email.trim();
      const cleanName = full_name.trim();
      const cleanNip = typeof nip === 'string' ? nip.trim() : '';

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          nip: cleanNip,
          role: assignedRole,
          jabatan: '',
        },
      });

      if (createError || !created.user) {
        res.status(400).json({ error: createError?.message || 'Gagal mendaftarkan akun.' });
        return;
      }

      const { data: profile, error: profError } = await adminClient
        .from('profiles')
        .upsert(
          {
            id: created.user.id,
            email: created.user.email || cleanEmail,
            full_name: cleanName,
            nip: cleanNip,
            role: assignedRole,
            jabatan: '',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select('*')
        .single();

      if (profError) {
        res.status(500).json({ error: profError.message });
        return;
      }

      res.status(201).json({ user: created.user, profile });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mendaftarkan akun.';
      res.status(500).json({ error: message });
    }
  });

  app.post(
    '/api/auth/bootstrap-profile',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      const adminClient = getAdminClient();
      const user = req.authUser;
      if (!adminClient || !user) {
        res.status(500).json({ error: 'Server belum siap.' });
        return;
      }

      try {
        const { data: existingProfile, error: fetchError } = await adminClient
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (fetchError) {
          res.status(500).json({ error: fetchError.message });
          return;
        }

        if (existingProfile) {
          res.json({ profile: existingProfile });
          return;
        }

        const { count } = await adminClient
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        const { data: listData } = await adminClient.auth.admin.listUsers({
          page: 1,
          perPage: 10,
        });

        const sortedUsers = [...(listData?.users || [])].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const isFirstAuthUser = sortedUsers.length > 0 && sortedUsers[0].id === user.id;

        let assignedRole = 'tenaga_kependidikan';
        if ((count ?? 0) === 0 || isFirstAuthUser) {
          assignedRole = 'admin';
        } else if (
          typeof user.user_metadata?.role === 'string' &&
          VALID_ROLES.has(user.user_metadata.role)
        ) {
          assignedRole = user.user_metadata.role;
        }

        const fullName =
          (typeof user.user_metadata?.full_name === 'string' &&
            user.user_metadata.full_name.trim()) ||
          user.email?.split('@')[0] ||
          'Pengguna';

        const { data: inserted, error: insertError } = await adminClient
          .from('profiles')
          .upsert(
            {
              id: user.id,
              email: user.email || '',
              full_name: fullName,
              nip: typeof user.user_metadata?.nip === 'string' ? user.user_metadata.nip : '',
              role: assignedRole,
              jabatan:
                typeof user.user_metadata?.jabatan === 'string' ? user.user_metadata.jabatan : '',
            },
            { onConflict: 'id' }
          )
          .select('*')
          .single();

        if (insertError) {
          res.status(500).json({ error: insertError.message });
          return;
        }

        res.json({ profile: inserted });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Terjadi kesalahan server.';
        res.status(500).json({ error: message });
      }
    }
  );

  // Admin: List all users synced with Supabase Authentication
  app.get(
    '/api/admin/users',
    requireAuth,
    requireAdmin,
    async (_req: AuthenticatedRequest, res: Response) => {
      const adminClient = getAdminClient();
      if (!adminClient) {
        res.status(503).json({ error: 'Admin client tidak tersedia.' });
        return;
      }

      try {
        const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        if (authError) {
          res.status(500).json({ error: authError.message });
          return;
        }

        const { data: profiles, error: profileError } = await adminClient
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: true });

        if (profileError) {
          res.status(500).json({ error: profileError.message });
          return;
        }

        const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

        const merged = (authData.users || []).map((authUser) => {
          const profile = profileMap.get(authUser.id);
          return {
            id: authUser.id,
            email: authUser.email || profile?.email || '',
            full_name:
              profile?.full_name ||
              (typeof authUser.user_metadata?.full_name === 'string'
                ? authUser.user_metadata.full_name
                : authUser.email?.split('@')[0] || 'Pengguna'),
            nip:
              profile?.nip ||
              (typeof authUser.user_metadata?.nip === 'string' ? authUser.user_metadata.nip : ''),
            role:
              profile?.role ||
              (typeof authUser.user_metadata?.role === 'string' &&
              VALID_ROLES.has(authUser.user_metadata.role)
                ? authUser.user_metadata.role
                : 'tenaga_kependidikan'),
            jabatan:
              profile?.jabatan ||
              (typeof authUser.user_metadata?.jabatan === 'string'
                ? authUser.user_metadata.jabatan
                : ''),
            created_at: authUser.created_at,
            last_sign_in_at: authUser.last_sign_in_at || null,
            email_confirmed_at: authUser.email_confirmed_at || null,
          };
        });

        merged.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        res.json({ users: merged });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Gagal memuat daftar pengguna.';
        res.status(500).json({ error: message });
      }
    }
  );

  // Admin: Create new user synced to Supabase Authentication & profiles
  app.post(
    '/api/admin/users',
    requireAuth,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response) => {
      const adminClient = getAdminClient();
      if (!adminClient) {
        res.status(503).json({ error: 'Admin client tidak tersedia.' });
        return;
      }

      const { email, password, full_name, nip, role, jabatan } = req.body || {};

      if (
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        typeof full_name !== 'string' ||
        typeof role !== 'string' ||
        !email.trim() ||
        !full_name.trim()
      ) {
        res.status(400).json({ error: 'Email, password, nama lengkap, dan role wajib diisi.' });
        return;
      }

      if (!VALID_ROLES.has(role)) {
        res.status(400).json({ error: 'Role tidak valid.' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: 'Password minimal 6 karakter.' });
        return;
      }

      const cleanEmail = email.trim();
      const cleanName = full_name.trim();
      const cleanNip = typeof nip === 'string' ? nip.trim() : '';
      const cleanJabatan = typeof jabatan === 'string' ? jabatan.trim() : '';

      try {
        const { data: created, error: createError } = await adminClient.auth.admin.createUser({
          email: cleanEmail,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: cleanName,
            nip: cleanNip,
            role,
            jabatan: cleanJabatan,
          },
        });

        if (createError || !created.user) {
          res.status(400).json({ error: createError?.message || 'Gagal membuat user di Supabase Auth.' });
          return;
        }

        const { data: profile, error: upsertError } = await adminClient
          .from('profiles')
          .upsert(
            {
              id: created.user.id,
              email: created.user.email || cleanEmail,
              full_name: cleanName,
              nip: cleanNip,
              role,
              jabatan: cleanJabatan,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
          .select('*')
          .single();

        if (upsertError) {
          res.status(500).json({ error: upsertError.message });
          return;
        }

        res.status(201).json({
          user: {
            ...profile,
            last_sign_in_at: null,
            email_confirmed_at: created.user.email_confirmed_at || null,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Gagal menambahkan user.';
        res.status(500).json({ error: message });
      }
    }
  );

  // Admin: Update user in Supabase Authentication & profiles
  app.patch(
    '/api/admin/users/:id',
    requireAuth,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response) => {
      const adminClient = getAdminClient();
      if (!adminClient) {
        res.status(503).json({ error: 'Admin client tidak tersedia.' });
        return;
      }

      const targetId = String(req.params.id || '');
      if (!UUID_REGEX.test(targetId)) {
        res.status(400).json({ error: 'ID pengguna tidak valid.' });
        return;
      }

      const { email, password, full_name, nip, role, jabatan } = req.body || {};

      if (
        typeof full_name !== 'string' ||
        typeof email !== 'string' ||
        typeof role !== 'string' ||
        !full_name.trim() ||
        !email.trim()
      ) {
        res.status(400).json({ error: 'Nama lengkap, email, dan role wajib diisi.' });
        return;
      }

      if (!VALID_ROLES.has(role)) {
        res.status(400).json({ error: 'Role tidak valid.' });
        return;
      }

      if (password && (typeof password !== 'string' || password.length < 6)) {
        res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
        return;
      }

      const cleanEmail = email.trim();
      const cleanName = full_name.trim();
      const cleanNip = typeof nip === 'string' ? nip.trim() : '';
      const cleanJabatan = typeof jabatan === 'string' ? jabatan.trim() : '';

      try {
        const updatePayload: {
          email: string;
          email_confirm: boolean;
          password?: string;
          user_metadata: Record<string, string>;
        } = {
          email: cleanEmail,
          email_confirm: true,
          user_metadata: {
            full_name: cleanName,
            nip: cleanNip,
            role,
            jabatan: cleanJabatan,
          },
        };

        if (typeof password === 'string' && password.trim().length > 0) {
          updatePayload.password = password;
        }

        const { data: updatedAuth, error: authErr } = await adminClient.auth.admin.updateUserById(
          targetId,
          updatePayload
        );

        if (authErr || !updatedAuth.user) {
          res
            .status(400)
            .json({ error: authErr?.message || 'Gagal memperbarui akun di Supabase Auth.' });
          return;
        }

        const { data: updatedProfile, error: profErr } = await adminClient
          .from('profiles')
          .upsert(
            {
              id: targetId,
              email: cleanEmail,
              full_name: cleanName,
              nip: cleanNip,
              role,
              jabatan: cleanJabatan,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
          .select('*')
          .single();

        if (profErr) {
          res.status(500).json({ error: profErr.message });
          return;
        }

        res.json({
          user: {
            ...updatedProfile,
            last_sign_in_at: updatedAuth.user.last_sign_in_at || null,
            email_confirmed_at: updatedAuth.user.email_confirmed_at || null,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Gagal memperbarui user.';
        res.status(500).json({ error: message });
      }
    }
  );

  // Admin: Hard delete user completely from Supabase Authentication & profiles
  app.delete(
    '/api/admin/users/:id',
    requireAuth,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response) => {
      const adminClient = getAdminClient();
      if (!adminClient || !req.authUser) {
        res.status(503).json({ error: 'Admin client tidak tersedia.' });
        return;
      }

      const targetId = String(req.params.id || '');
      if (!UUID_REGEX.test(targetId)) {
        res.status(400).json({ error: 'ID pengguna tidak valid.' });
        return;
      }

      if (targetId === req.authUser.id) {
        res
          .status(400)
          .json({ error: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.' });
        return;
      }

      try {
        const { error: deleteAuthErr } = await adminClient.auth.admin.deleteUser(targetId, false);
        if (deleteAuthErr) {
          res.status(400).json({ error: deleteAuthErr.message });
          return;
        }

        await adminClient.from('profiles').delete().eq('id', targetId);

        res.json({ deleted: true, id: targetId });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Gagal menghapus user secara permanen.';
        res.status(500).json({ error: message });
      }
    }
  );

  return app;
}
