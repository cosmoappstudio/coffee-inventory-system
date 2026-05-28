import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowRightLeft, Coffee, LogOut, PackageCheck } from 'lucide-react';
import LanguageSelector from '../../components/LanguageSelector';
import { useAuth } from '../../context/AuthContext';

export default function OpsLayout() {
  const { employee, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-brand-cream text-espresso-950 font-sans flex flex-col">
      <header className="bg-espresso-950 text-espresso-100 border-b border-brand-amber/15 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-amber text-espresso-950 p-2 rounded-lg">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-darkcream">
                Şube Operasyon Paneli
              </p>
              {employee && (
                <p className="text-[10px] font-mono text-espresso-400">
                  {employee.name} · {employee.locationId}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <LanguageSelector variant="dark" compact />
            <nav className="flex items-center gap-1">
              <NavLink
                to="/ops/usage"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-brand-amber text-espresso-950'
                      : 'text-espresso-300 hover:text-white hover:bg-espresso-900'
                  }`
                }
              >
                <PackageCheck className="w-3.5 h-3.5" />
                Stok Kullanımı
              </NavLink>
              <NavLink
                to="/ops/transfers"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-brand-amber text-espresso-950'
                      : 'text-espresso-300 hover:text-white hover:bg-espresso-900'
                  }`
                }
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Transferler
              </NavLink>
            </nav>
            <button
              type="button"
              onClick={handleSignOut}
              className="px-3 py-2 rounded-lg text-xs font-bold text-espresso-300 hover:text-white hover:bg-espresso-900 flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4">
        <Outlet />
      </main>
    </div>
  );
}
