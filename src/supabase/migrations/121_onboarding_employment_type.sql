-- Engagement type chosen at onboarding time: is this person being hired as an
-- INTERN or directly as a FULL-TIME employee?
--
-- This is distinct from `converted_to_fulltime_at` (migration 120), which records
-- an intern being promoted later. Together they give three states in the panel:
--   employment_type = 'intern',    converted_to_fulltime_at IS NULL  → Intern
--   employment_type = 'intern',    converted_to_fulltime_at IS SET   → Converted to full-time
--   employment_type = 'full_time'                                    → Hired directly as full-time
--
-- Existing packets are all internships, so 'intern' is the correct default.
alter table onboarding_packets
  add column if not exists employment_type text not null default 'intern';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'onboarding_packets_employment_type_check'
  ) then
    alter table onboarding_packets
      add constraint onboarding_packets_employment_type_check
      check (employment_type in ('intern', 'full_time'));
  end if;
end $$;

create index if not exists onboarding_packets_employment_type_idx
  on onboarding_packets (employment_type);
