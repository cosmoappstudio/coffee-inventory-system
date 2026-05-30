-- Switch transfer completion to destination receipt workflow.
-- Admin can dispatch from supplier or a branch; destination staff receive it.

insert into locations (id, name, address, is_warehouse)
values ('supplier', 'Supplier', 'External supplier', true)
on conflict (id) do update
set name = excluded.name,
    address = excluded.address,
    is_warehouse = excluded.is_warehouse;

drop policy if exists "transfers_insert" on stock_transfers;
create policy "transfers_insert"
  on stock_transfers for insert to authenticated
  with check (
    public.current_employee_role() in ('Owner', 'Location Manager', 'Barista')
  );

drop policy if exists "transfers_update" on stock_transfers;
create policy "transfers_update"
  on stock_transfers for update to authenticated
  using (
    public.current_employee_role() = 'Owner'
    or (
      public.current_employee_role() in ('Location Manager', 'Barista')
      and destination_location_id = public.current_employee_location()
    )
  )
  with check (
    public.current_employee_role() = 'Owner'
    or (
      public.current_employee_role() in ('Location Manager', 'Barista')
      and destination_location_id = public.current_employee_location()
    )
  );
