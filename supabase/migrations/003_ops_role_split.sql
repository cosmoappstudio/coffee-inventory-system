-- Run after 001_schema.sql + 002_rls.sql.
-- Aligns the new panel split:
-- Owner: /admin only
-- Location Manager + Barista: /ops usage + transfer requests

drop policy if exists "transfers_insert" on stock_transfers;
create policy "transfers_insert"
  on stock_transfers for insert to authenticated
  with check (
    public.current_employee_role() in ('Location Manager', 'Barista')
  );

drop policy if exists "transfers_update" on stock_transfers;
create policy "transfers_update"
  on stock_transfers for update to authenticated
  using (
    public.current_employee_role() = 'Location Manager'
    and destination_location_id = public.current_employee_location()
  );

drop policy if exists "usage_logs_insert" on usage_logs;
create policy "usage_logs_insert"
  on usage_logs for insert to authenticated
  with check (
    public.current_employee_role() in ('Location Manager', 'Barista')
    and location_id = public.current_employee_location()
  );

drop policy if exists "usage_logs_delete_barista" on usage_logs;
create policy "usage_logs_delete_branch_staff"
  on usage_logs for delete to authenticated
  using (
    public.current_employee_role() in ('Location Manager', 'Barista')
    and location_id = public.current_employee_location()
  );
