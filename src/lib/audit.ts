import { getSupabaseAdmin } from "@/lib/supabase";

export interface AuditChange { from: any; to: any; }

export interface LogAuditOpts {
  actorId?: string | null;        // employee id of the person doing the action
  actorName?: string | null;      // optional override (e.g. a candidate, not an employee)
  actorRole?: string | null;
  action: string;                 // machine action, e.g. "onboarding.approve"
  section: string;                // human section, e.g. "Onboarding"
  summary: string;                // human-readable one-liner for the log sheet
  targetType?: string | null;     // e.g. "onboarding_packet", "employee"
  targetId?: string | null;
  changes?: Record<string, AuditChange> | null;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  ip?: string | null;
}

/** Field-level diff between two plain objects → { field: {from, to} } (only changed keys). */
export function diffObjects(before?: Record<string, any> | null, after?: Record<string, any> | null): Record<string, AuditChange> | null {
  const b = before || {};
  const a = after || {};
  const out: Record<string, AuditChange> = {};
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  for (const k of keys) {
    if (JSON.stringify(b[k]) !== JSON.stringify(a[k])) out[k] = { from: b[k] ?? null, to: a[k] ?? null };
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Record one entry in the universal Master Log Sheet (audit_logs).
 * Best-effort: never throws into the calling flow.
 */
export async function logAudit(opts: LogAuditOpts): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();

    let name = opts.actorName ?? null;
    let role = opts.actorRole ?? null;
    let empId: string | null = null;

    if (opts.actorId) {
      const { data } = await supabase
        .from("employees")
        .select("name, employee_id, role")
        .eq("id", opts.actorId)
        .maybeSingle();
      if (data) {
        name = name ?? (data as any).name ?? null;
        empId = (data as any).employee_id ?? null;
        role = role ?? (data as any).role ?? null;
      }
    }

    const changes = opts.changes ?? diffObjects(opts.before, opts.after);

    await supabase.from("audit_logs").insert({
      user_id: opts.actorId ?? null,
      action: opts.action,
      target_type: opts.targetType ?? null,
      target_id: opts.targetId ? String(opts.targetId) : null,
      actor_name: name,
      actor_emp_id: empId,
      actor_role: role,
      section: opts.section,
      summary: opts.summary,
      changes,
      ip_address: opts.ip ?? null,
      metadata: {},
    });
  } catch (e: any) {
    console.error("[audit] failed to record:", e?.message);
  }
}
