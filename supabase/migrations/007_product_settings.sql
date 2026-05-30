-- Product catalog settings managed from the admin panel.

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

create unique index if not exists product_units_label_category_idx
  on product_units (label, coalesce(category, ''));

alter table product_categories enable row level security;
alter table product_units enable row level security;

drop policy if exists "product_categories_select" on product_categories;
create policy "product_categories_select"
  on product_categories for select to authenticated
  using (true);

drop policy if exists "product_categories_owner_write" on product_categories;
create policy "product_categories_owner_write"
  on product_categories for all to authenticated
  using (public.current_employee_role() = 'Owner')
  with check (public.current_employee_role() = 'Owner');

drop policy if exists "product_units_select" on product_units;
create policy "product_units_select"
  on product_units for select to authenticated
  using (true);

drop policy if exists "product_units_owner_write" on product_units;
create policy "product_units_owner_write"
  on product_units for all to authenticated
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
