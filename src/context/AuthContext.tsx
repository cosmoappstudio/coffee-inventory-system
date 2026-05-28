import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Employee, Role } from '../types';
import {
  employeeAuthEmail,
  isSupabaseConfigured,
  supabase,
  type EmployeeRow,
} from '../lib/supabase';

const AUTH_INIT_TIMEOUT_MS = 6000;
const AUTH_REQUEST_TIMEOUT_MS = 20000;

type AuthContextValue = {
  employee: Employee | null;
  role: Role | null;
  locationId: string | null;
  loading: boolean;
  signIn: (
    employeeId: string,
    password: string
  ) => Promise<{ error?: string; role?: Role }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapEmployeeRow(row: EmployeeRow): Employee {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    locationId: row.location_id ?? 'all',
    status: row.status,
    email: row.email,
  };
}

async function fetchEmployeeByAuthId(authId: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, auth_id, name, role, location_id, status, email')
    .eq('auth_id', authId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapEmployeeRow(data as EmployeeRow);
}

async function withTimeout<T>(
  promise: Promise<T>,
  message = 'İstek zaman aşımına uğradı.'
): Promise<T> {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, AUTH_REQUEST_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrateFromSession = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setEmployee(null);
      return;
    }

    try {
      const profile = await fetchEmployeeByAuthId(session.user.id);
      if (!profile) {
        await supabase.auth.signOut();
        setEmployee(null);
        return;
      }

      if (profile.status !== 'Active') {
        await supabase.auth.signOut();
        setEmployee(null);
        return;
      }

      setEmployee(profile);
    } catch {
      await supabase.auth.signOut().catch(() => undefined);
      setEmployee(null);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    let mounted = true;
    let finished = false;

    const finishLoading = () => {
      if (!finished && mounted) {
        finished = true;
        setLoading(false);
      }
    };

    const timeoutId = window.setTimeout(finishLoading, AUTH_INIT_TIMEOUT_MS);

    const applySession = (session: Session | null) => {
      void hydrateFromSession(session).finally(finishLoading);
    };

    // Defer handler — avoids getSession / onAuthStateChange deadlock in supabase-js
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (mounted) applySession(session);
      }, 0);
    });

    // Fallback if INITIAL_SESSION listener is slow or missing
    window.setTimeout(() => {
      void (async () => {
        try {
          const { data, error } = await supabase.auth.getSession();
          if (!mounted || finished) return;
          if (error) {
            finishLoading();
            return;
          }
          await hydrateFromSession(data.session);
        } catch {
          if (mounted) setEmployee(null);
        } finally {
          finishLoading();
        }
      })();
    }, 0);

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [hydrateFromSession]);

  const signIn = useCallback(
    async (
      employeeId: string,
      password: string
    ): Promise<{ error?: string; role?: Role }> => {
      if (!isSupabaseConfigured()) {
        return {
          error:
            'Supabase yapılandırması eksik. .env.local dosyasına VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ekleyin.',
        };
      }

      const normalizedId = employeeId.trim().toUpperCase();
      const email = employeeAuthEmail(normalizedId);

      let authData;
      let authError;
      try {
        const result = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          'Supabase giriş isteği zaman aşımına uğradı. Bağlantıyı kontrol edin.'
        );
        authData = result.data;
        authError = result.error;
      } catch (err) {
        return {
          error:
            err instanceof Error
              ? err.message
              : 'Giriş isteği tamamlanamadı.',
        };
      }

      if (authError) {
        const message = authError.message.toLowerCase();
        if (message.includes('invalid') || message.includes('credentials')) {
          return { error: 'Çalışan ID veya şifre hatalı.' };
        }
        return { error: 'Giriş yapılamadı. Lütfen tekrar deneyin.' };
      }

      const profile = await withTimeout(
        fetchEmployeeByAuthId(authData.user.id),
        'Çalışan profili yüklenirken zaman aşımı oluştu.'
      ).catch(() => null);
      if (!profile) {
        await supabase.auth.signOut();
        return { error: 'Hesap bulunamadı. Yöneticinizle iletişime geçin.' };
      }

      if (profile.status === 'Inactive') {
        await supabase.auth.signOut();
        return { error: 'Bu hesap devre dışı bırakılmış.' };
      }

      if (profile.status === 'On Leave') {
        await supabase.auth.signOut();
        return { error: 'Hesabınız izinli durumda. Giriş yapılamaz.' };
      }

      setEmployee(profile);
      setLoading(false);
      return { role: profile.role };
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setEmployee(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      employee,
      role: employee?.role ?? null,
      locationId: employee?.locationId ?? null,
      loading,
      signIn,
      signOut,
    }),
    [employee, loading, signIn, signOut]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
