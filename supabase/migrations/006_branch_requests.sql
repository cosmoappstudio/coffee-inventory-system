-- Add branch-level non-product request workflow.
-- Branch staff create requests; owner reviews and approves or declines.

create table if not exists branch_requests (
  id uuid primary key default gen_random_uuid(),
  location_id text references locations(id) on delete cascade not null,
  requested_by text references employees(id) on delete set null,
  title text not null,
  description text not null,
  priority text not null default 'Normal'
    check (priority in ('Low','Normal','High','Urgent')),
  status text not null default 'Pending Approval'
    check (status in ('Pending Approval','Approved','Declined')),
  created_at timestamptz default now(),
  resolved_at timestamptz,
  resolved_by text references employees(id) on delete set null,
  resolution_note text
);

create index if not exists idx_branch_requests_location on branch_requests(location_id);
create index if not exists idx_branch_requests_status on branch_requests(status);
create index if not exists idx_branch_requests_created_at on branch_requests(created_at desc);

alter table branch_requests enable row level security;

drop policy if exists "branch_requests_select" on branch_requests;
create policy "branch_requests_select"
  on branch_requests for select to authenticated
  using (
    public.current_employee_role() = 'Owner'
    or location_id = public.current_employee_location()
  );

drop policy if exists "branch_requests_insert" on branch_requests;
create policy "branch_requests_insert"
  on branch_requests for insert to authenticated
  with check (
    public.current_employee_role() in ('Location Manager', 'Barista')
    and location_id = public.current_employee_location()
  );

drop policy if exists "branch_requests_update_owner" on branch_requests;
create policy "branch_requests_update_owner"
  on branch_requests for update to authenticated
  using (public.current_employee_role() = 'Owner')
  with check (public.current_employee_role() = 'Owner');
