import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get("role");
  if (!role) {
    return NextResponse.json({ error: "role param required" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("role_permissions")
      .select("module_key, can_view, can_create, can_edit, can_delete, can_export")
      .eq("role", role);

    if (error) throw error;

    const permissions: Record<string, {
      can_view: boolean; can_create: boolean; can_edit: boolean;
      can_delete: boolean; can_export: boolean;
    }> = {};

    for (const row of data ?? []) {
      permissions[row.module_key] = {
        can_view:   row.can_view,
        can_create: row.can_create,
        can_edit:   row.can_edit,
        can_delete: row.can_delete,
        can_export: row.can_export,
      };
    }

    return NextResponse.json({ permissions });
  } catch (err: any) {
    console.error("[GET /api/permissions]", err);
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, permissions, updatedBy } = body as {
      role: string;
      permissions: Record<string, {
        can_view: boolean; can_create: boolean; can_edit: boolean;
        can_delete: boolean; can_export: boolean;
      }>;
      updatedBy?: string;
    };

    if (!role || !permissions) {
      return NextResponse.json({ error: "role and permissions are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const rows = Object.entries(permissions).map(([module_key, perms]) => ({
      role,
      module_key,
      can_view:   perms.can_view,
      can_create: perms.can_create,
      can_edit:   perms.can_edit,
      can_delete: perms.can_delete,
      can_export: perms.can_export,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy ?? null,
    }));

    const { error } = await supabase
      .from("role_permissions")
      .upsert(rows, { onConflict: "role,module_key" });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[POST /api/permissions]", err);
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}
