-- INSERT INITIAL SYSTEM CONFIG
INSERT INTO system_config (
  revenue, 
  profit_percentage, 
  expense_percentage, 
  company_stage, 
  vesting_days, 
  bonus_percentage_1m, 
  bonus_percentage_2m, 
  claim_limit, 
  payout_pool_amount, 
  payout_capacity
) VALUES (
  100000000, 
  85, 
  15, 
  'Hyper-Growth Archetype', 
  30, 
  5, 
  10, 
  25, 
  5000000, 
  'HIGH'
);

-- NOTE: Employees must be created AFTER the Supabase Auth users are created in the Auth service.
-- However, for the initial seed of the first Super Admin (Accounts & Finance Lead):
-- Replace the email with the actual admin email.

/*
INSERT INTO employees (name, email, employee_id, role, department, designation, joining_date)
VALUES ('Admin User', 'admin@namaah.pulse', 'EMP001', 'super_admin', 'Management', 'Accounts & Finance Lead', NOW());
*/

-- SEED SOME INITIAL TEAMS
/*
INSERT INTO teams (name, department) VALUES 
('Finance Alpha', 'Accounts'),
('Human Capital', 'HR'),
('Growth Ops', 'Sales'),
('Engineering Delta', 'IT');
*/
