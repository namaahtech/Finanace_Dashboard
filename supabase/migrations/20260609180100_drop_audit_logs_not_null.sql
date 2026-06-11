-- Migration: Allow nullable actor_id in audit_logs
-- Allows setting actor_id to NULL when employees are deleted to preserve audit trails.

ALTER TABLE audit_logs ALTER COLUMN actor_id DROP NOT NULL;
