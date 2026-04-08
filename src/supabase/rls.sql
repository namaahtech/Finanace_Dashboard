-- ENABLE RLS ON ALL TABLES
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE incentives ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_requests ENABLE ROW LEVEL SECURITY;

-- HELPER FUNCTION: Get current user role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM employees WHERE email = auth.jwt()->>'email' LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- HELPER FUNCTION: Get my employee id
CREATE OR REPLACE FUNCTION get_my_id()
RETURNS UUID AS $$
  SELECT id FROM employees WHERE email = auth.jwt()->>'email' LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. SUPER ADMIN: Full Access (SELECT, INSERT, UPDATE, DELETE)
-- (Applying to all tables with a simple "IF role = 'super_admin'" check)
CREATE POLICY super_admin_all_employees ON employees FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY super_admin_all_teams ON teams FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY super_admin_all_attendance ON attendance_logs FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY super_admin_all_leaves ON leave_requests FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY super_admin_all_kpi ON kpi_scores FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY super_admin_all_incentives ON incentives FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY super_admin_all_payroll ON payroll_runs FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY super_admin_all_vendors ON vendors FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY super_admin_all_clients ON clients FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY super_admin_all_invoices ON invoices FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY super_admin_all_subs ON subscriptions FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY super_admin_all_budgets ON team_budgets FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY super_admin_all_leads ON leads FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY super_admin_all_channels ON channels FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY super_admin_all_members ON channel_members FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY super_admin_all_messages ON messages FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY super_admin_all_meetings ON meetings FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY super_admin_all_attendees ON meeting_attendees FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY super_admin_all_config ON system_config FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY super_admin_all_audit ON audit_logs FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY super_admin_all_reimb ON reimbursements FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY super_admin_all_priority ON priority_requests FOR ALL TO authenticated USING (get_my_role() = 'super_admin');

-- 2. ACCOUNTS: Finance focus
CREATE POLICY accounts_read_employees ON employees FOR SELECT TO authenticated USING (get_my_role() = 'accounts');
CREATE POLICY accounts_all_payroll ON payroll_runs FOR ALL TO authenticated USING (get_my_role() = 'accounts');
CREATE POLICY accounts_all_vendors ON vendors FOR ALL TO authenticated USING (get_my_role() = 'accounts');
CREATE POLICY accounts_all_clients ON clients FOR ALL TO authenticated USING (get_my_role() = 'accounts');
CREATE POLICY accounts_all_invoices ON invoices FOR ALL TO authenticated USING (get_my_role() = 'accounts');
CREATE POLICY accounts_all_subs ON subscriptions FOR ALL TO authenticated USING (get_my_role() = 'accounts');
CREATE POLICY accounts_all_budgets ON team_budgets FOR ALL TO authenticated USING (get_my_role() = 'accounts');
CREATE POLICY accounts_all_reimb ON reimbursements FOR ALL TO authenticated USING (get_my_role() = 'accounts');
CREATE POLICY accounts_all_priority ON priority_requests FOR ALL TO authenticated USING (get_my_role() = 'accounts');

-- 3. HR: People focus
CREATE POLICY hr_all_employees ON employees FOR ALL TO authenticated USING (get_my_role() = 'hr');
CREATE POLICY hr_all_attendance ON attendance_logs FOR ALL TO authenticated USING (get_my_role() = 'hr');
CREATE POLICY hr_all_leaves ON leave_requests FOR ALL TO authenticated USING (get_my_role() = 'hr');
CREATE POLICY hr_all_kpi ON kpi_scores FOR ALL TO authenticated USING (get_my_role() = 'hr');
CREATE POLICY hr_all_meetings ON meetings FOR ALL TO authenticated USING (get_my_role() = 'hr');

-- 4. LEAD: Team focus
CREATE POLICY lead_read_my_team ON employees FOR SELECT TO authenticated 
  USING (team_id IN (SELECT id FROM teams WHERE lead_id = get_my_id()));
CREATE POLICY lead_read_team_attendance ON attendance_logs FOR SELECT TO authenticated 
  USING (employee_id IN (SELECT id FROM employees WHERE team_id IN (SELECT id FROM teams WHERE lead_id = get_my_id())));
CREATE POLICY lead_view_team_kpi ON kpi_scores FOR SELECT TO authenticated 
  USING (employee_id IN (SELECT id FROM employees WHERE team_id IN (SELECT id FROM teams WHERE lead_id = get_my_id())));
CREATE POLICY lead_view_own_budget ON team_budgets FOR SELECT TO authenticated 
  USING (team_id IN (SELECT id FROM teams WHERE lead_id = get_my_id()));

-- 5. EMPLOYEE: Own data
CREATE POLICY emp_view_self ON employees FOR SELECT TO authenticated USING (id = get_my_id());
CREATE POLICY emp_view_own_attendance ON attendance_logs FOR SELECT TO authenticated USING (employee_id = get_my_id());
CREATE POLICY emp_manage_own_leaves ON leave_requests FOR ALL TO authenticated USING (employee_id = get_my_id());
CREATE POLICY emp_view_own_kpi ON kpi_scores FOR SELECT TO authenticated USING (employee_id = get_my_id());
CREATE POLICY emp_view_own_incentives ON incentives FOR SELECT TO authenticated USING (employee_id = get_my_id());
CREATE POLICY emp_view_own_payroll ON payroll_runs FOR SELECT TO authenticated USING (employee_id = get_my_id());
CREATE POLICY emp_manage_own_reimb ON reimbursements FOR ALL TO authenticated USING (employee_id = get_my_id());
CREATE POLICY emp_manage_own_priority ON priority_requests FOR ALL TO authenticated USING (employee_id = get_my_id());

-- 6. SALES: CRM focus
CREATE POLICY sales_all_leads ON leads FOR ALL TO authenticated USING (get_my_role() = 'sales');
CREATE POLICY sales_all_clients ON clients FOR ALL TO authenticated USING (get_my_role() = 'sales');

-- GLOBAL ACCESS: Messaging (All users can see channels they are in)
CREATE POLICY global_read_channels ON channels FOR SELECT TO authenticated 
  USING (id IN (SELECT channel_id FROM channel_members WHERE employee_id = get_my_id()));
CREATE POLICY global_read_messages ON messages FOR SELECT TO authenticated 
  USING (channel_id IN (SELECT channel_id FROM channel_members WHERE employee_id = get_my_id()) OR recipient_id = get_my_id() OR sender_id = get_my_id());
CREATE POLICY global_send_messages ON messages FOR INSERT TO authenticated 
  WITH CHECK (sender_id = get_my_id());
