-- Intern → full-time conversion tracking on the onboarding packet.
-- Lets HR convert someone who finished their internship into a full-time employee
-- from the Onboarding panel, and records who did it so the action is auditable and
-- can only happen once per packet.
alter table onboarding_packets add column if not exists converted_to_fulltime_at timestamptz;
alter table onboarding_packets add column if not exists converted_to_fulltime_by uuid references employees(id);

create index if not exists onboarding_packets_converted_fulltime_idx
  on onboarding_packets (converted_to_fulltime_at)
  where converted_to_fulltime_at is not null;
