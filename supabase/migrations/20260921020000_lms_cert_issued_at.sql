-- Editable issue date+time for certificates (issue_date is DATE-only; add a full
-- timestamp so admins can adjust the exact date/time shown on the certificate).
ALTER TABLE lms_certifications ADD COLUMN IF NOT EXISTS issued_at timestamptz DEFAULT now();

-- Backfill existing rows from the best available source.
UPDATE lms_certifications
   SET issued_at = COALESCE(issued_at, created_at, (issue_date::timestamptz))
 WHERE issued_at IS NULL;
