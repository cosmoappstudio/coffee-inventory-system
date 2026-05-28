-- Adds admin-approval -> source-fulfillment transfer workflow.

alter table stock_transfers
  drop constraint if exists stock_transfers_status_check;

alter table stock_transfers
  add constraint stock_transfers_status_check
  check (
    status in (
      'Pending Approval',
      'Approved - Awaiting Fulfillment',
      'Approved & Completed',
      'Declined'
    )
  );

drop policy if exists "transfers_update" on stock_transfers;
create policy "transfers_update"
  on stock_transfers for update to authenticated
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
