import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';
import OwnerOverviewDashboard from '../../components/OwnerOverviewDashboard';
import PageSkeleton from '../../components/ui/PageSkeleton';

export default function InventoryPage() {
  const { employee } = useAuth();
  const { loading, locations, items, usageLogs, modifyProductQuantity } =
    useInventory();

  if (loading || !employee) return <PageSkeleton />;

  const restrictedLocationId =
    employee.role === 'Location Manager' ? employee.locationId : undefined;

  return (
    <OwnerOverviewDashboard
      locations={locations}
      items={items}
      usageLogs={usageLogs}
      currentUser={employee}
      onModifyProductQuantity={modifyProductQuantity}
      restrictedLocationId={restrictedLocationId}
      compactHeader
    />
  );
}
