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

insert into locations (id, name, address, is_warehouse)
values ('supplier', 'Supplier', 'External supplier', true)
on conflict (id) do update
set name = excluded.name,
    address = excluded.address,
    is_warehouse = excluded.is_warehouse;

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

create table if not exists employee_locations (
  employee_id text references employees(id) on delete cascade,
  location_id text references locations(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (employee_id, location_id)
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

create table if not exists branch_requests (
  id uuid primary key default gen_random_uuid(),
  location_id text references locations(id) on delete cascade not null,
  requested_by text references employees(id) on delete set null,
  title text not null,
  description text not null,
  priority text not null default 'Normal'
    check (priority in ('Low','Normal','High','Urgent')),
  status text not null default 'Pending Approval'
    check (status in ('Pending Approval','Approved','Completed','Declined')),
  created_at timestamptz default now(),
  resolved_at timestamptz,
  resolved_by text references employees(id) on delete set null,
  resolution_note text,
  completed_at timestamptz,
  completed_by text references employees(id) on delete set null
);

create table if not exists product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists product_units (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  category text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists idx_inventory_location on inventory(location_id);
create index if not exists idx_inventory_item on inventory(item_id);
create index if not exists idx_usage_logs_location on usage_logs(location_id);
create index if not exists idx_usage_logs_timestamp on usage_logs(timestamp desc);
create index if not exists idx_branch_requests_location on branch_requests(location_id);
create index if not exists idx_branch_requests_status on branch_requests(status);
create index if not exists idx_branch_requests_created_at on branch_requests(created_at desc);
create unique index if not exists product_units_label_category_idx
  on product_units (label, coalesce(category, ''));

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
alter table employee_locations enable row level security;
alter table stock_transfers enable row level security;
alter table transfer_items enable row level security;
alter table usage_logs enable row level security;
alter table branch_requests enable row level security;
alter table product_categories enable row level security;
alter table product_units enable row level security;

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

create or replace function public.current_employee_id()
returns text
language sql stable security definer set search_path = public
as $$ select id from employees where auth_id = auth.uid() limit 1; $$;

create or replace function public.current_employee_has_location(target_location text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    public.current_employee_role() = 'Owner'
    or exists (
      select 1
      from employees e
      where e.auth_id = auth.uid()
        and e.location_id = target_location
    )
    or exists (
      select 1
      from employee_locations el
      join employees e on e.id = el.employee_id
      where e.auth_id = auth.uid()
        and el.location_id = target_location
    );
$$;

create policy "locations_read_authenticated" on locations for select to authenticated using (true);
create policy "items_read_authenticated" on items for select to authenticated using (true);

create policy "inventory_select" on inventory for select to authenticated
  using (
    public.current_employee_role() = 'Owner'
    or public.current_employee_has_location(location_id)
  );

create policy "inventory_update_owner" on inventory for update to authenticated
  using (public.current_employee_role() = 'Owner') with check (public.current_employee_role() = 'Owner');

create policy "inventory_update_manager" on inventory for update to authenticated
  using (
    public.current_employee_role() = 'Location Manager'
    and public.current_employee_has_location(location_id)
  )
  with check (
    public.current_employee_role() = 'Location Manager'
    and public.current_employee_has_location(location_id)
  );

create policy "inventory_update_barista" on inventory for update to authenticated
  using (
    public.current_employee_role() = 'Barista'
    and public.current_employee_has_location(location_id)
  )
  with check (
    public.current_employee_role() = 'Barista'
    and public.current_employee_has_location(location_id)
  );

create policy "employees_select_own" on employees for select to authenticated
  using (auth_id = auth.uid() or public.current_employee_role() = 'Owner');

create policy "employees_insert_owner" on employees for insert to authenticated
  with check (public.current_employee_role() = 'Owner');

create policy "employees_update_owner" on employees for update to authenticated
  using (public.current_employee_role() = 'Owner') with check (public.current_employee_role() = 'Owner');

create policy "employees_delete_owner" on employees for delete to authenticated
  using (public.current_employee_role() = 'Owner');

create policy "employee_locations_select" on employee_locations for select to authenticated
  using (
    public.current_employee_role() = 'Owner'
    or employee_id = public.current_employee_id()
  );

create policy "employee_locations_owner_write" on employee_locations for all to authenticated
  using (public.current_employee_role() = 'Owner')
  with check (public.current_employee_role() = 'Owner');

create policy "transfers_select" on stock_transfers for select to authenticated
  using (
    public.current_employee_role() = 'Owner'
    or public.current_employee_has_location(source_location_id)
    or public.current_employee_has_location(destination_location_id)
  );

create policy "transfers_insert" on stock_transfers for insert to authenticated
  with check (public.current_employee_role() in ('Owner', 'Location Manager', 'Barista'));

create policy "transfers_update" on stock_transfers for update to authenticated
  using (
    public.current_employee_role() = 'Owner'
    or (
      public.current_employee_role() in ('Location Manager', 'Barista')
      and public.current_employee_has_location(destination_location_id)
    )
  )
  with check (
    public.current_employee_role() = 'Owner'
    or (
      public.current_employee_role() in ('Location Manager', 'Barista')
      and public.current_employee_has_location(destination_location_id)
    )
  );

create policy "transfer_items_select" on transfer_items for select to authenticated using (true);
create policy "transfer_items_insert" on transfer_items for insert to authenticated with check (true);
create policy "transfer_items_update" on transfer_items for update to authenticated using (true);
create policy "transfer_items_delete" on transfer_items for delete to authenticated using (true);

create policy "usage_logs_select" on usage_logs for select to authenticated
  using (
    public.current_employee_role() = 'Owner'
    or public.current_employee_has_location(location_id)
  );

create policy "usage_logs_insert" on usage_logs for insert to authenticated
  with check (
    public.current_employee_role() in ('Location Manager', 'Barista')
    and public.current_employee_has_location(location_id)
  );

create policy "usage_logs_delete_branch_staff" on usage_logs for delete to authenticated
  using (
    public.current_employee_role() in ('Location Manager', 'Barista')
    and public.current_employee_has_location(location_id)
  );

create policy "branch_requests_select" on branch_requests for select to authenticated
  using (
    public.current_employee_role() = 'Owner'
    or public.current_employee_has_location(location_id)
  );

create policy "branch_requests_insert" on branch_requests for insert to authenticated
  with check (
    public.current_employee_role() in ('Location Manager', 'Barista')
    and public.current_employee_has_location(location_id)
  );

create policy "branch_requests_update_owner" on branch_requests for update to authenticated
  using (public.current_employee_role() = 'Owner')
  with check (public.current_employee_role() = 'Owner');

create policy "branch_requests_update_branch_complete" on branch_requests for update to authenticated
  using (
    public.current_employee_role() in ('Location Manager', 'Barista')
    and public.current_employee_has_location(location_id)
    and status = 'Approved'
  )
  with check (
    public.current_employee_role() in ('Location Manager', 'Barista')
    and public.current_employee_has_location(location_id)
    and status = 'Completed'
  );

create policy "product_categories_select" on product_categories for select to authenticated
  using (true);

create policy "product_categories_owner_write" on product_categories for all to authenticated
  using (public.current_employee_role() = 'Owner')
  with check (public.current_employee_role() = 'Owner');

create policy "product_units_select" on product_units for select to authenticated
  using (true);

create policy "product_units_owner_write" on product_units for all to authenticated
  using (public.current_employee_role() = 'Owner')
  with check (public.current_employee_role() = 'Owner');

insert into product_categories (name, description, sort_order)
values
  ('Coffee Beans', 'Çekirdek, blend, decaf, single origin', 10),
  ('Dairy & Alternatives', 'Süt, oat, almond, cream', 20),
  ('Syrups', 'Şurup, sauce, concentrate', 30),
  ('Disposables', 'Bardak, kapak, peçete, paket', 40),
  ('Retail', 'Raf ürünü ve satış kalemi', 50)
on conflict (name) do update
set description = excluded.description,
    sort_order = excluded.sort_order,
    active = true;

insert into product_units (label, category, sort_order)
values
  ('bags (1kg)', 'Coffee Beans', 10),
  ('bags (5lb)', 'Coffee Beans', 20),
  ('bags', 'Coffee Beans', 30),
  ('packages', 'Coffee Beans', 40),
  ('boxes', 'Coffee Beans', 50),
  ('cases', 'Coffee Beans', 60),
  ('kg', 'Coffee Beans', 70),
  ('g', 'Coffee Beans', 80),
  ('cartons (1L)', 'Dairy & Alternatives', 10),
  ('crates (16L)', 'Dairy & Alternatives', 20),
  ('bottles', 'Dairy & Alternatives', 30),
  ('gallons', 'Dairy & Alternatives', 40),
  ('boxes', 'Dairy & Alternatives', 50),
  ('cases', 'Dairy & Alternatives', 60),
  ('units', 'Dairy & Alternatives', 70),
  ('bottles (750ml)', 'Syrups', 10),
  ('bottles (1L)', 'Syrups', 20),
  ('bottles', 'Syrups', 30),
  ('boxes', 'Syrups', 40),
  ('cases', 'Syrups', 50),
  ('pumps', 'Syrups', 60),
  ('units', 'Syrups', 70),
  ('sleeves', 'Disposables', 10),
  ('boxes (100pcs)', 'Disposables', 20),
  ('boxes', 'Disposables', 30),
  ('packs', 'Disposables', 40),
  ('packages', 'Disposables', 50),
  ('cartons', 'Disposables', 60),
  ('cases', 'Disposables', 70),
  ('units', 'Disposables', 80),
  ('units', 'Retail', 10),
  ('bags', 'Retail', 20),
  ('packages', 'Retail', 30),
  ('packs', 'Retail', 40),
  ('boxes', 'Retail', 50),
  ('cartons', 'Retail', 60),
  ('cases', 'Retail', 70)
on conflict (label, (coalesce(category, ''))) do update
set sort_order = excluded.sort_order,
    active = true;
