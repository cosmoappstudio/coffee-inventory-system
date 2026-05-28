import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, Lock, User, AlertCircle } from 'lucide-react';
import LanguageSelector from '../components/LanguageSelector';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { supabase } from '../lib/supabase';
import { getConfigError } from '../lib/inventoryService';
import { getDefaultPathForRole } from '../lib/routes';
import type { Role } from '../types';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, employee, loading: authLoading } = useAuth();
  const { t } = useI18n();

  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const configError = getConfigError();

  useEffect(() => {
    if (!authLoading && employee) {
      navigate(getDefaultPathForRole(employee.role as Role), { replace: true });
    }
  }, [authLoading, employee, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedId = employeeId.trim().toUpperCase();
    if (!/^IMM-\d{4}$/.test(normalizedId)) {
      setError(t('Çalışan ID formatı IMM-XXXX olmalıdır.'));
      return;
    }

    if (!/^\d{5}$/.test(password)) {
      setError(t('Şifre 5 haneli bir sayı olmalıdır.'));
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn(normalizedId, password);

      if (result.error) {
        setError(t(result.error));
        return;
      }

      if (result.role) {
        navigate(getDefaultPathForRole(result.role), { replace: true });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? t(err.message)
          : t('Giriş yapılamadı. Lütfen tekrar deneyin.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-espresso-600 font-medium text-sm">Oturum kontrol ediliyor…</p>
        <a
          href="/login"
          onClick={(e) => {
            e.preventDefault();
            void supabase.auth.signOut();
            window.location.href = '/login';
          }}
          className="text-xs text-espresso-500 underline hover:text-espresso-800"
        >
          Takıldıysa oturumu temizle
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream text-espresso-950 font-sans antialiased flex flex-col">
      <header className="bg-espresso-950 text-espresso-100 border-b border-brand-amber/15">
        <div className="max-w-lg mx-auto px-4 py-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-brand-amber text-espresso-950 p-2.5 rounded-lg font-bold w-10 h-10 flex items-center justify-center shrink-0">
              <Coffee className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-wider text-brand-darkcream uppercase">
                Immersion Coffee
              </h1>
              <p className="text-espresso-400 text-xs font-mono mt-0.5">
                Stok &amp; vardiya girişi
              </p>
            </div>
          </div>
          <LanguageSelector variant="dark" compact />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="bg-white border border-espresso-200 rounded-2xl shadow-sm p-6 sm:p-8">
            <h2 className="text-xl font-bold text-espresso-950 mb-1">
              Çalışan girişi
            </h2>
            <p className="text-sm text-espresso-600 mb-6">
              Employee ID ve 5 haneli şifrenizi girin.
            </p>

            {configError && (
              <div
                role="status"
                className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-950"
              >
                {configError} Canlıya almadan önce <code className="font-mono">.env</code> dosyasını doldurun ve{' '}
                <code className="font-mono">npm run seed</code> çalıştırın.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="employee-id"
                  className="block text-xs font-bold uppercase tracking-wider text-espresso-700 mb-2"
                >
                  Çalışan ID
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso-400 pointer-events-none" />
                  <input
                    id="employee-id"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder="IMM-1034"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    onBlur={() => setEmployeeId((v) => v.trim().toUpperCase())}
                    className="w-full pl-10 pr-4 py-3 min-h-[44px] rounded-lg border border-espresso-200 bg-brand-cream/50 text-espresso-950 font-mono text-sm placeholder:text-espresso-400 focus:outline-none focus:ring-2 focus:ring-brand-amber/40 focus:border-brand-amber"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider text-espresso-700 mb-2"
                >
                  Şifre (5 hane)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso-400 pointer-events-none" />
                  <input
                    id="password"
                    type="password"
                    inputMode="numeric"
                    autoComplete="current-password"
                    maxLength={5}
                    placeholder="•••••"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value.replace(/\D/g, '').slice(0, 5))
                    }
                    className="w-full pl-10 pr-4 py-3 min-h-[44px] rounded-lg border border-espresso-200 bg-brand-cream/50 text-espresso-950 font-mono text-sm tracking-widest placeholder:text-espresso-400 focus:outline-none focus:ring-2 focus:ring-brand-amber/40 focus:border-brand-amber"
                  />
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-brand-terracotta/30 bg-brand-terracotta/10 px-3 py-2.5 text-sm text-brand-terracotta"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[44px] rounded-lg bg-brand-amber hover:bg-brand-amber/90 disabled:opacity-60 disabled:cursor-not-allowed text-espresso-950 font-bold text-sm transition-colors cursor-pointer"
              >
                {submitting ? t('Giriş yapılıyor…') : t('Giriş yap')}
              </button>
              {submitting && (
                <button
                  type="button"
                  onClick={() => {
                    void supabase.auth.signOut();
                    setSubmitting(false);
                    setError(t('Giriş iptal edildi. Tekrar deneyebilirsiniz.'));
                  }}
                  className="w-full text-xs text-espresso-500 underline hover:text-espresso-800"
                >
                  Takıldıysa iptal et
                </button>
              )}
            </form>
          </div>

          <p className="text-center text-xs text-espresso-500 mt-6 font-mono">
            San Diego · Multi-location inventory
          </p>
        </div>
      </main>
    </div>
  );
}
