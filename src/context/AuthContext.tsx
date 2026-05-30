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
const ACTIVE_LOCATION_STORAGE_PREFIX = 'immersion-active-location:';

type AuthContextValue = {
  employee: Employee | null;
  role: Role | null;
  locationId: string | null;
  loading: boolean;
  signIn: (
    employeeId: string,
    password: string
  ) => Promise<{ error?: string; role?: Role }>;
  switchLocationWithPin: (
    locationId: string,
    password: string
  ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapEmployeeRow(row: EmployeeRow): Employee {
  const assignedLocationIds = (row.employee_locations ?? []).map(
    (assignment) => assignment.location_id
  );
  const storedActive =
    typeof window !== 'undefined'
      ? window.localStorage.getItem(`${ACTIVE_LOCATION_STORAGE_PREFIX}${row.id}`)
      : null;
  const fallbackLocationId = row.location_id ?? assignedLocationIds[0] ?? 'all';
  const locationIds =
    row.role === 'Owner'
      ? ['all']
      : Array.from(new Set([fallbackLocationId, ...assignedLocationIds]));
  const activeLocationId =
    storedActive && locationIds.includes(storedActive)
      ? storedActive
      : fallbackLocationId;

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    locationId: activeLocationId,
    locationIds,
    status: row.status,
    email: row.email,
  };
}

async function fetchEmployeeByAuthId(authId: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, auth_id, name, role, location_id, status, email, employee_locations(location_id)')
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

  const switchLocationWithPin = useCallback(
    async (
      nextLocationId: string,
      password: string
    ): Promise<{ error?: string }> => {
      if (!employee) return { error: 'Oturum bulunamadı.' };
      if (!employee.locationIds?.includes(nextLocationId)) {
        return { error: 'Bu şubeye atanmış değilsiniz.' };
      }
      if (!/^\d{5}$/.test(password)) {
        return { error: 'PIN 5 haneli olmalıdır.' };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: employeeAuthEmail(employee.id),
        password,
      });
      if (error) return { error: 'PIN hatalı.' };

      window.localStorage.setItem(
        `${ACTIVE_LOCATION_STORAGE_PREFIX}${employee.id}`,
        nextLocationId
      );
      setEmployee((prev) =>
        prev ? { ...prev, locationId: nextLocationId } : prev
      );
      return {};
    },
    [employee]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      employee,
      role: employee?.role ?? null,
      locationId: employee?.locationId ?? null,
      loading,
      signIn,
      switchLocationWithPin,
      signOut,
    }),
    [employee, loading, signIn, switchLocationWithPin, signOut]
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
