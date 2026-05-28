import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';
import AdminStockTransfer from '../../components/AdminStockTransfer';
import PageSkeleton from '../../components/ui/PageSkeleton';

export default function OpsTransfersPage() {
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

  const branchTransfers = transfers.filter(
    (transfer) =>
      transfer.sourceLocationId === employee.locationId ||
      transfer.destinationLocationId === employee.locationId
  );

  return (
    <AdminStockTransfer
      locations={locations}
      items={items}
      transfers={branchTransfers}
      currentUser={employee}
      lockedDestinationId={employee.locationId}
      allowApprovals={false}
      onCreateTransfer={createTransfer}
      onUpdateTransferStatus={updateTransferStatus}
    />
  );
}
