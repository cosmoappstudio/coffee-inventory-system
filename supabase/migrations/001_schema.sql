-- Immersion Coffee inventory schema
create extension if not exists "pgcrypto";

create table if not exists locations (
  id text primary key,
  name text not null,
  address text,
  is_warehouse boolean default false
);

create table if not exists items (
  id text primary key,
  name text not null,
  category text not null,
  unit text not null
);

create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  item_id text references items(id) on delete cascade,
  location_id text references locations(id) on delete cascade,
  quantity numeric not null default 0,
  min_stock numeric not null default 0,
  unique(item_id, location_id)
);

create table if not exists employees (
  id text primary key,
  auth_id uuid references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('Owner','Location Manager','Barista')),
  location_id text references locations(id),
  status text default 'Active' check (status in ('Active','On Leave','Inactive')),
  email text unique not null
);

create table if not exists stock_transfers (
  id uuid primary key default gen_random_uuid(),
  source_location_id text references locations(id),
  destination_location_id text references locations(id),
  status text default 'Pending Approval'
    check (status in ('Pending Approval','Approved - Awaiting Fulfillment','Approved & Completed','Declined')),
  notes text,
  created_by text references employees(id),
  approved_by text references employees(id),
  created_at timestamptz default now(),
  approved_at timestamptz
);

create table if not exists transfer_items (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid references stock_transfers(id) on delete cascade,
  item_id text references items(id),
  quantity numeric not null
);

create table if not exists usage_logs (
  id uuid primary key default gen_random_uuid(),
  location_id text references locations(id),
  item_id text references items(id),
  quantity_used numeric not null,
  logged_by text references employees(id),
  timestamp timestamptz default now()
);

create index if not exists idx_inventory_location on inventory(location_id);
create index if not exists idx_inventory_item on inventory(item_id);
create index if not exists idx_usage_logs_location on usage_logs(location_id);
create index if not exists idx_usage_logs_timestamp on usage_logs(timestamp desc);

alter publication supabase_realtime add table inventory;
