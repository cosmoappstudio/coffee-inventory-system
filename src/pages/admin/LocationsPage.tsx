import { useMemo, useState, type FormEvent } from 'react';
import { Building2, Pencil, Trash2 } from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { useI18n } from '../../context/I18nContext';
import PageSkeleton from '../../components/ui/PageSkeleton';
import type { Location } from '../../types';

type FormState = {
  id: string;
  name: string;
  address: string;
  isWarehouse: boolean;
};

const EMPTY_FORM: FormState = {
  id: '',
  name: '',
  address: '',
  isWarehouse: false,
};

export default function LocationsPage() {
  const {
    loading,
    locations,
    employees,
    createLocation,
    updateLocation,
    deleteLocation,
  } = useInventory();
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filteredLocations = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return locations;
    return locations.filter(
      (location) =>
        location.name.toLowerCase().includes(needle) ||
        location.id.toLowerCase().includes(needle) ||
        location.address.toLowerCase().includes(needle)
    );
  }, [locations, search]);

  const employeeCountByLocation = useMemo(() => {
    const counts = new Map<string, number>();
    for (const employee of employees) {
      counts.set(employee.locationId, (counts.get(employee.locationId) ?? 0) + 1);
    }
    return counts;
  }, [employees]);

  if (loading) return <PageSkeleton />;

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
  };

  const handleEdit = (location: Location) => {
    setEditingId(location.id);
    setForm({
      id: location.id,
      name: location.name,
      address: location.address,
      isWarehouse: Boolean(location.isWarehouse),
    });
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.id.trim() || !form.name.trim()) {
      setError(t('Lokasyon ID ve isim zorunlu.'));
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateLocation(editingId, {
          name: form.name,
          address: form.address,
          isWarehouse: form.isWarehouse,
        });
      } else {
        await createLocation({
          id: form.id.trim().toLowerCase(),
          name: form.name,
          address: form.address,
          isWarehouse: form.isWarehouse,
        });
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? t(err.message) : t('Lokasyon kaydedilemedi.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (location: Location) => {
    if (!window.confirm(`${location.name} ${t('lokasyonunu silmek istiyor musunuz?')}`)) {
      return;
    }
    await deleteLocation(location.id).catch((err) =>
      setError(err instanceof Error ? t(err.message) : t('Lokasyon silinemedi.'))
    );
  };

  return (
    <div className="p-4 sm:p-5 xl:p-6 space-y-6 font-sans">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-espresso-950 flex items-center gap-2 leading-tight">
          <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-brand-terracotta shrink-0" />
          Lokasyon Yönetimi
        </h1>
        <p className="text-xs text-espresso-600 mt-1 max-w-3xl leading-relaxed">
          Şubeleri ve merkez depo gibi operasyon noktalarını Owner panelinden yönetin.
          Yeni lokasyon açıldığında mevcut ürünler için stok satırları otomatik oluşturulur.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-espresso-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            value={form.id}
            onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))}
            disabled={Boolean(editingId)}
            placeholder="la"
            className="min-h-[44px] px-3 py-2 rounded-lg border border-espresso-200 text-sm md:text-xs font-mono disabled:bg-espresso-50"
          />
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Şube adı"
            className="md:col-span-2 min-h-[44px] px-3 py-2 rounded-lg border border-espresso-200 text-sm md:text-xs"
          />
          <input
            value={form.address}
            onChange={(e) =>
              setForm((p) => ({ ...p, address: e.target.value }))
            }
            placeholder="Adres"
            className="md:col-span-2 min-h-[44px] px-3 py-2 rounded-lg border border-espresso-200 text-sm md:text-xs"
          />
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-bold text-espresso-700">
          <input
            type="checkbox"
            checked={form.isWarehouse}
            onChange={(e) =>
              setForm((p) => ({ ...p, isWarehouse: e.target.checked }))
            }
            className="accent-brand-terracotta"
          />
          Merkez depo / warehouse olarak işaretle
        </label>

        {error && (
          <div className="text-xs text-brand-terracotta bg-brand-terracotta/10 border border-brand-terracotta/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-brand-terracotta text-white text-sm md:text-xs font-bold disabled:opacity-60 cursor-pointer"
          >
            {saving
              ? t('Kaydediliyor…')
              : editingId
                ? t('Lokasyonu Güncelle')
                : t('Lokasyon Ekle')}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="min-h-[44px] px-4 py-2 rounded-lg border border-espresso-200 text-sm md:text-xs font-bold cursor-pointer"
            >
              Vazgeç
            </button>
          )}
        </div>
      </form>

      <div className="bg-white border border-espresso-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-espresso-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <h2 className="font-bold text-espresso-950">Lokasyonlar</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Lokasyon ara..."
            className="min-h-[44px] px-3 py-2 rounded-lg border border-espresso-200 text-sm md:text-xs"
          />
        </div>

        <div className="md:hidden divide-y divide-espresso-100">
          {filteredLocations.map((location) => (
            <div key={`mobile-${location.id}`} className="p-4 space-y-3 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-espresso-950">{location.name}</p>
                  <p className="text-[10px] font-mono text-espresso-500 mt-1">
                    {location.id} · {location.isWarehouse ? 'Depo' : 'Şube'}
                  </p>
                  <p className="text-xs text-espresso-500 mt-1">
                    {location.address || 'Adres girilmedi'}
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold text-espresso-700 bg-espresso-50 border border-espresso-150 rounded px-2 py-1 shrink-0">
                  {employeeCountByLocation.get(location.id) ?? 0} kişi
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(location)}
                  className="min-h-[44px] rounded-lg border border-espresso-200 hover:bg-espresso-50 cursor-pointer inline-flex items-center justify-center gap-2 text-sm font-bold text-espresso-800"
                >
                  <Pencil className="w-4 h-4" />
                  Düzenle
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(location)}
                  disabled={location.id === 'warehouse'}
                  className="min-h-[44px] rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 cursor-pointer inline-flex items-center justify-center gap-2 text-sm font-bold"
                >
                  <Trash2 className="w-4 h-4" />
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-espresso-50 text-[10px] font-mono uppercase text-espresso-600">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Lokasyon</th>
                <th className="py-3 px-4">Tip</th>
                <th className="py-3 px-4">Çalışan</th>
                <th className="py-3 px-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-espresso-100">
              {filteredLocations.map((location) => (
                <tr key={location.id} className="hover:bg-espresso-50/30">
                  <td className="py-3 px-4 font-mono text-espresso-500">
                    {location.id}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-espresso-950">{location.name}</div>
                    <div className="text-[10px] text-espresso-500">
                      {location.address || 'Adres girilmedi'}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {location.isWarehouse ? 'Depo' : 'Şube'}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {employeeCountByLocation.get(location.id) ?? 0}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(location)}
                        className="p-2 rounded-lg border border-espresso-200 hover:bg-espresso-50 cursor-pointer"
                        title="Düzenle"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(location)}
                        disabled={location.id === 'warehouse'}
                        className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 cursor-pointer"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
