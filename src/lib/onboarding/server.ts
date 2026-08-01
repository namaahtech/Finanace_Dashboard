import { getApiUserId } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DEFAULT_SCHEMA } from "./schema";
import { termsFor } from "@/components/onboarding/templates/terminology";
import type { ConfigCategory, OnboardingSettings } from "./types";

// ════════════════════════════════════════════════════════════════════════════
// Onboarding — server-only helpers (auth actor, settings, schema resolution)
// ════════════════════════════════════════════════════════════════════════════

export interface Actor {
  userId: string;
  role: string;
  name: string;
  email: string;
  zoho_email: string | null;
  zoho_account_id: string | null;
}

/** Resolve the current API caller into an employee actor (or null if unauthenticated). */
export async function getActor(): Promise<Actor | null> {
  const userId = await getApiUserId();
  if (!userId) return null;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("employees")
    .select("id, name, email, role, zoho_email, zoho_account_id")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    userId,
    role: (data as any).role ?? "",
    name: (data as any).name ?? "",
    email: (data as any).email ?? "",
    zoho_email: (data as any).zoho_email ?? null,
    zoho_account_id: (data as any).zoho_account_id ?? null,
  };
}

export function isAdmin(actor: Actor | null): boolean {
  return actor?.role === "admin";
}

/**
 * Whether the actor may perform full-depth form-builder edits (edit the questions,
 * options, types & structure of the configuration sheet). Admin always can; others
 * need role_permissions.onboarding_builder.can_edit (with employee override).
 */
export async function canEditSchema(actor: Actor | null): Promise<boolean> {
  if (!actor) return false;
  if (actor.role === "admin") return true;
  const supabase = getSupabaseAdmin();
  // Per-employee override takes precedence when present.
  const { data: emp } = await supabase
    .from("employee_permissions")
    .select("can_edit")
    .eq("employee_id", actor.userId)
    .eq("module_key", "onboarding_builder")
    .maybeSingle();
  if (emp && emp.can_edit !== null && emp.can_edit !== undefined) return !!emp.can_edit;
  const { data: rp } = await supabase
    .from("role_permissions")
    .select("can_edit")
    .eq("role", actor.role)
    .eq("module_key", "onboarding_builder")
    .maybeSingle();
  return !!rp?.can_edit;
}

export async function loadSettings(): Promise<OnboardingSettings | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("onboarding_settings").select("*").eq("id", 1).maybeSingle();
  return (data as OnboardingSettings) ?? null;
}

/** The effective A–K schema for INTERN offers: settings override if present, else the built-in default. */
export function resolveSchema(settings: OnboardingSettings | null): ConfigCategory[] {
  const s = settings?.config_schema;
  return Array.isArray(s) && s.length ? (s as ConfigCategory[]) : DEFAULT_SCHEMA;
}

/**
 * Full-time starting point derived from the intern sheet: same structure, same
 * questions, employment wording. Used until an admin customises the full-time
 * sheet in Settings, so the panel is never empty and the two stay in step.
 */
export function deriveFullTimeSchema(base: ConfigCategory[]): ConfigCategory[] {
  const T = termsFor("full_time");
  return base.map((cat) => ({
    ...cat,
    title: T(cat.title),
    note: cat.note ? T(cat.note) : cat.note,
    fields: cat.fields?.map((f) => ({ ...f, label: T(f.label) })),
    options: cat.options?.map((o) => ({
      ...o,
      label: T(o.label),
      docNote: o.docNote ? T(o.docNote) : o.docNote,
      fields: o.fields?.map((f) => ({ ...f, label: T(f.label) })),
    })),
  }));
}

/**
 * The schema that applies to a given packet. Full-time hires use their own sheet
 * when one has been saved; otherwise they get the derived one above.
 */
export function resolveSchemaFor(
  settings: OnboardingSettings | null,
  employmentType: "intern" | "full_time" | null | undefined
): ConfigCategory[] {
  const intern = resolveSchema(settings);
  if (employmentType !== "full_time") return intern;
  const ft = settings?.config_schema_full_time;
  return Array.isArray(ft) && ft.length ? (ft as ConfigCategory[]) : deriveFullTimeSchema(intern);
}

/** Absolute base URL for magic links (env override → request origin fallback handled by caller). */
export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
