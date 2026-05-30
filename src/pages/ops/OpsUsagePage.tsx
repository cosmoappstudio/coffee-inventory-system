import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';
import { useI18n } from '../../context/I18nContext';
import BaristaShiftView from '../../components/BaristaShiftView';
import PageSkeleton from '../../components/ui/PageSkeleton';

export default function OpsUsagePage() {
  const { employee, switchLocationWithPin } = useAuth();
  const { t } = useI18n();
  const { loading, locations, items, usageLogs, transfers, logUsage, undoUsage } =
    useInventory();

  const location = useMemo(
    () =>
      locations.find((loc) => loc.id === employee?.locationId) ??
      locations.find((loc) => !loc.isWarehouse),
    [employee?.locationId, locations]
  );

  if (loading || !employee || !location) return <PageSkeleton />;

  const assignedLocations =
    employee.role === 'Owner'
      ? []
      : locations.filter((loc) =>
          (employee.locationIds?.length
            ? employee.locationIds
            : [employee.locationId]
          ).includes(loc.id)
        );

  const pendingDeliveries = transfers.filter(
    (transfer) =>
      transfer.status === 'Approved - Awaiting Fulfillment' &&
      transfer.destinationLocationId === employee.locationId
  );
  const pendingItemCount = pendingDeliveries.reduce(
    (count, transfer) => count + transfer.items.length,
    0
  );

  return (
    <div className="space-y-4">
      {pendingDeliveries.length > 0 && (
        <section className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-blue-200 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-blue-950">
                {pendingDeliveries.length} {t('bekleyen teslimat')} · {pendingItemCount} {t('ürün')}
              </h3>
              <p className="text-xs text-blue-800 mt-0.5">
                {t('Şubenize ürün gönderimi var. Teslim almak için transferler sayfasına gidin.')}
              </p>
            </div>
          </div>
          <Link
            to="/ops/transfers"
            className="min-h-[42px] px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold inline-flex items-center justify-center gap-2"
          >
            {t('Teslimatları Gör')}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>
      )}

      <BaristaShiftView
        location={location}
        currentUser={employee}
        items={items}
        usageLogs={usageLogs}
        assignedLocations={assignedLocations}
        onSwitchLocation={switchLocationWithPin}
        onLogUsage={(itemId, quantity) => logUsage(itemId, quantity, location.id)}
        onUndoUsage={undoUsage}
      />
    </div>
  );
}
