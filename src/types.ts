export type Role = 'Owner' | 'Location Manager' | 'Barista';
export type UserStatus = 'Active' | 'On Leave' | 'Inactive';
export type TransferStatus =
  | 'Pending Approval'
  | 'Approved - Awaiting Fulfillment'
  | 'Approved & Completed'
  | 'Declined';
export type BranchRequestStatus =
  | 'Pending Approval'
  | 'Approved'
  | 'Completed'
  | 'Declined';
export type BranchRequestPriority = 'Low' | 'Normal' | 'High' | 'Urgent';
export type ItemCategory = string;

export interface Location {
  id: string; // e.g. 'dt', 'np', 'ob', 'lj', 'li', 'warehouse'
  name: string;
  address: string;
  isWarehouse?: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  unit: string; // 'kg', 'carton', 'bottle', 'box (100pcs)'
  quantities: Record<string, number>; // locationId -> current stock level
  minStock: Record<string, number>; // locationId -> low stock warning threshold
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  active: boolean;
}

export interface ProductUnit {
  id: string;
  label: string;
  category?: string;
  sortOrder: number;
  active: boolean;
}

export interface TransferItem {
  itemId: string;
  quantity: number;
}

export interface StockTransfer {
  id: string;
  sourceLocationId: string;
  destinationLocationId: string;
  items: TransferItem[];
  status: TransferStatus;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  notes?: string;
}

export interface Employee {
  id: string; // e.g. 'IMM-1034'
  name: string;
  role: Role;
  locationId: string; // 'all' for Owner, or specific Location ID
  locationIds?: string[];
  status: UserStatus;
  email: string;
  lastActive?: string;
}

export interface UsageLog {
  id: string;
  timestamp: string;
  locationId: string;
  itemId: string;
  quantityUsed: number;
  loggedBy: string;
}

export interface BranchRequest {
  id: string;
  locationId: string;
  requestedBy: string;
  title: string;
  description: string;
  priority: BranchRequestPriority;
  status: BranchRequestStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
  completedAt?: string;
  completedBy?: string;
}
