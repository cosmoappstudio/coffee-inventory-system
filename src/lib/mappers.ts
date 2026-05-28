import type {
  Employee,
  InventoryItem,
  ItemCategory,
  Location,
  StockTransfer,
  TransferItem,
  UsageLog,
} from '../types';

export type DbLocation = {
  id: string;
  name: string;
  address: string | null;
  is_warehouse: boolean | null;
};

export type DbItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
};

export type DbInventory = {
  id: string;
  item_id: string;
  location_id: string;
  quantity: number;
  min_stock: number;
};

export type DbEmployee = {
  id: string;
  auth_id: string | null;
  name: string;
  role: Employee['role'];
  location_id: string | null;
  status: Employee['status'];
  email: string;
};

export type DbTransferItem = {
  item_id: string;
  quantity: number;
};

export type DbStockTransfer = {
  id: string;
  source_location_id: string;
  destination_location_id: string;
  status: StockTransfer['status'];
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  created_at: string;
  approved_at: string | null;
  transfer_items?: DbTransferItem[];
};

export type DbUsageLog = {
  id: string;
  location_id: string;
  item_id: string;
  quantity_used: number;
  logged_by: string | null;
  timestamp: string;
};

export function mapLocation(row: DbLocation): Location {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? '',
    isWarehouse: row.is_warehouse ?? false,
  };
}

export function mapEmployee(row: DbEmployee): Employee {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    locationId: row.location_id ?? 'all',
    status: row.status,
    email: row.email,
  };
}

export function buildInventoryItems(
  items: DbItem[],
  inventory: DbInventory[]
): InventoryItem[] {
  return items.map((item) => {
    const quantities: Record<string, number> = {};
    const minStock: Record<string, number> = {};
    for (const row of inventory.filter((i) => i.item_id === item.id)) {
      quantities[row.location_id] = Number(row.quantity);
      minStock[row.location_id] = Number(row.min_stock);
    }
    return {
      id: item.id,
      name: item.name,
      category: item.category as ItemCategory,
      unit: item.unit,
      quantities,
      minStock,
    };
  });
}

export function mapStockTransfer(row: DbStockTransfer): StockTransfer {
  const items: TransferItem[] = (row.transfer_items ?? []).map((ti) => ({
    itemId: ti.item_id,
    quantity: Number(ti.quantity),
  }));

  return {
    id: row.id,
    sourceLocationId: row.source_location_id,
    destinationLocationId: row.destination_location_id,
    items,
    status: row.status,
    createdAt: row.created_at,
    approvedAt: row.approved_at ?? undefined,
    approvedBy: row.approved_by ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export function mapUsageLog(
  row: DbUsageLog,
  employeeNameById: Map<string, string>
): UsageLog {
  const loggedBy =
    row.logged_by && employeeNameById.has(row.logged_by)
      ? employeeNameById.get(row.logged_by)!
      : row.logged_by ?? 'Unknown';

  return {
    id: row.id,
    timestamp: row.timestamp,
    locationId: row.location_id,
    itemId: row.item_id,
    quantityUsed: Number(row.quantity_used),
    loggedBy,
  };
}
