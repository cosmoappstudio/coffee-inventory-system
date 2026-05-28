/**
 * Seeds Supabase with INITIAL_* data from data.ts and creates auth users.
 *
 * Requires in .env or .env.local:
 *   VITE_SUPABASE_URL (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: npm run seed
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  INITIAL_EMPLOYEES,
  INITIAL_ITEMS,
  INITIAL_LOCATIONS,
  INITIAL_TRANSFERS,
  INITIAL_USAGE_LOGS,
} from '../src/data.ts';

dotenv.config();
dotenv.config({ path: '.env.local' });

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? '80125';

if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function employeeAuthEmail(employeeId: string): string {
  return `${employeeId.trim().toLowerCase()}@immersion.internal`;
}

async function clearTables() {
  await admin.from('usage_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await admin.from('transfer_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await admin.from('stock_transfers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await admin.from('inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await admin.from('employees').delete().neq('id', '');
  await admin.from('items').delete().neq('id', '');
  await admin.from('locations').delete().neq('id', '');
}

async function seedLocations() {
  const rows = INITIAL_LOCATIONS.map((l) => ({
    id: l.id,
    name: l.name,
    address: l.address,
    is_warehouse: l.isWarehouse ?? false,
  }));
  const { error } = await admin.from('locations').upsert(rows);
  if (error) throw error;
}

async function seedItemsAndInventory() {
  for (const item of INITIAL_ITEMS) {
    const { error: itemError } = await admin.from('items').upsert({
      id: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit,
    });
    if (itemError) throw itemError;

    const inventoryRows = Object.keys(item.quantities).map((locationId) => ({
      item_id: item.id,
      location_id: locationId,
      quantity: item.quantities[locationId] ?? 0,
      min_stock: item.minStock[locationId] ?? 0,
    }));

    const { error: invError } = await admin.from('inventory').upsert(inventoryRows, {
      onConflict: 'item_id,location_id',
    });
    if (invError) throw invError;
  }
}

async function seedEmployees() {
  const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existingAuthUsers = listData?.users ?? [];

  for (const emp of INITIAL_EMPLOYEES) {
    const email = employeeAuthEmail(emp.id);
    const existing = existingAuthUsers.find((u) => u.email === email);

    let authId = existing?.id;
    if (!authId) {
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
      });
      if (error) throw error;
      authId = created.user.id;
      console.log(`Created auth user ${email} (password: ${DEFAULT_PASSWORD})`);
    }

    const { error: empError } = await admin.from('employees').upsert({
      id: emp.id,
      auth_id: authId,
      name: emp.name,
      role: emp.role,
      location_id: emp.locationId === 'all' ? null : emp.locationId,
      status: emp.status,
      email,
    });
    if (empError) throw empError;
  }
}

async function seedTransfers() {
  for (const transfer of INITIAL_TRANSFERS) {
    const { data: row, error } = await admin
      .from('stock_transfers')
      .insert({
        source_location_id: transfer.sourceLocationId,
        destination_location_id: transfer.destinationLocationId,
        status: transfer.status,
        notes: transfer.notes ?? null,
        created_at: transfer.createdAt,
        approved_at: transfer.approvedAt ?? null,
        approved_by: null,
      })
      .select('id')
      .single();
    if (error) throw error;

    const lines = transfer.items.map((item) => ({
      transfer_id: row.id,
      item_id: item.itemId,
      quantity: item.quantity,
    }));
    const { error: lineError } = await admin.from('transfer_items').insert(lines);
    if (lineError) throw lineError;
  }
}

async function seedUsageLogs() {
  const nameToId = new Map(INITIAL_EMPLOYEES.map((e) => [e.name, e.id]));

  for (const log of INITIAL_USAGE_LOGS) {
    const loggedBy =
      INITIAL_EMPLOYEES.find((e) => e.name === log.loggedBy)?.id ??
      nameToId.get(log.loggedBy) ??
      null;

    const { error } = await admin.from('usage_logs').insert({
      location_id: log.locationId,
      item_id: log.itemId,
      quantity_used: log.quantityUsed,
      logged_by: loggedBy,
      timestamp: log.timestamp,
    });
    if (error) throw error;
  }
}

async function main() {
  console.log('Clearing tables…');
  await clearTables();

  console.log('Seeding locations…');
  await seedLocations();

  console.log('Seeding items + inventory…');
  await seedItemsAndInventory();

  console.log('Seeding employees + auth…');
  await seedEmployees();

  console.log('Seeding transfers…');
  await seedTransfers();

  console.log('Seeding usage logs…');
  await seedUsageLogs();

  console.log('Done. Default login password for all seeded users:', DEFAULT_PASSWORD);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
