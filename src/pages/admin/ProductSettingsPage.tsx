import { useMemo, useState, type FormEvent } from 'react';
import { Archive, Plus, Ruler, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useInventory } from '../../context/InventoryContext';
import PageSkeleton from '../../components/ui/PageSkeleton';

export default function ProductSettingsPage() {
  const { t } = useI18n();
  const {
    loading,
    items,
    productCategories,
    productUnits,
    addProductCategory,
    removeProductCategory,
    addProductUnit,
    removeProductUnit,
  } = useInventory();
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [unitLabel, setUnitLabel] = useState('');
  const [unitCategory, setUnitCategory] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCategories = useMemo(
    () => productCategories.filter((category) => category.active),
    [productCategories]
  );

  const categoryUsage = useMemo(() => {
    const usage = new Map<string, number>();
    for (const item of items) {
      usage.set(item.category, (usage.get(item.category) ?? 0) + 1);
    }
    return usage;
  }, [items]);

  if (loading) return <PageSkeleton />;

  const handleCategorySubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const name = categoryName.trim();
    if (!name) {
      setError(t('Kategori adı zorunludur.'));
      return;
    }
    setSavingCategory(true);
    try {
      await addProductCategory({
        name,
        description: categoryDescription,
        sortOrder: (productCategories.length + 1) * 10,
      });
      setCategoryName('');
      setCategoryDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Kategori eklenemedi.'));
    } finally {
      setSavingCategory(false);
    }
  };

  const handleUnitSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const label = unitLabel.trim();
    if (!label) {
      setError(t('Birim adı zorunludur.'));
      return;
    }
    setSavingUnit(true);
    try {
      await addProductUnit({
        label,
        category: unitCategory || undefined,
        sortOrder: (productUnits.length + 1) * 10,
      });
      setUnitLabel('');
      setUnitCategory('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Birim eklenemedi.'));
    } finally {
      setSavingUnit(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-brand-terracotta bg-brand-terracotta/10 px-2 py-1 rounded">
          Product Settings
        </span>
        <h1 className="text-2xl font-bold text-espresso-950 flex items-center gap-2 mt-3">
          <SlidersHorizontal className="w-7 h-7 text-brand-terracotta" />
          {t('Ürün Ayarları')}
        </h1>
        <p className="text-xs text-espresso-600 mt-1 max-w-2xl">
          {t('Admin ürün kategorilerini ve ürün sayım birimlerini buradan özelleştirebilir.')}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-900 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <section className="bg-white border border-espresso-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-espresso-100 bg-brand-cream/40">
            <h2 className="font-bold text-espresso-950 flex items-center gap-2">
              <Archive className="w-4 h-4 text-brand-terracotta" />
              {t('Kategori Yönetimi')}
            </h2>
            <p className="text-xs text-espresso-600 mt-1">
              {t('Yeni ürün oluştururken kullanılacak kategori seçeneklerini yönetin.')}
            </p>
          </div>

          <form onSubmit={handleCategorySubmit} className="p-4 space-y-3">
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-espresso-500 mb-1.5">
                {t('Kategori Adı')}
              </label>
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder={t('Örn: Cleaning Supplies')}
                className="w-full px-3 py-2.5 rounded-lg border border-espresso-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-espresso-500 mb-1.5">
                {t('Açıklama')}
              </label>
              <input
                value={categoryDescription}
                onChange={(event) => setCategoryDescription(event.target.value)}
                placeholder={t('Kısa kategori açıklaması')}
                className="w-full px-3 py-2.5 rounded-lg border border-espresso-200 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={savingCategory}
              className="w-full min-h-[42px] rounded-lg bg-brand-terracotta text-white text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {savingCategory ? t('Kaydediliyor…') : t('Kategori Ekle')}
            </button>
          </form>

          <div className="divide-y divide-espresso-100 border-t border-espresso-100">
            {activeCategories.map((category) => {
              const usedCount = categoryUsage.get(category.name) ?? 0;
              return (
                <div
                  key={category.id}
                  className="p-4 flex items-start justify-between gap-3"
                >
                  <div>
                    <h3 className="font-bold text-espresso-950 text-sm">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-xs text-espresso-500 mt-1">
                        {category.description}
                      </p>
                    )}
                    <p className="text-[10px] font-mono text-espresso-400 mt-2">
                      {usedCount} {t('ürün')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (usedCount > 0) {
                        setError(t('Bu kategori ürünlerde kullanıldığı için silinemez.'));
                        return;
                      }
                      removeProductCategory(category.id).catch((err) =>
                        setError(
                          err instanceof Error
                            ? err.message
                            : t('Kategori silinemedi.')
                        )
                      );
                    }}
                    className="p-2 rounded-lg text-red-700 hover:bg-red-50 cursor-pointer"
                    aria-label={t('Kategoriyi Sil')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white border border-espresso-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-espresso-100 bg-brand-cream/40">
            <h2 className="font-bold text-espresso-950 flex items-center gap-2">
              <Ruler className="w-4 h-4 text-brand-terracotta" />
              {t('Birim Yönetimi')}
            </h2>
            <p className="text-xs text-espresso-600 mt-1">
              {t('Ürünlerde kullanılacak satın alma ve sayım birimlerini yönetin.')}
            </p>
          </div>

          <form onSubmit={handleUnitSubmit} className="p-4 space-y-3">
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-espresso-500 mb-1.5">
                {t('Birim Adı')}
              </label>
              <input
                value={unitLabel}
                onChange={(event) => setUnitLabel(event.target.value)}
                placeholder={t('Örn: packs, gallons, rolls')}
                className="w-full px-3 py-2.5 rounded-lg border border-espresso-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-espresso-500 mb-1.5">
                {t('Bağlı Kategori')}
              </label>
              <select
                value={unitCategory}
                onChange={(event) => setUnitCategory(event.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-espresso-200 bg-white text-sm"
              >
                <option value="">{t('Tüm kategoriler')}</option>
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={savingUnit}
              className="w-full min-h-[42px] rounded-lg bg-brand-terracotta text-white text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {savingUnit ? t('Kaydediliyor…') : t('Birim Ekle')}
            </button>
          </form>

          <div className="divide-y divide-espresso-100 border-t border-espresso-100 max-h-[520px] overflow-y-auto">
            {productUnits
              .filter((unit) => unit.active)
              .map((unit) => (
                <div
                  key={unit.id}
                  className="p-4 flex items-center justify-between gap-3"
                >
                  <div>
                    <h3 className="font-bold text-espresso-950 text-sm">
                      {unit.label}
                    </h3>
                    <p className="text-[10px] font-mono text-espresso-400 mt-1">
                      {unit.category ?? t('Tüm kategoriler')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      removeProductUnit(unit.id).catch((err) =>
                        setError(
                          err instanceof Error ? err.message : t('Birim silinemedi.')
                        )
                      )
                    }
                    className="p-2 rounded-lg text-red-700 hover:bg-red-50 cursor-pointer"
                    aria-label={t('Birimi Sil')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
