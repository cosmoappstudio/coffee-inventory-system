-- Allow branch staff to be assigned to multiple locations.

create table if not exists employee_locations (
  employee_id text references employees(id) on delete cascade,
  location_id text references locations(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (employee_id, location_id)
);

insert into employee_locations (employee_id, location_id)
select id, location_id
from employees
where location_id is not null
on conflict do nothing;

alter table employee_locations enable row level security;

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

drop policy if exists "employee_locations_select" on employee_locations;
create policy "employee_locations_select"
  on employee_locations for select to authenticated
  using (
    public.current_employee_role() = 'Owner'
    or employee_id = public.current_employee_id()
  );

drop policy if exists "employee_locations_owner_write" on employee_locations;
create policy "employee_locations_owner_write"
  on employee_locations for all to authenticated
  using (public.current_employee_role() = 'Owner')
  with check (public.current_employee_role() = 'Owner');

drop policy if exists "inventory_select" on inventory;
create policy "inventory_select" on inventory for select to authenticated
  using (
    public.current_employee_role() = 'Owner'
    or public.current_employee_has_location(location_id)
  );

drop policy if exists "inventory_update_manager" on inventory;
create policy "inventory_update_manager" on inventory for update to authenticated
  using (
    public.current_employee_role() = 'Location Manager'
    and public.current_employee_has_location(location_id)
  )
  with check (
    public.current_employee_role() = 'Location Manager'
    and public.current_employee_has_location(location_id)
  );

drop policy if exists "inventory_update_barista" on inventory;
create policy "inventory_update_barista" on inventory for update to authenticated
  using (
    public.current_employee_role() = 'Barista'
    and public.current_employee_has_location(location_id)
  )
  with check (
    public.current_employee_role() = 'Barista'
    and public.current_employee_has_location(location_id)
  );

drop policy if exists "usage_logs_select" on usage_logs;
create policy "usage_logs_select" on usage_logs for select to authenticated
  using (
    public.current_employee_role() = 'Owner'
    or public.current_employee_has_location(location_id)
  );

drop policy if exists "usage_logs_insert" on usage_logs;
create policy "usage_logs_insert" on usage_logs for insert to authenticated
  with check (
    public.current_employee_role() in ('Location Manager', 'Barista')
    and public.current_employee_has_location(location_id)
  );

drop policy if exists "usage_logs_delete_branch_staff" on usage_logs;
create policy "usage_logs_delete_branch_staff" on usage_logs for delete to authenticated
  using (
    public.current_employee_role() in ('Location Manager', 'Barista')
    and public.current_employee_has_location(location_id)
  );

drop policy if exists "transfers_select" on stock_transfers;
create policy "transfers_select" on stock_transfers for select to authenticated
  using (
    public.current_employee_role() = 'Owner'
    or public.current_employee_has_location(source_location_id)
    or public.current_employee_has_location(destination_location_id)
  );

drop policy if exists "transfers_update" on stock_transfers;
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

drop policy if exists "branch_requests_select" on branch_requests;
create policy "branch_requests_select" on branch_requests for select to authenticated
  using (
    public.current_employee_role() = 'Owner'
    or public.current_employee_has_location(location_id)
  );

drop policy if exists "branch_requests_insert" on branch_requests;
create policy "branch_requests_insert" on branch_requests for insert to authenticated
  with check (
    public.current_employee_role() in ('Location Manager', 'Barista')
    and public.current_employee_has_location(location_id)
  );

drop policy if exists "branch_requests_update_branch_complete" on branch_requests;
create policy "branch_requests_update_branch_complete"
  on branch_requests for update to authenticated
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
