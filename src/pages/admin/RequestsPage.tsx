import { useMemo, useState } from 'react';
import { Check, ClipboardList, X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useInventory } from '../../context/InventoryContext';
import PageSkeleton from '../../components/ui/PageSkeleton';
import type { BranchRequestPriority, BranchRequestStatus } from '../../types';

function priorityLabel(priority: BranchRequestPriority) {
  switch (priority) {
    case 'Low':
      return 'Düşük';
    case 'High':
      return 'Yüksek';
    case 'Urgent':
      return 'Acil';
    default:
      return 'Normal';
  }
}

function statusTone(status: BranchRequestStatus) {
  switch (status) {
    case 'Approved':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'Completed':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'Declined':
      return 'bg-red-50 text-red-800 border-red-200';
    default:
      return 'bg-amber-50 text-amber-800 border-brand-amber/30';
  }
}

function statusLabel(status: BranchRequestStatus) {
  switch (status) {
    case 'Pending Approval':
      return 'Onay Bekliyor';
    case 'Approved':
      return 'Onaylandı';
    case 'Completed':
      return 'Gerçekleşti';
    case 'Declined':
      return 'Reddedildi';
    default:
      return status;
  }
}

export default function RequestsPage() {
  const { t } = useI18n();
  const {
    loading,
    locations,
    employees,
    branchRequests,
    updateRequestStatus,
  } = useInventory();
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  const locationNameById = useMemo(
    () => new Map(locations.map((location) => [location.id, location.name])),
    [locations]
  );
  const employeeNameById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee.name])),
    [employees]
  );

  if (loading) return <PageSkeleton />;

  const pendingCount = branchRequests.filter(
    (request) => request.status === 'Pending Approval'
  ).length;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-espresso-950 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-brand-terracotta" />
            {t('Talepler')}
          </h1>
          <p className="text-xs text-espresso-600 mt-1">
            {t('Şubelerden gelen ürün dışı talepleri inceleyin ve onaylayın.')}
          </p>
        </div>
        <span className="text-[11px] font-mono font-bold text-brand-terracotta bg-brand-terracotta/10 border border-brand-terracotta/20 rounded px-3 py-2">
          {pendingCount} {t('bekleyen talep')}
        </span>
      </div>

      <section className="bg-white border border-espresso-200 rounded-xl overflow-hidden shadow-xs">
        {branchRequests.length === 0 ? (
          <div className="p-8 text-center text-sm text-espresso-500">
            {t('Henüz şube talebi yok.')}
          </div>
        ) : (
          <div className="divide-y divide-espresso-100">
            {branchRequests.map((request) => {
              const pending = request.status === 'Pending Approval';
              return (
                <div key={request.id} className="p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold text-espresso-950 text-base">
                          {request.title}
                        </h2>
                        <span className={`text-[10px] font-mono font-bold uppercase rounded px-2 py-1 border ${statusTone(request.status)}`}>
                          {t(statusLabel(request.status))}
                        </span>
                      </div>
                      <p className="text-sm text-espresso-700 mt-2">
                        {request.description}
                      </p>
                    </div>
                    <div className="text-[11px] font-mono text-espresso-500 lg:text-right shrink-0 space-y-1">
                      <p>{locationNameById.get(request.locationId) ?? request.locationId}</p>
                      <p>{employeeNameById.get(request.requestedBy) ?? request.requestedBy}</p>
                      <p>{new Date(request.createdAt).toLocaleString('tr-TR')}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded bg-espresso-50 border border-espresso-100 px-2 py-1 text-espresso-600">
                      {t('Öncelik')}: <b>{t(priorityLabel(request.priority))}</b>
                    </span>
                    {request.resolvedBy && (
                      <span className="rounded bg-espresso-50 border border-espresso-100 px-2 py-1 text-espresso-600">
                        {t('Yanıtlayan')}: <b>{employeeNameById.get(request.resolvedBy) ?? request.resolvedBy}</b>
                      </span>
                    )}
                    {request.completedBy && (
                      <span className="rounded bg-blue-50 border border-blue-100 px-2 py-1 text-blue-800">
                        {t('Tamamlayan')}: <b>{employeeNameById.get(request.completedBy) ?? request.completedBy}</b>
                      </span>
                    )}
                    {request.completedAt && (
                      <span className="rounded bg-blue-50 border border-blue-100 px-2 py-1 text-blue-800">
                        {new Date(request.completedAt).toLocaleString('tr-TR')}
                      </span>
                    )}
                  </div>

                  {request.resolutionNote && (
                    <p className="text-xs text-espresso-500 italic bg-espresso-50 border border-espresso-100 rounded-lg px-3 py-2">
                      {t('Yönetim Notu')}: {request.resolutionNote}
                    </p>
                  )}

                  {pending && (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
                      <input
                        value={resolutionNotes[request.id] ?? ''}
                        onChange={(event) =>
                          setResolutionNotes((prev) => ({
                            ...prev,
                            [request.id]: event.target.value,
                          }))
                        }
                        placeholder={t('Opsiyonel yönetim notu...')}
                        className="min-h-[42px] rounded-lg border border-espresso-200 px-3 py-2 text-sm"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateRequestStatus(
                              request.id,
                              'Declined',
                              resolutionNotes[request.id]
                            )
                          }
                          className="min-h-[42px] px-4 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                          {t('Reddet')}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateRequestStatus(
                              request.id,
                              'Approved',
                              resolutionNotes[request.id]
                            )
                          }
                          className="min-h-[42px] px-4 rounded-lg bg-emerald-600 text-white text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          {t('Onayla')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
