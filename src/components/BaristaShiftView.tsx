import React, { useState } from 'react';
import { InventoryItem, Location, Employee, UsageLog, ItemCategory } from '../types';
import { 
  Sparkles, 
  AlertTriangle, 
  Plus, 
  Minus, 
  Check, 
  X, 
  History, 
  FileText, 
  Search,
  CheckCircle
} from 'lucide-react';

interface BaristaShiftViewProps {
  location: Location;
  currentUser: Employee;
  items: InventoryItem[];
  usageLogs: UsageLog[];
  assignedLocations?: Location[];
  onSwitchLocation?: (
    locationId: string,
    password: string
  ) => Promise<{ error?: string }>;
  onLogUsage: (itemId: string, quantity: number) => void;
  onUndoUsage: (logId: string) => void;
}

export default function BaristaShiftView({
  location,
  currentUser,
  items,
  usageLogs,
  assignedLocations = [],
  onSwitchLocation,
  onLogUsage,
  onUndoUsage
}: BaristaShiftViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for quantity log modal
  const [activeItem, setActiveItem] = useState<InventoryItem | null>(null);
  const [logQty, setLogQty] = useState<number>(1);
  const [customQtyInput, setCustomQtyInput] = useState<string>('');
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);
  const [pendingLocation, setPendingLocation] = useState<Location | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [switchingLocation, setSwitchingLocation] = useState(false);

  // Filter items for this location
  const locationItems = items.map(item => ({
    ...item,
    currentStock: item.quantities[location.id] ?? 0,
    minThreshold: item.minStock[location.id] ?? 0,
    isLowStock: (item.quantities[location.id] ?? 0) <= (item.minStock[location.id] ?? 0)
  }));

  const filteredItems = locationItems.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filter logs for this location and today (mocking today for demo purposes)
  const shiftLogs = usageLogs
    .filter(log => log.locationId === location.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleOpenQuantitySelector = (item: InventoryItem) => {
    setActiveItem(item);
    setLogQty(1);
    setCustomQtyInput('');
  };

  const handleConfirmLog = () => {
    if (!activeItem) return;
    const finalQty = customQtyInput ? parseFloat(customQtyInput) : logQty;
    if (isNaN(finalQty) || finalQty <= 0) return;

    onLogUsage(activeItem.id, finalQty);
    setShowSuccessToast(`Logged ${finalQty} ${activeItem.unit} of ${activeItem.name}`);
    setActiveItem(null);

    setTimeout(() => {
      setShowSuccessToast(null);
    }, 3000);
  };

  const handleOpenLocationSwitch = (nextLocation: Location) => {
    if (nextLocation.id === location.id) return;
    setPendingLocation(nextLocation);
    setPin('');
    setPinError(null);
  };

  const handleConfirmLocationSwitch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pendingLocation || !onSwitchLocation) return;
    setSwitchingLocation(true);
    setPinError(null);
    try {
      const result = await onSwitchLocation(pendingLocation.id, pin);
      if (result.error) {
        setPinError(result.error);
        return;
      }
      setPendingLocation(null);
      setPin('');
    } finally {
      setSwitchingLocation(false);
    }
  };

  const categories: (ItemCategory | 'All')[] = ['All', 'Coffee Beans', 'Dairy & Alternatives', 'Syrups', 'Disposables'];

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      {/* Header Info */}
      <div className="bg-espresso-950 text-espresso-50 p-4 sm:p-5 rounded-xl border border-brand-amber/20 overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="bg-brand-amber/10 text-brand-amber text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-brand-amber/20">
                Tablet Hızlı Giriş Ekranı
              </span>
            </div>
            <h2 className="text-2xl font-bold mt-1 text-brand-cream">
              {location.name}
            </h2>
            <p className="text-espresso-300 text-xs mt-0.5 flex items-center gap-1.5 font-sans">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Aktif Shift Oturumu &bull; {new Date().toLocaleDateString('tr-TR', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            {assignedLocations.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {assignedLocations.map((assignedLocation) => {
                  const active = assignedLocation.id === location.id;
                  return (
                    <button
                      key={assignedLocation.id}
                      type="button"
                      onClick={() => handleOpenLocationSwitch(assignedLocation)}
                      className={`min-h-[40px] px-4 rounded-lg text-xs font-bold whitespace-nowrap border cursor-pointer ${
                        active
                          ? 'bg-brand-amber text-espresso-950 border-brand-amber'
                          : 'bg-espresso-900/70 text-espresso-200 border-espresso-800 hover:bg-espresso-800'
                      }`}
                    >
                      {assignedLocation.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 bg-espresso-900/60 px-3 sm:px-4 py-2.5 rounded-lg border border-espresso-800 shrink-0">
            <div className="w-9 h-9 rounded-full bg-brand-amber flex items-center justify-center text-espresso-950 font-bold uppercase text-sm">
              {currentUser.name.slice(0, 2)}
            </div>
            <div>
              <p className="text-[10px] text-espresso-400 font-mono">ÇALIŞAN</p>
              <h4 className="text-sm font-semibold text-brand-cream">{currentUser.name}</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {showSuccessToast && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-950 p-4 rounded-lg flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold text-sm">{showSuccessToast}</span>
          </div>
          <button 
            type="button"
            onClick={() => setShowSuccessToast(null)} 
            className="text-emerald-800 hover:text-emerald-950 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Touch Cards (Grid Column: 8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-espresso-200/60">
            {/* Search and Category Toggle */}
            <div className="flex flex-col gap-3">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-espresso-400">
                  <Search className="w-5 h-5" />
                </span>
                <input 
                  type="text"
                  placeholder="Ürün adı ara..."
                  id="barista-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-lg border border-espresso-200 bg-espresso-50/50 text-espresso-900 placeholder:text-espresso-450 focus:outline-none focus:ring-1 focus:ring-brand-terracotta/40 focus:border-brand-terracotta text-base"
                />
              </div>

              {/* Category Buttons designed for thumbs (Min 44px high) */}
              <div className="flex overflow-x-auto pb-1 gap-2 no-scrollbar">
                {categories.map((cat) => {
                  const turkishLabel = cat === 'All' ? 'Tümü' : cat === 'Coffee Beans' ? 'Kahve' : cat === 'Dairy & Alternatives' ? 'Süt & Dairy' : cat === 'Syrups' ? 'Şurup' : 'Karton/Diğer';
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap border transition-all h-11 cursor-pointer select-none ${
                        selectedCategory === cat
                          ? 'bg-brand-terracotta border-brand-terracotta text-white shadow-sm'
                          : 'bg-espresso-50 border-espresso-200 text-espresso-700 hover:bg-espresso-100'
                      }`}
                    >
                      <span>{turkishLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cards Grid: Touch-Optimized */}
          {filteredItems.length === 0 ? (
            <div className="bg-espresso-50/50 p-12 text-center rounded-xl border border-dashed border-espresso-300">
              <Sparkles className="w-12 h-12 text-espresso-400 mx-auto stroke-1 mb-3" />
              <p className="text-espresso-700 font-semibold text-lg">Aramaya uygun ürün bulunamadı.</p>
              <p className="text-espresso-500 text-sm mt-1">Lütfen başka bir kategori seçin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredItems.map((item) => {
                const isLow = item.isLowStock;
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border transition-all p-4 sm:p-5 flex flex-col justify-between min-h-[168px] relative bg-white ${
                      isLow 
                        ? 'border-brand-amber bg-amber-50/35 ring-1 ring-brand-amber/25 shadow-orange-50/80 shadow-md' 
                        : 'border-espresso-200 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {/* Warning indicator */}
                    <div className="flex justify-end min-h-[24px]">
                      {isLow && (
                        <span className="flex items-center gap-1 bg-brand-amber/25 text-amber-950 font-mono uppercase text-[10px] tracking-wider px-2 py-0.5 rounded border border-brand-amber/30 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5 text-brand-amber shrink-0" />
                          Az Stok
                        </span>
                      )}
                    </div>

                    {/* Middle Section: Title & Qty */}
                    <div className="my-2.5">
                      <h3 className="font-sans font-semibold text-base text-espresso-950 leading-tight">
                        {item.name}
                      </h3>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="font-mono text-2xl font-bold text-espresso-900">
                          {item.currentStock}
                        </span>
                        <span className="text-xs text-espresso-550 font-medium">
                          {item.unit} mevcut
                        </span>
                      </div>
                      <p className="text-[10px] text-espresso-400 font-mono mt-0.5">
                        Kritik Limit: {item.minThreshold} {item.unit}
                      </p>
                    </div>

                    {/* Touch Action (Button height strictly 44px+) */}
                    <div>
                      <button
                        type="button"
                        onClick={() => handleOpenQuantitySelector(item as any)}
                        className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm tracking-wide h-11 flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-[0.98] select-none ${
                          isLow
                            ? 'bg-brand-amber text-espresso-950 hover:bg-brand-amber/90 font-bold active:bg-brand-amber'
                            : 'bg-espresso-800 text-brand-cream hover:bg-espresso-900 active:bg-espresso-950'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        Kullanım Gir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Shift Activity Log (Grid Column: 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-brand-cream p-5 rounded-xl border border-espresso-300/60 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-espresso-300/80">
              <History className="w-5 h-5 text-espresso-800" />
              <div>
                <h3 className="font-sans font-bold text-espresso-900 text-lg">Shift Kayıtlarım</h3>
                <p className="text-[11px] text-espresso-500 font-mono">Geri almak için döner oka dokunun</p>
              </div>
            </div>

            {shiftLogs.length === 0 ? (
              <div className="py-12 text-center text-espresso-500 font-sans">
                <FileText className="w-10 h-10 text-espresso-400 mx-auto stroke-1 mb-2" />
                <p className="text-sm font-medium">Kullanım girilmedi.</p>
                <p className="text-xs text-espresso-400/80 mt-1">Sarf ettiğiniz malzemeler burada listelenir.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {shiftLogs.map((log) => {
                  const itemRef = items.find(i => i.id === log.itemId);
                  return (
                    <div 
                      key={log.id} 
                      className="bg-white p-3 rounded-lg border border-espresso-200/80 flex items-center justify-between shadow-xs"
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <p className="text-xs font-bold text-espresso-900 truncate">
                          {itemRef ? itemRef.name : log.itemId}
                        </p>
                        <div className="flex items-center gap-2 font-mono text-[11px] text-espresso-500">
                          <span className="bg-brand-terracotta/10 text-brand-terracotta font-bold px-1.5 py-0.2 rounded">
                            -{log.quantityUsed} {itemRef?.unit ?? ''}
                          </span>
                          <span>&bull;</span>
                          <span>
                            {new Date(log.timestamp).toLocaleTimeString('tr-TR', { 
                              hour: 'numeric', 
                              minute: '2-digit', 
                              second: '2-digit',
                              hour12: false
                            })}
                          </span>
                        </div>
                        <p className="text-[10px] text-espresso-400">Giriş: {log.loggedBy}</p>
                      </div>
                      
                      {/* Tactile undo button trigger */}
                      <button
                        type="button"
                        onClick={() => onUndoUsage(log.id)}
                        title="İşlemi Geri Al"
                        className="p-2 ml-2 rounded bg-espresso-50 border border-espresso-200 text-espresso-600 hover:text-brand-terracotta hover:bg-rose-50 cursor-pointer text-xs"
                      >
                        Geri Al
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* iPad Touch Quantity Selector Overlay Modal */}
      {activeItem && (
        <div className="fixed inset-0 bg-brand-charcoal/80 flex items-center justify-center p-4 z-50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-brand-cream border-2 border-espresso-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-6 relative">
            <button 
              type="button"
              onClick={() => setActiveItem(null)}
              className="absolute top-4 right-4 p-2 text-espresso-500 hover:text-espresso-800 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Header info */}
            <div>
              <span className="text-[10px] font-mono text-brand-terracotta bg-brand-terracotta/10 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
                Kullanım
              </span>
              <h3 className="text-xl font-bold text-espresso-950 mt-1.5 leading-tight">
                Kullanım Kaydı
              </h3>
              <p className="text-espresso-800 text-sm font-semibold mt-1">
                {activeItem.name}
              </p>
              <p className="text-xs text-espresso-500 mt-0.5">
                Mevcut Stok: <span className="font-mono font-bold text-espresso-800">{activeItem.quantities[location.id]} {activeItem.unit}</span>
              </p>
            </div>

            {/* Custom Interactive Qty Selector (Big click targets) */}
            <div className="space-y-4 font-sans">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-espresso-700">
                Kullanılan Miktar ({activeItem.unit}):
              </label>

              {/* Big Display */}
              <div className="flex items-center justify-between bg-white px-5 py-3 rounded-lg border border-espresso-300 shadow-inner">
                <button
                  type="button"
                  onClick={() => setLogQty(prev => Math.max(1, prev - 1))}
                  className="w-12 h-12 bg-espresso-100 hover:bg-espresso-200 text-espresso-800 rounded-lg flex items-center justify-center font-bold text-lg cursor-pointer transition-colors"
                >
                  <Minus className="w-5 h-5 stroke-[2.5]" />
                </button>
                
                <div className="text-center">
                  <span className="text-3xl font-mono font-bold text-espresso-950">
                    {customQtyInput ? customQtyInput : logQty}
                  </span>
                  <span className="block text-xs text-espresso-400 font-medium font-mono">
                    {activeItem.unit}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const maxStock = activeItem.quantities[location.id] ?? 999;
                    setLogQty(prev => prev < maxStock ? prev + 1 : prev);
                  }}
                  className="w-12 h-12 bg-espresso-100 hover:bg-espresso-200 text-espresso-800 rounded-lg flex items-center justify-center font-bold text-lg cursor-pointer transition-colors"
                >
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Quick selectors row (Large clickable circles, min 44px) */}
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setLogQty(num);
                      setCustomQtyInput('');
                    }}
                    className={`py-2 px-3 h-11 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                      logQty === num && !customQtyInput
                        ? 'bg-brand-terracotta border-brand-terracotta text-white shadow-xs'
                        : 'bg-white border-espresso-200 text-espresso-800 hover:bg-espresso-50'
                    }`}
                  >
                    +{num}
                  </button>
                ))}
              </div>

              {/* Precise key-in alternative for bulk */}
              <div className="pt-2 border-t border-espresso-200/80">
                <label className="block text-xs font-semibold text-espresso-600 mb-1">
                  Veya küsuratlı bir miktar yazın (örn: 2.5):
                </label>
                <input 
                  type="number" 
                  step="any"
                  min="0.1"
                  placeholder="2.5"
                  value={customQtyInput}
                  onChange={(e) => setCustomQtyInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded bg-white border border-espresso-200 focus:outline-none focus:ring-1 focus:ring-brand-terracotta font-mono text-espresso-950"
                />
              </div>
            </div>

            {/* Submit Actions (Min height 44px for thumbs) */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-espresso-200">
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="py-2.5 px-4 rounded-lg bg-white border border-espresso-250 text-espresso-700 font-semibold text-sm h-11 flex items-center justify-center hover:bg-espresso-50 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmLog}
                className="py-2.5 px-4 rounded-lg bg-brand-terracotta hover:bg-brand-terracotta/90 text-white font-bold text-sm h-11 flex items-center justify-center cursor-pointer shadow-xs"
              >
                Onayla
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingLocation && (
        <div className="fixed inset-0 bg-brand-charcoal/80 flex items-center justify-center p-4 z-50 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleConfirmLocationSwitch}
            className="bg-brand-cream border-2 border-espresso-800 rounded-xl max-w-sm w-full p-5 shadow-xl space-y-4"
          >
            <div>
              <h3 className="text-lg font-bold text-espresso-950">
                Şube Değiştir
              </h3>
              <p className="text-xs text-espresso-600 mt-1">
                {pendingLocation.name} şubesine geçmek için 5 haneli PIN’inizi girin.
              </p>
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={5}
              value={pin}
              onChange={(event) =>
                setPin(event.target.value.replace(/\D/g, '').slice(0, 5))
              }
              placeholder="PIN"
              className="w-full min-h-[48px] px-3 py-2 rounded-lg border border-espresso-300 bg-white text-center font-mono text-lg tracking-[0.35em]"
              autoFocus
            />
            {pinError && (
              <p className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {pinError}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPendingLocation(null)}
                className="min-h-[44px] px-4 rounded-lg bg-white border border-espresso-300 text-espresso-750 font-semibold text-xs hover:bg-espresso-50 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={switchingLocation || pin.length !== 5}
                className="min-h-[44px] px-4 rounded-lg bg-brand-terracotta hover:bg-brand-terracotta/95 disabled:opacity-60 text-white font-bold text-xs shadow cursor-pointer"
              >
                {switchingLocation ? 'Kontrol ediliyor…' : 'Şubeye Geç'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
