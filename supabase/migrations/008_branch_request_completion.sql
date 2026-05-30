-- Allow branch staff to mark approved management requests as completed.

alter table branch_requests
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by text references employees(id) on delete set null;

alter table branch_requests
  drop constraint if exists branch_requests_status_check;

alter table branch_requests
  add constraint branch_requests_status_check
  check (status in ('Pending Approval','Approved','Completed','Declined'));

drop policy if exists "branch_requests_update_branch_complete" on branch_requests;
create policy "branch_requests_update_branch_complete"
  on branch_requests for update to authenticated
  using (
    public.current_employee_role() in ('Location Manager', 'Barista')
    and location_id = public.current_employee_location()
    and status = 'Approved'
  )
  with check (
    public.current_employee_role() in ('Location Manager', 'Barista')
    and location_id = public.current_employee_location()
    and status = 'Completed'
  );
