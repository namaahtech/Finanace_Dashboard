-- ============================================================
-- ATTENDANCE PROTOCOLS - COMPLETE SCHEMA FIX
-- ============================================================

-- Drop problematic check constraint if exists
ALTER TABLE public.attendance_protocols
  DROP CONSTRAINT IF EXISTS attendance_protocols_target_type_check;

-- Add/update all columns with proper types and defaults
ALTER TABLE public.attendance_protocols
  ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'General Shift',
  ADD COLUMN IF NOT EXISTS check_in_time TEXT NOT NULL DEFAULT '09:00:00',
  ADD COLUMN IF NOT EXISTS check_out_time TEXT NOT NULL DEFAULT '18:00:00',
  ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'All',
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'All',
  ADD COLUMN IF NOT EXISTS days TEXT[] NOT NULL DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri'],
  ADD COLUMN IF NOT EXISTS effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add new validation check constraint with proper logic
ALTER TABLE public.attendance_protocols
  ADD CONSTRAINT attendance_protocols_target_type_check
    CHECK (target_type IN ('All', 'Department', 'Individual', 'Team'));

-- Ensure RLS is disabled for admin operations
ALTER TABLE public.attendance_protocols DISABLE ROW LEVEL SECURITY;

-- Refresh PostgREST schema
NOTIFY pgrst, 'reload schema';
