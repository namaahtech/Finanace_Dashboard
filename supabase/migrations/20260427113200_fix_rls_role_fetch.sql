-- HELPER FUNCTION: Get current user role from database (more reliable than JWT)
DROP FUNCTION IF EXISTS get_my_role();
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
DECLARE
    r user_role;
BEGIN
    SELECT role INTO r FROM employees WHERE id = auth.uid();
    RETURN COALESCE(r, 'employee'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
