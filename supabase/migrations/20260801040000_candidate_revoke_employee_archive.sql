-- ════════════════════════════════════════════════════════════════════════════
-- Candidate Offer Revoke + Employee Permanent Delete (both archived)
-- ════════════════════════════════════════════════════════════════════════════
-- Two distinct actions, both keeping an archived trail (no hard row deletes):
--   • REVOKE  — a candidate who was mailed an offer but never joined. Available
--               within 48h of the offer-mail date (sent_at); admin can override.
--               Packet moves to status='revoked'.
--   • DELETE  — a joined employee who later stops working / is neglected. Soft
--               archive via employees.deleted_at + company (Zoho) mailbox disabled.
-- Permission-gated (default: admin + hr) via role_permissions module keys
--   candidate_revoke / employee_delete.

-- ── Onboarding: allow the new 'revoked' status + revocation trail ──────────────
ALTER TABLE onboarding_packets DROP CONSTRAINT IF EXISTS onboarding_status_chk;
ALTER TABLE onboarding_packets ADD  CONSTRAINT onboarding_status_chk CHECK (status IN
  ('draft','pending_approval','changes_requested','approved','sent','viewed','signed','completed','revoked'));

ALTER TABLE onboarding_packets ADD COLUMN IF NOT EXISTS revoked_at    timestamptz;
ALTER TABLE onboarding_packets ADD COLUMN IF NOT EXISTS revoked_by    uuid;
ALTER TABLE onboarding_packets ADD COLUMN IF NOT EXISTS revoke_reason text;

-- ── Employees: soft-archive trail for permanent delete ────────────────────────
ALTER TABLE employees ADD COLUMN IF NOT EXISTS deleted_at    timestamptz;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS deleted_by    uuid;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS delete_reason text;

CREATE INDEX IF NOT EXISTS idx_employees_deleted_at ON employees(deleted_at);

-- ── Seed default permissions (admin + hr get view + delete) ───────────────────
-- Admin passes unconditionally in code, but seed a row so the toggles read ON.
INSERT INTO role_permissions (role, module_key, can_view, can_create, can_edit, can_delete, can_export)
VALUES
  ('admin', 'candidate_revoke', true, false, false, true, false),
  ('hr',    'candidate_revoke', true, false, false, true, false),
  ('admin', 'employee_delete',  true, false, false, true, false),
  ('hr',    'employee_delete',  true, false, false, true, false)
ON CONFLICT (role, module_key) DO UPDATE
  SET can_view = EXCLUDED.can_view, can_delete = EXCLUDED.can_delete;
