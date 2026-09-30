-- ════════════════════════════════════════════════════════════════════════════
-- L&D Assignment Model — mandatory / department / optional + deadlines,
-- data-layer auto-assignment, auto-progress, and auto-certificate.
-- Implements the Namaah Nexus "Learning & Development Architecture Flow" spec:
-- assignment type is a property of the COURSE, enforced in the DB (not left to
-- an admin remembering to assign), and certificates are event-driven.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Assignment model on courses ─────────────────────────────────────────────
ALTER TABLE lms_courses ADD COLUMN IF NOT EXISTS assignment_type   TEXT DEFAULT 'optional';
ALTER TABLE lms_courses ADD COLUMN IF NOT EXISTS target_department TEXT;      -- for department_required
ALTER TABLE lms_courses ADD COLUMN IF NOT EXISTS deadline_days     INTEGER;   -- days from assignment → due
DO $$ BEGIN
  ALTER TABLE lms_courses ADD CONSTRAINT lms_courses_assignment_chk
    CHECK (assignment_type IN ('mandatory','department_required','optional'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Enrollment: deadline + how it was assigned ───────────────────────────────
ALTER TABLE lms_enrollments ADD COLUMN IF NOT EXISTS due_date     TIMESTAMPTZ;
ALTER TABLE lms_enrollments ADD COLUMN IF NOT EXISTS assigned_via TEXT DEFAULT 'self';  -- self | mandatory | department

-- 3. Reminder log (7d / 3d / 1d / manager escalation) — one row per fire ───────
CREATE TABLE IF NOT EXISTS lms_reminders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID REFERENCES lms_enrollments(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,              -- due_7d | due_3d | due_1d | escalation
  channel       TEXT DEFAULT 'email',       -- email | in_app
  sent_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_lms_enroll_due ON lms_enrollments(due_date);

-- 4. Assign one published course to the right employees ───────────────────────
CREATE OR REPLACE FUNCTION lms_assign_course(p_course UUID) RETURNS void AS $$
DECLARE c RECORD;
BEGIN
  SELECT * INTO c FROM lms_courses WHERE id = p_course;
  IF c IS NULL OR c.status <> 'published' THEN RETURN; END IF;

  IF c.assignment_type = 'mandatory' THEN
    INSERT INTO lms_enrollments (course_id, employee_id, assigned_via, due_date)
    SELECT c.id, e.id, 'mandatory',
           CASE WHEN c.deadline_days IS NOT NULL THEN NOW() + (c.deadline_days || ' days')::interval END
    FROM employees e
    WHERE COALESCE(e.is_active, true) = true AND e.deleted_at IS NULL
    ON CONFLICT (course_id, employee_id) DO NOTHING;

  ELSIF c.assignment_type = 'department_required' AND c.target_department IS NOT NULL THEN
    INSERT INTO lms_enrollments (course_id, employee_id, assigned_via, due_date)
    SELECT c.id, e.id, 'department',
           CASE WHEN c.deadline_days IS NOT NULL THEN NOW() + (c.deadline_days || ' days')::interval END
    FROM employees e
    WHERE e.department = c.target_department AND COALESCE(e.is_active, true) = true AND e.deleted_at IS NULL
    ON CONFLICT (course_id, employee_id) DO NOTHING;
  END IF;
END; $$ LANGUAGE plpgsql;

-- 5. Assign all relevant published courses to one employee (on hire) ──────────
CREATE OR REPLACE FUNCTION lms_assign_employee(p_emp UUID) RETURNS void AS $$
DECLARE e RECORD;
BEGIN
  SELECT * INTO e FROM employees WHERE id = p_emp;
  IF e IS NULL THEN RETURN; END IF;
  INSERT INTO lms_enrollments (course_id, employee_id, assigned_via, due_date)
  SELECT c.id, e.id,
         CASE WHEN c.assignment_type = 'mandatory' THEN 'mandatory' ELSE 'department' END,
         CASE WHEN c.deadline_days IS NOT NULL THEN NOW() + (c.deadline_days || ' days')::interval END
  FROM lms_courses c
  WHERE c.status = 'published'
    AND (c.assignment_type = 'mandatory'
         OR (c.assignment_type = 'department_required' AND c.target_department = e.department))
  ON CONFLICT (course_id, employee_id) DO NOTHING;
END; $$ LANGUAGE plpgsql;

-- 6. Triggers: publish/change a course → assign; hire an employee → assign ─────
CREATE OR REPLACE FUNCTION lms_course_publish_trg() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.assignment_type IN ('mandatory','department_required') THEN
    PERFORM lms_assign_course(NEW.id);
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_lms_course_publish ON lms_courses;
CREATE TRIGGER trg_lms_course_publish
  AFTER INSERT OR UPDATE OF status, assignment_type, target_department, deadline_days ON lms_courses
  FOR EACH ROW EXECUTE FUNCTION lms_course_publish_trg();

CREATE OR REPLACE FUNCTION lms_employee_hire_trg() RETURNS trigger AS $$
BEGIN
  PERFORM lms_assign_employee(NEW.id);
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_lms_employee_hire ON employees;
CREATE TRIGGER trg_lms_employee_hire
  AFTER INSERT ON employees
  FOR EACH ROW EXECUTE FUNCTION lms_employee_hire_trg();

-- 7. Recompute enrollment progress + issue certificate on lesson completion ────
--    (event-driven: the moment the last lesson is marked complete).
CREATE OR REPLACE FUNCTION lms_recompute_progress() RETURNS trigger AS $$
DECLARE
  v_course UUID;
  v_total  INT;
  v_done   INT;
  v_pct    INT;
BEGIN
  SELECT m.course_id INTO v_course
    FROM lms_lessons l JOIN lms_modules m ON m.id = l.module_id
   WHERE l.id = NEW.lesson_id;
  IF v_course IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_total
    FROM lms_lessons l JOIN lms_modules m ON m.id = l.module_id
   WHERE m.course_id = v_course;

  SELECT COUNT(DISTINCT lp.lesson_id) INTO v_done
    FROM lms_lesson_progress lp
    JOIN lms_lessons l ON l.id = lp.lesson_id
    JOIN lms_modules m ON m.id = l.module_id
   WHERE m.course_id = v_course AND lp.employee_id = NEW.employee_id;

  v_pct := CASE WHEN v_total > 0 THEN LEAST(100, ROUND(v_done * 100.0 / v_total)) ELSE 0 END;

  UPDATE lms_enrollments
     SET progress_percent = v_pct,
         completed_at = CASE WHEN v_pct >= 100 THEN COALESCE(completed_at, NOW()) ELSE NULL END
   WHERE course_id = v_course AND employee_id = NEW.employee_id;

  IF v_pct >= 100 THEN
    INSERT INTO lms_certifications (course_id, employee_id, certificate_number, issue_date)
    SELECT v_course, NEW.employee_id,
           'NX-' || upper(substr(md5(v_course::text || NEW.employee_id::text), 1, 8)),
           CURRENT_DATE
    WHERE NOT EXISTS (
      SELECT 1 FROM lms_certifications WHERE course_id = v_course AND employee_id = NEW.employee_id
    );
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_lms_progress ON lms_lesson_progress;
CREATE TRIGGER trg_lms_progress
  AFTER INSERT ON lms_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION lms_recompute_progress();
