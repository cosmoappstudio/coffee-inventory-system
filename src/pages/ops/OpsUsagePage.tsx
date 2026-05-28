import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';
import BaristaShiftView from '../../components/BaristaShiftView';
import PageSkeleton from '../../components/ui/PageSkeleton';

export default function OpsUsagePage() {
  const { employee } = useAuth();
  const { loading, locations, items, usageLogs, logUsage, undoUsage } =
    useInventory();

  const location = useMemo(
    () =>
      locations.find((loc) => loc.id === employee?.locationId) ??
      locations.find((loc) => !loc.isWarehouse),
    [employee?.locationId, locations]
  );

  if (loading || !employee || !location) return <PageSkeleton />;

  return (
    <BaristaShiftView
      location={location}
      currentUser={employee}
      items={items}
      usageLogs={usageLogs}
      onLogUsage={(itemId, quantity) => logUsage(itemId, quantity, location.id)}
      onUndoUsage={undoUsage}
    />
  );
}
