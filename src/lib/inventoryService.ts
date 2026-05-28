import { employeeAuthEmail, isSupabaseConfigured, supabase } from './supabase';
import {
  buildInventoryItems,
  mapEmployee,
  mapLocation,
  mapStockTransfer,
  mapUsageLog,
  type DbEmployee,
  type DbInventory,
  type DbItem,
  type DbStockTransfer,
  type DbUsageLog,
} from './mappers';
import type {
  Employee,
  InventoryItem,
  ItemCategory,
  Location,
  StockTransfer,
  TransferStatus,
  UsageLog,
  UserStatus,
} from '../types';

export async function fetchLocations(): Promise<Location[]> {
  const { data, error } = await supabase.from('locations').select('*').order('name');
  if (error) throw error;
  return (data ?? []).map(mapLocation);
}

export async function fetchItemsBundle(): Promise<InventoryItem[]> {
  const [{ data: items, error: itemsError }, { data: inventory, error: invError }] =
    await Promise.all([
      supabase.from('items').select('*'),
      supabase.from('inventory').select('*'),
    ]);
  if (itemsError) throw itemsError;
  if (invError) throw invError;
  return buildInventoryItems(
    (items ?? []) as DbItem[],
    (inventory ?? []) as DbInventory[]
  );
}

export async function fetchEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase.from('employees').select('*').order('name');
  if (error) throw error;
  return ((data ?? []) as DbEmployee[]).map(mapEmployee);
}

export async function fetchTransfers(): Promise<StockTransfer[]> {
  const { data, error } = await supabase
    .from('stock_transfers')
    .select('*, transfer_items(item_id, quantity)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as DbStockTransfer[]).map(mapStockTransfer);
}

export async function fetchUsageLogs(
  employeeNameById: Map<string, string>
): Promise<UsageLog[]> {
  const { data, error } = await supabase
    .from('usage_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(500);
  if (error) throw error;
  return ((data ?? []) as DbUsageLog[]).map((row) =>
    mapUsageLog(row, employeeNameById)
  );
}

export async function updateInventoryQuantity(
  itemId: string,
  locationId: string,
  quantity: number
): Promise<void> {
  const { error } = await supabase
    .from('inventory')
    .update({ quantity })
    .eq('item_id', itemId)
    .eq('location_id', locationId);
  if (error) throw error;
}

export async function insertUsageLog(params: {
  locationId: string;
  itemId: string;
  quantityUsed: number;
  loggedByEmployeeId: string;
}): Promise<void> {
  const { error } = await supabase.from('usage_logs').insert({
    location_id: params.locationId,
    item_id: params.itemId,
    quantity_used: params.quantityUsed,
    logged_by: params.loggedByEmployeeId,
  });
  if (error) throw error;
}

export async function deleteUsageLog(logId: string): Promise<void> {
  const { error } = await supabase.from('usage_logs').delete().eq('id', logId);
  if (error) throw error;
}

export async function createTransferRecord(params: {
  sourceLocationId: string;
  destinationLocationId: string;
  items: { itemId: string; quantity: number }[];
  notes?: string;
  createdByEmployeeId: string;
}): Promise<void> {
  const { data: transfer, error: transferError } = await supabase
    .from('stock_transfers')
    .insert({
      source_location_id: params.sourceLocationId,
      destination_location_id: params.destinationLocationId,
      status: 'Pending Approval',
      notes: params.notes ?? null,
      created_by: params.createdByEmployeeId,
    })
    .select('id')
    .single();

  if (transferError) throw transferError;

  const rows = params.items.map((item) => ({
    transfer_id: transfer.id,
    item_id: item.itemId,
    quantity: item.quantity,
  }));

  const { error: itemsError } = await supabase.from('transfer_items').insert(rows);
  if (itemsError) throw itemsError;
}

export async function updateTransferStatus(params: {
  transferId: string;
  status: Extract<
    TransferStatus,
    'Approved - Awaiting Fulfillment' | 'Approved & Completed' | 'Declined'
  >;
  approvedByEmployeeId: string;
  items: { itemId: string; quantity: number }[];
  sourceLocationId: string;
  destinationLocationId: string;
}): Promise<void> {
  if (params.status === 'Approved & Completed') {
    for (const line of params.items) {
      const { data: sourceRow, error: sourceReadError } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('item_id', line.itemId)
        .eq('location_id', params.sourceLocationId)
        .single();
      if (sourceReadError) throw sourceReadError;

      const { data: destRow, error: destReadError } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('item_id', line.itemId)
        .eq('location_id', params.destinationLocationId)
        .single();
      if (destReadError) throw destReadError;

      const newSource = Math.max(0, Number(sourceRow.quantity) - line.quantity);
      const newDest = Number(destRow.quantity) + line.quantity;

      const { error: sourceUpdateError } = await supabase
        .from('inventory')
        .update({ quantity: newSource })
        .eq('item_id', line.itemId)
        .eq('location_id', params.sourceLocationId);
      if (sourceUpdateError) throw sourceUpdateError;

      const { error: destUpdateError } = await supabase
        .from('inventory')
        .update({ quantity: newDest })
        .eq('item_id', line.itemId)
        .eq('location_id', params.destinationLocationId);
      if (destUpdateError) throw destUpdateError;
    }
  }

  const { error } = await supabase
    .from('stock_transfers')
    .update({
      status: params.status,
      approved_by: params.approvedByEmployeeId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', params.transferId);
  if (error) throw error;
}

export async function updateTransferStatusViaApi(
  transferId: string,
  status: Extract<
    TransferStatus,
    'Approved - Awaiting Fulfillment' | 'Approved & Completed' | 'Declined'
  >,
  accessToken: string
): Promise<void> {
  const response = await fetch(
    `/api/transfers/${encodeURIComponent(transferId)}/status`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ status }),
    }
  );

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? 'Transfer güncellenemedi.');
  }
}

export async function updateEmployeeStatus(
  employeeId: string,
  status: UserStatus
): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .update({ status })
    .eq('id', employeeId);
  if (error) throw error;
}

export async function deleteEmployee(employeeId: string): Promise<void> {
  const { error } = await supabase.from('employees').delete().eq('id', employeeId);
  if (error) throw error;
}

export type CreateEmployeePayload = {
  id: string;
  name: string;
  role: Employee['role'];
  locationId: string;
  password: string;
};

export type UpdateEmployeePayload = {
  name: string;
  role: Employee['role'];
  locationId: string;
  status: Employee['status'];
  password?: string;
};

export async function createEmployeeViaApi(
  payload: CreateEmployeePayload,
  accessToken: string
): Promise<Employee> {
  const response = await fetch('/api/employees', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? 'Çalışan oluşturulamadı.');
  }
  return body.employee as Employee;
}

export async function updateEmployeeViaApi(
  employeeId: string,
  payload: UpdateEmployeePayload,
  accessToken: string
): Promise<Employee> {
  const response = await fetch(`/api/employees/${encodeURIComponent(employeeId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? 'Çalışan güncellenemedi.');
  }
  return body.employee as Employee;
}

export type ProductPayload = {
  id: string;
  name: string;
  category: ItemCategory;
  unit: string;
  minStock: number;
  inventory?: Record<string, { quantity: number; minStock: number }>;
};

async function productApiRequest(
  path: string,
  method: 'POST' | 'PUT' | 'DELETE',
  accessToken: string,
  body?: unknown
): Promise<void> {
  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error ?? 'Ürün işlemi başarısız.');
  }
}

export async function createProductViaApi(
  payload: ProductPayload,
  accessToken: string
): Promise<void> {
  await productApiRequest('/api/items', 'POST', accessToken, payload);
}

export async function updateProductViaApi(
  itemId: string,
  payload: Omit<ProductPayload, 'id'>,
  accessToken: string
): Promise<void> {
  await productApiRequest(
    `/api/items/${encodeURIComponent(itemId)}`,
    'PUT',
    accessToken,
    payload
  );
}

export async function deleteProductViaApi(
  itemId: string,
  accessToken: string
): Promise<void> {
  await productApiRequest(
    `/api/items/${encodeURIComponent(itemId)}`,
    'DELETE',
    accessToken
  );
}

export type LocationPayload = {
  id: string;
  name: string;
  address: string;
  isWarehouse: boolean;
};

async function locationApiRequest(
  path: string,
  method: 'POST' | 'PUT' | 'DELETE',
  accessToken: string,
  body?: unknown
): Promise<void> {
  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error ?? 'Lokasyon işlemi başarısız.');
  }
}

export async function createLocationViaApi(
  payload: LocationPayload,
  accessToken: string
): Promise<void> {
  await locationApiRequest('/api/locations', 'POST', accessToken, payload);
}

export async function updateLocationViaApi(
  locationId: string,
  payload: Omit<LocationPayload, 'id'>,
  accessToken: string
): Promise<void> {
  await locationApiRequest(
    `/api/locations/${encodeURIComponent(locationId)}`,
    'PUT',
    accessToken,
    payload
  );
}

export async function deleteLocationViaApi(
  locationId: string,
  accessToken: string
): Promise<void> {
  await locationApiRequest(
    `/api/locations/${encodeURIComponent(locationId)}`,
    'DELETE',
    accessToken
  );
}

export function getConfigError(): string | null {
  if (!isSupabaseConfigured()) {
    return 'Supabase yapılandırması eksik. .env dosyasına VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ekleyin.';
  }
  return null;
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export { isSupabaseConfigured, employeeAuthEmail };
