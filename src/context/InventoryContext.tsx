import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { useI18n } from './I18nContext';
import { useToast } from './ToastContext';
import {
  createEmployeeViaApi,
  createBranchRequest,
  completeBranchRequest,
  createLocationViaApi,
  createProductCategory,
  createProductViaApi,
  createProductUnit,
  createTransferRecord,
  deleteProductCategory,
  deleteLocationViaApi,
  deleteProductViaApi,
  deleteProductUnit,
  deleteEmployee,
  deleteUsageLog,
  fetchEmployees,
  fetchBranchRequests,
  fetchItemsBundle,
  fetchLocations,
  fetchProductCategories,
  fetchProductUnits,
  fetchTransfers,
  fetchUsageLogs,
  getAccessToken,
  getConfigError,
  insertUsageLog,
  type LocationPayload,
  type BranchRequestPayload,
  type ProductPayload,
  type ProductCategoryPayload,
  type ProductUnitPayload,
  type UpdateEmployeePayload,
  updateEmployeeStatus,
  updateBranchRequestStatus,
  updateEmployeeViaApi,
  updateInventoryQuantity,
  updateLocationViaApi,
  updateProductViaApi,
  updateTransferStatusViaApi,
} from '../lib/inventoryService';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type {
  Employee,
  BranchRequest,
  BranchRequestStatus,
  InventoryItem,
  Location,
  ProductCategory,
  ProductUnit,
  StockTransfer,
  TransferStatus,
  UsageLog,
  UserStatus,
} from '../types';

type InventoryContextValue = {
  loading: boolean;
  error: string | null;
  locations: Location[];
  items: InventoryItem[];
  employees: Employee[];
  transfers: StockTransfer[];
  branchRequests: BranchRequest[];
  productCategories: ProductCategory[];
  productUnits: ProductUnit[];
  usageLogs: UsageLog[];
  refresh: () => Promise<void>;
  logUsage: (itemId: string, quantity: number, locationId: string) => Promise<void>;
  undoUsage: (logId: string) => Promise<void>;
  modifyProductQuantity: (
    itemId: string,
    locationId: string,
    newTotal: number
  ) => Promise<void>;
  createTransfer: (
    draft: Omit<StockTransfer, 'id' | 'createdAt' | 'status'>
  ) => Promise<void>;
  updateTransferStatus: (
    transferId: string,
    status: Extract<
      TransferStatus,
      'Approved - Awaiting Fulfillment' | 'Approved & Completed' | 'Declined'
    >,
    updaterName: string
  ) => Promise<void>;
  createRequest: (payload: BranchRequestPayload) => Promise<void>;
  updateRequestStatus: (
    requestId: string,
    status: BranchRequestStatus,
    resolutionNote?: string
  ) => Promise<void>;
  completeRequest: (requestId: string) => Promise<void>;
  addEmployee: (employee: Employee, password: string) => Promise<void>;
  updateEmployee: (
    employeeId: string,
    payload: UpdateEmployeePayload
  ) => Promise<void>;
  removeEmployee: (employeeId: string) => Promise<void>;
  setEmployeeStatus: (employeeId: string, status: UserStatus) => Promise<void>;
  createProduct: (product: ProductPayload) => Promise<void>;
  updateProduct: (
    itemId: string,
    product: Omit<ProductPayload, 'id'>
  ) => Promise<void>;
  deleteProduct: (itemId: string) => Promise<void>;
  addProductCategory: (category: ProductCategoryPayload) => Promise<void>;
  removeProductCategory: (categoryId: string) => Promise<void>;
  addProductUnit: (unit: ProductUnitPayload) => Promise<void>;
  removeProductUnit: (unitId: string) => Promise<void>;
  createLocation: (location: LocationPayload) => Promise<void>;
  updateLocation: (
    locationId: string,
    location: Omit<LocationPayload, 'id'>
  ) => Promise<void>;
  deleteLocation: (locationId: string) => Promise<void>;
};

const InventoryContext = createContext<InventoryContextValue | undefined>(
  undefined
);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const { employee: currentUser } = useAuth();
  const { t } = useI18n();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [branchRequests, setBranchRequests] = useState<BranchRequest[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [productUnits, setProductUnits] = useState<ProductUnit[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);

  const loadAll = useCallback(async () => {
    const configError = getConfigError();
    if (configError) {
      setError(configError);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [
        locData,
        itemData,
        empData,
        transferData,
        requestData,
        categoryData,
        unitData,
      ] = await Promise.all([
        fetchLocations(),
        fetchItemsBundle(),
        fetchEmployees(),
        fetchTransfers(),
        fetchBranchRequests(),
        fetchProductCategories(),
        fetchProductUnits(),
      ]);

      const nameMap = new Map(empData.map((e) => [e.id, e.name]));
      const logData = await fetchUsageLogs(nameMap);

      setLocations(locData);
      setItems(itemData);
      setEmployees(empData);
      setTransfers(transferData);
      setBranchRequests(requestData);
      setProductCategories(categoryData);
      setProductUnits(unitData);
      setUsageLogs(logData);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('Veriler yüklenemedi.');
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [showError, t]);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    loadAll();
  }, [currentUser, loadAll]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !currentUser) {
      return;
    }

    const channel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory' },
        () => {
          fetchItemsBundle()
            .then(setItems)
            .catch(() => undefined);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const logUsage = useCallback(
    async (itemId: string, quantity: number, locationId: string) => {
      if (!currentUser) return;
      try {
        const item = items.find((i) => i.id === itemId);
        const prevQty = item?.quantities[locationId] ?? 0;
        const newQty = Math.max(0, prevQty - quantity);

        await updateInventoryQuantity(itemId, locationId, newQty);
        await insertUsageLog({
          locationId,
          itemId,
          quantityUsed: quantity,
          loggedByEmployeeId: currentUser.id,
        });

        await loadAll();
        showSuccess(t('Kullanım kaydedildi.'));
      } catch (err) {
        showError(err instanceof Error ? err.message : t('Kayıt başarısız.'));
      }
    },
    [currentUser, items, loadAll, showError, showSuccess, t]
  );

  const undoUsage = useCallback(
    async (logId: string) => {
      const targetLog = usageLogs.find((l) => l.id === logId);
      if (!targetLog) return;

      try {
        const item = items.find((i) => i.id === targetLog.itemId);
        const prevQty = item?.quantities[targetLog.locationId] ?? 0;
        await updateInventoryQuantity(
          targetLog.itemId,
          targetLog.locationId,
          prevQty + targetLog.quantityUsed
        );
        await deleteUsageLog(logId);
        await loadAll();
        showSuccess(t('Kayıt geri alındı.'));
      } catch (err) {
        showError(err instanceof Error ? err.message : t('Geri alma başarısız.'));
      }
    },
    [items, loadAll, showError, showSuccess, t, usageLogs]
  );

  const modifyProductQuantity = useCallback(
    async (itemId: string, locationId: string, newTotal: number) => {
      try {
        await updateInventoryQuantity(itemId, locationId, newTotal);
        await loadAll();
        showSuccess(t('Stok güncellendi.'));
      } catch (err) {
        showError(err instanceof Error ? err.message : t('Güncelleme başarısız.'));
      }
    },
    [loadAll, showError, showSuccess, t]
  );

  const createTransfer = useCallback(
    async (draft: Omit<StockTransfer, 'id' | 'createdAt' | 'status'>) => {
      if (!currentUser) return;
      try {
        await createTransferRecord({
          sourceLocationId: draft.sourceLocationId,
          destinationLocationId: draft.destinationLocationId,
          items: draft.items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
          })),
          notes: draft.notes,
          createdByEmployeeId: currentUser.id,
          status:
            currentUser.role === 'Owner'
              ? 'Approved - Awaiting Fulfillment'
              : 'Pending Approval',
        });
        await loadAll();
        showSuccess(
          currentUser.role === 'Owner'
            ? t('Gönderim hedef şubeye bildirildi.')
            : t('Transfer talebi oluşturuldu.')
        );
      } catch (err) {
        showError(err instanceof Error ? err.message : t('Transfer oluşturulamadı.'));
      }
    },
    [currentUser, loadAll, showError, showSuccess, t]
  );

  const handleUpdateTransferStatus = useCallback(
    async (
      transferId: string,
      status: Extract<
        TransferStatus,
        'Approved - Awaiting Fulfillment' | 'Approved & Completed' | 'Declined'
      >,
      updaterName: string
    ) => {
      if (!currentUser) return;
      const token = await getAccessToken();
      if (!token) {
        showError(t('Oturum bulunamadı.'));
        return;
      }

      try {
        await updateTransferStatusViaApi(transferId, status, token);
        await loadAll();
        showSuccess(
          status === 'Approved & Completed'
            ? `${t('Transfer tamamlandı')} (${updaterName}).`
            : status === 'Approved - Awaiting Fulfillment'
              ? `${t('Transfer yönetici tarafından onaylandı')} (${updaterName}).`
              : t('Transfer reddedildi.')
        );
      } catch (err) {
        showError(err instanceof Error ? err.message : t('Transfer güncellenemedi.'));
      }
    },
    [currentUser, loadAll, showError, showSuccess, t]
  );

  const createRequest = useCallback(
    async (payload: BranchRequestPayload) => {
      try {
        await createBranchRequest(payload);
        await loadAll();
        showSuccess(t('Talep yönetime gönderildi.'));
      } catch (err) {
        showError(err instanceof Error ? err.message : t('Talep oluşturulamadı.'));
      }
    },
    [loadAll, showError, showSuccess, t]
  );

  const updateRequestStatus = useCallback(
    async (
      requestId: string,
      status: BranchRequestStatus,
      resolutionNote?: string
    ) => {
      if (!currentUser) return;
      try {
        await updateBranchRequestStatus(
          requestId,
          status,
          currentUser.id,
          resolutionNote
        );
        await loadAll();
        showSuccess(
          status === 'Approved'
            ? t('Talep onaylandı.')
            : t('Talep reddedildi.')
        );
      } catch (err) {
        showError(err instanceof Error ? err.message : t('Talep güncellenemedi.'));
      }
    },
    [currentUser, loadAll, showError, showSuccess, t]
  );

  const completeRequest = useCallback(
    async (requestId: string) => {
      if (!currentUser) return;
      try {
        await completeBranchRequest(requestId, currentUser.id);
        await loadAll();
        showSuccess(t('Talep gerçekleşti olarak işaretlendi.'));
      } catch (err) {
        showError(
          err instanceof Error ? err.message : t('Talep gerçekleştirilemedi.')
        );
      }
    },
    [currentUser, loadAll, showError, showSuccess, t]
  );

  const addEmployee = useCallback(
    async (newStaff: Employee, password: string) => {
      const token = await getAccessToken();
      if (!token) {
        showError(t('Oturum bulunamadı.'));
        return;
      }
      try {
        const created = await createEmployeeViaApi(
          {
            id: newStaff.id,
            name: newStaff.name,
            role: newStaff.role,
            locationId:
              newStaff.role === 'Owner'
                ? 'dt'
                : newStaff.locationId === 'all'
                  ? 'dt'
                  : newStaff.locationId,
            locationIds:
              newStaff.role === 'Owner'
                ? []
                : newStaff.locationIds?.length
                  ? newStaff.locationIds
                  : [newStaff.locationId],
            password,
          },
          token
        );
        setEmployees((prev) => [created, ...prev]);
        showSuccess(`${created.name} ${t('eklendi.')}`);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t('Çalışan eklenemedi.');
        showError(message);
        throw new Error(message);
      }
    },
    [showError, showSuccess, t]
  );

  const removeEmployee = useCallback(
    async (empId: string) => {
      try {
        await deleteEmployee(empId);
        setEmployees((prev) => prev.filter((e) => e.id !== empId));
        showSuccess(t('Çalışan silindi.'));
      } catch (err) {
        showError(err instanceof Error ? err.message : t('Silme başarısız.'));
      }
    },
    [showError, showSuccess, t]
  );

  const updateEmployee = useCallback(
    async (employeeId: string, payload: UpdateEmployeePayload) => {
      const token = await getAccessToken();
      if (!token) {
        showError(t('Oturum bulunamadı.'));
        return;
      }

      try {
        const updated = await updateEmployeeViaApi(employeeId, payload, token);
        setEmployees((prev) =>
          prev.map((employee) => (employee.id === employeeId ? updated : employee))
        );
        showSuccess(t('Çalışan bilgileri güncellendi.'));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t('Çalışan güncellenemedi.');
        showError(message);
        throw new Error(message);
      }
    },
    [showError, showSuccess, t]
  );

  const setEmployeeStatus = useCallback(
    async (empId: string, status: UserStatus) => {
      try {
        await updateEmployeeStatus(empId, status);
        setEmployees((prev) =>
          prev.map((e) => (e.id === empId ? { ...e, status } : e))
        );
        showSuccess(t('Durum güncellendi.'));
      } catch (err) {
        showError(err instanceof Error ? err.message : t('Durum güncellenemedi.'));
      }
    },
    [showError, showSuccess, t]
  );

  const createProduct = useCallback(
    async (product: ProductPayload) => {
      const token = await getAccessToken();
      if (!token) {
        showError(t('Oturum bulunamadı.'));
        return;
      }

      try {
        await createProductViaApi(product, token);
        await loadAll();
        showSuccess(`${product.name} ${t('eklendi.')}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('Ürün eklenemedi.');
        showError(message);
        throw new Error(message);
      }
    },
    [loadAll, showError, showSuccess, t]
  );

  const updateProduct = useCallback(
    async (itemId: string, product: Omit<ProductPayload, 'id'>) => {
      const token = await getAccessToken();
      if (!token) {
        showError(t('Oturum bulunamadı.'));
        return;
      }

      try {
        await updateProductViaApi(itemId, product, token);
        await loadAll();
        showSuccess(t('Ürün güncellendi.'));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t('Ürün güncellenemedi.');
        showError(message);
        throw new Error(message);
      }
    },
    [loadAll, showError, showSuccess, t]
  );

  const deleteProduct = useCallback(
    async (itemId: string) => {
      const token = await getAccessToken();
      if (!token) {
        showError(t('Oturum bulunamadı.'));
        return;
      }

      try {
        await deleteProductViaApi(itemId, token);
        await loadAll();
        showSuccess(t('Ürün silindi.'));
      } catch (err) {
        const message = err instanceof Error ? err.message : t('Ürün silinemedi.');
        showError(message);
        throw new Error(message);
      }
    },
    [loadAll, showError, showSuccess, t]
  );

  const addProductCategory = useCallback(
    async (category: ProductCategoryPayload) => {
      try {
        await createProductCategory(category);
        await loadAll();
        showSuccess(t('Kategori eklendi.'));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t('Kategori eklenemedi.');
        showError(message);
        throw new Error(message);
      }
    },
    [loadAll, showError, showSuccess, t]
  );

  const removeProductCategory = useCallback(
    async (categoryId: string) => {
      try {
        await deleteProductCategory(categoryId);
        await loadAll();
        showSuccess(t('Kategori silindi.'));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t('Kategori silinemedi.');
        showError(message);
        throw new Error(message);
      }
    },
    [loadAll, showError, showSuccess, t]
  );

  const addProductUnit = useCallback(
    async (unit: ProductUnitPayload) => {
      try {
        await createProductUnit(unit);
        await loadAll();
        showSuccess(t('Birim eklendi.'));
      } catch (err) {
        const message = err instanceof Error ? err.message : t('Birim eklenemedi.');
        showError(message);
        throw new Error(message);
      }
    },
    [loadAll, showError, showSuccess, t]
  );

  const removeProductUnit = useCallback(
    async (unitId: string) => {
      try {
        await deleteProductUnit(unitId);
        await loadAll();
        showSuccess(t('Birim silindi.'));
      } catch (err) {
        const message = err instanceof Error ? err.message : t('Birim silinemedi.');
        showError(message);
        throw new Error(message);
      }
    },
    [loadAll, showError, showSuccess, t]
  );

  const createLocation = useCallback(
    async (location: LocationPayload) => {
      const token = await getAccessToken();
      if (!token) {
        showError(t('Oturum bulunamadı.'));
        return;
      }

      try {
        await createLocationViaApi(location, token);
        await loadAll();
        showSuccess(`${location.name} ${t('eklendi.')}`);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t('Lokasyon eklenemedi.');
        showError(message);
        throw new Error(message);
      }
    },
    [loadAll, showError, showSuccess, t]
  );

  const updateLocation = useCallback(
    async (locationId: string, location: Omit<LocationPayload, 'id'>) => {
      const token = await getAccessToken();
      if (!token) {
        showError(t('Oturum bulunamadı.'));
        return;
      }

      try {
        await updateLocationViaApi(locationId, location, token);
        await loadAll();
        showSuccess(t('Lokasyon güncellendi.'));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t('Lokasyon güncellenemedi.');
        showError(message);
        throw new Error(message);
      }
    },
    [loadAll, showError, showSuccess, t]
  );

  const deleteLocation = useCallback(
    async (locationId: string) => {
      const token = await getAccessToken();
      if (!token) {
        showError(t('Oturum bulunamadı.'));
        return;
      }

      try {
        await deleteLocationViaApi(locationId, token);
        await loadAll();
        showSuccess(t('Lokasyon silindi.'));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t('Lokasyon silinemedi.');
        showError(message);
        throw new Error(message);
      }
    },
    [loadAll, showError, showSuccess, t]
  );

  const value = useMemo(
    () => ({
      loading,
      error,
      locations,
      items,
      employees,
      transfers,
      branchRequests,
      productCategories,
      productUnits,
      usageLogs,
      refresh: loadAll,
      logUsage,
      undoUsage,
      modifyProductQuantity,
      createTransfer,
      updateTransferStatus: handleUpdateTransferStatus,
      createRequest,
      updateRequestStatus,
      completeRequest,
      addEmployee,
      updateEmployee,
      removeEmployee,
      setEmployeeStatus,
      createProduct,
      updateProduct,
      deleteProduct,
      addProductCategory,
      removeProductCategory,
      addProductUnit,
      removeProductUnit,
      createLocation,
      updateLocation,
      deleteLocation,
    }),
    [
      loading,
      error,
      locations,
      items,
      employees,
      transfers,
      branchRequests,
      productCategories,
      productUnits,
      usageLogs,
      loadAll,
      logUsage,
      undoUsage,
      modifyProductQuantity,
      createTransfer,
      handleUpdateTransferStatus,
      createRequest,
      updateRequestStatus,
      completeRequest,
      addEmployee,
      updateEmployee,
      removeEmployee,
      setEmployeeStatus,
      createProduct,
      updateProduct,
      deleteProduct,
      addProductCategory,
      removeProductCategory,
      addProductUnit,
      removeProductUnit,
      createLocation,
      updateLocation,
      deleteLocation,
    ]
  );

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory(): InventoryContextValue {
  const ctx = useContext(InventoryContext);
  if (!ctx) {
    throw new Error('useInventory must be used within InventoryProvider');
  }
  return ctx;
}
