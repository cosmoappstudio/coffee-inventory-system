import { useInventory } from '../../context/InventoryContext';
import ReportsView from '../../components/ReportsView';
import PageSkeleton from '../../components/ui/PageSkeleton';

export default function ReportsPage() {
  const {
    loading,
    locations,
    items,
    usageLogs,
    transfers,
    updateTransferStatus,
  } = useInventory();

  if (loading) return <PageSkeleton />;

  return (
    <ReportsView
      locations={locations}
      items={items}
      usageLogs={usageLogs}
      transfers={transfers}
      onUpdateTransferStatus={updateTransferStatus}
    />
  );
}
