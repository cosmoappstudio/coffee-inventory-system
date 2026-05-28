import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';
import AdminStockTransfer from '../../components/AdminStockTransfer';
import PageSkeleton from '../../components/ui/PageSkeleton';

export default function TransfersPage() {
  const { employee } = useAuth();
  const {
    loading,
    locations,
    items,
    transfers,
    createTransfer,
    updateTransferStatus,
  } = useInventory();

  if (loading || !employee) return <PageSkeleton />;

  return (
    <div className="p-4 sm:p-6">
      <AdminStockTransfer
        locations={locations}
        items={items}
        transfers={transfers}
        currentUser={employee}
        onCreateTransfer={createTransfer}
        onUpdateTransferStatus={updateTransferStatus}
      />
    </div>
  );
}
