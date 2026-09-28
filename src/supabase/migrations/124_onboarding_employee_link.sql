-- Onboarding → Employees handoff.
--
-- A completed onboarding had no record of the employee it produced, so the
-- "Add Employee" action could be repeated and create the same person twice, and
-- nothing in the panel showed that a candidate had already been handed over.
-- These columns link the packet to the employee row created from it.
alter table onboarding_packets
  add column if not exists employee_id uuid references employees(id) on delete set null;
alter table onboarding_packets
  add column if not exists added_to_employees_at timestamptz;

create index if not exists onboarding_packets_employee_id_idx
  on onboarding_packets (employee_id)
  where employee_id is not null;
