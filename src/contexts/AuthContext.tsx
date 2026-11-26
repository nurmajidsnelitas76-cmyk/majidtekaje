import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { initSupabaseClient } from '../lib/supabase';
import type { UserProfile } from '../types';

interface AuthContextValue {
  supabase: SupabaseClient | null;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  supabaseReady: boolean;
  adminConfigured: boolean;
  schemaMissing: boolean;
  authError: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [adminConfigured, setAdminConfigured] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadUserProfile = useCallback(
    async (client: SupabaseClient, activeSession: Session | null) => {
      if (!activeSession?.user) {
        setProfile(null);
        setSchemaMissing(false);
        return;
      }

      setAuthError(null);
      try {
        // Attempt direct read from public.profiles first
        const { data: existing, error } = await client
          .from('profiles')
          .select('*')
          .eq('id', activeSession.user.id)
          .maybeSingle();

        if (error) {
          if (
            error.code === '42P01' ||
            error.message.includes('Could not find the table') ||
            error.message.includes('does not exist')
          ) {
            setSchemaMissing(true);
            setProfile(null);
            return;
          }
        }

        if (existing) {
          setProfile(existing as UserProfile);
          setSchemaMissing(false);
          return;
        }

        // Bootstrap profile via backend (ensures first user in Supabase Auth becomes 'admin')
        const resp = await fetch('/api/auth/bootstrap-profile', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeSession.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (resp.ok) {
          const body = await resp.json();
          if (body.profile) {
            setProfile(body.profile as UserProfile);
            setSchemaMissing(false);
            return;
          }
        } else {
          // Fallback: insert own profile directly via authenticated Supabase RLS
          const metaRole = activeSession.user.user_metadata?.role;
          const safeRole =
            metaRole === 'guru' || metaRole === 'tenaga_kependidikan' || metaRole === 'admin'
              ? metaRole
              : 'tenaga_kependidikan';

          const { data: insertedDirect, error: directErr } = await client
            .from('profiles')
            .upsert(
              {
                id: activeSession.user.id,
                email: activeSession.user.email || '',
                full_name:
                  (typeof activeSession.user.user_metadata?.full_name === 'string' &&
                    activeSession.user.user_metadata.full_name.trim()) ||
                  activeSession.user.email?.split('@')[0] ||
                  'Pengguna',
                nip:
                  typeof activeSession.user.user_metadata?.nip === 'string'
                    ? activeSession.user.user_metadata.nip
                    : '',
                role: safeRole,
                jabatan: '',
              },
              { onConflict: 'id' }
            )
            .select('*')
            .maybeSingle();

          if (!directErr && insertedDirect) {
            setProfile(insertedDirect as UserProfile);
            setSchemaMissing(false);
            return;
          }

          const errBody = await resp.json().catch(() => ({}));
          if (
            typeof errBody.error === 'string' &&
            (errBody.error.includes('does not exist') || errBody.error.includes('42P01'))
          ) {
            setSchemaMissing(true);
          } else if (errBody.error) {
            setAuthError(errBody.error);
          }
        }
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Gagal memuat profil pengguna.');
      }
    },
    []
  );

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    async function bootstrap() {
      const { client, adminConfigured: hasAdmin } = await initSupabaseClient();
      if (!mounted) return;

      setAdminConfigured(hasAdmin);

      if (!client) {
        setSupabase(null);
        setSupabaseReady(false);
        setLoading(false);
        return;
      }

      setSupabase(client);
      setSupabaseReady(true);

      const { data } = await client.auth.getSession();
      if (!mounted) return;

      setSession(data.session);
      await loadUserProfile(client, data.session);
      if (mounted) setLoading(false);

      const { data: authListener } = client.auth.onAuthStateChange((_event, nextSession) => {
        if (!mounted) return;
        setSession(nextSession);
        if (nextSession) {
          void loadUserProfile(client, nextSession);
        } else {
          setProfile(null);
        }
      });

      subscription = authListener.subscription;
    }

    bootstrap();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [loadUserProfile]);

  const refreshProfile = useCallback(async () => {
    if (supabase && session) {
      await loadUserProfile(supabase, session);
    }
  }, [supabase, session, loadUserProfile]);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setProfile(null);
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{
        supabase,
        session,
        user: session?.user ?? null,
        profile,
        loading,
        supabaseReady,
        adminConfigured,
        schemaMissing,
        authError,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
