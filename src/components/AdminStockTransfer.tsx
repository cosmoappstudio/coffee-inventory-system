import React, { useState } from 'react';
import { Location, InventoryItem, StockTransfer, TransferItem, TransferStatus, Employee } from '../types';
import { 
  ArrowRightLeft, 
  Warehouse, 
  Store, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  AlertCircle, 
  History, 
  Truck, 
  Clock, 
  Ban, 
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';

interface AdminStockTransferProps {
  locations: Location[];
  items: InventoryItem[];
  transfers: StockTransfer[];
  currentUser: Employee;
  lockedSourceId?: string;
  lockedDestinationId?: string;
  allowApprovals?: boolean;
  onCreateTransfer: (transfer: Omit<StockTransfer, 'id' | 'createdAt' | 'status'>) => void;
  onUpdateTransferStatus: (
    transferId: string,
    status: Extract<
      TransferStatus,
      'Approved - Awaiting Fulfillment' | 'Approved & Completed' | 'Declined'
    >,
    updaterName: string
  ) => void;
}

export default function AdminStockTransfer({
  locations,
  items,
  transfers,
  currentUser,
  lockedSourceId,
  lockedDestinationId,
  allowApprovals = true,
  onCreateTransfer,
  onUpdateTransferStatus
}: AdminStockTransferProps) {
  const { t } = useI18n();
  // Transfer Creator Form State
  const [sourceId, setSourceId] = useState<string>('warehouse');
  const [destId, setDestId] = useState<string>('');
  const [itemsToTransfer, setItemsToTransfer] = useState<{ itemId: string; quantity: number }[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedQty, setSelectedQty] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (lockedSourceId) {
      setSourceId(lockedSourceId);
      setItemsToTransfer([]);
    }
  }, [lockedSourceId]);

  React.useEffect(() => {
    if (lockedDestinationId) {
      setDestId(lockedDestinationId);
      setItemsToTransfer([]);
    }
  }, [lockedDestinationId]);

  // Initialize destId to first non-source location on change or mount
  React.useEffect(() => {
    if (lockedDestinationId) {
      setDestId(lockedDestinationId);
      return;
    }
    const defaultDest = locations.find(loc => loc.id !== sourceId);
    if (defaultDest) {
      setDestId(defaultDest.id);
    }
  }, [sourceId, locations, lockedDestinationId]);

  // Handle adding an item to the transfer draft
  const handleAddItem = () => {
    if (!selectedItemId) {
      setErrorMsg(t('Önce bir malzeme seçin.'));
      return;
    }
    if (selectedQty <= 0) {
      setErrorMsg(t('Miktar sıfırdan büyük olmalıdır.'));
      return;
    }

    // Check if item already exists in list
    const existingIndex = itemsToTransfer.findIndex(it => it.itemId === selectedItemId);
    const itemFull = items.find(i => i.id === selectedItemId);
    if (!itemFull) return;

    // Check stock levels at source
    const sourceStock = itemFull.quantities[sourceId] ?? 0;
    const requestedQty = selectedQty + (existingIndex > -1 ? itemsToTransfer[existingIndex].quantity : 0);

    if (sourceStock < requestedQty) {
      setErrorMsg(
        `${t('Uyarı:')} ${itemFull.name} ${t('kaynakta yalnızca')} ${sourceStock} ${itemFull.unit} ${t('stoka sahip.')}`
      );
      // We will allow adding it but warn them in the template with red indicators
    } else {
      setErrorMsg(null);
    }

    if (existingIndex > -1) {
      const updated = [...itemsToTransfer];
      updated[existingIndex].quantity = requestedQty;
      setItemsToTransfer(updated);
    } else {
      setItemsToTransfer([...itemsToTransfer, { itemId: selectedItemId, quantity: selectedQty }]);
    }

    setSelectedItemId('');
    setSelectedQty(5);
  };

  const handleRemoveDraftItem = (index: number) => {
    setItemsToTransfer(itemsToTransfer.filter((_, idx) => idx !== index));
    setErrorMsg(null);
  };

  // Submit transfer form
  const handleConfirmTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !destId) {
      setErrorMsg(t('Lütfen kaynak ve hedef lokasyon seçin.'));
      return;
    }
    if (sourceId === destId) {
      setErrorMsg(t('Kaynak ve hedef aynı lokasyon olamaz.'));
      return;
    }
    if (itemsToTransfer.length === 0) {
      setErrorMsg(t('Transfer oluşturmak için en az bir ürün eklemelisiniz.'));
      return;
    }

    onCreateTransfer({
      sourceLocationId: sourceId,
      destinationLocationId: destId,
      items: itemsToTransfer,
      notes: notes.trim()
    });

    // Reset draft state
    setItemsToTransfer([]);
    setNotes('');
    setSuccessMsg(t('Transfer talebi başarıyla kaydedildi.'));
    setErrorMsg(null);

    setTimeout(() => {
      setSuccessMsg(null);
    }, 4500);
  };

  const getSourceLocationObj = () => locations.find(l => l.id === sourceId);
  const getDestLocationObj = () => locations.find(l => l.id === destId);
  const awaitingSourceTransfers = transfers.filter(
    (transfer) =>
      transfer.status === 'Approved - Awaiting Fulfillment' &&
      transfer.sourceLocationId === currentUser.locationId
  );

  // Status Badge styling helper
  const getStatusBadge = (status: TransferStatus) => {
    switch(status) {
      case 'Pending Approval':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold uppercase rounded-md bg-amber-50 border border-brand-amber/30 text-amber-850">
            <Clock className="w-3.5 h-3.5 text-brand-amber shrink-0" />
            YÖNETİCİ ONAYI
          </span>
        );
      case 'Approved - Awaiting Fulfillment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold uppercase rounded-md bg-blue-50 border border-blue-200 text-blue-800">
            <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            GÖNDERİM BEKLİYOR
          </span>
        );
      case 'Approved & Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold uppercase rounded-md bg-emerald-50 border border-emerald-300 text-emerald-900">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            TAMAMLANDI
          </span>
        );
      case 'Declined':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold uppercase rounded-md bg-red-50 border border-red-200 text-red-800">
            <Ban className="w-3.5 h-3.5 text-red-500 shrink-0" />
            REDDEDİLDİ
          </span>
        );
    }
  };

  const renderTransferCard = (trsf: StockTransfer) => {
    const sourceObj = locations.find(l => l.id === trsf.sourceLocationId);
    const destObj = locations.find(l => l.id === trsf.destinationLocationId);
    const isPending = trsf.status === 'Pending Approval';
    const isAwaitingFulfillment =
      trsf.status === 'Approved - Awaiting Fulfillment';
    const canApprove =
      allowApprovals && isPending && currentUser.role === 'Owner';
    const canComplete =
      isAwaitingFulfillment && currentUser.locationId === trsf.sourceLocationId;

    return (
      <div key={trsf.id} className="p-3 bg-white border border-espresso-150 rounded-lg space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] text-espresso-500 truncate">
              {trsf.id}
            </p>
            <div className="mt-1 text-xs font-bold text-espresso-950 leading-snug">
              {sourceObj ? sourceObj.name : trsf.sourceLocationId}
              <ArrowRight className="inline-block w-3.5 h-3.5 mx-1 text-brand-terracotta" />
              {destObj ? destObj.name : trsf.destinationLocationId}
            </div>
          </div>
          {getStatusBadge(trsf.status)}
        </div>

        <div className="rounded-lg bg-espresso-50/45 border border-espresso-100 p-2 space-y-1.5">
          {trsf.items.map((item, index) => {
            const itemFull = items.find(it => it.id === item.itemId);
            return (
              <div
                key={`${trsf.id}-side-${item.itemId}-${index}`}
                className="flex items-start justify-between gap-3 text-[11px]"
              >
                <span className="font-semibold text-espresso-800 truncate">
                  {itemFull ? itemFull.name : item.itemId}
                </span>
                <span className="font-mono font-bold text-espresso-950 whitespace-nowrap">
                  {item.quantity} {itemFull?.unit || 'pcs'}
                </span>
              </div>
            );
          })}
          {trsf.notes && (
            <p className="pt-2 border-t border-espresso-100 text-[10px] text-espresso-500 italic line-clamp-2">
              Not: &ldquo;{trsf.notes}&rdquo;
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 text-[10px] text-espresso-500">
          <span className="font-mono">
            {new Date(trsf.createdAt).toLocaleString('tr-TR', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
          {trsf.approvedBy && (
            <span className="font-mono truncate">Onay: {trsf.approvedBy}</span>
          )}
        </div>

        {canApprove ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onUpdateTransferStatus(trsf.id, 'Declined', currentUser.name)}
              className="min-h-[40px] text-xs border border-red-200 bg-red-50 text-red-800 font-bold hover:bg-red-100 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Reddet
            </button>
            <button
              type="button"
              onClick={() => onUpdateTransferStatus(trsf.id, 'Approved - Awaiting Fulfillment', currentUser.name)}
              className="min-h-[40px] text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center justify-center gap-1 shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Onayla
            </button>
          </div>
        ) : canComplete ? (
          <button
            type="button"
            onClick={() => onUpdateTransferStatus(trsf.id, 'Approved & Completed', currentUser.name)}
            className="w-full min-h-[40px] text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center justify-center gap-1 shadow-xs cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" /> Transfer Tamamlandı
          </button>
        ) : (
          <div className="text-[10px] text-espresso-400 font-mono font-medium">
            {isPending
              ? 'Yönetici Onayı Bekliyor'
              : isAwaitingFulfillment
                ? 'Kaynak Şubeye Bildirildi'
                : trsf.status === 'Declined'
                  ? 'Reddedildi'
                  : 'Tamamlandı'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Head */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-espresso-950 flex items-center gap-2 leading-tight">
          <ArrowRightLeft className="w-6 h-6 sm:w-7 sm:h-7 text-brand-terracotta shrink-0" />
          Stok Transfer Yönetimi
        </h2>
        <p className="text-espresso-600 text-xs mt-1">
          Merkez depo ile 5 şube arasında kahve çekirdeği, süt, şurup ve bardak transferlerini gerçekleştirin.
        </p>
      </div>

      {awaitingSourceTransfers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-white border border-blue-200 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-950">
                Kaynak şubenize düşen {awaitingSourceTransfers.length} onaylı transfer var.
              </p>
              <p className="text-xs text-blue-800 mt-0.5">
                Ürünler gönderildiğinde aşağıdaki listeden “Transfer Tamamlandı” olarak işaretleyin.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Left Card: Input Panel (Column: 7) */}
        <div className="xl:col-span-7 bg-white rounded-xl border border-espresso-200 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-espresso-100 mb-4 sm:mb-5">
            <Truck className="w-5 h-5 text-brand-terracotta" />
            <h3 className="font-bold text-espresso-900 text-base sm:text-lg">
              Yeni Stok Transfer Talebi
            </h3>
          </div>

          <form onSubmit={handleConfirmTransferSubmit} className="space-y-5">
            {/* Step 1: Source & Dest */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-mono font-bold text-espresso-700 tracking-wider uppercase mb-1.5 flex items-center gap-1">
                  <Warehouse className="w-4 h-4 text-espresso-500" />
                  Nereden (Kaynak)
                </label>
                <select
                  value={sourceId}
                  disabled={Boolean(lockedSourceId)}
                  onChange={(e) => {
                    setSourceId(e.target.value);
                    setItemsToTransfer([]); // Clear list on source switch to avoid wrong stock references
                  }}
                  className="w-full min-h-[48px] px-3 py-2 rounded-lg border border-espresso-200 bg-white disabled:bg-espresso-50 text-espresso-900 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30 focus:border-brand-terracotta"
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.isWarehouse ? '(Merkez Depo)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-espresso-700 tracking-wider uppercase mb-1.5 flex items-center gap-1">
                  <Store className="w-4 h-4 text-espresso-500" />
                  Nereye (Hedef)
                </label>
                <select
                  value={destId}
                  disabled={Boolean(lockedDestinationId)}
                  onChange={(e) => setDestId(e.target.value)}
                  className="w-full min-h-[48px] px-3 py-2 rounded-lg border border-espresso-200 bg-white disabled:bg-espresso-50 text-espresso-900 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30 focus:border-brand-terracotta"
                >
                  {locations.filter(loc => loc.id !== sourceId).map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 2: Add Items */}
            <div className="bg-espresso-50/60 p-4 rounded-xl space-y-3 border border-espresso-100">
              <span className="text-[10px] font-mono font-bold text-brand-terracotta uppercase tracking-wider">
                Gönderilecek Ürün & Miktar Ekle
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                {/* Item Select (Width: 6) */}
                <div className="sm:col-span-2 lg:col-span-6">
                  <label className="block text-[11px] font-mono text-espresso-500 mb-1">
                    Malzeme Seçin
                  </label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full min-h-[48px] px-3 py-2 rounded-lg border border-espresso-200 bg-white text-base md:text-sm text-espresso-950 focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30"
                  >
                    <option value="">-- Ürün Seçin --</option>
                    {items.map(item => {
                      const stockAtSource = item.quantities[sourceId] ?? 0;
                      return (
                        <option key={item.id} value={item.id}>
                          {item.name} ({stockAtSource} {item.unit} mevcut)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Qty Input (Width: 3) */}
                <div className="lg:col-span-3">
                  <label className="block text-[11px] font-mono text-espresso-500 mb-1">
                    Miktar
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="5"
                    value={selectedQty}
                    onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full min-h-[48px] px-3 py-2 rounded-lg border border-espresso-200 bg-white text-base md:text-sm font-mono placeholder:text-espresso-300 focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30"
                  />
                </div>

                {/* Add Trigger (Width: 3) */}
                <div className="lg:col-span-3">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full min-h-[48px] bg-espresso-800 hover:bg-espresso-900 text-brand-cream border border-espresso-750 text-sm font-bold rounded-lg flex items-center justify-center gap-2 select-none cursor-pointer active:scale-[0.99]"
                  >
                    <Plus className="w-4 h-4" /> Ekle
                  </button>
                </div>
              </div>
            </div>

            {/* Transfer Items Table Checklist */}
            <div className="space-y-2 font-sans">
              <span className="block text-xs font-mono font-bold text-espresso-700 uppercase tracking-wider">
                AKTARILACAK ÜRÜN LİSTESİ ({itemsToTransfer.length})
              </span>

              {itemsToTransfer.length === 0 ? (
                <div className="py-8 text-center text-espresso-400 border border-dashed border-espresso-200 rounded-lg text-xs">
                  Henüz ürün eklenmedi. Yukarıdan malzeme ve miktar seçerek ekleyin.
                </div>
              ) : (
                <div className="border border-espresso-200 rounded-lg divide-y divide-espresso-150 overflow-hidden">
                  {itemsToTransfer.map((itemDraft, index) => {
                    const itemObj = items.find(i => i.id === itemDraft.itemId);
                    if (!itemObj) return null;
                    const originStock = itemObj.quantities[sourceId] ?? 0;
                    const isInsufficient = originStock < itemDraft.quantity;

                    return (
                      <div key={itemDraft.itemId} className="p-3 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-espresso-950 truncate">{itemObj.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="bg-espresso-100 text-espresso-700 text-[10px] font-mono font-bold px-1 rounded uppercase">
                              {itemObj.category === 'Coffee Beans' ? 'Kahve' : itemObj.category === 'Dairy & Alternatives' ? 'Süt' : itemObj.category === 'Syrups' ? 'Şurup' : 'Karton/Bardak'}
                            </span>
                            <span className="text-[11px] text-espresso-500">
                              Gönderende mevcut: <b className="font-mono text-espresso-800">{originStock} {itemObj.unit}</b>
                            </span>
                          </div>
                          {isInsufficient && (
                            <span className="text-[10px] text-brand-terracotta font-mono font-semibold flex items-center gap-0.5 mt-0.5 animate-pulse">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              Uyarı: Kaynak şubede yetersiz stok (Kalan: {originStock} {itemObj.unit})!
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          <div className="font-mono font-bold text-sm text-espresso-900 text-right">
                            {itemDraft.quantity} <span className="text-xs font-medium text-espresso-500">{itemObj.unit}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveDraftItem(index)}
                            className="min-w-[44px] min-h-[44px] text-espresso-400 hover:text-brand-terracotta p-2 hover:bg-espresso-50 rounded-lg cursor-pointer flex items-center justify-center"
                            title="Kaldır"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Shift Notes */}
            <div>
              <label className="block text-xs font-semibold text-espresso-700 uppercase mb-1">
                Açıklama / Not ekle
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Gönderim nedeni veya özel teslimat talimatı yazabilirsiniz..."
                className="w-full min-h-[96px] p-3 text-base md:text-sm bg-white border border-espresso-250 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30 focus:border-brand-terracotta"
              />
            </div>

            {/* Messages Display */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-900">
                <AlertCircle className="w-4 h-4 text-brand-terracotta shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-xs text-emerald-950">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Confirm Actions */}
            <div className="pt-4 border-t border-espresso-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-espresso-600">
                Talep Durumu: <span className="font-bold text-amber-600 font-mono">YÖNETİCİ ONAYI BEKLİYOR</span>
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto min-h-[48px] px-5 py-3 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-bold rounded-lg shadow-sm transition-transform active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Transfer Talebini Gönder
              </button>
            </div>
          </form>
        </div>

        {/* Right Card: Running Summary & Checklist (Column: 5) */}
        <div className="xl:col-span-5 space-y-4">
          <div className="bg-brand-cream border border-espresso-300 rounded-xl p-4 shadow-xs space-y-4 font-sans">
            <div className="flex items-center gap-1.5 pb-2 border-b border-espresso-250 font-sans">
              <ClipboardList className="w-5 h-5 text-espresso-800" />
              <h4 className="font-bold text-espresso-950 text-base">Transfer Özeti</h4>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-baseline">
                <span className="font-mono text-espresso-500">KAYNAK:</span>
                <span className="font-bold text-espresso-900">{getSourceLocationObj()?.name || "Belirtilmedi"}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="font-mono text-espresso-500">HEDEF:</span>
                <span className="font-bold text-espresso-900">{getDestLocationObj()?.name || "Belirtilmedi"}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="font-mono text-espresso-500">EKLENEN ÜRÜN TÜRÜ:</span>
                <span className="font-mono font-bold text-brand-terracotta">{itemsToTransfer.length} çeşit ürün</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="font-mono text-espresso-500">AÇIKLAMA:</span>
                <span className="text-right text-espresso-750 italic max-w-[180px] break-words">{notes || "Not eklenmedi."}</span>
              </div>

              <div className="pt-3 border-t border-espresso-250 text-[11px] text-espresso-500 leading-relaxed">
                <p className="font-bold uppercase text-espresso-700 tracking-wider mb-1">Onay Kuralları:</p>
                <b>{currentUser.role}</b> olarak transfer kaydı oluşturuyorsunuz. Owner onayından sonra talep kaynak şubeye bildirim gibi düşer; kaynak şube “Transfer tamamlandı” dediğinde stok bakiyeleri işlenir.
              </div>
            </div>
          </div>

          <div className="bg-white border border-espresso-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-espresso-100 bg-espresso-50/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <History className="w-5 h-5 text-espresso-700 shrink-0" />
                <h3 className="font-bold text-espresso-955 text-sm truncate">
                  Transfer Hareketleri
                </h3>
              </div>
              <span className="font-mono text-[10px] text-espresso-500 bg-white border border-espresso-200 px-2 py-1 rounded shadow-xs shrink-0">
                {transfers.length} kayıt
              </span>
            </div>

            {transfers.length === 0 ? (
              <div className="p-6 text-center text-espresso-500 font-sans text-xs">
                Kayıtlı transfer işlemi bulunmuyor.
              </div>
            ) : (
              <div className="p-3 space-y-3 max-h-[520px] overflow-y-auto">
                {transfers.map((trsf) => renderTransferCard(trsf))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
