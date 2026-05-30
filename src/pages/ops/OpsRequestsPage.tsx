import { useMemo, useState, type FormEvent } from 'react';
import { ClipboardList, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { useInventory } from '../../context/InventoryContext';
import PageSkeleton from '../../components/ui/PageSkeleton';
import type { BranchRequestPriority, BranchRequestStatus } from '../../types';

const PRIORITIES: BranchRequestPriority[] = ['Low', 'Normal', 'High', 'Urgent'];

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

function statusTone(status: BranchRequestStatus) {
  switch (status) {
    case 'Approved':
      return 'bg-emerald-50 border-emerald-200 text-emerald-800';
    case 'Completed':
      return 'bg-blue-50 border-blue-200 text-blue-800';
    case 'Declined':
      return 'bg-red-50 border-red-200 text-red-800';
    default:
      return 'bg-amber-50 border-brand-amber/30 text-amber-800';
  }
}

export default function OpsRequestsPage() {
  const { employee } = useAuth();
  const { t } = useI18n();
  const {
    loading,
    locations,
    employees,
    branchRequests,
    createRequest,
    completeRequest,
  } = useInventory();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<BranchRequestPriority>('Normal');
  const [submitting, setSubmitting] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const location = useMemo(
    () => locations.find((loc) => loc.id === employee?.locationId),
    [employee?.locationId, locations]
  );

  const employeeNameById = useMemo(
    () => new Map(employees.map((staff) => [staff.id, staff.name])),
    [employees]
  );

  const branchRequestsForLocation = useMemo(
    () =>
      branchRequests.filter(
        (request) => request.locationId === employee?.locationId
      ),
    [branchRequests, employee?.locationId]
  );

  if (loading || !employee || !location) return <PageSkeleton />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError(t('Talep başlığı ve açıklaması zorunludur.'));
      return;
    }

    setSubmitting(true);
    try {
      await createRequest({
        locationId: location.id,
        requestedBy: employee.id,
        title: title.trim(),
        description: description.trim(),
        priority,
      });
      setTitle('');
      setDescription('');
      setPriority('Normal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (requestId: string) => {
    setCompletingId(requestId);
    try {
      await completeRequest(requestId);
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-espresso-950 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-brand-terracotta" />
          {t('Talepler')}
        </h1>
        <p className="text-xs text-espresso-600 mt-1">
          {t('Şubeniz için ürün dışı ihtiyaçları yönetime iletin.')}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-espresso-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-mono font-bold uppercase text-espresso-600 mb-1">
              {t('Talep Başlığı')}
            </label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t('Örn: Ek sandalye, tamir, temizlik malzemesi...')}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-espresso-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-bold uppercase text-espresso-600 mb-1">
              {t('Öncelik')}
            </label>
            <select
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as BranchRequestPriority)
              }
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-espresso-200 bg-white text-sm font-bold"
            >
              {PRIORITIES.map((option) => (
                <option key={option} value={option}>
                  {t(priorityLabel(option))}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-mono font-bold uppercase text-espresso-600 mb-1">
            {t('Açıklama')}
          </label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder={t('Neye ihtiyaç var, neden gerekli, ne kadar acil?')}
            className="w-full min-h-[120px] px-3 py-2 rounded-lg border border-espresso-200 text-sm"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-900 px-3 py-2 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto min-h-[44px] px-5 rounded-lg bg-brand-terracotta text-white text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          {submitting ? t('Gönderiliyor…') : t('Talebi Gönder')}
        </button>
      </form>

      <section className="bg-white border border-espresso-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-espresso-100 bg-espresso-50/45 flex items-center justify-between gap-3">
          <h2 className="font-bold text-espresso-950 text-sm">
            {t('Şube Talepleri')}
          </h2>
          <span className="text-[10px] font-mono text-espresso-500 bg-white border border-espresso-200 rounded px-2 py-1">
            {branchRequestsForLocation.length} {t('kayıt')}
          </span>
        </div>

        {branchRequestsForLocation.length === 0 ? (
          <div className="p-6 text-center text-sm text-espresso-500">
            {t('Henüz talep oluşturulmadı.')}
          </div>
        ) : (
          <div className="divide-y divide-espresso-100">
            {branchRequestsForLocation.map((request) => (
              <div key={request.id} className="p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-espresso-950 text-sm">
                      {request.title}
                    </h3>
                    <p className="text-xs text-espresso-600 mt-1">
                      {request.description}
                    </p>
                  </div>
                  <span className={`text-[10px] font-mono font-bold uppercase rounded px-2 py-1 border self-start ${statusTone(request.status)}`}>
                    {t(statusLabel(request.status))}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-mono text-espresso-500">
                  <span>{t('Öncelik')}: {t(priorityLabel(request.priority))}</span>
                  <span>{t('Talep Eden')}: {employeeNameById.get(request.requestedBy) ?? request.requestedBy}</span>
                  <span>{new Date(request.createdAt).toLocaleString('tr-TR')}</span>
                </div>
                {request.resolutionNote && (
                  <p className="text-[11px] text-espresso-500 italic">
                    {t('Yönetim Notu')}: {request.resolutionNote}
                  </p>
                )}
                {request.status === 'Approved' && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-xs text-emerald-900">
                      {t('Yönetim bu talebi onayladı. Talep karşılandığında gerçekleşti olarak işaretleyin.')}
                    </p>
                    <button
                      type="button"
                      disabled={completingId === request.id}
                      onClick={() => handleComplete(request.id)}
                      className="min-h-[40px] px-4 rounded-lg bg-emerald-600 text-white text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {completingId === request.id
                        ? t('Kaydediliyor…')
                        : t('Gerçekleşti')}
                    </button>
                  </div>
                )}
                {request.status === 'Completed' && (
                  <p className="text-[11px] text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    {t('Talep gerçekleşti olarak bildirildi.')}
                    {request.completedBy
                      ? ` ${t('Tamamlayan')}: ${
                          employeeNameById.get(request.completedBy) ??
                          request.completedBy
                        }`
                      : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
