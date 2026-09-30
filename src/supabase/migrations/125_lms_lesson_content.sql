-- ════════════════════════════════════════════════════════════════════════════
-- L&D lesson content + enforcement fields
--  • lesson (chapter): a video (embed or direct file) or a document, or reading
--  • quiz: a passing score gate (questions live in lms_quiz_questions)
--  • enforcement: no-skip video / must-read document, tracked in the player
-- ════════════════════════════════════════════════════════════════════════════

-- Which kind of content a 'lesson'-type row holds.
ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS content_kind    TEXT DEFAULT 'video'; -- video | document | reading
-- Document (PDF/URL) for a document lesson.
ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS attachment_url  TEXT;
-- Passing score for a quiz lesson (percent).
ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS pass_percent    INTEGER DEFAULT 70;
-- Enforce no-skip (video) / read-all (document) before the lesson can complete.
ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS enforce_no_skip BOOLEAN DEFAULT true;

DO $$ BEGIN
  ALTER TABLE lms_lessons ADD CONSTRAINT lms_lessons_content_kind_chk
    CHECK (content_kind IN ('video','document','reading'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Public bucket for lesson media (videos / documents). Public read so the player
-- can stream them; authenticated users (admins) can upload.
INSERT INTO storage.buckets (id, name, public) VALUES ('lms', 'lms', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "lms_read" ON storage.objects FOR SELECT USING (bucket_id = 'lms');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "lms_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'lms');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "lms_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'lms');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
