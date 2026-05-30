import React, { useState } from 'react';
import { Employee, Location, Role, UserStatus } from '../types';
import { employeeAuthEmail } from '../lib/supabase';
import { useI18n } from '../context/I18nContext';
import { 
  Users, 
  UserPlus, 
  Search, 
  Mail, 
  Key, 
  Pencil,
  Trash2, 
  ShieldAlert, 
  Check, 
  X, 
  Briefcase, 
  MapPin, 
  Sparkles,
  ToggleLeft,
  CircleDot
} from 'lucide-react';

interface UserManagementScreenProps {
  employees: Employee[];
  locations: Location[];
  onAddEmployee: (employee: Employee, password: string) => void | Promise<void>;
  onUpdateEmployee: (
    employeeId: string,
    employee: {
      name: string;
      role: Role;
      locationId: string;
      locationIds?: string[];
      status: UserStatus;
      password?: string;
    }
  ) => void | Promise<void>;
  onRemoveEmployee: (employeeId: string) => void | Promise<void>;
  onUpdateStatus: (employeeId: string, status: UserStatus) => void | Promise<void>;
}

export default function UserManagementScreen({
  employees,
  locations,
  onAddEmployee,
  onUpdateEmployee,
  onRemoveEmployee,
  onUpdateStatus
}: UserManagementScreenProps) {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'All'>('All');
  
  // Create state for Create Modal
  const [showModal, setShowModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('Barista');
  const [newUserLocs, setNewUserLocs] = useState<string[]>([]);
  const [newUserPassword, setNewUserPassword] = useState('');
  const [generatedId, setGeneratedId] = useState('');

  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<Role>('Barista');
  const [editLocationIds, setEditLocationIds] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<UserStatus>('Active');
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Auto-generate employee ID
  const generateEmployeeId = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `IMM-${num}`;
  };

  const storeLocations = locations.filter((location) => !location.isWarehouse);

  const toggleLocation = (
    locationId: string,
    setSelectedLocationIds: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setSelectedLocationIds((prev) =>
      prev.includes(locationId)
        ? prev.filter((id) => id !== locationId)
        : [...prev, locationId]
    );
  };

  const handleOpenCreateModal = () => {
    setGeneratedId(generateEmployeeId());
    setNewUserName('');
    setNewUserRole('Barista');
    
    const firstStore = locations.find(l => !l.isWarehouse);
    setNewUserLocs(firstStore ? [firstStore.id] : []);
    setNewUserPassword(String(Math.floor(10000 + Math.random() * 90000)));
    setModalError(null);
    setShowModal(true);
  };

  const handleConfirmAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) {
      setModalError('Lütfen çalışanın tam adını girin.');
      return;
    }
    if (!/^\d{5}$/.test(newUserPassword)) {
      setModalError('Şifre tam 5 haneli rakam olmalıdır.');
      return;
    }
    if (newUserRole !== 'Owner' && newUserLocs.length === 0) {
      setModalError('Owner dışındaki roller için en az bir şube seçilmelidir.');
      return;
    }

    const created: Employee = {
      id: generatedId,
      name: newUserName.trim(),
      role: newUserRole,
      locationId: newUserRole === 'Owner' ? 'all' : newUserLocs[0],
      locationIds: newUserRole === 'Owner' ? ['all'] : newUserLocs,
      status: 'Active',
      email: employeeAuthEmail(generatedId),
      lastActive: 'Never active (New)'
    };

    setSaving(true);
    setModalError(null);
    try {
      await onAddEmployee(created, newUserPassword);
      setShowModal(false);
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : 'Çalışan eklenemedi.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditModal = (employee: Employee) => {
    const firstStore = locations.find((location) => !location.isWarehouse);
    setEditingEmployee(employee);
    setEditName(employee.name);
    setEditRole(employee.role);
    setEditLocationIds(
      employee.role === 'Owner'
        ? []
        : employee.locationIds?.length
          ? employee.locationIds
          : employee.locationId === 'all'
            ? firstStore
              ? [firstStore.id]
              : []
            : [employee.locationId]
    );
    setEditStatus(employee.status);
    setEditPassword('');
    setEditError(null);
  };

  const handleConfirmEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    if (!editName.trim()) {
      setEditError('Çalışan adı boş bırakılamaz.');
      return;
    }

    if (editRole !== 'Owner' && editLocationIds.length === 0) {
      setEditError('Owner dışındaki roller için en az bir şube seçilmelidir.');
      return;
    }

    if (editPassword && !/^\d{5}$/.test(editPassword)) {
      setEditError('Yeni şifre boş bırakılabilir veya tam 5 haneli rakam olmalıdır.');
      return;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      await onUpdateEmployee(editingEmployee.id, {
        name: editName.trim(),
        role: editRole,
        locationId: editRole === 'Owner' ? 'all' : editLocationIds[0],
        locationIds: editRole === 'Owner' ? [] : editLocationIds,
        status: editStatus,
        ...(editPassword ? { password: editPassword } : {}),
      });
      setEditingEmployee(null);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Çalışan güncellenemedi.'
      );
    } finally {
      setEditSaving(false);
    }
  };

  // Filters
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All' || emp.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: Role) => {
    switch(role) {
      case 'Owner': return 'bg-brand-charcoal text-brand-darkcream border border-brand-darkcream/30';
      case 'Location Manager': return 'bg-brand-terracotta/10 text-brand-terracotta border border-brand-terracotta/20';
      case 'Barista': return 'bg-brand-amber/15 text-amber-950 border border-brand-amber/35';
    }
  };

  const getStatusStyle = (status: UserStatus) => {
    switch(status) {
      case 'Active': return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'On Leave': return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'Inactive': return 'bg-red-50 text-red-800 border-red-300';
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header section with Create Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-espresso-955 flex items-center gap-2">
            <Users className="w-7 h-7 text-brand-terracotta" />
            Personel & Yetki Yönetimi
          </h2>
          <p className="text-espresso-600 text-xs mt-1">
            Ekip yetkilerini düzenleyin, yeni çalışan hesapları oluşturun ve şube bazında yöneticileri atayın.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-5 py-3 bg-brand-terracotta hover:bg-brand-terracotta/95 text-white font-bold text-xs rounded-lg shadow-md flex items-center gap-2 select-none cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Yeni Çalışan Tanımla
        </button>
      </div>

      {/* SEARCH AND FILTERS ROW */}
      <div className="bg-white p-5 rounded-xl border border-espresso-200 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Local Table Search */}
        <div className="w-full md:w-96 relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-espresso-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="İsim, ID veya e-posta ile çalışan ara..."
            value={searchTerm}
            id="user-search-input"
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-espresso-250 bg-white placeholder:text-espresso-400 focus:outline-none focus:ring-1 focus:ring-brand-terracotta font-sans text-espresso-900"
          />
        </div>

        {/* Role toggle filters */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto whitespace-nowrap">
          <span className="text-xs font-mono font-bold text-espresso-500 uppercase">YETKİ KATEGORİSİ:</span>
          {([
            { key: 'All', label: 'Tümü' },
            { key: 'Owner', label: 'Yönetici / Sahip' },
            { key: 'Location Manager', label: 'Şube Müdürü' },
            { key: 'Barista', label: 'Barista' }
          ]).map((role) => (
            <button
              key={`role-tab-${role.key}`}
              type="button"
              onClick={() => setRoleFilter(role.key as any)}
              className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                roleFilter === role.key
                  ? 'bg-brand-charcoal border-brand-charcoal text-white'
                  : 'bg-white border-espresso-200 text-espresso-700 hover:bg-espresso-50'
              }`}
            >
              {role.label}
            </button>
          ))}
        </div>
      </div>

      {/* EMPLOYEES DIRECTORY TABLE CARD */}
      <div className="bg-white rounded-xl border border-espresso-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-espresso-50 text-[10px] font-mono uppercase text-espresso-600 tracking-wider border-b border-espresso-150">
                <th className="py-3 px-4">ID Kodu</th>
                <th className="py-3 px-4">Çalışan Bilgisi</th>
                <th className="py-3 px-4">Yetki Derecesi</th>
                <th className="py-3 px-4">Atandığı Şube</th>
                <th className="py-3 px-4 text-center">Durum</th>
                <th className="py-3 px-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-espresso-100 font-sans text-xs">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-espresso-500 font-medium">
                    Aranan kriterlere uygun çalışan bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const assignedLocations = locations.filter((location) =>
                    (emp.locationIds?.length ? emp.locationIds : [emp.locationId]).includes(
                      location.id
                    )
                  );
                  const isSystemSelf = emp.id === 'IMM-8012'; // Keep owner self from being deleted as safeguards

                  return (
                    <tr key={emp.id} className="hover:bg-espresso-50/20 transition-colors">
                      {/* ID Code column */}
                      <td className="py-4 px-4 font-mono font-bold text-brand-terracotta text-sm">
                        {emp.id}
                      </td>

                      {/* Staff Member Info Column */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-espresso-955 text-sm flex items-center gap-1.5">
                          {emp.name}
                          {isSystemSelf && (
                            <span className="text-[9px] font-mono font-bold bg-brand-amber text-espresso-950 px-1 rounded uppercase">
                              Sistem Sahibi
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-espresso-500 flex items-center gap-1 mt-0.5 font-mono">
                          <Mail className="w-3.5 h-3.5 text-espresso-400 shrink-0" />
                          <span>{emp.email}</span>
                        </div>
                      </td>

                      {/* Security Limit Column */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${getRoleColor(emp.role)}`}>
                          {emp.role === 'Owner' ? 'Yönetici' : emp.role === 'Location Manager' ? 'Şube Müdürü' : 'Barista'}
                        </span>
                      </td>

                      {/* Store Assignment Column */}
                      <td className="py-4 px-4 text-espresso-900 whitespace-nowrap font-medium text-xs">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-espresso-400" />
                          <span>
                            {emp.role === 'Owner'
                              ? 'Tüm Şubeler (Merkez)'
                              : assignedLocations.length > 0
                                ? assignedLocations.map((loc) => loc.name).join(', ')
                                : emp.locationId || 'Atanmamış'}
                          </span>
                        </div>
                      </td>

                      {/* Tethered alignment status Column */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <select
                            value={emp.status}
                            onChange={(e) => onUpdateStatus(emp.id, e.target.value as UserStatus)}
                            className={`px-2 py-1 text-xs font-bold rounded border py-1.5 focus:outline-none ${getStatusStyle(emp.status)} cursor-pointer`}
                          >
                            <option value="Active">Aktif</option>
                            <option value="On Leave">İzinli</option>
                            <option value="Inactive">Pasif</option>
                          </select>
                        </div>
                      </td>

                      {/* Action parameters Column */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(emp)}
                            className="p-2 text-espresso-500 hover:text-espresso-950 hover:bg-espresso-50 rounded-lg border border-espresso-150 cursor-pointer transition-all"
                            title="Çalışanı Düzenle"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        {!isSystemSelf ? (
                          <button
                            type="button"
                            onClick={() => onRemoveEmployee(emp.id)}
                            className="p-2 text-espresso-400 hover:text-brand-terracotta hover:bg-rose-50 rounded-lg border border-red-100 cursor-pointer transition-all"
                            title="Çalışanı Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-espresso-400 font-bold uppercase self-center">Sistem Korumalı</span>
                        )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE NEW USER - POPUP DIALOG */}
      {showModal && (
        <div className="fixed inset-0 bg-brand-charcoal/85 flex items-center justify-center p-4 z-50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-brand-cream border-2 border-espresso-800 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-5 relative">
            <button 
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-espresso-450 hover:text-espresso-800 rounded"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title section */}
            <div>
              <span className="text-xs font-mono text-brand-terracotta bg-brand-terracotta/10 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Sistem Personel Kayıt Defteri
              </span>
              <h3 className="text-xl font-bold text-espresso-950 mt-1">
                Yeni Çalışan Hesabı Tanımla
              </h3>
              <p className="text-xs text-espresso-500 mt-0.5">
                Yeni personele ait rol ve şube kısıtlamalarını buradan düzenleyebilirsiniz.
              </p>
            </div>

            {/* Error alerts if any */}
            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-900 rounded-lg flex items-center gap-2">
                <ShieldAlert className="w-4.5 h-4.5 text-brand-terracotta" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleConfirmAddEmployee} className="space-y-4 font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Generated employee Id badge */}
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wide text-espresso-600 mb-1">
                    Sistem Tarafından Atanan ID
                  </label>
                  <div className="w-full px-3 py-2 bg-espresso-100 text-brand-terracotta rounded border border-espresso-200 select-none font-mono font-bold text-base flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-brand-terracotta shrink-0" />
                    {generatedId}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wide text-espresso-600 mb-1">
                    Çalışanın Tam Adı
                  </label>
                  <input
                    type="text"
                    placeholder="Adı Soyadı"
                    id="new-user-name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-espresso-250 rounded focus:ring-1 focus:ring-brand-terracotta focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Internal auth email */}
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wide text-espresso-600 mb-1">
                    Giriş E-postası (otomatik)
                  </label>
                  <div className="w-full px-3 py-1.5 text-xs bg-espresso-50 border border-espresso-200 rounded font-mono text-espresso-700">
                    {employeeAuthEmail(generatedId)}
                  </div>
                </div>

                {/* Password preset */}
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wide text-espresso-600 mb-1 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-espresso-400" />
                    5 Haneli Giriş Şifresi
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="12345"
                    value={newUserPassword}
                    onChange={(e) =>
                      setNewUserPassword(e.target.value.replace(/\D/g, '').slice(0, 5))
                    }
                    className="w-full px-3 py-1.5 bg-white text-xs font-mono border border-espresso-255 rounded focus:ring-1 focus:ring-brand-terracotta focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Role dropdown */}
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wide text-espresso-600 mb-1">
                    Görev / Yetki Derecesi
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as Role)}
                    className="w-full px-3 py-1.5 bg-white border border-espresso-250 rounded text-xs font-semibold focus:ring-1 focus:ring-brand-terracotta focus:outline-none cursor-pointer"
                  >
                    <option value="Barista">Barista (Sadece sayım yetkisi)</option>
                    <option value="Location Manager">Şube Müdürü (Detayları ve şubeyi görür)</option>
                    <option value="Owner">Yönetici / Sahip (Tüm şubeler & ayarlar)</option>
                  </select>
                </div>

                {/* Location Assignment selector */}
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wide text-espresso-600 mb-1">
                    Atanacağı Şubeler
                  </label>
                  <div className={`rounded-lg border border-espresso-250 bg-white p-2 space-y-1 max-h-32 overflow-y-auto ${newUserRole === 'Owner' ? 'opacity-60 pointer-events-none' : ''}`}>
                    {storeLocations.map((loc) => (
                      <label
                        key={`assign-${loc.id}`}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-espresso-50 text-xs font-semibold cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={newUserLocs.includes(loc.id)}
                          onChange={() => toggleLocation(loc.id, setNewUserLocs)}
                          className="accent-brand-terracotta"
                        />
                        {loc.name}
                      </label>
                    ))}
                  </div>
                  {newUserRole === 'Owner' && (
                    <p className="text-[10px] text-brand-terracotta font-mono mt-1">Yöneticiler otomatik olarak tüm şubelerde yetkilidir.</p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-espresso-250">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="py-2.5 px-4 rounded-lg bg-white border border-espresso-300 text-espresso-750 font-semibold text-xs hover:bg-espresso-50 cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="py-2.5 px-4 rounded-lg bg-brand-terracotta hover:bg-brand-terracotta/95 disabled:opacity-60 text-white font-bold text-xs shadow cursor-pointer"
                >
                  {saving ? t('Kaydediliyor…') : t('Hesabı Kaydet')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER - POPUP DIALOG */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-brand-charcoal/85 flex items-center justify-center p-4 z-50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-brand-cream border-2 border-espresso-800 rounded-xl max-w-2xl w-full p-5 sm:p-6 shadow-xl space-y-5 relative max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setEditingEmployee(null)}
              className="absolute top-4 right-4 p-2 text-espresso-450 hover:text-espresso-800 rounded"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-mono text-brand-terracotta bg-brand-terracotta/10 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Çalışan Profili
              </span>
              <h3 className="text-xl font-bold text-espresso-950 mt-2">
                Çalışan Bilgilerini Düzenle
              </h3>
              <p className="text-xs text-espresso-500 mt-1">
                Yetki, şube, durum ve giriş şifresi değişikliklerini buradan yönetin.
              </p>
            </div>

            {editError && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-900 rounded-lg flex items-center gap-2">
                <ShieldAlert className="w-4.5 h-4.5 text-brand-terracotta" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmEditEmployee} className="space-y-5 font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wide text-espresso-600 mb-1">
                    Çalışan ID
                  </label>
                  <div className="min-h-[44px] w-full px-3 py-2 bg-espresso-100 text-brand-terracotta rounded-lg border border-espresso-200 select-none font-mono font-bold flex items-center">
                    {editingEmployee.id}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wide text-espresso-600 mb-1">
                    Giriş E-postası
                  </label>
                  <div className="min-h-[44px] w-full px-3 py-2 bg-espresso-50 border border-espresso-200 rounded-lg font-mono text-xs text-espresso-700 flex items-center">
                    {editingEmployee.email}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wide text-espresso-600 mb-1">
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="min-h-[44px] w-full px-3 py-2 text-sm bg-white border border-espresso-250 rounded-lg focus:ring-1 focus:ring-brand-terracotta focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wide text-espresso-600 mb-1">
                    Durum
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                    className="min-h-[44px] w-full px-3 py-2 bg-white border border-espresso-250 rounded-lg text-sm font-semibold focus:ring-1 focus:ring-brand-terracotta focus:outline-none cursor-pointer"
                  >
                    <option value="Active">Aktif</option>
                    <option value="On Leave">İzinli</option>
                    <option value="Inactive">Pasif</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wide text-espresso-600 mb-1">
                    Görev / Yetki Derecesi
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as Role)}
                    className="min-h-[44px] w-full px-3 py-2 bg-white border border-espresso-250 rounded-lg text-sm font-semibold focus:ring-1 focus:ring-brand-terracotta focus:outline-none cursor-pointer"
                  >
                    <option value="Barista">Barista</option>
                    <option value="Location Manager">Şube Müdürü</option>
                    <option value="Owner">Yönetici / Sahip</option>
                  </select>
                  {editRole === 'Owner' && (
                    <p className="text-[10px] text-brand-terracotta font-mono mt-1">
                      Owner rolü tüm şubeleri ve admin panelini görür.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wide text-espresso-600 mb-1">
                    Atandığı Şubeler
                  </label>
                  <div className={`rounded-lg border border-espresso-250 bg-white p-2 space-y-1 max-h-36 overflow-y-auto ${editRole === 'Owner' ? 'opacity-60 pointer-events-none' : ''}`}>
                    {storeLocations.map((loc) => (
                      <label
                        key={`edit-assign-${loc.id}`}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-espresso-50 text-xs font-semibold cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={editLocationIds.includes(loc.id)}
                          onChange={() => toggleLocation(loc.id, setEditLocationIds)}
                          className="accent-brand-terracotta"
                        />
                        {loc.name}
                      </label>
                    ))}
                  </div>
                  {editRole === 'Owner' && (
                    <p className="text-[10px] text-brand-terracotta font-mono mt-1">
                      Owner için şube ataması “Tüm Şubeler” olarak saklanır.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wide text-espresso-600 mb-1 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-espresso-400" />
                  Yeni 5 Haneli Şifre
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="Boş bırakılırsa şifre değişmez"
                  value={editPassword}
                  onChange={(e) =>
                    setEditPassword(e.target.value.replace(/\D/g, '').slice(0, 5))
                  }
                  className="min-h-[44px] w-full px-3 py-2 bg-white text-sm font-mono border border-espresso-255 rounded-lg focus:ring-1 focus:ring-brand-terracotta focus:outline-none"
                />
                <p className="text-[10px] text-espresso-500 mt-1">
                  Şifre alanı opsiyoneldir; sadece yeni şifre vermek istiyorsanız doldurun.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-espresso-250">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="min-h-[44px] px-4 rounded-lg bg-white border border-espresso-300 text-espresso-750 font-semibold text-sm hover:bg-espresso-50 cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="min-h-[44px] px-4 rounded-lg bg-brand-terracotta hover:bg-brand-terracotta/95 disabled:opacity-60 text-white font-bold text-sm shadow cursor-pointer"
                >
                  {editSaving ? t('Güncelleniyor…') : t('Değişiklikleri Kaydet')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
