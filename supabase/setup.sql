-- ═══════════════════════════════════════════════════════════════
-- Immersion Coffee — TEK SEFERDE KURULUM
-- Supabase Dashboard → SQL Editor → New query → yapıştır → Run
-- ═══════════════════════════════════════════════════════════════
-- Ayrı dosyalar: migrations/001_schema.sql + migrations/002_rls.sql

-- ─── 001 SCHEMA ───
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

-- Realtime: hata verirse Database → Replication → inventory tablosunu elle açın
do $$
begin
  alter publication supabase_realtime add table inventory;
exception
  when duplicate_object then null;
end $$;

-- ─── 002 RLS ───
alter table locations enable row level security;
alter table items enable row level security;
alter table inventory enable row level security;
alter table employees enable row level security;
alter table stock_transfers enable row level security;
alter table transfer_items enable row level security;
alter table usage_logs enable row level security;

create or replace function public.current_employee()
returns employees
language sql stable security definer set search_path = public
as $$ select e.* from employees e where e.auth_id = auth.uid() limit 1; $$;

create or replace function public.current_employee_role()
returns text
language sql stable security definer set search_path = public
as $$ select role from employees where auth_id = auth.uid() limit 1; $$;

create or replace function public.current_employee_location()
returns text
language sql stable security definer set search_path = public
as $$ select location_id from employees where auth_id = auth.uid() limit 1; $$;

create policy "locations_read_authenticated" on locations for select to authenticated using (true);
create policy "items_read_authenticated" on items for select to authenticated using (true);

create policy "inventory_select" on inventory for select to authenticated
  using (public.current_employee_role() = 'Owner' or location_id = public.current_employee_location() or public.current_employee_location() is null);

create policy "inventory_update_owner" on inventory for update to authenticated
  using (public.current_employee_role() = 'Owner') with check (public.current_employee_role() = 'Owner');

create policy "inventory_update_manager" on inventory for update to authenticated
  using (public.current_employee_role() = 'Location Manager' and location_id = public.current_employee_location())
  with check (public.current_employee_role() = 'Location Manager' and location_id = public.current_employee_location());

create policy "inventory_update_barista" on inventory for update to authenticated
  using (public.current_employee_role() = 'Barista' and location_id = public.current_employee_location())
  with check (public.current_employee_role() = 'Barista' and location_id = public.current_employee_location());

create policy "employees_select_own" on employees for select to authenticated
  using (auth_id = auth.uid() or public.current_employee_role() = 'Owner');

create policy "employees_insert_owner" on employees for insert to authenticated
  with check (public.current_employee_role() = 'Owner');

create policy "employees_update_owner" on employees for update to authenticated
  using (public.current_employee_role() = 'Owner') with check (public.current_employee_role() = 'Owner');

create policy "employees_delete_owner" on employees for delete to authenticated
  using (public.current_employee_role() = 'Owner');

create policy "transfers_select" on stock_transfers for select to authenticated
  using (public.current_employee_role() = 'Owner' or source_location_id = public.current_employee_location() or destination_location_id = public.current_employee_location());

create policy "transfers_insert" on stock_transfers for insert to authenticated
  with check (public.current_employee_role() in ('Location Manager', 'Barista'));

create policy "transfers_update" on stock_transfers for update to authenticated
  using (
    public.current_employee_role() = 'Owner'
    or (
      public.current_employee_role() in ('Location Manager', 'Barista')
      and source_location_id = public.current_employee_location()
    )
  )
  with check (
    public.current_employee_role() = 'Owner'
    or (
      public.current_employee_role() in ('Location Manager', 'Barista')
      and source_location_id = public.current_employee_location()
    )
  );

create policy "transfer_items_select" on transfer_items for select to authenticated using (true);
create policy "transfer_items_insert" on transfer_items for insert to authenticated with check (true);
create policy "transfer_items_update" on transfer_items for update to authenticated using (true);
create policy "transfer_items_delete" on transfer_items for delete to authenticated using (true);

create policy "usage_logs_select" on usage_logs for select to authenticated
  using (public.current_employee_role() = 'Owner' or location_id = public.current_employee_location());

create policy "usage_logs_insert" on usage_logs for insert to authenticated
  with check (public.current_employee_role() in ('Location Manager', 'Barista') and location_id = public.current_employee_location());

create policy "usage_logs_delete_branch_staff" on usage_logs for delete to authenticated
  using (public.current_employee_role() in ('Location Manager', 'Barista') and location_id = public.current_employee_location());
