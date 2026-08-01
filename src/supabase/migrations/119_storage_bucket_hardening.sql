-- ─────────────────────────────────────────────────────────────────────────────
-- Storage bucket hardening.
--
-- Several buckets were readable (and in some cases writable) by the anonymous
-- `public` role. The most serious was `resumes`: it allowed public SELECT and
-- public INSERT, so anyone on the internet could download every candidate's
-- resume — name, phone, address, work history — and upload arbitrary files into
-- the bucket. `attachments` additionally allowed public DELETE.
--
-- Every one of these buckets is only ever read or written by our own server
-- routes, which use the service-role key. The service role BYPASSES RLS, so
-- removing the public policies does not affect the application at all — it only
-- closes direct anonymous access.
--
-- Buckets deliberately left public: avatars, product-images (non-sensitive assets
-- referenced directly by <img> tags).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── resumes: candidate CVs. Was fully public read + public write. ─────────────
drop policy if exists "Allow Public Resume Uploads"     on storage.objects;
drop policy if exists "Allow public read for resumes"   on storage.objects;
drop policy if exists "Allow public uploads for resumes" on storage.objects;

-- ── attachments: mail attachments. Was public read + write + DELETE. ──────────
drop policy if exists "auth_read_attachments"   on storage.objects;
drop policy if exists "auth_write_attachments"  on storage.objects;
drop policy if exists "auth_delete_attachments" on storage.objects;

-- Re-grant attachment access to signed-in users only (never anonymous).
create policy "attachments_read_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'attachments');

create policy "attachments_write_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'attachments');

create policy "attachments_delete_authenticated"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'attachments');

-- ── legal: signed agreements / policy documents. Was public SELECT. ───────────
-- These are company legal documents; anonymous read is not appropriate.
drop policy if exists "Public Access" on storage.objects;

create policy "legal_read_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'legal');

-- Mark the two sensitive buckets private so direct object URLs stop resolving
-- even if a policy is re-added by mistake later.
update storage.buckets set public = false where id in ('legal', 'resumes');

-- `documents` (candidate KYC: selfies, Aadhaar, PAN) intentionally has NO
-- policies and is private — reachable only through our authenticated API routes
-- via the service role. Same for invoices, lms-content, mail-attachments.
