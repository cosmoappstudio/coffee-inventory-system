alter table locations enable row level security;
alter table items enable row level security;
alter table inventory enable row level security;
alter table employees enable row level security;
alter table stock_transfers enable row level security;
alter table transfer_items enable row level security;
alter table usage_logs enable row level security;

create or replace function public.current_employee()
returns employees
language sql
stable
security definer
set search_path = public
as $$
  select e.* from employees e where e.auth_id = auth.uid() limit 1;
$$;

create or replace function public.current_employee_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from employees where auth_id = auth.uid() limit 1;
$$;

create or replace function public.current_employee_location()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select location_id from employees where auth_id = auth.uid() limit 1;
$$;

-- locations
create policy "locations_read_authenticated"
  on locations for select to authenticated using (true);

-- items
create policy "items_read_authenticated"
  on items for select to authenticated using (true);

-- inventory
create policy "inventory_select"
  on inventory for select to authenticated
  using (
    public.current_employee_role() = 'Owner'
    or location_id = public.current_employee_location()
    or public.current_employee_location() is null
  );

create policy "inventory_update_owner"
  on inventory for update to authenticated
  using (public.current_employee_role() = 'Owner')
  with check (public.current_employee_role() = 'Owner');

create policy "inventory_update_manager"
  on inventory for update to authenticated
  using (
    public.current_employee_role() = 'Location Manager'
    and location_id = public.current_employee_location()
  )
  with check (
    public.current_employee_role() = 'Location Manager'
    and location_id = public.current_employee_location()
  );

create policy "inventory_update_barista"
  on inventory for update to authenticated
  using (
    public.current_employee_role() = 'Barista'
    and location_id = public.current_employee_location()
  )
  with check (
    public.current_employee_role() = 'Barista'
    and location_id = public.current_employee_location()
  );

-- employees
create policy "employees_select_own"
  on employees for select to authenticated
  using (
    auth_id = auth.uid()
    or public.current_employee_role() = 'Owner'
  );

create policy "employees_insert_owner"
  on employees for insert to authenticated
  with check (public.current_employee_role() = 'Owner');

create policy "employees_update_owner"
  on employees for update to authenticated
  using (public.current_employee_role() = 'Owner')
  with check (public.current_employee_role() = 'Owner');

create policy "employees_delete_owner"
  on employees for delete to authenticated
  using (public.current_employee_role() = 'Owner');

-- stock_transfers
create policy "transfers_select"
  on stock_transfers for select to authenticated
  using (
    public.current_employee_role() = 'Owner'
    or source_location_id = public.current_employee_location()
    or destination_location_id = public.current_employee_location()
  );

create policy "transfers_insert"
  on stock_transfers for insert to authenticated
  with check (
    public.current_employee_role() in ('Location Manager', 'Barista')
  );

create policy "transfers_update"
  on stock_transfers for update to authenticated
  using (
    public.current_employee_role() = 'Location Manager'
    and destination_location_id = public.current_employee_location()
  );

-- transfer_items
create policy "transfer_items_select"
  on transfer_items for select to authenticated using (true);

create policy "transfer_items_insert"
  on transfer_items for insert to authenticated with check (true);

create policy "transfer_items_update"
  on transfer_items for update to authenticated using (true);

create policy "transfer_items_delete"
  on transfer_items for delete to authenticated using (true);

-- usage_logs
create policy "usage_logs_select"
  on usage_logs for select to authenticated
  using (
    public.current_employee_role() = 'Owner'
    or location_id = public.current_employee_location()
  );

create policy "usage_logs_insert"
  on usage_logs for insert to authenticated
  with check (
    public.current_employee_role() in ('Location Manager', 'Barista')
    and location_id = public.current_employee_location()
  );

create policy "usage_logs_delete_branch_staff"
  on usage_logs for delete to authenticated
  using (
    public.current_employee_role() in ('Location Manager', 'Barista')
    and location_id = public.current_employee_location()
  );
