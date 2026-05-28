import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle,
  Filter,
  Lightbulb,
  Search,
  TrendingUp,
} from 'lucide-react';
import type {
  InventoryItem,
  ItemCategory,
  Location,
  StockTransfer,
  TransferStatus,
  UsageLog,
} from '../types';

type ReportsViewProps = {
  locations: Location[];
  items: InventoryItem[];
  usageLogs: UsageLog[];
  transfers: StockTransfer[];
  onUpdateTransferStatus: (
    transferId: string,
    status: Extract<
      TransferStatus,
      'Approved - Awaiting Fulfillment' | 'Approved & Completed' | 'Declined'
    >,
    updaterName: string
  ) => Promise<void>;
};

type StockRow = {
  item: InventoryItem;
  location: Location;
  quantity: number;
  minStock: number;
  delta: number;
  status: 'critical' | 'healthy' | 'surplus';
  coverageRatio: number;
};

type TransferRecommendation = {
  item: InventoryItem;
  source: Location;
  destination: Location;
  recommendedQty: number;
  sourceSurplus: number;
  destinationNeed: number;
  score: number;
};

const CATEGORIES: (ItemCategory | 'All')[] = [
  'All',
  'Coffee Beans',
  'Dairy & Alternatives',
  'Syrups',
  'Disposables',
  'Retail',
];

function getCoverageRatio(quantity: number, minStock: number): number {
  if (minStock <= 0) return quantity > 0 ? 999 : 0;
  return quantity / minStock;
}

function getStatus(quantity: number, minStock: number): StockRow['status'] {
  if (quantity <= minStock) return 'critical';
  if (quantity >= minStock * 2) return 'surplus';
  return 'healthy';
}

function formatRatio(value: number): string {
  if (value === 999) return '∞';
  return `${value.toFixed(1)}x`;
}

export default function ReportsView({
  locations,
  items,
  usageLogs,
  transfers,
  onUpdateTransferStatus,
}: ReportsViewProps) {
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'All'>(
    'All'
  );
  const [statusFilter, setStatusFilter] = useState<'all' | StockRow['status']>(
    'all'
  );
  const [search, setSearch] = useState('');

  const locationNameById = useMemo(
    () => new Map(locations.map((location) => [location.id, location.name])),
    [locations]
  );

  const itemNameById = useMemo(
    () => new Map(items.map((item) => [item.id, item.name])),
    [items]
  );

  const stockRows = useMemo<StockRow[]>(() => {
    return items.flatMap((item) =>
      locations.map((location) => {
        const quantity = item.quantities[location.id] ?? 0;
        const minStock = item.minStock[location.id] ?? 0;
        return {
          item,
          location,
          quantity,
          minStock,
          delta: quantity - minStock,
          status: getStatus(quantity, minStock),
          coverageRatio: getCoverageRatio(quantity, minStock),
        };
      })
    );
  }, [items, locations]);

  const filteredStockRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return stockRows.filter((row) => {
      const matchesLocation =
        locationFilter === 'all' || row.location.id === locationFilter;
      const matchesCategory =
        categoryFilter === 'All' || row.item.category === categoryFilter;
      const matchesStatus =
        statusFilter === 'all' || row.status === statusFilter;
      const matchesSearch =
        !needle ||
        row.item.name.toLowerCase().includes(needle) ||
        row.item.id.toLowerCase().includes(needle) ||
        row.location.name.toLowerCase().includes(needle);

      return matchesLocation && matchesCategory && matchesStatus && matchesSearch;
    });
  }, [categoryFilter, locationFilter, search, statusFilter, stockRows]);

  const allRecommendations = useMemo<TransferRecommendation[]>(() => {
    const recs: TransferRecommendation[] = [];

    for (const item of items) {
      const rowsForItem = stockRows.filter((row) => row.item.id === item.id);
      const surplusRows = rowsForItem
        .filter((row) => !row.location.isWarehouse && row.delta > row.minStock * 0.5)
        .sort((a, b) => b.delta - a.delta);
      const criticalRows = rowsForItem
        .filter((row) => !row.location.isWarehouse && row.delta < 0)
        .sort((a, b) => a.delta - b.delta);

      for (const destination of criticalRows) {
        let remainingNeed = Math.abs(destination.delta);
        for (const source of surplusRows) {
          if (source.location.id === destination.location.id || remainingNeed <= 0) {
            continue;
          }

          const sourceBuffer = Math.max(0, source.delta - source.minStock * 0.25);
          const recommendedQty = Math.floor(Math.min(sourceBuffer, remainingNeed));
          if (recommendedQty <= 0) continue;

          const urgency = destination.minStock > 0
            ? Math.min(2, Math.abs(destination.delta) / destination.minStock)
            : 1;
          const balanceScore = recommendedQty / Math.max(1, remainingNeed);

          recs.push({
            item,
            source: source.location,
            destination: destination.location,
            recommendedQty,
            sourceSurplus: Math.floor(source.delta),
            destinationNeed: Math.ceil(Math.abs(destination.delta)),
            score: Math.round((urgency * 60 + balanceScore * 40) * 10) / 10,
          });

          remainingNeed -= recommendedQty;
        }
      }
    }

    return recs.sort((a, b) => b.score - a.score);
  }, [items, stockRows]);

  const recommendations = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return allRecommendations
      .filter((rec) => {
        const matchesLocation =
          locationFilter === 'all' ||
          rec.source.id === locationFilter ||
          rec.destination.id === locationFilter;
        const matchesCategory =
          categoryFilter === 'All' || rec.item.category === categoryFilter;
        const matchesStatus =
          statusFilter === 'all' ||
          statusFilter === 'critical' ||
          statusFilter === 'surplus';
        const matchesSearch =
          !needle ||
          rec.item.name.toLowerCase().includes(needle) ||
          rec.item.id.toLowerCase().includes(needle) ||
          rec.source.name.toLowerCase().includes(needle) ||
          rec.destination.name.toLowerCase().includes(needle);

        return (
          matchesLocation &&
          matchesCategory &&
          matchesStatus &&
          matchesSearch
        );
      })
      .slice(0, 12);
  }, [
    allRecommendations,
    categoryFilter,
    locationFilter,
    search,
    statusFilter,
  ]);

  const filteredUsageLogs = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return usageLogs.filter((log) => {
      const itemName = itemNameById.get(log.itemId) ?? log.itemId;
      const matchesLocation =
        locationFilter === 'all' || log.locationId === locationFilter;
      const matchesSearch =
        !needle ||
        itemName.toLowerCase().includes(needle) ||
        log.loggedBy.toLowerCase().includes(needle);
      return matchesLocation && matchesSearch;
    });
  }, [itemNameById, locationFilter, search, usageLogs]);

  const totalUsed = filteredUsageLogs.reduce(
    (sum, log) => sum + log.quantityUsed,
    0
  );
  const criticalCount = filteredStockRows.filter(
    (row) => row.status === 'critical'
  ).length;
  const surplusCount = filteredStockRows.filter(
    (row) => row.status === 'surplus'
  ).length;

  const filteredTransfers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return transfers.filter((transfer) => {
      const sourceName =
        locationNameById.get(transfer.sourceLocationId) ??
        transfer.sourceLocationId;
      const destinationName =
        locationNameById.get(transfer.destinationLocationId) ??
        transfer.destinationLocationId;
      const itemNames = transfer.items
        .map((item) => itemNameById.get(item.itemId) ?? item.itemId)
        .join(' ');
      const matchesLocation =
        locationFilter === 'all' ||
        transfer.sourceLocationId === locationFilter ||
        transfer.destinationLocationId === locationFilter;
      const matchesSearch =
        !needle ||
        sourceName.toLowerCase().includes(needle) ||
        destinationName.toLowerCase().includes(needle) ||
        itemNames.toLowerCase().includes(needle) ||
        transfer.id.toLowerCase().includes(needle);
      return matchesLocation && matchesSearch;
    });
  }, [itemNameById, locationFilter, locationNameById, search, transfers]);

  const pendingAdminTransfers = filteredTransfers.filter(
    (transfer) => transfer.status === 'Pending Approval'
  );

  return (
    <div className="space-y-6 font-sans p-4 sm:p-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-brand-terracotta bg-brand-terracotta/10 px-2 py-1 rounded">
            Inventory Intelligence
          </span>
          <h2 className="text-2xl font-bold text-espresso-950 flex items-center gap-2 mt-3">
            <BarChart3 className="w-7 h-7 text-brand-terracotta" />
            Raporlar & Stok Analitiği
          </h2>
          <p className="text-espresso-600 text-xs mt-1 max-w-3xl">
            Lokasyon bazlı stok sağlığı, tüketim geçmişi ve şubeler arası
            gönderim önerileri. Öneriler kritik stok açığı ile fazla stok
            tamponunu eşleştirerek üretilir.
          </p>
        </div>
      </div>

      <section className="bg-white border border-espresso-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-brand-terracotta" />
          <h3 className="font-bold text-sm text-espresso-950">Filtreler</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-espresso-200 bg-white text-xs font-bold"
          >
            <option value="all">Tüm lokasyonlar</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as ItemCategory | 'All')
            }
            className="px-3 py-2 rounded-lg border border-espresso-200 bg-white text-xs font-bold"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category === 'All' ? 'Tüm kategoriler' : category}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'all' | StockRow['status'])
            }
            className="px-3 py-2 rounded-lg border border-espresso-200 bg-white text-xs font-bold"
          >
            <option value="all">Tüm stok durumları</option>
            <option value="critical">Kritik stok</option>
            <option value="healthy">Sağlıklı stok</option>
            <option value="surplus">Stok fazlası</option>
          </select>
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ürün, SKU, lokasyon veya çalışan ara..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-espresso-200 bg-white"
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Kritik Stok Satırı',
            value: criticalCount,
            icon: <AlertTriangle className="w-4 h-4" />,
            tone: 'text-brand-terracotta',
          },
          {
            label: 'Stok Fazlası',
            value: surplusCount,
            icon: <TrendingUp className="w-4 h-4" />,
            tone: 'text-emerald-700',
          },
          {
            label: 'Transfer Önerisi',
            value: recommendations.length,
            icon: <Lightbulb className="w-4 h-4" />,
            tone: 'text-brand-amber',
          },
          {
            label: 'Filtreli Tüketim',
            value: totalUsed,
            icon: <Boxes className="w-4 h-4" />,
            tone: 'text-espresso-950',
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="bg-white border border-espresso-200 rounded-xl p-4 shadow-xs"
          >
            <div className="flex justify-between text-espresso-500">
              <span className="text-[10px] font-mono uppercase font-bold">
                {metric.label}
              </span>
              <span className={metric.tone}>{metric.icon}</span>
            </div>
            <p className={`text-2xl font-bold mt-2 ${metric.tone}`}>
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <section className="bg-white border border-espresso-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-espresso-100 bg-brand-cream/40">
          <h3 className="font-bold text-espresso-950 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-brand-amber" />
            Lokasyonlar Arası Gönderim Önerileri
          </h3>
          <p className="text-xs text-espresso-600 mt-1">
            Model: kaynak lokasyonda minimum stok üstü tampon, hedef lokasyonda
            minimum stok açığı. Skor; aciliyet ve açığı kapama oranına göre hesaplanır.
          </p>
        </div>

        <div className="divide-y divide-espresso-100">
          {recommendations.length === 0 ? (
            <div className="p-6 text-sm text-espresso-500 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Kritik stok-fazla stok eşleşmesi bulunamadı.
            </div>
          ) : (
            recommendations.map((rec) => (
              <div
                key={`${rec.item.id}-${rec.source.id}-${rec.destination.id}`}
                className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center"
              >
                <div className="lg:col-span-4">
                  <p className="font-bold text-sm text-espresso-950">
                    {rec.item.name}
                  </p>
                  <p className="text-[10px] font-mono text-espresso-500">
                    {rec.item.id} · {rec.item.category}
                  </p>
                </div>
                <div className="lg:col-span-4 flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 font-bold">
                    {rec.source.name}
                  </span>
                  <ArrowRight className="w-4 h-4 text-espresso-400" />
                  <span className="px-2 py-1 rounded bg-brand-terracotta/10 text-brand-terracotta font-bold">
                    {rec.destination.name}
                  </span>
                </div>
                <div className="lg:col-span-2 text-xs">
                  <span className="text-espresso-500 font-mono uppercase">
                    Öneri
                  </span>
                  <p className="font-bold text-espresso-950">
                    {rec.recommendedQty} {rec.item.unit}
                  </p>
                </div>
                <div className="lg:col-span-2 text-right">
                  <span className="text-[10px] font-mono uppercase text-espresso-500">
                    Skor
                  </span>
                  <p className="font-bold text-brand-amber">{rec.score}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="bg-white border border-espresso-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-espresso-100 bg-brand-cream/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-bold text-espresso-950 flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-brand-terracotta" />
              Transferler
            </h3>
            <p className="text-xs text-espresso-600 mt-1">
              Şubelerden gelen talepler önce burada yönetici onayı bekler.
              Onay sonrası kaynak şubenin operasyon paneline düşer.
            </p>
          </div>
          <span className="font-mono text-[11px] text-espresso-500 bg-white border border-espresso-200 px-2.5 py-1 rounded">
            Yönetici Onayı: {pendingAdminTransfers.length}
          </span>
        </div>

        <div className="divide-y divide-espresso-100">
          {filteredTransfers.length === 0 ? (
            <div className="p-6 text-sm text-espresso-500">
              Filtrelere uyan transfer kaydı bulunamadı.
            </div>
          ) : (
            filteredTransfers.map((transfer) => {
              const sourceName =
                locationNameById.get(transfer.sourceLocationId) ??
                transfer.sourceLocationId;
              const destinationName =
                locationNameById.get(transfer.destinationLocationId) ??
                transfer.destinationLocationId;

              return (
                <div
                  key={transfer.id}
                  className="p-4 grid grid-cols-1 xl:grid-cols-12 gap-4 items-start"
                >
                  <div className="xl:col-span-3">
                    <p className="font-mono text-[11px] text-espresso-500">
                      {transfer.id}
                    </p>
                    <div className="mt-1 text-sm font-bold text-espresso-950">
                      {sourceName}
                      <ArrowRight className="inline-block w-3.5 h-3.5 mx-1 text-brand-terracotta" />
                      {destinationName}
                    </div>
                    <p className="text-[11px] text-espresso-500 mt-1">
                      {new Date(transfer.createdAt).toLocaleString('tr-TR')}
                    </p>
                  </div>

                  <div className="xl:col-span-4 space-y-1">
                    {transfer.items.map((item) => {
                      const itemName = itemNameById.get(item.itemId) ?? item.itemId;
                      return (
                        <div
                          key={`${transfer.id}-${item.itemId}`}
                          className="flex items-start justify-between gap-3 text-xs"
                        >
                          <span className="font-semibold text-espresso-800">
                            {itemName}
                          </span>
                          <span className="font-mono font-bold text-espresso-950 whitespace-nowrap">
                            {item.quantity}
                          </span>
                        </div>
                      );
                    })}
                    {transfer.notes && (
                      <p className="text-[11px] text-espresso-500 italic pt-1">
                        Not: &ldquo;{transfer.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="xl:col-span-2">
                    <span
                      className={`inline-flex px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-md border ${
                        transfer.status === 'Pending Approval'
                          ? 'bg-amber-50 border-brand-amber/30 text-amber-800'
                          : transfer.status === 'Approved - Awaiting Fulfillment'
                            ? 'bg-blue-50 border-blue-200 text-blue-800'
                            : transfer.status === 'Declined'
                              ? 'bg-red-50 border-red-200 text-red-800'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      {transfer.status === 'Pending Approval'
                        ? 'Yönetici Onayı'
                        : transfer.status === 'Approved - Awaiting Fulfillment'
                          ? 'Kaynak Şubede'
                          : transfer.status === 'Declined'
                            ? 'Reddedildi'
                            : 'Tamamlandı'}
                    </span>
                  </div>

                  <div className="xl:col-span-3 flex xl:justify-end gap-2">
                    {transfer.status === 'Pending Approval' ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateTransferStatus(
                              transfer.id,
                              'Declined',
                              'Owner'
                            )
                          }
                          className="min-h-[40px] px-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs font-bold cursor-pointer"
                        >
                          Reddet
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateTransferStatus(
                              transfer.id,
                              'Approved - Awaiting Fulfillment',
                              'Owner'
                            )
                          }
                          className="min-h-[40px] px-3 rounded-lg bg-brand-terracotta text-white text-xs font-bold cursor-pointer"
                        >
                          Yönetici Onayı Ver
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-espresso-400 font-mono">
                        Aksiyon yok
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-espresso-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-espresso-100 bg-brand-cream/40">
          <h3 className="font-bold text-espresso-950">
            Lokasyon Bazlı Stok Matrisi
          </h3>
          <p className="text-xs text-espresso-600 mt-1">
            Delta = mevcut stok - minimum stok. Negatif delta kritik açık,
            yüksek pozitif delta stok fazlasıdır.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-espresso-50 text-[10px] font-mono uppercase text-espresso-600">
                <th className="py-3 px-4">Lokasyon</th>
                <th className="py-3 px-4">Ürün</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-center">Stok</th>
                <th className="py-3 px-4 text-center">Min</th>
                <th className="py-3 px-4 text-center">Delta</th>
                <th className="py-3 px-4 text-center">Coverage</th>
                <th className="py-3 px-4 text-center">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-espresso-100">
              {filteredStockRows.map((row) => (
                <tr
                  key={`${row.item.id}-${row.location.id}`}
                  className="hover:bg-espresso-50/30"
                >
                  <td className="py-3 px-4 font-bold text-espresso-950">
                    {row.location.name}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold">{row.item.name}</div>
                    <div className="text-[10px] font-mono text-espresso-400">
                      {row.item.id}
                    </div>
                  </td>
                  <td className="py-3 px-4">{row.item.category}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold">
                    {row.quantity}
                  </td>
                  <td className="py-3 px-4 text-center font-mono">
                    {row.minStock}
                  </td>
                  <td
                    className={`py-3 px-4 text-center font-mono font-bold ${
                      row.delta < 0 ? 'text-brand-terracotta' : 'text-emerald-700'
                    }`}
                  >
                    {row.delta > 0 ? '+' : ''}
                    {row.delta}
                  </td>
                  <td className="py-3 px-4 text-center font-mono">
                    {formatRatio(row.coverageRatio)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        row.status === 'critical'
                          ? 'bg-brand-terracotta/10 text-brand-terracotta border border-brand-terracotta/20'
                          : row.status === 'surplus'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-espresso-50 text-espresso-700 border border-espresso-200'
                      }`}
                    >
                      {row.status === 'critical'
                        ? 'Kritik'
                        : row.status === 'surplus'
                          ? 'Fazla'
                          : 'Sağlıklı'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-espresso-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-espresso-100 bg-brand-cream/40">
          <h3 className="font-bold text-espresso-950">Kullanım Logları</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-espresso-50 text-[10px] font-mono uppercase text-espresso-600">
                <th className="py-3 px-4">Zaman</th>
                <th className="py-3 px-4">Şube</th>
                <th className="py-3 px-4">Ürün</th>
                <th className="py-3 px-4 text-center">Miktar</th>
                <th className="py-3 px-4">Kaydeden</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-espresso-100">
              {filteredUsageLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-espresso-500">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredUsageLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-espresso-50/30">
                    <td className="py-3 px-4 font-mono">
                      {new Date(log.timestamp).toLocaleString('tr-TR')}
                    </td>
                    <td className="py-3 px-4">
                      {locationNameById.get(log.locationId) ?? log.locationId}
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      {itemNameById.get(log.itemId) ?? log.itemId}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      {log.quantityUsed}
                    </td>
                    <td className="py-3 px-4">{log.loggedBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
