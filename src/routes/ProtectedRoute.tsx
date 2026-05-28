import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { clearAppCacheAndReload } from '../lib/appReset';
import { getAdminLandingPath, getDefaultPathForRole } from '../lib/routes';
import type { Role } from '../types';

type ProtectedRouteProps = {
  allowedRoles?: Role[];
  ownerOnly?: boolean;
  children?: React.ReactNode;
};

export function AuthLoadingScreen() {
  const [showReset, setShowReset] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setShowReset(true), 3500);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-espresso-600 font-medium text-sm">{t('Yükleniyor…')}</p>
      {showReset && (
        <div className="space-y-2">
          <p className="text-xs text-espresso-500 max-w-sm">
            {t('Bu ekran uzun sürdüyse tarayıcıda eski oturum veya cache kalmış olabilir.')}
          </p>
          <button
            type="button"
            onClick={() => void clearAppCacheAndReload()}
            className="min-h-[40px] px-4 rounded-lg bg-brand-terracotta text-white text-xs font-bold cursor-pointer"
          >
            {t("Oturumu ve cache'i temizle")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProtectedRoute({
  allowedRoles,
  ownerOnly,
  children,
}: ProtectedRouteProps) {
  const { employee, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (!employee || !role) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getDefaultPathForRole(role)} replace />;
  }

  if (ownerOnly && role !== 'Owner') {
    return <Navigate to={getAdminLandingPath(role)} replace />;
  }

  return children ?? <Outlet />;
}
