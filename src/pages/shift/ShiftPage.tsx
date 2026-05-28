import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';
import BaristaShiftView from '../../components/BaristaShiftView';
import PageSkeleton from '../../components/ui/PageSkeleton';

export default function ShiftPage() {
  const { employee, signOut } = useAuth();
  const { loading, locations, items, usageLogs, logUsage, undoUsage } =
    useInventory();
  const navigate = useNavigate();

  const location = useMemo(
    () =>
      locations.find((l) => l.id === employee?.locationId) ??
      locations.find((l) => !l.isWarehouse),
    [locations, employee?.locationId]
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  if (loading || !employee || !location) {
    return (
      <div className="min-h-screen bg-brand-cream">
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream text-espresso-950 font-sans flex flex-col">
      <header className="bg-espresso-950 text-espresso-100 border-b border-brand-amber/15 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="bg-brand-amber text-espresso-950 p-2 rounded-lg">
            <Coffee className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-darkcream">
              Vardiya · {location.name}
            </p>
            <p className="text-[10px] font-mono text-espresso-400">
              {employee.name} · {employee.id}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg text-xs font-bold text-espresso-300 hover:text-white hover:bg-espresso-900 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Çıkış
        </button>
      </header>

      <div className="flex-1 p-4 max-w-3xl mx-auto w-full">
        <BaristaShiftView
          location={location}
          currentUser={employee}
          items={items}
          usageLogs={usageLogs}
          onLogUsage={(itemId, qty) => logUsage(itemId, qty, location.id)}
          onUndoUsage={undoUsage}
        />
      </div>
    </div>
  );
}
