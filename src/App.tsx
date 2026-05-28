import React, { useState, useEffect } from 'react';
import { Location, InventoryItem, Employee, StockTransfer, UsageLog, UserStatus } from './types';
import { 
  INITIAL_LOCATIONS, 
  INITIAL_ITEMS, 
  INITIAL_EMPLOYEES, 
  INITIAL_TRANSFERS, 
  INITIAL_USAGE_LOGS 
} from './data';
import BaristaShiftView from './components/BaristaShiftView';
import AdminStockTransfer from './components/AdminStockTransfer';
import OwnerOverviewDashboard from './components/OwnerOverviewDashboard';
import UserManagementScreen from './components/UserManagementScreen';
import { useI18n } from './context/I18nContext';
import { 
  Coffee, 
  Users, 
  ArrowRightLeft, 
  LayoutDashboard, 
  Sparkles, 
  ShieldAlert, 
  Lock, 
  UserCheck, 
  Info,
  Smartphone,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  BookOpen
} from 'lucide-react';

export default function App() {
  const { t } = useI18n();
  // Load or seed initial values into LocalStorage state
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('immersion_employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [items, setItems] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('immersion_items');
    return saved ? JSON.parse(saved) : INITIAL_ITEMS;
  });

  const [transfers, setTransfers] = useState<StockTransfer[]>(() => {
    const saved = localStorage.getItem('immersion_transfers');
    return saved ? JSON.parse(saved) : INITIAL_TRANSFERS;
  });

  const [usageLogs, setUsageLogs] = useState<UsageLog[]>(() => {
    const saved = localStorage.getItem('immersion_usage_logs');
    return saved ? JSON.parse(saved) : INITIAL_USAGE_LOGS;
  });

  // Simulator Control States
  const [activeEmployeeId, setActiveEmployeeId] = useState<string>('IMM-8012'); // Defaults to Owner Evelyn
  const [activeTab, setActiveTab] = useState<string>('dashboard'); // 'dashboard', 'transfer', 'users', 'barista'
  
  // Location designated for barista shift workspace simulator (Owner can select store, Managers are locked to their own)
  const [simulatedLocationId, setSimulatedLocationId] = useState<string>('np');

  // Persistence side-effects
  useEffect(() => {
    localStorage.setItem('immersion_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('immersion_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('immersion_transfers', JSON.stringify(transfers));
  }, [transfers]);

  useEffect(() => {
    localStorage.setItem('immersion_usage_logs', JSON.stringify(usageLogs));
  }, [usageLogs]);

  // Current logged in simulator user context
  const currentUser = employees.find(e => e.id === activeEmployeeId) || employees[0];

  // Force tab switches or presets based on simulated user shift change
  useEffect(() => {
    if (currentUser.role === 'Barista') {
      setActiveTab('barista');
      setSimulatedLocationId(currentUser.locationId);
    } else if (currentUser.role === 'Location Manager') {
      setActiveTab('barista');
      setSimulatedLocationId(currentUser.locationId);
    } else {
      // Owner default overview
      setActiveTab('dashboard');
    }
  }, [activeEmployeeId, currentUser]);

  // RESET SYSTEM DATABASE DEMO ACTION
  const handleResetDatabase = () => {
    if (window.confirm(t('Tüm sistemi sıfırlayarak varsayılan başlangıç verilerine döndürmek istiyor musunuz? Tüm özel kayıtlar silinecektir.'))) {
      setEmployees(INITIAL_EMPLOYEES);
      setItems(INITIAL_ITEMS);
      setTransfers(INITIAL_TRANSFERS);
      setUsageLogs(INITIAL_USAGE_LOGS);
      setActiveEmployeeId('IMM-8012');
      setActiveTab('dashboard');
      setSimulatedLocationId('np');
    }
  };

  // BARISTA ACTION: LOG USAGE
  const handleLogUsage = (itemId: string, quantity: number) => {
    // 1. Deduct from store inventory quantities
    setItems(prevItems => {
      return prevItems.map(item => {
        if (item.id === itemId) {
          const prevQty = item.quantities[simulatedLocationId] ?? 0;
          return {
            ...item,
            quantities: {
              ...item.quantities,
              [simulatedLocationId]: Math.max(0, prevQty - quantity)
            }
          };
        }
        return item;
      });
    });

    // 2. Append usage log
    const index = usageLogs.length + 1;
    const newLog: UsageLog = {
      id: `log-${Date.now()}-${index}`,
      timestamp: new Date().toISOString(),
      locationId: simulatedLocationId,
      itemId,
      quantityUsed: quantity,
      loggedBy: currentUser.name
    };

    setUsageLogs(prevLogs => [newLog, ...prevLogs]);
  };

  // BARISTA ACTION: UNDO SHIFT ACTIVITY LOG
  const handleUndoUsage = (logId: string) => {
    const targetLog = usageLogs.find(l => l.id === logId);
    if (!targetLog) return;

    // 1. Restore item quantity in inventory balances
    setItems(prevItems => {
      return prevItems.map(item => {
        if (item.id === targetLog.itemId) {
          const prevQty = item.quantities[targetLog.locationId] ?? 0;
          return {
            ...item,
            quantities: {
              ...item.quantities,
              [targetLog.locationId]: prevQty + targetLog.quantityUsed
            }
          };
        }
        return item;
      });
    });

    // 2. Erase the log row
    setUsageLogs(prevLogs => prevLogs.filter(l => l.id !== logId));
  };

  // ADMIN ACTION: PROCESS OR INIT STOCK SHIPMENT TRANSFER
  const handleCreateTransfer = (draft: Omit<StockTransfer, 'id' | 'createdAt' | 'status'>) => {
    const nextIdNum = Math.floor(1000 + Math.random() * 9000);
    const newTransfer: StockTransfer = {
      ...draft,
      id: `TRSF-${nextIdNum}`,
      status: 'Pending Approval',
      createdAt: new Date().toISOString()
    };

    setTransfers(prev => [newTransfer, ...prev]);
  };

  // MANAGER/ADMIN ACTION: UPDATE STOCK TRANSFER (Approve triggers stock movement balance deduction/addition)
  const handleUpdateTransferStatus = (
    transferId: string, 
    newStatus: 'Approved & Completed' | 'Declined', 
    updaterName: string
  ) => {
    const targetTransfer = transfers.find(t => t.id === transferId);
    if (!targetTransfer) return;

    if (newStatus === 'Approved & Completed') {
      // Subtract from source, add to destination
      setItems(prevItems => {
        return prevItems.map(item => {
          const matchItem = targetTransfer.items.find(ti => ti.itemId === item.id);
          if (matchItem) {
            const srcQty = item.quantities[targetTransfer.sourceLocationId] ?? 0;
            const destQty = item.quantities[targetTransfer.destinationLocationId] ?? 0;
            return {
              ...item,
              quantities: {
                ...item.quantities,
                [targetTransfer.sourceLocationId]: Math.max(0, srcQty - matchItem.quantity),
                [targetTransfer.destinationLocationId]: destQty + matchItem.quantity
              }
            };
          }
          return item;
        });
      });
    }

    setTransfers(prevTransfers => {
      return prevTransfers.map(t => {
        if (t.id === transferId) {
          return {
            ...t,
            status: newStatus,
            approvedAt: new Date().toISOString(),
            approvedBy: updaterName
          };
        }
        return t;
      });
    });
  };

  // OWNER PANEL: ADD NEW PERSONNEL account
  const handleAddEmployee = (newStaff: Employee) => {
    setEmployees(prev => [newStaff, ...prev]);
  };

  // OWNER PANEL: TERMINATE EMPlOYEE ACCESS
  const handleRemoveEmployee = (empId: string) => {
    if (window.confirm(t('Bu çalışanın tüm yetkilerini iptal edip hesabı tamamen silmek istediğinize emin misiniz?'))) {
      setEmployees(prev => prev.filter(e => e.id !== empId));
    }
  };

  // OWNER PANEL: UPDATE ACCESS STATUS TOGGLE
  const handleUpdateEmployeeStatus = (empId: string, newStatus: UserStatus) => {
    setEmployees(prev => prev.map(e => e.id === empId ? { ...e, status: newStatus } : e));
  };

  // OWNER ACTION: OVERRIDE INVENTORY VIA QUICK AUDIT
  const handleModifyProductQuantity = (itemId: string, locationId: string, newTotal: number) => {
    setItems(prevItems => {
      return prevItems.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            quantities: {
              ...item.quantities,
              [locationId]: newTotal
            }
          };
        }
        return item;
      });
    });
  };

  // Total active alerts globally matching across stores
  const globalAlertTotal = items.reduce((acc, currentItem) => {
    let subAlerts = 0;
    Object.keys(currentItem.quantities).forEach(locId => {
      if (locId !== 'warehouse') {
        const stock = currentItem.quantities[locId] ?? 0;
        const limit = currentItem.minStock[locId] ?? 0;
        if (stock <= limit) subAlerts++;
      }
    });
    return acc + subAlerts;
  }, 0);

  // Filter locations list for select inputs
  const locationsObjList = INITIAL_LOCATIONS;

  const currentStoreLocation = INITIAL_LOCATIONS.find(l => l.id === simulatedLocationId) || INITIAL_LOCATIONS[1];

  return (
    <div className="min-h-screen bg-brand-cream text-espresso-950 font-sans antialiased selection:bg-brand-amber/30 selection:text-espresso-955 flex flex-col">
      {/* UNIFIED PREMIUM COMPACT HEADER */}
      <header className="bg-espresso-950 text-espresso-100 border-b border-brand-amber/15 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          
          {/* Logo Brand & Persona Selector Dropdown */}
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="flex items-center gap-2">
              <div className="bg-brand-amber text-espresso-950 p-2 rounded-lg font-bold w-9 h-9 flex items-center justify-center">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold tracking-wider text-brand-darkcream font-sans uppercase">
                  IMMERSION SPECIALTY LOGISTICS
                </span>
                <span className="ml-2 bg-brand-terracotta text-white text-[9px] font-sans leading-none py-0.5 px-1.5 rounded uppercase font-bold">
                  Demo
                </span>
              </div>
            </div>

            {/* Quick Simulation Login Selector dropdown */}
            <div className="flex items-center gap-2 border-l border-espresso-800 pl-4 py-1">
              <span className="text-[10.5px] text-espresso-400 font-mono font-bold uppercase tracking-wider">HIZLI GİRİŞ:</span>
              <select
                value={activeEmployeeId}
                onChange={(e) => setActiveEmployeeId(e.target.value)}
                className="bg-espresso-900 hover:bg-espresso-850 text-brand-cream border border-espresso-750 px-2 py-1 rounded text-xs font-bold leading-tight focus:outline-none focus:ring-1 focus:ring-brand-amber cursor-pointer transition-colors"
                title="Simülatör için çalışan kimliğini seçin"
              >
                {employees.map((emp) => (
                  <option key={`opt-persona-${emp.id}`} value={emp.id}>
                    {emp.name} ({emp.role === 'Owner' ? 'Yönetici' : emp.role === 'Location Manager' ? 'Müdür' : 'Barista'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Secure Interactive Tabs & Dynamic Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {currentUser.role !== 'Barista' ? (
              <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
                {/* Executive overview allowed for OWNER only */}
                {currentUser.role === 'Owner' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                      activeTab === 'dashboard'
                        ? 'bg-brand-amber text-espresso-950'
                        : 'text-espresso-300 hover:text-white hover:bg-espresso-900'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Genel Durum Paneli
                  </button>
                )}

                {/* Transfers Logs page allowed for Owner + Location Managers */}
                <button
                  type="button"
                  onClick={() => setActiveTab('transfer')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                    activeTab === 'transfer'
                      ? 'bg-brand-amber text-espresso-950'
                      : 'text-espresso-300 hover:text-white hover:bg-espresso-900'
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Stok Transferi
                </button>

                {/* Staff Control limited for Owner only */}
                {currentUser.role === 'Owner' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('users')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                      activeTab === 'users'
                        ? 'bg-brand-amber text-espresso-950'
                        : 'text-espresso-300 hover:text-white hover:bg-espresso-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Çalışan Yönetimi
                  </button>
                )}

                {/* Barista shift console mock view */}
                <button
                  type="button"
                  onClick={() => setActiveTab('barista')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                    activeTab === 'barista'
                      ? 'bg-brand-amber text-espresso-950'
                      : 'text-espresso-300 hover:text-white hover:bg-espresso-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Barista Ekranı
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-950 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-900 max-w-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[11px] font-bold font-mono uppercase tracking-wider">AKTİF BARİSTA OTURUMU</span>
              </div>
            )}

            {/* Owner only store context override for testing barista shifts inside header */}
            {currentUser.role === 'Owner' && activeTab === 'barista' && (
              <div className="flex items-center gap-1.5 bg-espresso-905 border border-espresso-750 px-2 py-1.5 rounded-lg text-xs">
                <span className="font-mono text-espresso-400 uppercase font-bold text-[10px]">ŞUBE SEÇ:</span>
                <select
                  value={simulatedLocationId}
                  onChange={(e) => setSimulatedLocationId(e.target.value)}
                  className="bg-transparent text-brand-cream font-bold text-xs inline-block focus:outline-none cursor-pointer"
                >
                  {locationsObjList.filter(l => !l.isWarehouse).map(loc => (
                    <option key={`barista-sim-${loc.id}`} value={loc.id} className="text-espresso-950 font-sans">
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Clean, simple system reset inside action strip */}
            <button
              onClick={handleResetDatabase}
              title="Tüm verileri ilk haline sıfırlar"
              className="px-2.5 py-2 hover:bg-rose-950/25 text-rose-300 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Sıfırla
            </button>
          </div>
        </div>
      </header>

      {/* CORE FRAMEWORK WORKSPACE CONTAINER */}
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-grow flex flex-col justify-start space-y-5">
        
        {/* ACTION DRIVEN STATUS INDICATORS AND ALERTS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="text-xs text-espresso-600 bg-white/20 px-3 py-1.5 rounded-lg border border-espresso-200 shadow-3xs flex items-center gap-2 flex-wrap">
            <span>Mevcut Kullanıcı:</span>
            <strong className="text-espresso-950 font-bold">{currentUser.name}</strong>
            <span className="text-espresso-300">|</span>
            <span>Yetki Rolü:</span>
            <span className="font-bold text-brand-terracotta uppercase tracking-wider text-[10px]">
              {currentUser.role === 'Owner' 
                ? 'Sistem Sahibi (Yönetici)' 
                : currentUser.role === 'Location Manager' 
                ? `${currentStoreLocation.name} Müdürü`
                : `${currentStoreLocation.name} Baristası`}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {globalAlertTotal > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (currentUser.role === 'Owner') {
                    setActiveTab('dashboard');
                  }
                }}
                className="bg-amber-50 hover:bg-amber-100 border border-brand-amber/30 text-amber-950 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition-colors cursor-pointer select-none"
              >
                <AlertTriangle className="w-4 h-4 text-brand-amber shrink-0 animate-bounce" />
                <span>Kritik Stok: {globalAlertTotal} Ürün Kapandı</span>
              </button>
            )}

            <div className="bg-espresso-50 border border-espresso-200 text-espresso-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium select-none">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Sistem Aktif</span>
            </div>
          </div>
        </div>

        {/* ACTIVE CONTAINER OUTLET SWITCHBOARD */}
        <div className="min-h-[500px]">
          {activeTab === 'dashboard' && currentUser.role === 'Owner' && (
            <OwnerOverviewDashboard
              locations={locationsObjList}
              items={items}
              usageLogs={usageLogs}
              currentUser={currentUser}
              onModifyProductQuantity={handleModifyProductQuantity}
            />
          )}

          {activeTab === 'transfer' && currentUser.role !== 'Barista' && (
            <AdminStockTransfer
              locations={locationsObjList}
              items={items}
              transfers={transfers}
              currentUser={currentUser}
              onCreateTransfer={handleCreateTransfer}
              onUpdateTransferStatus={handleUpdateTransferStatus}
            />
          )}

          {activeTab === 'users' && currentUser.role === 'Owner' && (
            <UserManagementScreen
              employees={employees}
              locations={locationsObjList}
              onAddEmployee={handleAddEmployee}
              onRemoveEmployee={handleRemoveEmployee}
              onUpdateStatus={handleUpdateEmployeeStatus}
            />
          )}

          {(activeTab === 'barista' || currentUser.role === 'Barista') && (
            <BaristaShiftView
              location={currentStoreLocation}
              currentUser={currentUser}
              items={items}
              usageLogs={usageLogs}
              onLogUsage={handleLogUsage}
              onUndoUsage={handleUndoUsage}
            />
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="mt-auto bg-brand-charcoal text-espresso-400 py-6 px-4 border-t border-espresso-900 text-xs font-mono text-center">
        <div className="max-w-7xl mx-auto space-y-1.5">
          <p className="text-brand-darkcream">&copy; 2026 Immersion Coffee Specialty Logistics &bull; San Diego, CA</p>
          <p className="opacity-75">Dokunmatik tablet iş istasyonları ve yönetici masaüstü tarayıcıları için optimize edilmiştir.</p>
        </div>
      </footer>
    </div>
  );
}
