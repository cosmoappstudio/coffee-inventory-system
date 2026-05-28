import React, { useState } from 'react';
import { Location, InventoryItem, UsageLog, ItemCategory, Employee } from '../types';
import { 
  Building2, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  LayoutGrid, 
  SlidersHorizontal,
  Plus,
  Minus,
  Coffee,
  X,
  CornerDownRight,
  RotateCcw
} from 'lucide-react';

interface OwnerOverviewDashboardProps {
  locations: Location[];
  items: InventoryItem[];
  usageLogs: UsageLog[];
  currentUser: Employee;
  onModifyProductQuantity: (itemId: string, locationId: string, newTotal: number) => void;
  /** Lock view to a single location (Location Manager). */
  restrictedLocationId?: string;
  /** Hide multi-location bento when restricted. */
  compactHeader?: boolean;
}

type StockStatusFilter = 'All' | 'Critical' | 'Healthy' | 'Surplus';
type InventorySortMode = 'priority' | 'name' | 'stock-asc' | 'stock-desc';

const CATEGORY_FILTERS: { key: ItemCategory | 'All'; label: string }[] = [
  { key: 'All', label: 'Tüm Kategoriler' },
  { key: 'Coffee Beans', label: 'Kahve' },
  { key: 'Dairy & Alternatives', label: 'Süt & Alternatif' },
  { key: 'Syrups', label: 'Şuruplar' },
  { key: 'Disposables', label: 'Bardak/Paket' },
  { key: 'Retail', label: 'Retail' },
];

const STOCK_STATUS_FILTERS: { key: StockStatusFilter; label: string }[] = [
  { key: 'All', label: 'Tüm Durumlar' },
  { key: 'Critical', label: 'Kritik Stok' },
  { key: 'Healthy', label: 'Sağlıklı' },
  { key: 'Surplus', label: 'Stok Fazlası' },
];

const SORT_OPTIONS: { key: InventorySortMode; label: string }[] = [
  { key: 'priority', label: 'Öncelik: Kritik önce' },
  { key: 'name', label: 'Ürün adına göre' },
  { key: 'stock-asc', label: 'Stok: Azdan çoğa' },
  { key: 'stock-desc', label: 'Stok: Çoktan aza' },
];

export default function OwnerOverviewDashboard({
  locations,
  items,
  usageLogs,
  currentUser,
  onModifyProductQuantity,
  restrictedLocationId,
  compactHeader = false,
}: OwnerOverviewDashboardProps) {
  const defaultLocation =
    restrictedLocationId ??
    locations.find((l) => !l.isWarehouse)?.id ??
    locations[0]?.id ??
    '';

  const [selectedLocationId, setSelectedLocationId] = useState<string>(defaultLocation);
  const [globalSearchTerm, setGlobalSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'All'>('All');
  const [stockStatusFilter, setStockStatusFilter] =
    useState<StockStatusFilter>('All');
  const [sortMode, setSortMode] = useState<InventorySortMode>('priority');

  React.useEffect(() => {
    if (restrictedLocationId) {
      setSelectedLocationId(restrictedLocationId);
      return;
    }

    const hasSelectedLocation = locations.some(
      (location) => location.id === selectedLocationId
    );

    if (locations.length > 0 && !hasSelectedLocation) {
      setSelectedLocationId(defaultLocation);
    }
  }, [defaultLocation, locations, restrictedLocationId, selectedLocationId]);
  
  // Quick Edit State for stock modal/row
  const [editingItem, setEditingItem] = useState<{ itemId: string; name: string; current: number } | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');

  // Get active stores (excluding the Central Warehouse or keeping it in sidebar/bento)
  const stores = locations.filter(l => !l.isWarehouse);
  const warehouse = locations.find(l => l.isWarehouse);

  // Helper: Count low stock items for a given location
  const getLowStockCountForLocation = (locId: string) => {
    return items.filter(item => {
      const stock = item.quantities[locId] ?? 0;
      const minVal = item.minStock[locId] ?? 0;
      return stock <= minVal;
    }).length;
  };

  // Helper: Get last updated timestamp or log action for a given location
  const getLastUpdatedForLocation = (locId: string) => {
    const locLogs = usageLogs.filter(log => log.locationId === locId);
    if (locLogs.length === 0) {
      return 'No logs today';
    }
    const latest = [...locLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    return new Date(latest.timestamp).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Select the currently viewing location object
  const activeLocation =
    locations.find((l) => l.id === selectedLocationId) ??
    locations.find((l) => !l.isWarehouse) ??
    locations[0] ?? {
      id: selectedLocationId || 'unknown',
      name: 'Lokasyon bulunamadı',
      address: 'Lokasyon verisi henüz yüklenmedi.',
      isWarehouse: false,
    };

  // Map inventory for active table
  const activeLocationInventory = items.map(item => {
    const current = item.quantities[selectedLocationId] ?? 0;
    const minVal = item.minStock[selectedLocationId] ?? 0;
    const isLow = current <= minVal;
    const isSurplus = minVal > 0 && current >= minVal * 2;
    return {
      ...item,
      current,
      minVal,
      isLow,
      isSurplus
    };
  });

  const filteredInventory = activeLocationInventory
    .filter(item => {
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      const matchesSearch =
        item.name.toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(globalSearchTerm.toLowerCase());
      const matchesStatus =
        stockStatusFilter === 'All' ||
        (stockStatusFilter === 'Critical' && item.isLow) ||
        (stockStatusFilter === 'Surplus' && item.isSurplus) ||
        (stockStatusFilter === 'Healthy' && !item.isLow && !item.isSurplus);
      return matchesCategory && matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortMode === 'name') return a.name.localeCompare(b.name);
      if (sortMode === 'stock-asc') return a.current - b.current;
      if (sortMode === 'stock-desc') return b.current - a.current;
      if (a.isLow !== b.isLow) return a.isLow ? -1 : 1;
      if (a.isSurplus !== b.isSurplus) return a.isSurplus ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const filterSummary = {
    total: activeLocationInventory.length,
    shown: filteredInventory.length,
    critical: activeLocationInventory.filter((item) => item.isLow).length,
    surplus: activeLocationInventory.filter((item) => item.isSurplus).length,
  };

  const resetFilters = () => {
    setCategoryFilter('All');
    setStockStatusFilter('All');
    setSortMode('priority');
    setGlobalSearchTerm('');
    if (!restrictedLocationId) {
      setSelectedLocationId(defaultLocation);
    }
  };

  // Global Multi-Location search list (shows matched items on all stores)
  const matchesGlobalSearch = globalSearchTerm.trim().length > 1;
  const globalSearchResults = items.filter(item => 
    item.name.toLowerCase().includes(globalSearchTerm.toLowerCase()) || 
    item.category.toLowerCase().includes(globalSearchTerm.toLowerCase())
  );

  const handleQuickAdjustSave = () => {
    if (!editingItem) return;
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt < 0) return;

    onModifyProductQuantity(editingItem.itemId, selectedLocationId, amt);
    setEditingItem(null);
    setEditAmount('');
  };

  const handleStepValue = (itemId: string, locationId: string, current: number, step: number) => {
    const newTotal = Math.max(0, current + step);
    onModifyProductQuantity(itemId, locationId, newTotal);
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="max-w-3xl">
          <h2 className="text-xl sm:text-2xl font-bold text-espresso-955 flex items-center gap-2 leading-tight">
            <LayoutGrid className="w-6 h-6 sm:w-7 sm:h-7 text-brand-terracotta shrink-0" />
            {compactHeader ? 'Stok Envanteri' : 'Şubeler Genel Paneli'}
          </h2>
          <p className="text-espresso-600 text-xs mt-1 leading-relaxed">
            {compactHeader
              ? 'Şubenizdeki malzeme stoklarını görüntüleyin ve sayım güncelleyin.'
              : "Immersion Coffee'nin 5 şubesindeki stok hareketlerini, kritik seviyeleri ve güncel sayımları takip edin."}
          </p>
        </div>

        {/* Global Search Input Box */}
        <div className="w-full xl:w-[360px] relative shrink-0">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-espresso-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Tüm şubelerde malzeme ara..."
            id="global-search-query"
            value={globalSearchTerm}
            onChange={(e) => setGlobalSearchTerm(e.target.value)}
            className="w-full min-h-[44px] pl-10 pr-10 py-2 text-sm md:text-xs rounded-lg border border-espresso-200 bg-white placeholder:text-espresso-400 focus:outline-none focus:ring-1 focus:ring-brand-terracotta focus:border-brand-terracotta text-espresso-950"
          />
          {globalSearchTerm && (
            <button
              type="button"
              onClick={() => setGlobalSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-espresso-400 hover:text-espresso-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* MATCHED GLOBAL SEARCH EXPANSION DRAWER */}
      {matchesGlobalSearch && (
        <div className="bg-amber-50/45 p-6 rounded-xl border border-brand-amber/60 shadow-xs animate-fadeIn space-y-4 font-sans">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-espresso-955 text-sm flex items-center gap-2">
              <CornerDownRight className="w-5 h-5 text-brand-terracotta" />
              &ldquo;{globalSearchTerm}&rdquo; İçin Şube Arama Sonuçları
            </h3>
            <button
              type="button"
              onClick={() => setGlobalSearchTerm('')}
              className="text-xs font-semibold text-espresso-600 hover:text-espresso-950 bg-white border border-espresso-200 px-2 py-1 rounded cursor-pointer"
            >
              Aramayı Temizle
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {globalSearchResults.map(item => (
              <div key={`global-${item.id}`} className="bg-white p-4 rounded-lg border border-espresso-200 shadow-xs">
                <span className="text-[10px] font-mono text-espresso-500 bg-espresso-100 px-1.5 py-0.5 rounded uppercase">
                  {item.category === 'Coffee Beans' ? 'Kahve' : item.category === 'Dairy & Alternatives' ? 'Süt & Alternatif' : item.category === 'Syrups' ? 'Şurup' : 'Karton/Bardak'}
                </span>
                <h4 className="font-bold text-espresso-950 mt-1 text-sm">{item.name}</h4>
                <p className="text-[11px] text-espresso-500 mb-2">Şubelere göre stok miktarları:</p>
                
                <div className="space-y-1 bg-espresso-50/45 p-2 rounded border border-espresso-100 font-mono text-xs">
                  {locations.map(loc => {
                    const stock = item.quantities[loc.id] ?? 0;
                    const min = item.minStock[loc.id] ?? 0;
                    const isLow = stock <= min;
                    return (
                      <div key={`global-${item.id}-${loc.id}`} className="flex justify-between items-center py-0.5">
                        <span className="text-espresso-700">{loc.name}</span>
                        <span className={`font-bold px-1 rounded ${isLow ? 'text-brand-terracotta bg-brand-terracotta/10' : 'text-espresso-900'}`}>
                          {stock} {item.unit} {isLow ? '!' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6 UNIFIED SHUBELER + WAREHOUSE BENTO PANEL */}
      {!restrictedLocationId && (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 xl:gap-4">
        {locations.map((loc) => {
          const lowCount = getLowStockCountForLocation(loc.id);
          const lastLogTime = getLastUpdatedForLocation(loc.id);
          const isSelected = selectedLocationId === loc.id;
          const isWarehouse = loc.isWarehouse;

          return (
            <button
              key={loc.id}
              type="button"
              onClick={() => !restrictedLocationId && setSelectedLocationId(loc.id)}
              disabled={Boolean(restrictedLocationId && restrictedLocationId !== loc.id)}
              className={`text-left p-4 rounded-xl border transition-all select-none cursor-pointer flex flex-col justify-between min-h-[156px] relative ${
                isSelected
                  ? 'bg-espresso-950 text-brand-cream border-espresso-900 ring-4 ring-brand-amber/20 shadow-lg'
                  : 'bg-white text-espresso-950 border-espresso-200 shadow-xs hover:border-brand-amber/60 hover:shadow-md'
              }`}
            >
              {/* Top Row: Icon + status badge */}
              <div className="flex justify-between items-start gap-3 w-full">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-brand-amber/25' : 'bg-espresso-50'}`}>
                  {isWarehouse ? (
                    <Building2 className={`w-4 h-4 ${isSelected ? 'text-brand-amber' : 'text-espresso-800'}`} />
                  ) : (
                    <Coffee className={`w-4 h-4 ${isSelected ? 'text-brand-amber' : 'text-espresso-800'}`} />
                  )}
                </div>
                {isWarehouse ? (
                  <span className={`px-2 py-1 text-[10px] font-mono font-bold rounded-md tracking-wide uppercase leading-none ${
                    isSelected ? 'bg-brand-amber text-espresso-950' : 'bg-espresso-100 text-espresso-800'
                  }`}>
                    MERKEZ DEPO
                  </span>
                ) : lowCount > 0 ? (
                  <span className={`px-2 py-1 text-[10px] font-mono font-bold rounded-md flex items-center gap-1 uppercase tracking-wider leading-none ${
                    isSelected ? 'bg-brand-amber text-espresso-950' : 'bg-brand-terracotta/10 text-brand-terracotta border border-brand-terracotta/20'
                  }`}>
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    {lowCount} KRİTİK
                  </span>
                ) : (
                  <span className={`px-2 py-1 text-[10px] font-mono font-bold rounded-md tracking-wide leading-none ${
                    isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-800'
                  }`}>
                    STOK TAMAM
                  </span>
                )}
              </div>

              {/* Bottom Info */}
              <div className="mt-4 font-sans min-w-0">
                <h3 className="font-bold text-sm tracking-tight leading-tight truncate">
                  {loc.name}
                </h3>
                <p className={`text-[11px] mt-1 flex items-center gap-1 font-mono ${isSelected ? 'text-espresso-300' : 'text-espresso-500'}`}>
                  <MapPin className="w-3 h-3 shrink-0" />
                  {isWarehouse ? 'Imperial Ave' : 'San Diego, CA'}
                </p>
                
                <div className="flex items-center justify-between border-t border-dashed mt-4 pt-3 w-full text-[10px]" style={{ borderColor: isSelected ? '#574136' : '#e8dcc4' }}>
                  <span className={isSelected ? 'text-espresso-400 font-mono' : 'text-espresso-500'}>HAREKET</span>
                  <span className="font-bold">{isWarehouse ? 'Sevkiyat Üssü' : lastLogTime === 'No logs today' ? 'Kayıt Yok' : lastLogTime}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      )}

      {/* STORES DETAILED VIEW TABULAR GRID */}
      <div className="bg-white rounded-xl border border-espresso-200 overflow-hidden shadow-xs">
        {/* Table Header Controls */}
        <div className="p-5 border-b border-espresso-100 bg-brand-cream/40 font-sans space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono bg-brand-charcoal text-brand-cream font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                Aktif Şube
              </span>
              <h3 className="font-bold text-espresso-950 text-base mt-2 flex items-center gap-1.5">
                {activeLocation.name} {activeLocation.isWarehouse ? 'Depo' : 'Şubesi'} Stok Listesi
              </h3>
              <p className="text-xs text-espresso-500 mt-0.5">{activeLocation.address}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs min-w-full lg:min-w-[360px]">
              <div className="bg-white border border-espresso-200 rounded-lg px-3 py-2">
                <p className="text-[10px] font-mono uppercase text-espresso-500 font-bold">Gösterilen</p>
                <p className="font-bold text-espresso-950">{filterSummary.shown}/{filterSummary.total}</p>
              </div>
              <div className="bg-white border border-brand-terracotta/20 rounded-lg px-3 py-2">
                <p className="text-[10px] font-mono uppercase text-espresso-500 font-bold">Kritik</p>
                <p className="font-bold text-brand-terracotta">{filterSummary.critical}</p>
              </div>
              <div className="bg-white border border-emerald-200 rounded-lg px-3 py-2">
                <p className="text-[10px] font-mono uppercase text-espresso-500 font-bold">Fazla</p>
                <p className="font-bold text-emerald-700">{filterSummary.surplus}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-espresso-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-mono font-bold text-espresso-600 flex items-center gap-1 uppercase">
                <SlidersHorizontal className="w-3.5 h-3.5 text-brand-terracotta" />
                Akıllı Filtreler
              </span>
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] font-bold text-espresso-600 hover:text-espresso-950 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Sıfırla
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
              {!restrictedLocationId && (
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="min-h-[44px] px-3 py-2 rounded-lg border border-espresso-200 bg-brand-cream/40 text-xs font-bold text-espresso-900"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.isWarehouse ? '(Depo)' : ''}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value as ItemCategory | 'All')
                }
                className="min-h-[44px] px-3 py-2 rounded-lg border border-espresso-200 bg-brand-cream/40 text-xs font-bold text-espresso-900"
              >
                {CATEGORY_FILTERS.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.label}
                  </option>
                ))}
              </select>

              <select
                value={stockStatusFilter}
                onChange={(e) =>
                  setStockStatusFilter(e.target.value as StockStatusFilter)
                }
                className="min-h-[44px] px-3 py-2 rounded-lg border border-espresso-200 bg-brand-cream/40 text-xs font-bold text-espresso-900"
              >
                {STOCK_STATUS_FILTERS.map((status) => (
                  <option key={status.key} value={status.key}>
                    {status.label}
                  </option>
                ))}
              </select>

              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as InventorySortMode)}
                className="min-h-[44px] px-3 py-2 rounded-lg border border-espresso-200 bg-brand-cream/40 text-xs font-bold text-espresso-900"
              >
                {SORT_OPTIONS.map((sort) => (
                  <option key={sort.key} value={sort.key}>
                    {sort.label}
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso-400 pointer-events-none" />
                <input
                  type="text"
                  value={globalSearchTerm}
                  onChange={(e) => setGlobalSearchTerm(e.target.value)}
                  placeholder="Ürün veya SKU ara..."
                  className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-lg border border-espresso-200 bg-brand-cream/40 text-xs font-medium text-espresso-900"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="px-2 py-1 rounded bg-espresso-50 border border-espresso-100 text-espresso-600">
                Lokasyon: <b>{activeLocation.name}</b>
              </span>
              <span className="px-2 py-1 rounded bg-espresso-50 border border-espresso-100 text-espresso-600">
                Kategori: <b>{CATEGORY_FILTERS.find((cat) => cat.key === categoryFilter)?.label}</b>
              </span>
              <span className="px-2 py-1 rounded bg-espresso-50 border border-espresso-100 text-espresso-600">
                Durum: <b>{STOCK_STATUS_FILTERS.find((status) => status.key === stockStatusFilter)?.label}</b>
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Product Ledger Cards */}
        <div className="lg:hidden divide-y divide-espresso-100">
          {filteredInventory.length === 0 ? (
            <div className="p-8 text-center text-espresso-500 text-sm font-medium">
              Seçili filtrelerde malzeme kaydı bulunamadı. Lütfen arama kriterlerinizi kontrol edin.
            </div>
          ) : (
            filteredInventory.map((item) => (
              <div
                key={`mobile-${item.id}`}
                className={`p-4 space-y-4 ${item.isLow ? 'bg-amber-50/20' : 'bg-white'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-espresso-950 text-sm leading-snug">
                      {item.name}
                    </p>
                    <p className="text-[10px] font-mono text-espresso-400 mt-1">
                      ID: {item.id}
                    </p>
                  </div>
                  {item.isLow ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-brand-terracotta/10 border border-brand-terracotta/30 text-brand-terracotta shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Kritik
                    </span>
                  ) : item.isSurplus ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-emerald-50 border border-emerald-300/40 text-emerald-800 shrink-0">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Fazla
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-emerald-50 border border-emerald-300/40 text-emerald-800 shrink-0">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Yeterli
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg border border-espresso-150 bg-brand-cream/50 p-3">
                    <p className="text-[10px] font-mono uppercase text-espresso-500">
                      Mevcut
                    </p>
                    <p className="font-mono font-bold text-espresso-950 mt-1">
                      {item.current} <span className="text-espresso-500">{item.unit}</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-espresso-150 bg-brand-cream/50 p-3">
                    <p className="text-[10px] font-mono uppercase text-espresso-500">
                      Minimum
                    </p>
                    <p className="font-mono font-bold text-espresso-950 mt-1">
                      {item.minVal} <span className="text-espresso-500">{item.unit}</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-espresso-150 bg-brand-cream/50 p-3">
                    <p className="text-[10px] font-mono uppercase text-espresso-500">
                      Kategori
                    </p>
                    <p className="font-bold text-espresso-800 mt-1 truncate">
                      {item.category === 'Coffee Beans'
                        ? 'Kahve'
                        : item.category === 'Dairy & Alternatives'
                          ? 'Süt'
                          : item.category === 'Syrups'
                            ? 'Şurup'
                            : 'Paket'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-[48px_1fr_48px] gap-2">
                  <button
                    type="button"
                    onClick={() => handleStepValue(item.id, selectedLocationId, item.current, -1)}
                    className="min-h-[48px] rounded-lg border border-espresso-250 bg-white hover:border-brand-terracotta hover:bg-espresso-50 flex items-center justify-center text-espresso-800 cursor-pointer select-none"
                    title="Stoğu 1 Azalt"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem({ itemId: item.id, name: item.name, current: item.current });
                      setEditAmount(item.current.toString());
                    }}
                    className="min-h-[48px] rounded-lg border border-espresso-250 bg-white hover:bg-espresso-50 text-sm font-bold text-espresso-800 cursor-pointer flex items-center justify-center select-none"
                  >
                    Sayım Gir
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStepValue(item.id, selectedLocationId, item.current, 1)}
                    className="min-h-[48px] rounded-lg border border-espresso-250 bg-white hover:border-brand-terracotta hover:bg-espresso-50 flex items-center justify-center text-espresso-800 cursor-pointer select-none"
                    title="Stoğu 1 Arttır"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Product Ledger Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-espresso-50 text-[10px] font-mono uppercase text-espresso-600 tracking-wider border-b border-espresso-150">
                <th className="py-3 px-4">Malzeme Detayı</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-center">Mevcut Stok</th>
                <th className="py-3 px-4 text-center">Güvenlik Sınırı</th>
                <th className="py-3 px-4 text-center">Durum</th>
                <th className="py-3 px-4 text-right">Hızlı Sayım</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-espresso-100 font-sans text-xs">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-espresso-500 font-medium">
                    Seçili filtrelerde malzeme kaydı bulunamadı. Lütfen arama kriterlerinizi kontrol edin.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => (
                  <tr key={item.id} className={`hover:bg-espresso-50/20 transition-colors ${item.isLow ? 'bg-amber-50/15' : ''}`}>
                    <td className="py-4 px-4">
                      <div className="font-bold text-espresso-950 text-sm">{item.name}</div>
                      <div className="text-[10px] font-mono text-espresso-400">ID: {item.id}</div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="bg-espresso-100 text-espresso-700 text-[11px] font-semibold px-2 py-0.5 rounded">
                        {item.category === 'Coffee Beans' ? 'Kahve Çekirdeği' : item.category === 'Dairy & Alternatives' ? 'Süt & Alternatif' : item.category === 'Syrups' ? 'Şuruplar' : 'Paket/Karton'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-sm text-espresso-900">
                      {item.current} <span className="text-xs text-espresso-500 font-medium">{item.unit}</span>
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-xs text-espresso-600">
                      {item.minVal} {item.unit}
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      {item.isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-brand-terracotta/10 border border-brand-terracotta/30 text-brand-terracotta animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Kritik Stok
                        </span>
                      ) : item.isSurplus ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-50 border border-emerald-300/40 text-emerald-800">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Stok Fazlası
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-50 border border-emerald-300/40 text-emerald-800">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Yeterli
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      {/* Flex layout for audit button options */}
                      <div className="flex justify-end items-center gap-1.5">
                        {/* Minus Audit Trigger */}
                        <button
                          type="button"
                          onClick={() => handleStepValue(item.id, selectedLocationId, item.current, -1)}
                          className="w-7 h-7 rounded border border-espresso-250 hover:border-brand-terracotta hover:bg-espresso-50 flex items-center justify-center text-espresso-700 cursor-pointer text-xs select-none"
                          title="Stoğu 1 Azalt"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        {/* Direct input set button */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem({ itemId: item.id, name: item.name, current: item.current });
                            setEditAmount(item.current.toString());
                          }}
                          className="px-2 py-1.5 rounded border border-espresso-250 hover:bg-espresso-50 text-[11px] font-bold text-espresso-700 cursor-pointer flex items-center gap-1 select-none"
                        >
                          Sayım Gir
                        </button>

                        {/* Plus Audit Trigger */}
                        <button
                          type="button"
                          onClick={() => handleStepValue(item.id, selectedLocationId, item.current, 1)}
                          className="w-7 h-7 rounded border border-espresso-250 hover:border-brand-terracotta hover:bg-espresso-50 flex items-center justify-center text-espresso-700 cursor-pointer text-xs select-none"
                          title="Stoğu 1 Arttır"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK AUDIT MODAL DIALOG */}
      {editingItem && (
        <div className="fixed inset-0 bg-brand-charcoal/85 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-brand-cream border border-espresso-800 p-5 rounded-xl shadow-lg max-w-sm w-full space-y-4 font-sans">
            <div>
              <span className="text-[10px] font-mono text-brand-terracotta uppercase font-bold tracking-wider">Hızlı Stok Girişi</span>
              <h3 className="text-base font-bold text-espresso-950 mt-1">Stok Sayım Güncelleme</h3>
              <p className="text-espresso-600 text-xs font-semibold mt-1">{editingItem.name}</p>
              <p className="text-[11px] text-espresso-500">Güncellenecek Şube: <b>{activeLocation.name}</b></p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-espresso-500 font-bold">
                RAF SAYIM MİKTARINI GİRİN:
              </label>
              <input
                type="number"
                value={editAmount}
                id="audit-override-input"
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder={editingItem.current.toString()}
                className="w-full px-4 py-3 border border-espresso-350 bg-white font-mono rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-terracotta text-lg"
              />
              <p className="text-[10px] text-espresso-500 leading-normal">
                Girilen miktar anında bu şubenin stok bakiyesine yansıyacaktır.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-espresso-200">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="w-1/2 py-2 text-center rounded bg-white hover:bg-espresso-50 border border-espresso-300 text-espresso-755 text-xs font-semibold cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleQuickAdjustSave}
                className="w-1/2 py-2 text-center rounded bg-brand-terracotta text-white text-xs font-bold shadow hover:bg-brand-terracotta/90 cursor-pointer"
              >
                Sayıyı Güncelle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
