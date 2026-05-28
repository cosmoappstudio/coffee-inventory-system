import { Location, InventoryItem, Employee, StockTransfer, UsageLog } from './types';

export const INITIAL_LOCATIONS: Location[] = [
  { id: 'warehouse', name: 'Central Warehouse', address: '1220 Imperial Ave, San Diego, CA', isWarehouse: true },
  { id: 'dt', name: 'Downtown (Gaslamp)', address: '501 J St, San Diego, CA' },
  { id: 'np', name: 'North Park', address: '3000 Upas St, San Diego, CA' },
  { id: 'ob', name: 'Ocean Beach', address: '4900 Newport Ave, San Diego, CA' },
  { id: 'lj', name: 'La Jolla Cove', address: '1100 Prospect St, San Diego, CA' },
  { id: 'li', name: 'Little Italy', address: '1600 Kettner Blvd, San Diego, CA' }
];

export const INITIAL_ITEMS: InventoryItem[] = [
  {
    id: 'item-ethiopia',
    name: 'Ethiopia Yirgacheffe Beans (SO)',
    category: 'Coffee Beans',
    unit: 'bags (1kg)',
    quantities: {
      warehouse: 120,
      dt: 12,
      np: 4, // LOW STOCK
      ob: 15,
      lj: 3, // LOW STOCK
      li: 18
    },
    minStock: {
      warehouse: 30,
      dt: 8,
      np: 8,
      ob: 8,
      lj: 8,
      li: 8
    }
  },
  {
    id: 'item-espresso-blend',
    name: 'Immersion House Espresso Blend',
    category: 'Coffee Beans',
    unit: 'bags (1kg)',
    quantities: {
      warehouse: 250,
      dt: 24,
      np: 32,
      ob: 18,
      lj: 22,
      li: 6 // LOW STOCK!
    },
    minStock: {
      warehouse: 50,
      dt: 15,
      np: 15,
      ob: 15,
      lj: 15,
      li: 15
    }
  },
  {
    id: 'item-decaf',
    name: 'Colombia Sugarcane Decaf Beans',
    category: 'Coffee Beans',
    unit: 'bags (1kg)',
    quantities: {
      warehouse: 45,
      dt: 5,
      np: 6,
      ob: 2, // LOW STOCK
      lj: 4,
      li: 5
    },
    minStock: {
      warehouse: 10,
      dt: 3,
      np: 3,
      ob: 3,
      lj: 3,
      li: 3
    }
  },
  {
    id: 'item-oatmilk',
    name: 'Oatly Barista Edition Oat Milk',
    category: 'Dairy & Alternatives',
    unit: 'cartons (1L)',
    quantities: {
      warehouse: 480,
      dt: 72,
      np: 12, // LOW STOCK
      ob: 60,
      lj: 48,
      li: 84
    },
    minStock: {
      warehouse: 100,
      dt: 24,
      np: 24,
      ob: 24,
      lj: 24,
      li: 24
    }
  },
  {
    id: 'item-wholemilk',
    name: 'Organic Whole Milk (Clover Sonoma)',
    category: 'Dairy & Alternatives',
    unit: 'crates (16L)',
    quantities: {
      warehouse: 80,
      dt: 14,
      np: 11,
      ob: 5, // LOW STOCK
      lj: 12,
      li: 15
    },
    minStock: {
      warehouse: 20,
      dt: 8,
      np: 8,
      ob: 8,
      lj: 8,
      li: 8
    }
  },
  {
    id: 'item-almondmilk',
    name: 'Califia Farms Barista Almond Milk',
    category: 'Dairy & Alternatives',
    unit: 'cartons (1L)',
    quantities: {
      warehouse: 180,
      dt: 28,
      np: 30,
      ob: 18,
      lj: 6, // LOW STOCK
      li: 24
    },
    minStock: {
      warehouse: 40,
      dt: 12,
      np: 12,
      ob: 12,
      lj: 12,
      li: 12
    }
  },
  {
    id: 'item-vanilla',
    name: 'Immersion House Vanilla Syrup',
    category: 'Syrups',
    unit: 'bottles (750ml)',
    quantities: {
      warehouse: 60,
      dt: 8,
      np: 11,
      ob: 6,
      lj: 2, // LOW STOCK
      li: 9
    },
    minStock: {
      warehouse: 12,
      dt: 4,
      np: 4,
      ob: 4,
      lj: 4,
      li: 4
    }
  },
  {
    id: 'item-caramel',
    name: 'Artisanal Salted Caramel Sauce',
    category: 'Syrups',
    unit: 'bottles (1L)',
    quantities: {
      warehouse: 40,
      dt: 3, // LOW STOCK
      np: 6,
      ob: 5,
      lj: 4,
      li: 8
    },
    minStock: {
      warehouse: 10,
      dt: 4,
      np: 4,
      ob: 4,
      lj: 4,
      li: 4
    }
  },
  {
    id: 'item-cups12',
    name: 'Immersion Hot Cups Double-Wall 12oz',
    category: 'Disposables',
    unit: 'sleeves (50pcs)',
    quantities: {
      warehouse: 200,
      dt: 18,
      np: 22,
      ob: 14,
      lj: 24,
      li: 30
    },
    minStock: {
      warehouse: 50,
      dt: 10,
      np: 10,
      ob: 10,
      lj: 10,
      li: 10
    }
  },
  {
    id: 'item-cups16',
    name: 'Immersion Hot Cups Double-Wall 16oz',
    category: 'Disposables',
    unit: 'sleeves (50pcs)',
    quantities: {
      warehouse: 180,
      dt: 8, // LOW STOCK
      np: 15,
      ob: 12,
      lj: 14,
      li: 22
    },
    minStock: {
      warehouse: 50,
      dt: 10,
      np: 10,
      ob: 10,
      lj: 10,
      li: 10
    }
  },
  {
    id: 'item-lids-hot',
    name: 'Compostable Fiber Lids (Fits 12/16oz)',
    category: 'Disposables',
    unit: 'boxes (1000pcs)',
    quantities: {
      warehouse: 30,
      dt: 3,
      np: 1, // LOW STOCK
      ob: 4,
      lj: 3,
      li: 5
    },
    minStock: {
      warehouse: 8,
      dt: 2,
      np: 2,
      ob: 2,
      lj: 2,
      li: 2
    }
  },
  {
    id: 'item-pastry-boxes',
    name: 'Kraft Pastry Handout Boxes',
    category: 'Disposables',
    unit: 'packs (250pcs)',
    quantities: {
      warehouse: 25,
      dt: 2,
      np: 4,
      ob: 1, // LOW STOCK
      lj: 3,
      li: 3
    },
    minStock: {
      warehouse: 5,
      dt: 2,
      np: 2,
      ob: 2,
      lj: 2,
      li: 2
    }
  }
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'IMM-8012',
    name: 'Evelyn Carter',
    role: 'Owner',
    locationId: 'all',
    status: 'Active',
    email: 'evelyn@immersioncoffee.com',
    lastActive: 'Active now'
  },
  {
    id: 'IMM-3401',
    name: 'Mateo Rodriguez',
    role: 'Location Manager',
    locationId: 'np',
    status: 'Active',
    email: 'mateo.np@immersioncoffee.com',
    lastActive: '2 hours ago'
  },
  {
    id: 'IMM-2292',
    name: 'Sarah Chen',
    role: 'Location Manager',
    locationId: 'dt',
    status: 'Active',
    email: 'sarah.dt@immersioncoffee.com',
    lastActive: '34 mins ago'
  },
  {
    id: 'IMM-4039',
    name: 'Marcus Brody',
    role: 'Barista',
    locationId: 'np',
    status: 'Active',
    email: 'marcus.b@immersioncoffee.com',
    lastActive: 'Active now'
  },
  {
    id: 'IMM-5110',
    name: 'Clara Jenkins',
    role: 'Barista',
    locationId: 'dt',
    status: 'Active',
    email: 'clara.j@immersioncoffee.com',
    lastActive: '3 days ago'
  },
  {
    id: 'IMM-6912',
    name: 'Diego Lopez',
    role: 'Barista',
    locationId: 'ob',
    status: 'Active',
    email: 'diego.l@immersioncoffee.com',
    lastActive: '12 hours ago'
  },
  {
    id: 'IMM-7751',
    name: 'Elena Rostova',
    role: 'Barista',
    locationId: 'lj',
    status: 'On Leave',
    email: 'elena.r@immersioncoffee.com',
    lastActive: '2 weeks ago'
  }
];

export const INITIAL_TRANSFERS: StockTransfer[] = [
  {
    id: 'TRSF-4402',
    sourceLocationId: 'warehouse',
    destinationLocationId: 'np',
    status: 'Pending Approval',
    createdAt: '2026-05-25T03:40:00Z',
    items: [
      { itemId: 'item-ethiopia', quantity: 15 },
      { itemId: 'item-oatmilk', quantity: 36 },
      { itemId: 'item-lids-hot', quantity: 2 }
    ],
    notes: 'Urgent low stock replenishment for North Park morning shift.'
  },
  {
    id: 'TRSF-4389',
    sourceLocationId: 'warehouse',
    destinationLocationId: 'dt',
    status: 'Approved & Completed',
    createdAt: '2026-05-24T18:15:00Z',
    approvedAt: '2026-05-24T19:30:00Z',
    approvedBy: 'Sarah Chen',
    items: [
      { itemId: 'item-espresso-blend', quantity: 20 },
      { itemId: 'item-cups16', quantity: 10 }
    ],
    notes: 'Weekly baseline delivery.'
  },
  {
    id: 'TRSF-4390',
    sourceLocationId: 'li',
    destinationLocationId: 'dt',
    status: 'Declined',
    createdAt: '2026-05-24T10:00:00Z',
    items: [
      { itemId: 'item-vanilla', quantity: 2 }
    ],
    notes: 'Borrowing vanilla syrup. Canceled because Little Italy is running low too.'
  }
];

export const INITIAL_USAGE_LOGS: UsageLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-05-25T05:12:00Z',
    locationId: 'np',
    itemId: 'item-ethiopia',
    quantityUsed: 2,
    loggedBy: 'Marcus Brody'
  },
  {
    id: 'log-2',
    timestamp: '2026-05-25T04:45:00Z',
    locationId: 'np',
    itemId: 'item-oatmilk',
    quantityUsed: 6,
    loggedBy: 'Marcus Brody'
  },
  {
    id: 'log-3',
    timestamp: '2026-05-25T04:02:00Z',
    locationId: 'dt',
    itemId: 'item-wholemilk',
    quantityUsed: 4,
    loggedBy: 'Clara Jenkins'
  }
];
