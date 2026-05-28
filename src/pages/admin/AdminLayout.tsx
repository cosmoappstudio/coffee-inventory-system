import type { ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Coffee,
  Building2,
  LayoutDashboard,
  LogOut,
  PackagePlus,
  Users,
  BarChart3,
} from 'lucide-react';
import LanguageSelector from '../../components/LanguageSelector';
import { useAuth } from '../../context/AuthContext';
import type { Role } from '../../types';

type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
  roles: Role[];
};

const NAV_ITEMS: NavItem[] = [
  {
    to: '/admin/dashboard',
    label: 'Genel Durum',
    icon: <LayoutDashboard className="w-4 h-4" />,
    roles: ['Owner'],
  },
  {
    to: '/admin/products',
    label: 'Ürünler',
    icon: <PackagePlus className="w-4 h-4" />,
    roles: ['Owner'],
  },
  {
    to: '/admin/locations',
    label: 'Lokasyonlar',
    icon: <Building2 className="w-4 h-4" />,
    roles: ['Owner'],
  },
  {
    to: '/admin/employees',
    label: 'Çalışanlar',
    icon: <Users className="w-4 h-4" />,
    roles: ['Owner'],
  },
  {
    to: '/admin/reports',
    label: 'Raporlar',
    icon: <BarChart3 className="w-4 h-4" />,
    roles: ['Owner'],
  },
];

export default function AdminLayout() {
  const { employee, signOut } = useAuth();
  const navigate = useNavigate();

  const visibleNav = NAV_ITEMS.filter(
    (item) => employee && item.roles.includes(employee.role)
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-brand-cream text-espresso-950 font-sans lg:flex">
      <header className="lg:hidden sticky top-0 z-40 bg-espresso-950 text-espresso-100 border-b border-brand-amber/15 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="bg-brand-amber text-espresso-950 p-2 rounded-lg shrink-0">
              <Coffee className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-darkcream truncate">
                Immersion Admin
              </p>
              {employee && (
                <p className="text-[10px] text-espresso-400 font-mono truncate">
                  {employee.name} · {employee.id}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <LanguageSelector variant="dark" compact />
            <button
              type="button"
              onClick={handleSignOut}
              className="min-h-[40px] px-3 rounded-lg text-xs font-bold text-espresso-200 hover:text-white hover:bg-espresso-900 transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              Çıkış
            </button>
          </div>
        </div>

        <nav className="px-3 pb-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {visibleNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `min-h-[42px] px-3 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? 'bg-brand-amber text-espresso-950'
                      : 'bg-espresso-900/70 text-espresso-250 hover:text-white'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <aside className="hidden lg:flex w-60 shrink-0 bg-espresso-950 text-espresso-100 border-r border-brand-amber/15 flex-col sticky top-0 h-screen">
        <div className="px-4 py-5 border-b border-espresso-800">
          <div className="flex items-center gap-2">
            <div className="bg-brand-amber text-espresso-950 p-2 rounded-lg">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-darkcream">
                Immersion
              </p>
              <p className="text-[10px] text-espresso-400 font-mono">Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `min-h-[44px] flex items-center gap-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-brand-amber text-espresso-950'
                    : 'text-espresso-300 hover:text-white hover:bg-espresso-900'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-espresso-800 space-y-3">
          {employee && (
            <p className="text-[10px] font-mono text-espresso-400 mb-2 truncate">
              {employee.name}
              <span className="block text-brand-darkcream">{employee.id}</span>
            </p>
          )}
          <LanguageSelector variant="dark" placement="top" />
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 px-3 rounded-lg text-xs font-bold text-espresso-300 hover:text-white hover:bg-espresso-900 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Çıkış
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
