-- Separate Offer Letter configuration sheet for FULL-TIME hires.
--
-- `config_schema` holds the internship questionnaire (A–K categories, checklist
-- points, field labels). A full-time offer needs its own set — different
-- compensation options, no "Internship Type", and so on — so admins get a second,
-- independently editable schema instead of one sheet serving both engagements.
--
-- NULL means "not customised yet": the app then derives a full-time starting point
-- from the intern schema with employment wording applied, so the panel is never
-- empty and admins can edit from a sensible baseline.
alter table onboarding_settings
  add column if not exists config_schema_full_time jsonb;

comment on column onboarding_settings.config_schema_full_time is
  'Offer Letter configuration sheet used when onboarding_packets.employment_type = ''full_time''. NULL falls back to the intern schema with employment terminology applied.';
