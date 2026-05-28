import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';
import OwnerOverviewDashboard from '../../components/OwnerOverviewDashboard';
import PageSkeleton from '../../components/ui/PageSkeleton';

export default function DashboardPage() {
  const { employee } = useAuth();
  const { loading, locations, items, usageLogs, modifyProductQuantity } =
    useInventory();

  if (loading || !employee) return <PageSkeleton />;

  return (
    <div className="p-4 sm:p-5 xl:p-6">
      <OwnerOverviewDashboard
        locations={locations}
        items={items}
        usageLogs={usageLogs}
        currentUser={employee}
        onModifyProductQuantity={modifyProductQuantity}
      />
    </div>
  );
}
