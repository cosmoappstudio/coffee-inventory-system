export type Role = 'Owner' | 'Location Manager' | 'Barista';
export type UserStatus = 'Active' | 'On Leave' | 'Inactive';
export type TransferStatus =
  | 'Pending Approval'
  | 'Approved - Awaiting Fulfillment'
  | 'Approved & Completed'
  | 'Declined';
export type ItemCategory = 'Coffee Beans' | 'Dairy & Alternatives' | 'Syrups' | 'Disposables' | 'Retail';

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
