import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Archive,
  Boxes,
  ChevronDown,
  ClipboardList,
  PackagePlus,
  Pencil,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { useI18n } from '../../context/I18nContext';
import PageSkeleton from '../../components/ui/PageSkeleton';
import type { InventoryItem, ItemCategory } from '../../types';

const DEFAULT_CATEGORY_OPTIONS: { value: ItemCategory; label: string; hint: string }[] = [
  {
    value: 'Coffee Beans',
    label: 'Coffee Beans',
    hint: 'Çekirdek, blend, decaf, single origin',
  },
  {
    value: 'Dairy & Alternatives',
    label: 'Dairy & Alternatives',
    hint: 'Süt, oat, almond, cream',
  },
  {
    value: 'Syrups',
    label: 'Syrups',
    hint: 'Şurup, sauce, concentrate',
  },
  {
    value: 'Disposables',
    label: 'Disposables',
    hint: 'Bardak, kapak, peçete, paket',
  },
  {
    value: 'Retail',
    label: 'Retail',
    hint: 'Raf ürünü ve satış kalemi',
  },
];

const DEFAULT_UNIT_OPTIONS_BY_CATEGORY: Record<string, string[]> = {
  'Coffee Beans': [
    'bags (1kg)',
    'bags (5lb)',
    'bags',
    'packages',
    'boxes',
    'cases',
    'kg',
    'g',
  ],
  'Dairy & Alternatives': [
    'cartons (1L)',
    'crates (16L)',
    'bottles',
    'gallons',
    'boxes',
    'cases',
    'units',
  ],
  Syrups: [
    'bottles (750ml)',
    'bottles (1L)',
    'bottles',
    'boxes',
    'cases',
    'pumps',
    'units',
  ],
  Disposables: [
    'sleeves',
    'boxes (100pcs)',
    'boxes',
    'packs',
    'packages',
    'cartons',
    'cases',
    'units',
  ],
  Retail: [
    'units',
    'bags',
    'packages',
    'packs',
    'boxes',
    'cartons',
    'cases',
  ],
};

const REPLENISHMENT_POLICIES = [
  { value: '8', label: 'Daily critical', helper: 'Yoğun tüketilen ürünler' },
  { value: '15', label: 'Weekly par', helper: 'Standart şube stoğu' },
  { value: '24', label: 'High volume par', helper: 'Süt/alternatif ve paket ürünler' },
  { value: '50', label: 'Warehouse reserve', helper: 'Merkez depo tampon stoğu' },
  { value: 'custom', label: 'Custom threshold', helper: 'Elle minimum stok belirle' },
];

type FormState = {
  id: string;
  name: string;
  category: ItemCategory;
  unit: string;
  policy: string;
  minStock: string;
  initialStock: string;
};

type LocationStockForm = Record<
  string,
  {
    quantity: string;
    minStock: string;
  }
>;

const EMPTY_FORM: FormState = {
  id: '',
  name: '',
  category: 'Coffee Beans',
  unit: DEFAULT_UNIT_OPTIONS_BY_CATEGORY['Coffee Beans'][0],
  policy: '15',
  minStock: '15',
  initialStock: '0',
};

function getDefaultMinStock(item: InventoryItem): number {
  const values = Object.values(item.minStock);
  return values.length > 0 ? values[0] : 0;
}

function getTotalStock(item: InventoryItem): number {
  return Object.values(item.quantities).reduce((sum, qty) => sum + qty, 0);
}

function getLowLocationCount(item: InventoryItem): number {
  return Object.entries(item.quantities).filter(([locationId, qty]) => {
    return qty <= (item.minStock[locationId] ?? 0);
  }).length;
}

function slugifyProductId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 42);
  return slug ? `item-${slug}` : '';
}

export default function ProductsPage() {
  const {
    loading,
    locations,
    items,
    productCategories,
    productUnits,
    createProduct,
    updateProduct,
    deleteProduct,
  } = useInventory();
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [locationStock, setLocationStock] = useState<LocationStockForm>({});
  const [selectedItemId, setSelectedItemId] = useState<string>('new');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stockPlanOpen, setStockPlanOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'All'>(
    'All'
  );

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );

  const categoryOptions = useMemo(() => {
    const configured = productCategories
      .filter((category) => category.active)
      .map((category) => ({
        value: category.name,
        label: category.name,
        hint: category.description ?? 'Özel kategori',
      }));
    const baseOptions =
      configured.length > 0 ? configured : DEFAULT_CATEGORY_OPTIONS;
    const seen = new Set(baseOptions.map((category) => category.value));
    const itemCategories = Array.from(new Set(items.map((item) => item.category)))
      .filter((category) => !seen.has(category))
      .map((category) => ({
        value: category,
        label: category,
        hint: 'Mevcut ürün kategorisi',
      }));

    return [...baseOptions, ...itemCategories];
  }, [items, productCategories]);

  const getUnitOptionsForCategory = useCallback(
    (category: ItemCategory) => {
      const configuredUnits = productUnits.filter((unit) => unit.active);
      if (configuredUnits.length > 0) {
        const scopedUnits = configuredUnits
          .filter((unit) => !unit.category || unit.category === category)
          .map((unit) => unit.label);
        const existingItemUnits = items
          .filter((item) => item.category === category)
          .map((item) => item.unit);
        const combined = Array.from(new Set([...scopedUnits, ...existingItemUnits]));
        if (combined.length > 0) return combined;
      }

      return (
        DEFAULT_UNIT_OPTIONS_BY_CATEGORY[category] ??
        Array.from(
          new Set([
            ...Object.values(DEFAULT_UNIT_OPTIONS_BY_CATEGORY).flat(),
            ...items.map((item) => item.unit),
          ])
        )
      );
    },
    [items, productUnits]
  );

  const unitOptionsForForm = useMemo(
    () => getUnitOptionsForCategory(form.category),
    [form.category, getUnitOptionsForCategory]
  );

  useEffect(() => {
    if (selectedItemId !== 'new') return;

    setForm((prev) => {
      const categoryIsValid = categoryOptions.some(
        (category) => category.value === prev.category
      );
      const nextCategory = categoryIsValid
        ? prev.category
        : categoryOptions[0]?.value ?? prev.category;
      const nextUnitOptions = getUnitOptionsForCategory(nextCategory);
      const nextUnit = nextUnitOptions.includes(prev.unit)
        ? prev.unit
        : nextUnitOptions[0] ?? prev.unit;

      if (nextCategory === prev.category && nextUnit === prev.unit) {
        return prev;
      }
      return { ...prev, category: nextCategory, unit: nextUnit };
    });
  }, [categoryOptions, getUnitOptionsForCategory, selectedItemId]);

  const buildLocationStockForm = (
    item?: InventoryItem,
    fallbackMinStock = Number(EMPTY_FORM.minStock)
  ): LocationStockForm => {
    return locations.reduce<LocationStockForm>((acc, location) => {
      acc[location.id] = {
        quantity: String(item?.quantities[location.id] ?? 0),
        minStock: String(item?.minStock[location.id] ?? fallbackMinStock),
      };
      return acc;
    }, {});
  };

  useEffect(() => {
    setLocationStock((prev) => {
      const fallbackMinStock = Number(form.minStock) || Number(EMPTY_FORM.minStock);
      return locations.reduce<LocationStockForm>((acc, location) => {
        acc[location.id] = prev[location.id] ?? {
          quantity: '0',
          minStock: String(fallbackMinStock),
        };
        return acc;
      }, {});
    });
  }, [form.minStock, locations]);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory =
        categoryFilter === 'All' || item.category === categoryFilter;
      const matchesSearch =
        !needle ||
        item.name.toLowerCase().includes(needle) ||
        item.id.toLowerCase().includes(needle) ||
        item.category.toLowerCase().includes(needle);
      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, items, search]);

  const metrics = useMemo(() => {
    const lowItems = items.filter((item) => getLowLocationCount(item) > 0).length;
    const totalStockUnits = items.reduce((sum, item) => sum + getTotalStock(item), 0);
    return {
      totalProducts: items.length,
      categories: new Set(items.map((item) => item.category)).size,
      lowItems,
      totalStockUnits,
    };
  }, [items]);

  const stockPlanSummary = useMemo(() => {
    return Object.values(locationStock).reduce(
      (summary, stock) => {
        summary.totalStock += Number(stock.quantity) || 0;
        summary.averageMin += Number(stock.minStock) || 0;
        return summary;
      },
      { totalStock: 0, averageMin: 0 }
    );
  }, [locationStock]);

  if (loading) return <PageSkeleton />;

  const getEmptyForm = () => {
    const category = categoryOptions[0]?.value ?? EMPTY_FORM.category;
    const unit = getUnitOptionsForCategory(category)[0] ?? EMPTY_FORM.unit;
    return { ...EMPTY_FORM, category, unit };
  };

  const resetForm = () => {
    const nextForm = getEmptyForm();
    setForm(nextForm);
    setLocationStock(buildLocationStockForm(undefined, Number(EMPTY_FORM.minStock)));
    setSelectedItemId('new');
    setError(null);
  };

  const hydrateFormFromItem = (item: InventoryItem) => {
    const minStock = getDefaultMinStock(item);
    const policy = REPLENISHMENT_POLICIES.some(
      (option) => option.value === String(minStock)
    )
      ? String(minStock)
      : 'custom';

    setSelectedItemId(item.id);
    setForm({
      id: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      policy,
      minStock: String(minStock),
      initialStock: String(getTotalStock(item)),
    });
    setLocationStock(buildLocationStockForm(item, minStock));
    setError(null);
  };

  const handleCategoryChange = (category: ItemCategory) => {
    const unitOptions = getUnitOptionsForCategory(category);
    setForm((prev) => ({
      ...prev,
      category,
      unit: unitOptions.includes(prev.unit) ? prev.unit : unitOptions[0],
    }));
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      id:
        selectedItemId === 'new' && (!prev.id || prev.id.startsWith('item-'))
          ? slugifyProductId(name)
          : prev.id,
    }));
  };

  const handlePolicyChange = (policy: string) => {
    setForm((prev) => ({
      ...prev,
      policy,
      minStock: policy === 'custom' ? prev.minStock : policy,
    }));

    if (policy !== 'custom') {
      setLocationStock((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([locationId, stock]) => [
            locationId,
            { ...stock, minStock: policy },
          ])
        )
      );
    }
  };

  const handleLocationStockChange = (
    locationId: string,
    field: 'quantity' | 'minStock',
    value: string
  ) => {
    const normalized = value.replace(/[^\d.]/g, '');
    setLocationStock((prev) => ({
      ...prev,
      [locationId]: {
        quantity: prev[locationId]?.quantity ?? '0',
        minStock: prev[locationId]?.minStock ?? form.minStock,
        [field]: normalized,
      },
    }));
  };

  const handleDefaultMinStockChange = (value: string) => {
    const normalized = value.replace(/[^\d.]/g, '');
    setForm((prev) => ({ ...prev, minStock: normalized }));
    setLocationStock((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([locationId, stock]) => [
          locationId,
          { ...stock, minStock: normalized },
        ])
      )
    );
  };

  const handleInitialStockChange = (value: string) => {
    const normalized = value.replace(/[^\d.]/g, '');
    setForm((prev) => ({ ...prev, initialStock: normalized }));
    setLocationStock((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([locationId, stock]) => [
          locationId,
          { ...stock, quantity: normalized },
        ])
      )
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const minStock = Number(form.minStock);
    if (!form.id.trim() || !form.name.trim() || !form.unit.trim()) {
      setError(t('Ürün ID, isim ve birim zorunlu.'));
      return;
    }
    const initialStock = Number(form.initialStock);
    if (!Number.isFinite(minStock) || minStock < 0) {
      setError(t('Minimum stok 0 veya daha büyük olmalı.'));
      return;
    }
    if (!Number.isFinite(initialStock) || initialStock < 0) {
      setError(t('Stok sayısı 0 veya daha büyük olmalı.'));
      return;
    }

    const inventory = locations.reduce<
      Record<string, { quantity: number; minStock: number }>
    >((acc, location) => {
      const stock = locationStock[location.id];
      const quantity = Number(stock?.quantity ?? 0);
      const locationMinStock = Number(stock?.minStock ?? minStock);
      acc[location.id] = {
        quantity,
        minStock: locationMinStock,
      };
      return acc;
    }, {});

    const hasInvalidInventory = Object.values(inventory).some(
      (stock) =>
        !Number.isFinite(stock.quantity) ||
        stock.quantity < 0 ||
        !Number.isFinite(stock.minStock) ||
        stock.minStock < 0
    );

    if (hasInvalidInventory) {
      setError(t('Şube stok ve minimum stok değerleri 0 veya daha büyük olmalı.'));
      return;
    }

    setSaving(true);
    try {
      if (selectedItem) {
        await updateProduct(selectedItem.id, {
          name: form.name,
          category: form.category,
          unit: form.unit,
          minStock,
          inventory,
        });
      } else {
        await createProduct({
          id: form.id.trim(),
          name: form.name,
          category: form.category,
          unit: form.unit,
          minStock,
          inventory,
        });
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? t(err.message) : t('Ürün kaydedilemedi.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    if (!window.confirm(`${item.name} ${t('ürününü silmek istiyor musunuz?')}`)) return;
    await deleteProduct(item.id).catch((err) =>
      setError(err instanceof Error ? t(err.message) : t('Ürün silinemedi.'))
    );
    if (selectedItemId === item.id) resetForm();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 font-sans">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-brand-terracotta bg-brand-terracotta/10 px-2 py-1 rounded">
            Catalog Management
          </span>
          <h1 className="text-2xl font-bold text-espresso-950 flex items-center gap-2 mt-3">
            <PackagePlus className="w-7 h-7 text-brand-terracotta" />
            Ürün Yönetimi
          </h1>
          <p className="text-xs text-espresso-600 mt-1 max-w-2xl">
            Ürün kartlarını sektör standardı katalog alanlarıyla yönetin:
            kategori, birim formatı, replenishment policy ve minimum stok
            eşiği.
          </p>
        </div>

        <button
          type="button"
          onClick={resetForm}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-terracotta text-white text-xs font-bold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Yeni Ürün Kartı
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Aktif SKU',
            value: metrics.totalProducts,
            icon: <Boxes className="w-4 h-4" />,
          },
          {
            label: 'Kategori',
            value: metrics.categories,
            icon: <Archive className="w-4 h-4" />,
          },
          {
            label: 'Kritik SKU',
            value: metrics.lowItems,
            icon: <AlertTriangle className="w-4 h-4" />,
          },
          {
            label: 'Toplam Stok',
            value: metrics.totalStockUnits,
            icon: <ClipboardList className="w-4 h-4" />,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white border border-espresso-200 rounded-xl p-4 shadow-xs"
          >
            <div className="flex items-center justify-between text-espresso-500">
              <span className="text-[10px] font-mono uppercase font-bold">
                {card.label}
              </span>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-espresso-950 mt-2">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <section className="xl:col-span-4 bg-white border border-espresso-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-espresso-100 space-y-3">
            <div>
              <h2 className="font-bold text-espresso-950 text-sm">
                Ürün Seçimi
              </h2>
              <p className="text-[11px] text-espresso-500 mt-0.5">
                Mevcut bir ürünü seçin veya yeni kart oluşturun.
              </p>
            </div>

            <div className="relative">
              <select
                value={selectedItemId}
                onChange={(e) => {
                  if (e.target.value === 'new') {
                    resetForm();
                    return;
                  }
                  const item = items.find((i) => i.id === e.target.value);
                  if (item) hydrateFormFromItem(item);
                }}
                className="w-full appearance-none px-3 py-2.5 pr-9 rounded-lg border border-espresso-200 bg-brand-cream/40 text-xs font-bold text-espresso-900"
              >
                <option value="new">+ Yeni ürün kartı</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-espresso-400 pointer-events-none" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="SKU, ürün veya kategori ara..."
                className="px-3 py-2 rounded-lg border border-espresso-200 text-xs"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-espresso-200 text-xs bg-white"
              >
                <option value="All">Tüm kategoriler</option>
                {categoryOptions.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-h-[540px] overflow-y-auto divide-y divide-espresso-100">
            {filteredItems.map((item) => {
              const lowCount = getLowLocationCount(item);
              const isSelected = selectedItemId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => hydrateFormFromItem(item)}
                  className={`w-full text-left p-4 hover:bg-espresso-50/50 transition-colors cursor-pointer ${
                    isSelected ? 'bg-brand-amber/10' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-sm text-espresso-950">
                        {item.name}
                      </p>
                      <p className="text-[10px] font-mono text-espresso-400 mt-0.5">
                        {item.id}
                      </p>
                    </div>
                    {lowCount > 0 && (
                      <span className="text-[10px] font-bold text-brand-terracotta bg-brand-terracotta/10 border border-brand-terracotta/20 rounded px-2 py-0.5">
                        {lowCount} kritik
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="px-2 py-0.5 rounded bg-espresso-100 text-[10px] font-semibold text-espresso-700">
                      {item.category}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-espresso-50 text-[10px] font-mono text-espresso-600">
                      {item.unit}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="xl:col-span-8 bg-white border border-espresso-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-espresso-100 bg-brand-cream/40">
            <h2 className="font-bold text-espresso-950 flex items-center gap-2">
              {selectedItem ? (
                <Pencil className="w-4 h-4 text-brand-terracotta" />
              ) : (
                <PackagePlus className="w-4 h-4 text-brand-terracotta" />
              )}
              {selectedItem ? 'Ürün Profilini Düzenle' : 'Yeni Ürün Profili'}
            </h2>
            <p className="text-xs text-espresso-600 mt-1">
              Dropdown alanları ürün master data standardını korur; ID alanı
              yeni ürün oluştururken otomatik önerilir.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-espresso-500 mb-1.5">
                  SKU / Product ID
                </label>
                <input
                  value={form.id}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, id: e.target.value }))
                  }
                  disabled={Boolean(selectedItem)}
                  placeholder="item-ethiopia"
                  className="w-full px-3 py-2.5 rounded-lg border border-espresso-200 text-xs font-mono disabled:bg-espresso-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-espresso-500 mb-1.5">
                  Ürün Adı
                </label>
                <input
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Immersion House Espresso Blend"
                  className="w-full px-3 py-2.5 rounded-lg border border-espresso-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-espresso-500 mb-1.5">
                  Kategori
                </label>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full appearance-none px-3 py-2.5 pr-9 rounded-lg border border-espresso-200 bg-white text-xs font-bold"
                  >
                    {categoryOptions.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label} — {category.hint}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-espresso-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-espresso-500 mb-1.5">
                  Satın Alma / Sayım Birimi
                </label>
                <div className="relative">
                  <select
                    value={form.unit}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, unit: e.target.value }))
                    }
                    className="w-full appearance-none px-3 py-2.5 pr-9 rounded-lg border border-espresso-200 bg-white text-xs font-bold"
                  >
                    {unitOptionsForForm.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-espresso-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-espresso-500 mb-1.5">
                  Replenishment Policy
                </label>
                <div className="relative">
                  <select
                    value={form.policy}
                    onChange={(e) => handlePolicyChange(e.target.value)}
                    className="w-full appearance-none px-3 py-2.5 pr-9 rounded-lg border border-espresso-200 bg-white text-xs font-bold"
                  >
                    {REPLENISHMENT_POLICIES.map((policy) => (
                      <option key={policy.value} value={policy.value}>
                        {policy.label} — {policy.helper}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-espresso-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-espresso-500 mb-1.5">
                  Stok Sayısı
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.initialStock}
                  onChange={(e) => handleInitialStockChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-espresso-200 text-xs font-mono"
                />
                <p className="text-[10px] text-espresso-500 mt-1">
                  Bu sayı tüm lokasyonların başlangıç stok alanına uygulanır.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-espresso-200 bg-brand-cream/35 overflow-hidden">
              <button
                type="button"
                onClick={() => setStockPlanOpen((open) => !open)}
                className="w-full p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-espresso-200 flex items-center justify-center shrink-0">
                    <SlidersHorizontal className="w-4 h-4 text-brand-terracotta" />
                  </div>
                  <div>
                    <h3 className="font-bold text-espresso-950 text-sm">
                      Şube Bazlı Stok Planı
                    </h3>
                    <p className="text-[11px] text-espresso-600 mt-0.5">
                      Gelişmiş stok dağılımını açarak lokasyon bazında mevcut stok ve min. stok düzenleyin.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className="text-[10px] font-mono font-bold uppercase text-brand-terracotta bg-white border border-espresso-200 rounded px-2 py-1">
                    {locations.length} {t('lokasyon')}
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase text-espresso-600 bg-white border border-espresso-200 rounded px-2 py-1">
                    {t('Toplam:')} {stockPlanSummary.totalStock}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-espresso-500 transition-transform ${
                      stockPlanOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {stockPlanOpen && (
                <div className="border-t border-espresso-200 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {locations.map((location) => {
                      const stock = locationStock[location.id] ?? {
                        quantity: '0',
                        minStock: form.minStock,
                      };

                      return (
                        <div
                          key={`stock-plan-${location.id}`}
                          className="bg-white border border-espresso-150 rounded-lg p-3 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-espresso-950 truncate">
                                {location.name}
                              </p>
                              <p className="text-[10px] font-mono text-espresso-500">
                                {location.isWarehouse ? 'Merkez Depo' : 'Şube'} · {location.id}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-mono font-bold uppercase text-espresso-500 mb-1">
                                Mevcut Stok
                              </label>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={stock.quantity}
                                onChange={(e) =>
                                  handleLocationStockChange(
                                    location.id,
                                    'quantity',
                                    e.target.value
                                  )
                                }
                                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-espresso-200 bg-white text-sm font-mono text-espresso-950"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-mono font-bold uppercase text-espresso-500 mb-1">
                                Min. Stok
                              </label>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={stock.minStock}
                                onChange={(e) =>
                                  handleLocationStockChange(
                                    location.id,
                                    'minStock',
                                    e.target.value
                                  )
                                }
                                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-espresso-200 bg-white text-sm font-mono text-espresso-950"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {selectedItem && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg bg-espresso-50 border border-espresso-100 p-3">
                  <p className="text-[10px] font-mono uppercase text-espresso-500 font-bold">
                    Toplam Stok
                  </p>
                  <p className="text-lg font-bold text-espresso-950">
                    {getTotalStock(selectedItem)} {selectedItem.unit}
                  </p>
                </div>
                <div className="rounded-lg bg-espresso-50 border border-espresso-100 p-3">
                  <p className="text-[10px] font-mono uppercase text-espresso-500 font-bold">
                    Kritik Lokasyon
                  </p>
                  <p className="text-lg font-bold text-brand-terracotta">
                    {getLowLocationCount(selectedItem)}
                  </p>
                </div>
                <div className="rounded-lg bg-espresso-50 border border-espresso-100 p-3">
                  <p className="text-[10px] font-mono uppercase text-espresso-500 font-bold">
                    Varsayılan Min.
                  </p>
                  <p className="text-lg font-bold text-espresso-950">
                    {getDefaultMinStock(selectedItem)}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-brand-terracotta bg-brand-terracotta/10 border border-brand-terracotta/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-espresso-100">
              <div className="text-[11px] text-espresso-500">
                Şube bazlı stok planındaki mevcut stok ve minimum stok değerleri
                kaydedildiğinde envanter kayıtlarına uygulanır.
              </div>
              <div className="flex items-center gap-2">
                {selectedItem && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(selectedItem)}
                    className="px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Sil
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-brand-terracotta text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving
                    ? t('Kaydediliyor…')
                    : selectedItem
                      ? t('Değişiklikleri Kaydet')
                      : t('Ürünü Yayına Al')}
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
