import type {
  Employee,
  BranchRequest,
  InventoryItem,
  ItemCategory,
  Location,
  ProductCategory,
  ProductUnit,
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
  employee_locations?: { location_id: string }[];
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

export type DbProductCategory = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number | null;
  active: boolean | null;
};

export type DbProductUnit = {
  id: string;
  label: string;
  category: string | null;
  sort_order: number | null;
  active: boolean | null;
};

export type DbBranchRequest = {
  id: string;
  location_id: string;
  requested_by: string | null;
  title: string;
  description: string;
  priority: BranchRequest['priority'];
  status: BranchRequest['status'];
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  completed_at: string | null;
  completed_by: string | null;
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
  const assignedLocationIds = (row.employee_locations ?? []).map(
    (assignment) => assignment.location_id
  );
  const locationId = row.location_id ?? assignedLocationIds[0] ?? 'all';

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    locationId,
    locationIds:
      row.role === 'Owner'
        ? ['all']
        : Array.from(new Set([locationId, ...assignedLocationIds])),
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

export function mapProductCategory(row: DbProductCategory): ProductCategory {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    sortOrder: row.sort_order ?? 0,
    active: row.active ?? true,
  };
}

export function mapProductUnit(row: DbProductUnit): ProductUnit {
  return {
    id: row.id,
    label: row.label,
    category: row.category ?? undefined,
    sortOrder: row.sort_order ?? 0,
    active: row.active ?? true,
  };
}

export function mapBranchRequest(row: DbBranchRequest): BranchRequest {
  return {
    id: row.id,
    locationId: row.location_id,
    requestedBy: row.requested_by ?? '',
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
    resolvedBy: row.resolved_by ?? undefined,
    resolutionNote: row.resolution_note ?? undefined,
    completedAt: row.completed_at ?? undefined,
    completedBy: row.completed_by ?? undefined,
  };
}
